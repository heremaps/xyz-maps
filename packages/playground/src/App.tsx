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
import React, {useEffect, useLayoutEffect} from 'react';
import './App.scss';
import {Navbar} from './components/Navbar';
import {Editor, Value} from './components/Editor';
import {Slider} from './components/Slider';
import {createIframeSrc, Preview} from './components/Preview';
import {Example, ExampleList} from './components/ExampleList';
// @ts-ignore
import settings from 'settings';
// @ts-ignore
import ts from 'ts';
import {MobilePanel} from './components/MobilePanel';

const fetchExample = async (example): Promise<{ title: string, html: string, ts: string }> => {
    let {file, title, description} = example;
    file = 'examples/' + file + '?ts=' + ts;
    let response = await fetch(file);
    let htmlSource = await response.text();

    response = await fetch(file.replace('.html', '.ts'));

    let tsSource = await response.text();

    return {
        title: title,
        html: htmlSource,
        ts: tsSource
    };
};


export const App: React.FC = (props: { examples: any }) => {
    const containerRef = React.useRef(null);
    const previewRef = React.useRef(null);
    const prevGridTemplateColumns = React.useRef(null);
    const initialExample = React.useRef(null);
    const dtsPaths = React.useRef(null);

    const isMobileMode = window.innerWidth <= 768;
    let [exampleSrc, setExampleSrc] = React.useState({
        html: '',
        ts: '// Welcome to the XYZ Maps Playground',
        title: '',
        org: {
            html: '',
            ts: ''
        },
        docs: ''
    });
    let [previewPointerEvents, setPreviewPointerEvents] = React.useState(true);
    let [apiVersion, setApiVersion] = React.useState('');
    let [previewWidth, setPreviewWidth] = React.useState('calc( 50% - 4px )');
    let [editorWidth, setEditorWidth] = React.useState('calc( 50% - 4px )');

    const selectExample = async (example: Example) => {
        let exampleSources = await fetchExample(example);
        const {html, ts, title} = exampleSources;
        setExampleSrc({title, html, ts, org: {html, ts}, docs: example.docs});

        window.location.hash = example.section + '-' + title.replace(/\ /g, '_');
    };

    const updateSource = (source: Value | null) => {
        let {html, ts, title, org, docs} = exampleSrc;
        if (source) {
            html = source.html;
            ts = source.ts;
        } else {
            html = org.html;
            ts = org.ts;
        }
        setExampleSrc({title, html, ts, org, docs});
    };

    const onDownload = () => {
        const title = exampleSrc.title;
        if (title) {
            const content = createIframeSrc(exampleSrc);
            const a = document.createElement('a');
            a.href = 'data:application/octet-stream,' + encodeURIComponent(content);
            a.target = '_blank';
            a.download = title + '.html';
            a.click();
        }
    };


    const updateColumnSize = (dx: number = 0) => {
        const gutterWidth = 8;
        const containerWidth = containerRef.current.offsetWidth - gutterWidth;
        const newPreviewWidth = previewRef.current.offsetWidth - dx;
        const newEditorWidth = containerWidth - newPreviewWidth;
        const gridTemplateColumns = [`${newEditorWidth}px`, `${gutterWidth}px`, 'auto'];
        containerRef.current.style.gridTemplateColumns = gridTemplateColumns.join(' ');
        setPreviewWidth(`${newPreviewWidth}px`);
        // force editor refresh
        setEditorWidth(previewWidth);
    };

    if (!initialExample.current) {
        let initExample = [0, 'Display'];
        const hash = window.location.hash.substr(1);
        if (hash) {
            let [c, title] = hash.split('-');
            if (title) {
                c = decodeURI(c);
                title = title.replace(/_/g, ' ');
                for (let i = 0, examples = props.examples[c]; i < examples.length; i++) {
                    if (examples[i].title == title) {
                        initExample = [i, c];
                        break;
                    }
                }
            }
        }
        initialExample.current = initExample;
    }

    useEffect(() => {
        const [index, section] = initialExample.current;
        selectExample(props.examples[section][index]);
    }, []);

    useLayoutEffect(() => {
        !isMobileMode && updateColumnSize();
    }, []);

    if (!dtsPaths.current) {
        // create declaration-path-map
        dtsPaths.current = {};
        const libs = settings.path['xyz-maps'];
        for (let name in libs) {
            dtsPaths.current[`@here/xyz-maps-${name}`] = libs[name].replace(/\.min\.js|\.js/, '.d.ts');
        }
    }

    let [visibility, setVisibility] = React.useState(isMobileMode
        ? {examples: false, editor: true, preview: false} // mobile
        : {examples: true, editor: true, preview: true} // desktop
    );

    const handleVisibility = (type: string) => {
        const visibility = {examples: false, editor: false, preview: false};
        visibility[type] = true;
        setVisibility(visibility);
    };

    const toggleFullscreen = (active: boolean) => {
        let gridTemplateColumns;
        if (active) {
            prevGridTemplateColumns.current = containerRef.current.style.gridTemplateColumns;
            gridTemplateColumns = 'none';
        } else {
            gridTemplateColumns = prevGridTemplateColumns.current;
        }

        containerRef.current.style.gridTemplateColumns = gridTemplateColumns;

        setVisibility(active
            ? {examples: false, editor: false, preview: true}
            : {examples: true, editor: true, preview: true}
        );
    };

    return (<div className={'Playground'}>
        <Navbar title={'XYZ Maps Playground'} version={apiVersion}></Navbar>
        <MobilePanel defaultActive={'editor'} onChange={handleVisibility} visibility={visibility}/>

        <div className={'content'}>
            <ExampleList examples={props.examples} onSelect={selectExample} onResize={updateColumnSize}
                active={visibility.examples} defaultSelected={initialExample.current}>
            </ExampleList>
            <div className={'container'} ref={containerRef}>
                <Editor language={'ts'} value={exampleSrc} onChange={updateSource} onDownload={onDownload}
                    active={visibility.editor} theme={settings.monaco.theme} dtsPaths={dtsPaths.current}
                />
                <Slider onPointerDown={() => setPreviewPointerEvents(false)} onPointerMove={updateColumnSize}
                    onPointerUp={() => setPreviewPointerEvents(true)} containerRef={containerRef}
                    active={visibility.editor}
                />
                <Preview src={exampleSrc} width={previewWidth} ref={previewRef} setApiVersion={setApiVersion}
                    pointerEvents={previewPointerEvents} active={visibility.preview}
                    onToggleFullscreen={toggleFullscreen}
                />
            </div>
        </div>
    </div>);
};
