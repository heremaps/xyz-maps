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

import React, {useEffect} from 'react';
import './FSToggle.scss';

export const FSToggle: React.FC = (props: { title: string, onClick?: (fs: boolean) => void }) => {
    const ref = React.useRef(null);

    const handleClick = () => {
        ref.current.classList.toggle('active');
        if (props.onClick) {
            const isActive = ref.current.classList.length == 2;
            const param = isActive ? '?fullscreen' : '';
            window.history.replaceState({}, document.title, location.pathname + param + location.hash);
            props.onClick(isActive);
        }
    };

    useEffect(() => {
        if ((new URLSearchParams(window.location.search)).has('fullscreen')) {
            handleClick();
        }
    }, []);

    return (<div className={'fs-toggle'} onClick={handleClick} ref={ref}>
        <div/>
        <div/>
        <div/>
        <div/>
    </div>);
};
