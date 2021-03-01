import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

const checkDiagnostics = (diagnostics: ts.Diagnostic[]) => {
    let errorMsg;
    for (let diagnostic of diagnostics) {
        errorMsg = '';
        if (diagnostic.file) {
            const {line, character} = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            errorMsg += ` ${diagnostic.file.fileName} (${line + 1},${character + 1})`;
        }
        errorMsg += ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    }

    if (errorMsg) {
        throw new Error(errorMsg);
    }
};

const readConfigFile = (configFileName: string) => {
    const result = ts.parseConfigFileTextToJson(configFileName, fs.readFileSync(configFileName, 'utf-8'));
    const {config} = result;

    if (!config) {
        checkDiagnostics([result.error]);
    }
    const configParseResult = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(configFileName));
    if (configParseResult.errors.length > 0) {
        checkDiagnostics(configParseResult.errors);
    }
    return configParseResult;
};


export const compileDeclarations = (configFilePath: string, entryPoint: string, outDir: string): void => {
    const cfg = readConfigFile(configFilePath);

    // update config to build declarations only.
    cfg.options.emitDeclarationOnly = true;
    cfg.options.declarationMap = true;
    cfg.options.declaration = true;
    cfg.options.outDir = outDir;

    const fileNames = [entryPoint];
    const program = ts.createProgram(fileNames, cfg.options);
    const emitResult = program.emit();

    checkDiagnostics(ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics));

    if (emitResult.emitSkipped) {
        throw Error('emitSkipped');
    }
};
