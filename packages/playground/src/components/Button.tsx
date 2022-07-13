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
import './Button.scss';

const Button: React.FC = (props: { name: string, id: string, active?: boolean, onClick: (id: string) => void }) => {
    const handleClick = () => {
        const {onClick} = props;
        onClick && onClick(props.id);
    };

    const classNames = ['button'];

    if (props.active) {
        classNames.push('active');
    }
    return (
        <button
            id={props.id}
            className={classNames.join(' ')}
            type={'button'}
            onClick={handleClick}
        >{props.name}</button>
    );
};

export {Button};
