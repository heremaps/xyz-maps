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
import './Slider.scss';

export const Slider: React.FC = (props: {
    onDragStart: () => void,
    onDragStop: () => void,
    onDrag: (dx: number) => void,
    active: boolean
    containerRef: React.Ref<HTMLElement>
}) => {
    const {containerRef} = props;
    let prevX;

    const handlePointerUp = (e: PointerEvent) => {
        containerRef.current.removeEventListener('pointermove', handlePointerMove);
        containerRef.current.removeEventListener('pointerup', handlePointerUp);
        if (props.onDragStop) {
            props.onDragStop();
        }
    };

    const handlePointerMove = (e: PointerEvent) => {
        const {clientX} = e;
        const dx = Math.round(clientX - prevX);
        prevX = clientX;
        if (dx && props.onDrag) {
            props.onDrag(dx);
        }
    };


    const handlePointerDown = (e: PointerEvent) => {
        prevX = e.clientX;
        containerRef.current.addEventListener('pointermove', handlePointerMove);
        containerRef.current.addEventListener('pointerup', handlePointerUp);
        if (props.onDragStart) {
            props.onDragStart();
        }
    };

    return (
        <div className={'slider'} onPointerDown={handlePointerDown} style={{display: props.active?'block':'none'}}/>
    );
};
