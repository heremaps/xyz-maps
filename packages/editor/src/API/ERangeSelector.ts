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

import {Feature} from '../features/feature/Feature';
import MultiSelector from '../tools/rangeSelector/MultiSelector';
import InternalEditor from '../IEditor';

import {Navlink} from '../features/link/Navlink';
import {Range as InternalZone} from '../tools/rangeSelector/Range';
import {MapEvent} from '@here/xyz-maps-display';
import EventHandler from '../handlers/EventHandler';
import {EditorEvent} from './EditorEvent';

let UNDEF;

/**
 * A RangeSegment is the part of a "Range" that's located at a specific Navlink.
 */
export type RangeSegment = {
    /**
     * The Navlink the RangeSegment is located at.
     */
    navlink: Navlink
    /**
     * Relative start position on the geometry of the Navlink.
     * 0 -\> 0% -\> start, 0.5 -\> 50% -\> middle, 1 -\> 100% -\> end
     */
    from: number;
    /**
     * Relative end position on the geometry of the Navlink.
     * 0.5 -\> 50% -\> middle, 1 -\> 100% -\> end
     */
    to: number;
    /**
     * The indicates if the direction of travel of the Navlink is in reverse order, compared to the direction of travel of the first Navlink that's has been added of the RangeSelector.
     */
    reversed: boolean;
}

/**
 * A Range represents a part/subsegment on a line geometry or multiple line geometries.
 * Its used by the RangeSelector utility. {@link editor.RangeSelector}
 */
export interface Range {
    /**
     * Optional identifier of the Range
     */
    id?: string | number;
    /**
     * Side of the Range. Relative to the direction of travel of the line geometry.
     * "L" | "R" | "B" -\> Left, Right or Both sides.
     *
     * @defaultValue "B"
     */
    side?: 'L' | 'R' | 'B';
    /**
     * Relative start position on the line geometry.
     * 0 -\> 0% -\> start, 0.5 -\> 50% -\> middle, 1 -\> 100% -\> end
     * @defaultValue 0.0
     */
    from?: number;
    /**
     * Relative end position on the line geometry.
     * 0.5 -\> 50% -\> middle, 1 -\> 100% -\> end
     * @defaultValue 1.0
     */
    to?: number;
    /**
     * lock the range and prevent dragging/editing of the Range.
     */
    locked?: boolean;
    /**
     * Apply custom styling of Range.
     * Objects of key value pairs.
     */
    style?: any;
    /**
     * Set an event listener that will be called when a range drag starts.
     *
     * @param event - The respective event.
     * The {@link Range} is provided in the detail property of the event. (event.detail.range)
     */
    dragStart?: (event: EditorEvent) => void;
    /**
     * Set an event listener that will be called when a range is dragged.
     *
     * @param event - The respective event.
     * The {@link Range} is provided in the detail property of the event. (event.detail.range)
     */
    dragMove?: (event: EditorEvent) => void;
    /**
     * Set an event listener that will be called when a range drag has been finished.
     *
     * @param event - The respective event.
     * The {@link Range} is provided in the detail property of the event. (event.detail.range)
     */
    dragStop?: (event: EditorEvent) => void;
    /**
     * A range can consist of several segments.
     * A Segment provides detailed information on the affected Navlinks:
     * @example
     * ```
     * {
     *  navlink: Navlink;
     *  from: number;
     *  to: number;
     *  reversed: boolean;
     * }
     * ```
     */
    readonly segments?: RangeSegment[]

    markerStyle?;
    lineStyle?;
}

const convertZone = (range: InternalZone): Range => {
    const {id, from, to, side, style} = range.options;
    return {id, from, to, side, style, segments: range.segments};
};

/**
 * The RangeSelector is a tool to create and modify Ranges on a single geometry or multiple line geometries.
 * A Range represents a part/subsegment on a line geometry or multiple line geometries and allows separate attribution.
 */
export class RangeSelector {
    private links: MultiSelector;
    private ranges: [];

    constructor(iEditor: InternalEditor) {
        this.links = new MultiSelector(iEditor);
    }

    /**
     * Add Navlink(s) to RangeSelector tool.
     *
     * @param navlink - a single or multiple Navlinks to add. Multiple Navlinks must be linked.
     *
     */
    add(navlink: Navlink | Navlink[]) {
        const links = navlink instanceof Array ? navlink : [].slice.call(arguments);

        for (let i = 0; i < links.length; i++) {
            if (links[i] instanceof Feature) {
                this.links.addLink(links[i]);
            }
        }
    };

    /**
     * Add and show a Range. A Range can be located on a single or multiple Navlink(s).
     *
     * @param range - The Range that should be displayed.
     */
    show(...ranges: Range[]);

    show(range: Range) {
        const ranges = this.ranges = range instanceof Array ? range : [].slice.call(arguments);

        ranges.forEach((range) => {
            range['from'] = range['from'] || 0;
            range['to'] = (range['to'] == UNDEF ? 1 : range['to']) || 0;

            for (let name of ['markerStyle', 'lineStyle']) {
                let style = range[name];
                if (style && !Array.isArray(style)) {
                    range[name] = [style];
                }
            }

            for (let type of ['dragStart', 'dragMove', 'dragStop']) {
                const listener = range[type];
                if (listener) {
                    range[type] = (e: MapEvent, range: InternalZone) => {
                        /* detail.zone is deprecated */
                        e.detail.range = e.detail.zone = convertZone(range);
                        listener(EventHandler.createEditorEvent(e, e.target, type));
                    };
                }
            }
        });

        this.links.show(ranges);
    };

    /**
     * hides all Ranges and the RangeSelector tool itself.
     */
    hide() {
        return this.links.hide();
    }

    /**
     * detailed information about all ranges and its segments.
     *
     * @returns An array of Ranges providing detailed information for each Range.
     */
    info(): Range[] {
        const rangeInfos = [];
        const multilink = this.links.getCollection();

        if (multilink) {
            const ranges = multilink.getRanges();
            ranges.forEach((range) => {
                rangeInfos.push(convertZone(range));
            });
        }
        return rangeInfos;
    };


    setStyleGroup(styleGroup) {
        this.links.setMLStyle(styleGroup);
    }
}
