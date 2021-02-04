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

export const Slider: React.FC = React.forwardRef((props: {
    active?: boolean,
    onPointerDown?: () => void,
    onPointerUp?: () => void,
    onPointerMove?: (dx: number) => void,
    containerRef?: React.Ref<HTMLElement>,
}, ref) => {
    const {containerRef} = props;
    let prevX;

    const handlePointerUp = (e: PointerEvent) => {
        if (containerRef) {
            containerRef.current.removeEventListener('pointermove', handlePointerMove);
            containerRef.current.removeEventListener('pointerup', handlePointerUp);
        }
        if (props.onPointerUp) {
            props.onPointerUp();
        }
    };

    const handlePointerMove = (e: PointerEvent) => {
        const {clientX} = e;
        const dx = Math.round(clientX - prevX);
        prevX = clientX;
        if (dx && props.onPointerMove) {
            props.onPointerMove(dx);
        }
    };


    const handlePointerDown = (e: PointerEvent) => {
        prevX = e.clientX;
        if (containerRef) {
            containerRef.current.addEventListener('pointermove', handlePointerMove);
            containerRef.current.addEventListener('pointerup', handlePointerUp);
        }
        if (props.onPointerDown) {
            props.onPointerDown();
        }
    };

    let {active} = props;

    if (active == undefined) {
        active = true;
    }

    return (
        <div ref={ref} className={'slider'} onPointerDown={handlePointerDown} style={{display: active ? 'block' : 'none'}}>
            <div></div>
        </div>
    );
});
