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
import MonacoEditor from '@monaco-editor/react';
import {ButtonPanel} from './ButtonPanel';
import './Editor.scss';

export type Value = { html: string, js: string, docs: string };

let foldRegions: boolean;

export const Editor = (props: {
    language: 'js' | 'html',
    onChange?: (value: Value) => void,
    onDownload?: () => void
    value?: Value,
    active?: boolean
}) => {
    const editorRef = useRef(null);
    const [language, setLanguage] = React.useState(props.language);


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
        // updateEditorDimensions();

        monaco.languages.registerFoldingRangeProvider('javascript', {
            provideFoldingRanges: function(model, context, token) {
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
                if (foldRegions) {
                    editor.getAction('editor.foldAllMarkerRegions').run();
                    foldRegions = false;
                }
                return ranges;
            }
        });
        editorRef.current.getAction('editor.foldAllMarkerRegions').run();
    };

    const onClick = (id) => {
        switch (id) {
        case 'js':
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

    foldRegions = true;
    if (editorRef.current) {
        editorRef.current.getAction('editor.unfoldAllMarkerRegions').run();
        // editorRef.current.layout({});
    }

    // React.useEffect(() => {
    //     updateEditorDimensions();
    // });

    const containerRef = React.useRef(null);

    // return (<div className={'editorContainer'}>
    return (<div className={'editorContainer'} style={{display: props.active ? '' : 'none'}}>
        <ButtonPanel language={language} onClick={onClick} docs={props.value.docs}></ButtonPanel>

        <div className={'monacoEditor'} ref={containerRef}>
            <MonacoEditor
                language={language == 'js' ? 'javascript' : language}
                value={props.value[language]}
                onMount={handleEditorDidMount}
                theme={'vs-dark'}
                // width='300px'
                // height="300px"
                options={{
                    minimap: {
                        enabled: false
                    },
                    automaticLayout: true
                    // automaticLayout: false
                }}
            />
        </div>

    </div>);
};


