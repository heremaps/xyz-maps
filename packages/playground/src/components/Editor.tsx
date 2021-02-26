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
import React, {useRef} from 'react';
import MonacoEditor, {useMonaco} from '@monaco-editor/react';
import {ButtonPanel} from './ButtonPanel';
import './Editor.scss';

export type Value = { html: string, ts: string, docs: string };

const fetchDeclarations = (
    dtsPaths: { [module: string]: string },
    onLoad: (declarations: { [module: string]: string }) => void
) => {
    let cnt = 0;
    const declarations = {};
    const ready = () => {
        if (!--cnt) {
            onLoad(declarations);
        }
    };
    for (let name in dtsPaths) {
        cnt++;
        fetch(dtsPaths[name])
            .then((response) => {
                if (response.status != 200) {
                    throw new TypeError(`Declaration not found for module ${name}`);
                }
                return response.text();
            })
            .then((data) => {
                declarations[name] = data;
                ready();
            }).catch((e) => {
                delete declarations[name];
                ready();
            });
    }
};


export const Editor = (props: {
    language: 'ts' | 'html',
    onChange?: (value: Value) => void,
    onDownload?: () => void
    value?: Value,
    theme?: string
    active?: boolean,
    dtsPaths?: { [module: string]: string }
}) => {
    const editorRef = useRef(null);
    const modelPath = useRef(null);
    const [language, setLanguage] = React.useState(props.language);
    const [declarations, setDeclarations] = React.useState(false);
    const declarationsAdded = useRef(false);
    const foldRegions = useRef(false);

    // triggers reinitialization after the first initialization so we can create the modelPath
    const monaco = useMonaco();
    if (monaco) {
        if (declarations && !declarationsAdded.current) {
            // add the declaration files to monaco
            declarationsAdded.current = true;
            for (let module in declarations) {
                const libSource = declarations[module];
                const libUri = `file:///${module}.d.ts`;
                monaco.languages.typescript.typescriptDefaults.addExtraLib(libSource, libUri);
            }
        }
        if (!modelPath.current) {
            modelPath.current = monaco.Uri.parse('file:///example.ts');
            monaco.languages.typescript.typescriptDefaults.addExtraLib(`declare const YOUR_ACCESS_TOKEN: string;`);
        }
    }


    React.useEffect(() => {
        const {dtsPaths} = props;
        if (dtsPaths) {
            fetchDeclarations(dtsPaths, setDeclarations);
        }
    }, []);


    // const updateEditorDimensions = ()=>{
    //     if (editorRef.current) {
    //         const dimensions = {
    //             width: containerRef.current.offsetWidth,
    //             height: containerRef.current.offsetHeight
    //         };
    //         console.log(dimensions);
    //         editorRef.current.layout(dimensions)
    //     }
    // }

    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
        monaco.languages.registerFoldingRangeProvider('typescript', {
            provideFoldingRanges: (model, context, token) => {
                let ranges = [];
                for (let i = 1, start; i <= model.getLineCount(); i++) {
                    if (model.getLineContent(i).match(/\/\*\*.*\*\*\//)) {
                        if (!start) {
                            start = i;
                        } else {
                            ranges.push({
                                start: start, end: i,
                                kind: monaco.languages.FoldingRangeKind.Region
                            });
                            start = null;
                        }
                    }
                }

                if (foldRegions.current) {
                    foldRegions.current = false;
                    editor.getAction('editor.foldAllMarkerRegions').run()
                        .then(() => editorRef.current.revealLine(0));
                }
                return ranges;
            }
        });
    };

    const onClick = (id) => {
        switch (id) {
        case 'ts':
        case 'html':
            setLanguage(id);
            break;
        case 'dl':
            if (props.onDownload) {
                props.onDownload();
            }
            break;
        default:
            const {onChange} = props;
            if (onChange) {
                if (id == 'run') {
                    const value = editorRef.current.getValue();
                    if (props.value[language] != value) {
                        const updated = {...props.value};
                        updated[language] = value;
                        onChange(updated);
                    }
                } else {
                    onChange(null);
                }
            }
        }
    };

    foldRegions.current = true;

    // editorRef.current && editorRef.current.revealLine(0);

    // React.useEffect(() => {
    //     updateEditorDimensions();
    // });

    const containerRef = React.useRef(null);

    // return (<div className={'editorContainer'}>
    return (<div className={'editorContainer'} style={{display: props.active ? '' : 'none'}}>
        <ButtonPanel language={language} onClick={onClick} docs={props.value.docs}></ButtonPanel>

        <div className={'monacoEditor'} ref={containerRef}>
            <MonacoEditor
                language={language == 'ts' ? 'typescript' : language}
                value={props.value[language]}
                path={modelPath.current}
                onMount={handleEditorDidMount}
                theme={props.theme}
                // width='300px'
                // height="300px"
                options={{
                    minimap: {
                        enabled: false
                    },
                    automaticLayout: true
                }}
            />
        </div>

    </div>);
};


