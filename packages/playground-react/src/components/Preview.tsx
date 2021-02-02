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
import './Preview.scss';
import {convertImport} from '../convertImport';
// @ts-ignore
import settings from 'settings';
// @ts-ignore
import ts from 'ts';
import {FSToggle} from './FSToggle';

const TS_PARAM = '?ts=' + ts;
// @ts-ignore
const TOKEN = window._TKN;

const globalImportMap = {
    '@here/xyz-maps-common': {ns: 'here.xyz.maps'},
    '@here/xyz-maps-core': {ns: 'here.xyz.maps'},
    '@here/xyz-maps-display': {ns: 'here.xyz.maps', default: 'Map'},
    '@here/xyz-maps-editor': {ns: 'here.xyz.maps.editor'}
};

export const createIframeSrc = (exampleSource, includePgSpecifics: boolean = false): string => {
    const tokenInject = `var YOUR_ACCESS_TOKEN='${TOKEN}';`;
    const {html, js} = exampleSource;
    const injectScript = (html, src) => {
        const absolutePath = (href) => {
            let linkForPath = document.createElement('a');
            linkForPath.href = href;
            return linkForPath.href;
        };
        return html.replace('</head>', `\t<script src="${absolutePath(src)}"></script>\n\t</head>`);
    };

    let lines = js.split('\n');
    let modules = [];
    let bodyIndention = '\t\t\t';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const convertedImport = convertImport(line, globalImportMap);
        if (convertedImport) {
            modules.push(convertedImport.module);
            lines[i] = bodyIndention + '// ' + lines[i];
            lines.splice(++i, 0, convertedImport.globalImport);
        }
        lines[i] = bodyIndention + lines[i];
    }

    let data = html.replace('</body>',
        `\t<script>(()=>{${includePgSpecifics ? tokenInject : ''}\n${lines.join('\n')}\n\t\twindow.__map=(window.display||window.map);})();</script>\n\t</body>`
    );
    if (modules.length && modules.indexOf('@here/xyz-maps-common') != 1) {
        modules.unshift('@here/xyz-maps-common');
    }
    for (let name of modules) {
        data = injectScript(data, settings.path['xyz-maps'][name.split('-').pop()] + TS_PARAM);
    }
    return data;
};

export const Preview: React.FC = React.forwardRef((props: {
    src: { html: string, js: string, title: string },
    width: string,
    pointerEvents: boolean,
    active: boolean,
    setApiVersion?: (string) => void,
    onToggleFullscreen: (active: boolean) => void
}, ref) => {
    const {src} = props;
    const iFrameSrc = createIframeSrc(src, true);
    const iframeRef = React.useRef(null);
    const [size, setSize] = React.useState([0, 0]);

    // refresh display size on window size changes..
    useLayoutEffect(() => {
        const updateSize = () => setSize([window.innerWidth, window.innerHeight]);
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    useEffect(() => {
        const {contentWindow} = iframeRef.current;
        const display = contentWindow.__map;
        display && display.resize();
    });

    useEffect(() => {
        iframeRef.current.onload = () => {
            try {
                props.setApiVersion(iframeRef.current.contentWindow.here.xyz.maps.build.version);
            } catch (e) {
            }
        };
    }, []);

    return (
        <div ref={ref} className={'preview'}
            style={{display: props.active ? '' : 'none', pointerEvents: props.pointerEvents ? 'auto' : 'none'}}>
            <FSToggle onClick={props.onToggleFullscreen}></FSToggle>
            <iframe className={'iframe'} ref={iframeRef} srcDoc={iFrameSrc}></iframe>
        </div>
    );
});
