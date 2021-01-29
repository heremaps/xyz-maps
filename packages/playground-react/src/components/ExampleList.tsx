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
import './ExampleList.scss';


export type Example = { title: string, file: string, docs: string, description: string };

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
    active: boolean
}) => {
    const examples = props.examples;
    const list = [];

    let [selected, setSelected] = React.useState({index: 0, section: 0});

    const selectExample = (index: number, section: number) => {
        if (index != selected.index || section != selected.section) {
            setSelected({index: index, section: section});
            if (props.onSelect) {
                props.onSelect(examples[section].samples[index]);
            }
        }
    };

    let sectionIndex = 0;
    for (let {title, samples} of examples) {
        list.push(<li className={'section'}>{title}</li>);
        let i = 0;
        list.push.apply(list, samples.map(({title}) => <ListItem
            selected={sectionIndex == selected.section && i == selected.index}
            index={i++}
            section={sectionIndex}
            onClick={selectExample}
            title={title}
        />
        ));
        sectionIndex++;
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
    }, []);


    return (<div className={'exampleList'} ref={exampleRef} style={{display: props.active ? '' : 'none'}}>
        <ul ref={listRef}>{list}</ul>
        <div className={'gutter'} onClick={onGutterClick} ref={gutterRef}></div>
    </div>);
};
