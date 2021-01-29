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
import ts from 'ts';
import {MobilePanel} from './components/MobilePanel';

const exampleSource = {
    title: '',
    html: '',
    js: ''
};

const fetchExample = async (example) => {
    let {file, title, description} = example;
    file = 'examples/' + file + '?ts=' + ts;
    let response = await fetch(file);
    let htmlSource = await response.text();

    response = await fetch(file.replace('.html', '.js'));
    let jsSource = await response.text();

    exampleSource.html = htmlSource;
    exampleSource.js = jsSource;
    exampleSource.title = title;

    return exampleSource;
};


let init = false;

export const App: React.FC = (props: { examples: any }) => {
    const containerRef = React.useRef(null);
    const previewRef = React.useRef(null);
    const isMobileMode = window.innerWidth <= 768;

    let [exampleSrc, setExampleSrc] = React.useState({
        html: '',
        js: '// Welcome to the XYZ Maps Playground',
        title: '',
        org: {
            html: '',
            js: ''
        },
        docs: ''
    });

    let [previewPointerEvents, setPreviewPointerEvents] = React.useState(true);
    let [previewWidth, setPreviewWidth] = React.useState('calc( 50% - 4px )');
    let [editorWidth, setEditorWidth] = React.useState('calc( 50% - 4px )');


    const selectExample = async (example: Example) => {
        let exampleSources = await fetchExample(example);
        const {html, js, title} = exampleSources;
        setExampleSrc({title, html, js, org: {html, js}, docs: example.docs});
    };

    const updateSource = (source: Value | null) => {
        let {html, js, title, org, docs} = exampleSrc;
        if (source) {
            html = source.html;
            js = source.js;
        } else {
            html = org.html;
            js = org.js;
        }
        setExampleSrc({title, html, js, org, docs});
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
        // this.utag(idx);
    };


    const updateColumnSize = (dx: number = 0) => {
        const gutterWidth = 8;
        const containerWidth = containerRef.current.offsetWidth - gutterWidth;
        const newPreviewWidth = previewRef.current.offsetWidth - dx;
        const newEditorWidth = containerWidth - newPreviewWidth;

        // const gridTemplateColumns = [newEditorWidth, gutterWidth, newPreviewWidth];
        // containerRef.current.style.gridTemplateColumns = gridTemplateColumns.map((w)=>`${w}px`).join(' ');

        const gridTemplateColumns = [`${newEditorWidth}px`, `${gutterWidth}px`, 'auto'];
        containerRef.current.style.gridTemplateColumns = gridTemplateColumns.join(' ');

        console.log(gridTemplateColumns);

        setPreviewWidth(`${newPreviewWidth}px`);

        // force editor refresh
        setEditorWidth(previewWidth);
    };

    if (!init) {
        init = true;
        selectExample(props.examples[0].samples[0]);
    }

    useLayoutEffect(() => {
        !isMobileMode && updateColumnSize();
    }, []);

    let [visibility, setVisibility] = React.useState(isMobileMode
        ? {examples: false, editor: true, preview: false} // mobile
        : {examples: true, editor: true, preview: true} // desktop
    );

    const handleVisibility = (type: string) => {
        const visibility = {examples: false, editor: false, preview: false};
        visibility[type] = true;
        console.log(visibility);
        setVisibility(visibility);
    };

    return (<div className={'Playground'}>
        <Navbar title={'XYZ Maps Playground'}></Navbar>
        <MobilePanel active={'preview'} onChange={handleVisibility} visibility={visibility}/>

        <div className={'content'}>
            <ExampleList examples={props.examples} onSelect={selectExample} onResize={updateColumnSize}
                active={visibility.examples}></ExampleList>
            <div className={'container'} ref={containerRef}>
                <Editor language={'js'} value={exampleSrc} onChange={updateSource} onDownload={onDownload}
                    active={visibility.editor}/>
                <Slider onDragStart={() => setPreviewPointerEvents(false)} onDrag={updateColumnSize}
                    onDragStop={() => setPreviewPointerEvents(true)} containerRef={containerRef}/>
                <Preview src={exampleSrc} width={previewWidth} pointerEvents={previewPointerEvents}
                    active={visibility.preview} ref={previewRef}/>
                {/* <Preview src={exampleSrc} pointerEvents={previewPointerEvents} ref={previewRef}/>*/}
            </div>
        </div>
    </div>);
};
