/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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
import {Extractor, ExtractorConfig, ExtractorResult, IConfigFile} from '@microsoft/api-extractor';
import {compileDeclarations} from './compileDeclarations';

export const build = async (moduleDirectory: string, apiExtractorJsonPath: string, dtsFolder: string = 'lib') => {
    const entryPoint = 'src/index.ts';
    const basePath = path.resolve(moduleDirectory, 'tsconfig.json');
    const moduleName = path.basename(path.dirname(basePath));
    const mainEntryPointFile = path.join(moduleDirectory, dtsFolder, moduleName, entryPoint);

    try {
        // compile typescript declarations
        compileDeclarations(basePath, path.join(path.dirname(basePath), entryPoint), dtsFolder);

        // set release-tag to "@internal" for undocumented code to exclude from public dts build
        const releaseTag = 'internal';
        await setReleaseTags(path.dirname(mainEntryPointFile), releaseTag);

        // load default template config
        let cfg: IConfigFile = ExtractorConfig.loadFile(apiExtractorJsonPath);

        // set the project folder and main entry point of the current module
        cfg.projectFolder = path.resolve(moduleDirectory);
        cfg.mainEntryPointFilePath = `<projectFolder>/${mainEntryPointFile.replace('.ts', '.d.ts')}`;

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

        if (extractorResult.succeeded) {
            console.log(`API Extractor completed successfully`);
            process.exitCode = 0;
        } else {
            console.error(`API Extractor completed with ${extractorResult.errorCount} errors`
                + ` and ${extractorResult.warningCount} warnings`);
            process.exitCode = 1;
        }
    } catch (e) {
        console.error(e);
        process.exitCode = 1;
    } finally {
        console.log(`Cleanup temporary declaration files`);
        rmdirSync(path.join(moduleDirectory, dtsFolder), {recursive: true});
    }
};
