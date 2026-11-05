/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 * License-Filename: LICENSE
 */
import {Buffer} from 'node:buffer';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import sourceMap from 'source-map';

const {SourceMapConsumer, SourceMapGenerator} = sourceMap;

const inlineSourceMapPattern = /\n\/\/# sourceMappingURL=([^\n]+)\n?$/;

const parseInlineSourceMap = (code, filePath) => {
    const match = code.match(inlineSourceMapPattern);

    if (!match) {
        throw new Error(`Missing trailing inline source map: ${filePath}`);
    }

    const sourceMappingURL = match[1];

    if (!sourceMappingURL.startsWith('data:')) {
        throw new Error(`Pass-1 source map is not an inline data URL: ${filePath}`);
    }

    const comma = sourceMappingURL.indexOf(',');

    if (comma === -1) {
        throw new Error(`Malformed inline source map data URL: ${filePath}`);
    }

    const metadata = sourceMappingURL.slice('data:'.length, comma);
    const payload = sourceMappingURL.slice(comma + 1);
    const base64 = metadata.split(';').some((part) => part.toLowerCase() === 'base64');
    let map;

    try {
        const json = base64 ?
            Buffer.from(payload, 'base64').toString('utf8') :
            decodeURIComponent(payload);
        map = JSON.parse(json);
    } catch (error) {
        throw new Error(`Invalid inline source map: ${filePath}: ${error.message}`);
    }

    return {
        body: code.slice(0, match.index) + '\n',
        map
    };
};

const readInlineSourceMap = async (code, filePath) => {
    const {body, map} = parseInlineSourceMap(code, filePath);
    let consumer;

    try {
        consumer = await new SourceMapConsumer(map);
    } catch (error) {
        throw new Error(`Invalid source map data: ${filePath}: ${error.message}`);
    }

    return {body, consumer};
};

export const readPass2EntrySourceMap = (code, filePath) => parseInlineSourceMap(code, filePath).map;

/**
 * Loads the generated pass-2 entry, forwards its composed source map to
 * Rolldown, and watches the entry for pass-2 rebuilds.
 *
 * @param {string} pass2EntryFile
 * @returns {object}
 */
export const createPass2EntrySourceMapPlugin = (pass2EntryFile) => ({
    name: 'core-load-pass2-entry-sourcemap',
    buildStart() {
        this.addWatchFile(pass2EntryFile);
    },
    load(id) {
        if (id !== pass2EntryFile) {
            return null;
        }

        return readFileSync(id, 'utf8');
    },
    transform(code, id) {
        if (id !== pass2EntryFile) {
            return null;
        }

        const map = {...readPass2EntrySourceMap(code, id)};
        // Avoid Rolldown treating the intermediate file as the final source in
        // sequential multi-config builds; the inline artifact retains its file.
        delete map.file;

        return {
            code: code.replace(/\n\/\/# sourceMappingURL=[^\n]+\n?$/, '\n'),
            map
        };
    },
    writeBundle(options, bundle) {
        const chunk = Object.values(bundle).find((item) => item.type === 'chunk');

        if (chunk?.map && options.file) {
            // The CLI writer can reconstruct the map asset from the input map;
            // write the generated chunk map after that serialization step. The
            // hook map is relative to the intermediate entry, so remove its
            // extra leading directory before writing the final dist map.
            const map = {
                ...chunk.map,
                sources: chunk.map.sources.map((source) => source.startsWith('../') ? source.slice(3) : source)
            };
            writeFileSync(options.file + '.map', JSON.stringify(map), 'utf8');
        }
    }
});

const wrapChunk = (factoryName, body) =>
    `const ${factoryName} = function(exports, require) {\n` +
    body +
    `\n};\n`;

const addChunkMappings = (generator, consumer, lineOffset) => {
    consumer.eachMapping((mapping) => {
        const generated = {
            line: lineOffset + 1 + mapping.generatedLine,
            column: mapping.generatedColumn
        };

        if (mapping.source == null || mapping.originalLine == null || mapping.originalColumn == null) {
            generator.addMapping({generated});
            return;
        }

        const composed = {
            generated,
            original: {
                line: mapping.originalLine,
                column: mapping.originalColumn
            },
            source: mapping.source
        };

        if (mapping.name != null) {
            composed.name = mapping.name;
        }

        generator.addMapping(composed);
    });

    consumer.sources.forEach((source) => {
        const content = consumer.sourceContentFor(source, true);

        if (content != null) {
            generator.setSourceContent(source, content);
        }
    });
};

const newlineCount = (source) => source.split('\n').length - 1;

/**
 * Generates the pass-2 entry from the pass-1 CJS chunks and composes their
 * source maps for the final UMD build.
 *
 * @param {{
 *     buildDir: string,
 *     pass1Chunks: {shared: string, worker: string, main: string},
 *     pass2EntryFileName: string,
 *     sourcemap?: boolean
 * }} options
 * @returns {Promise<string>}
 */
export const createPass2EntrySource = async ({
    buildDir,
    pass1Chunks,
    pass2EntryFileName,
    sourcemap = true
}) => {
    const read = (fileName) => {
        const filePath = join(buildDir, fileName);
        if (!existsSync(filePath)) {
            throw new Error(`Missing pass-1 chunk: ${filePath}`);
        }
        return {
            filePath,
            code: readFileSync(filePath, 'utf8')
        };
    };

    const readChunk = async (fileName) => {
        const {filePath, code} = read(fileName);
        return sourcemap ?
            readInlineSourceMap(code, filePath) :
            {body: code, consumer: null};
    };

    const sharedChunkId = './' + pass1Chunks.shared;
    const chunks = await Promise.all(['shared', 'worker', 'main'].map(async (role) => [
        `${role}Factory`,
        await readChunk(pass1Chunks[role])
    ]));

    const generator = sourcemap ? new SourceMapGenerator({file: pass2EntryFileName}) : null;
    const sourceParts = [`import '@here/xyz-maps-common';`];
    let lineOffset = 1;

    for (const [factoryName, chunk] of chunks) {
        const wrapped = wrapChunk(factoryName, chunk.body);
        sourceParts.push(wrapped);
        if (sourcemap) {
            addChunkMappings(generator, chunk.consumer, lineOffset);
            if (typeof chunk.consumer.destroy === 'function') {
                chunk.consumer.destroy();
            }
        }
        lineOffset += newlineCount(wrapped);
        lineOffset++;
    }

    sourceParts.push(
        `let xyz = typeof window == 'undefined' ? global : window;`,
        `'here.xyz.maps'.split('.').forEach((ns) => xyz = (xyz[ns] = xyz[ns] || {}));`,
        `bootstrapCore(sharedFactory, workerFactory, mainFactory, ${JSON.stringify(sharedChunkId)});`,
        `export default xyz;`
    );
    if (sourcemap) {
        const map = Buffer.from(JSON.stringify(generator.toJSON()), 'utf8').toString('base64');
        sourceParts.push(`//# sourceMappingURL=data:application/json;charset=utf-8;base64,${map}`);
    }

    return sourceParts.join('\n');
};
