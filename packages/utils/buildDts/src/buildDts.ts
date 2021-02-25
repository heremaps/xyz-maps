/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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
import {rmdirSync, existsSync, mkdirSync} from 'fs';
import * as path from 'path';
import {setReleaseTags} from './setReleaseTags';
import {spawn} from 'cross-spawn';
import {Extractor, ExtractorConfig, ExtractorResult, IConfigFile} from '@microsoft/api-extractor';

const run = async (cwd: string, cmd: string, args: string[]) => {
    return new Promise((resolve, reject) => {
        spawn(cmd, args, {cwd: cwd, stdio: 'inherit'})
            .on('close', resolve)
            .on('error', reject);
    });
};

export const build = async (moduleDirectory: string, apiExtractorJsonPath: string, dtsFolder: string = 'lib') => {
    // build typescript declarations
    await run(moduleDirectory, 'tsc', ['src/index.ts',
        '--allowJs', 'true',
        '--emitDeclarationOnly',
        '--declarationMap', 'true',
        '--declaration',
        '--module', 'amd',
        '--outDir', dtsFolder
    ]);

    // set release-tag to @internal for undocumented code to exclude from public dts build
    await setReleaseTags(path.join(moduleDirectory, dtsFolder), 'internal');

    // load default template config
    let cfg: IConfigFile = ExtractorConfig.loadFile(apiExtractorJsonPath);

    // set the project folder of the current module
    cfg.projectFolder = path.resolve(moduleDirectory);

    // create api report folder if needed
    if (cfg.apiReport?.enabled) {
        let {reportFolder} = cfg.apiReport;
        if (!existsSync(reportFolder)) {
            mkdirSync(reportFolder);
        }
    }

    const extractorConfig = ExtractorConfig.prepare({
        configObject: cfg,
        configObjectFullPath: apiExtractorJsonPath,
        packageJsonFullPath: path.join(cfg.projectFolder, 'package.json')
    });

    // Invoke API Extractor
    const extractorResult: ExtractorResult = Extractor.invoke(extractorConfig, {
        localBuild: true,
        showVerboseMessages: true
    });

    console.log(`Cleanup temporary declaration files`);
    rmdirSync(path.join(moduleDirectory, dtsFolder), {recursive: true});

    if (extractorResult.succeeded) {
        console.log(`API Extractor completed successfully`);
        process.exitCode = 0;
    } else {
        console.error(`API Extractor completed with ${extractorResult.errorCount} errors`
            + ` and ${extractorResult.warningCount} warnings`);
        process.exitCode = 1;
    }
};
