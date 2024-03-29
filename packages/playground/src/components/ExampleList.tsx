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
import React, {useEffect, useLayoutEffect} from 'react';
import './ExampleList.scss';
import {Slider} from './Slider';


export type Example = { title: string, file: string, docs: string, section: string };

const ListItem: React.FC = (props: {
    section: number,
    index: number,
    title: string,
    selected?: boolean,
    onClick: (i: number, section: number) => void
}) => {
    const handleClick = (e: Event) => {
        props.onClick(props.index, props.section);
    };
    return (
        <li className={props.selected ? 'selected' : ''} onClick={handleClick}>{props.title}</li>
    );
};


export const ExampleList: React.FC = (props: {
    examples: any,
    onSelect: (example: Example) => void,
    onResize?: () => void,
    active: boolean,
    defaultSelected: [number, string]
}) => {
    const {examples, defaultSelected} = props;
    const list = [];

    let [selected, setSelected] = React.useState({index: defaultSelected[0], section: defaultSelected[1]});

    const selectExample = (index: number, section: number) => {
        if (index != selected.index || section != selected.section) {
            setSelected({index: index, section: section});

            if (props.onSelect) {
                props.onSelect(examples[section][index]);
            }
        }
    };


    for (let module in examples) {
        const samples = examples[module];

        list.push(<li className={'section'}>{module}</li>);
        let i = 0;
        list.push.apply(list, samples.map(({title}) => <ListItem
            selected={module == selected.section && i == selected.index}
            index={i++}
            section={module}
            onClick={selectExample}
            title={title}
        />
        ));
    }


    const listRef = React.useRef(null);
    const exampleRef = React.useRef(null);
    const gutterRef = React.useRef(null);

    const onGutterClick = () => {
        exampleRef.current.classList.toggle('hidden');
        gutterRef.current.classList.toggle('toggle');
    };

    useLayoutEffect(() => {
        let animationDone = false;
        const updateSize = () => {
            props.onResize();
            if (!animationDone) {
                requestAnimationFrame(updateSize);
            }
            animationDone = false;
        };
        exampleRef.current.addEventListener('transitionstart', updateSize);
        exampleRef.current.addEventListener('transitionend', () => animationDone = true);

        const target = exampleRef.current.querySelector('.selected');
        target.parentNode.scrollTop = target.offsetTop;
    }, []);

    return (<div className={'exampleList'} ref={exampleRef} style={{display: props.active ? '' : 'none'}}>
        <ul ref={listRef}>{list}</ul>
        <Slider onPointerDown={onGutterClick} ref={gutterRef}></Slider>
        {/* <div className={'gutter'} onClick={onGutterClick} ref={gutterRef}></div>*/}
    </div>);
};
