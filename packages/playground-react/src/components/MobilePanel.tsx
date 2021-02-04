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
import React from 'react';
import './MobilePanel.scss';

const MobilePanel: React.FC = (props: {
    defaultActive: string,
    onChange?: (mode: string) => void,
    visibility: { examples: boolean, editor: boolean, preview: boolean }
}) => {
    const [active, setActive] = React.useState(props.defaultActive);
    const {visibility} = props;

    const onChange = (e) => {
        const {id} = e.target;
        const {onChange} = props;

        if (id != active) {
            setActive(id);
            if (onChange) {
                onChange(id);
            }
        }
    };

    return (
        <div className={'mobilePanel'} onClick={onChange}>
            <div id={'examples'} className={visibility.examples ? 'active' : ''}>Samples</div>
            <div id={'editor'} className={visibility.editor ? 'active' : ''}>Source</div>
            <div id={'preview'} className={visibility.preview ? 'active' : ''}>Preview</div>
            {/*<div id={'examples'} className={active == 'examples' ? 'active' : ''}>Samples</div>*/}
            {/*<div id={'editor'} className={active == 'editor' ? 'active' : ''}>Source</div>*/}
            {/*<div id={'preview'} className={active == 'preview' ? 'active' : ''}>Preview</div>*/}
        </div>
    );
};

export {MobilePanel};
