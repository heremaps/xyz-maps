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
import './FSToggle.scss';

export const FSToggle: React.FC = (props: { title: string, onClick?: (fs: boolean) => void }) => {
    const ref = React.useRef(null);

    const handleClick = (e) => {
        ref.current.childNodes.forEach((c) => c.classList.toggle('active'));

        if (props.onClick) {
            props.onClick(!!ref.current.firstChild.classList.length);
        }
    };

    return (<div className={'fs-toggle'} onClick={handleClick} ref={ref}>
        <div/>
        <div/>
        <div/>
        <div/>
    </div>);
};