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
import React from 'react';
import './ButtonPanel.scss';
import {Button} from './Button';
// @ts-ignore
import settings from 'settings';

const ButtonPanel: React.FC = (props: {
    language: 'ts' | 'html',
    docs: string,
    onClick?: (id: string) => void,
}) => {
    const [active, setActive] = React.useState(props.language);

    const handleClick = (id: string) => {
        if (id === 'ts' || id === 'html') {
            setActive(id);
        }
        if (props.onClick) {
            props.onClick(id);
        }
    };

    return (<div className={'buttonPanel'}>
        <Button active={active == 'ts'} id={'ts'} name={'Typescript'} onClick={handleClick}></Button>
        <Button active={active == 'html'} id={'html'} name={'HTML/CSS'} onClick={handleClick}></Button>
        <Button id={'run'} name={'Run'} onClick={handleClick}></Button>
        <Button id={'reset'} name={'Reset'} onClick={handleClick}></Button>
        <a id={'docs'} className={'button'} target={'_blank'} href={settings.path.doc + props.docs}>{'Docs'}</a>
        <Button id={'dl'} name={'\u2191'} onClick={handleClick}></Button>
    </div>);
};

export {ButtonPanel};
