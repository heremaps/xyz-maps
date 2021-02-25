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
import MultiSelector from '../tools/ZoneSelection/MultiSelector';
import InternalEditor from '../IEditor';

import {Navlink} from '../features/link/NavLink';
import {Zone as InternalZone} from '../tools/ZoneSelection/Zone';
import {MapEvent} from '@here/xyz-maps-display';
import EventHandler from '../handlers/EventHandler';
import {EditorEvent} from './EditorEvent';

let UNDEF;

/**
 * A ZoneSegment is the part of a "Zone" that`s located at a specific Navlink.
 */
export type ZoneSegment = {
    /**
     * The Navlink the ZoneSegment is located at.
     */
    navlink: Navlink
    /**
     * Relative start position on the geometry of the Navlink.
     * 0 -> 0% -> start, 0.5 -> 50% -> middle, 1 -> 100% -> end
     */
    from: number;
    /**
     * Relative end position on the geometry of the Navlink.
     * 0.5 -> 50% -> middle, 1 -> 100% -> end
     */
    to: number;
    /**
     * The indicates if the direction of travel of the Navlink is in reverse order, compared to the direction of travel of the first Navlink that's has been added of the ZoneSelector.
     */
    reversed: boolean;
}

/**
 * A zone represents a part/subsegment on a line geometry or multiple line geometries.
 * Its used by the ZoneSelector utility. {@link editor.ZoneSelector}
 */
export interface Zone {
    /**
     * Optional identifier of the Zone
     */
    id?: string | number;
    /**
     * Side of the Zone. Relative to the direction of travel of the line geometry.
     * "L" | "R" | "B" -> Left, Right or Both sides.
     *
     * @default "B"
     */
    side?: 'L' | 'R' | 'B';
    /**
     * Relative start position on the line geometry.
     * 0 -> 0% -> start, 0.5 -> 50% -> middle, 1 -> 100% -> end
     * @default 0.0
     */
    from?: number;
    /**
     * Relative end position on the line geometry.
     * 0.5 -> 50% -> middle, 1 -> 100% -> end
     * @default 1.0
     */
    to?: number;
    /**
     * lock the zone and prevent dragging/editing of the Zone.
     */
    locked?: boolean;
    /**
     * Apply custom styling of Zone.
     * Objects of key value pairs.
     */
    style?: any;
    /**
     * Set an event listener that will be called when a zone drag starts.
     *
     * @param event The respective event.
     * The {@link Zone} is provided in the detail property of the event. (event.detail.zone)
     */
    dragStart?: (event: EditorEvent) => void;
    /**
     * Set an event listener that will be called when a zone is dragged.
     *
     * @param event The respective event.
     * The {@link Zone} is provided in the detail property of the event. (event.detail.zone)
     */
    dragMove?: (event: EditorEvent) => void;
    /**
     * Set an event listener that will be called when a zone drag has been finished.
     *
     * @param event The respective event.
     * The {@link Zone} is provided in the detail property of the event. (event.detail.zone)
     */
    dragStop?: (event: EditorEvent) => void;
    /**
     * A zone can consist of several segments.
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
    readonly segments: ZoneSegment[]

    markerStyle?;
    lineStyle?;
}

const convertZone = (zone: InternalZone): Zone => {
    const {id, from, to, side, style} = zone.options;
    return {id, from, to, side, style, segments: zone.segments};
};

/**
 * The ZoneSelector is a tool to create and modify Zones on a single geometry or multiple line geometries.
 * A Zone represents a part/subsegment on a line geometry or multiple line geometries and allows separate attribution.
 */
export class ZoneSelector {
    private links: MultiSelector;
    private zones: [];

    constructor(iEditor: InternalEditor) {
        this.links = new MultiSelector(iEditor);
    }

    /**
     * Add Navlink(s) to ZoneSelector tool.
     *
     * @param links - a single or multiple Navlinks to add. Multiple Navlinks must be linked.
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
     * Add and show a Zone. A Zone can be located on a single or multiple Navlink(s).
     *
     * @param zone - The zone that should be displayed.
     */
    show(zone: Zone) {
        const zones = this.zones = zone instanceof Array ? zone : [].slice.call(arguments);

        zones.forEach((zone) => {
            zone['from'] = zone['from'] || 0;
            zone['to'] = (zone['to'] == UNDEF ? 1 : zone['to']) || 0;

            for (let name of ['markerStyle', 'lineStyle']) {
                let style = zone[name];
                if (style && !Array.isArray(style)) {
                    zone[name] = [style];
                }
            }

            for (let type of ['dragStart', 'dragMove', 'dragStop']) {
                const listener = zone[type];
                if (listener) {
                    zone[type] = (e: MapEvent, zone: InternalZone) => {
                        e.detail.zone = convertZone(zone);
                        listener(EventHandler.createEditorEvent(e, e.target, type));
                    };
                }
            }
        });

        this.links.show(zones);
    };

    /**
     * hides all Zones and the Zoneselecor tool itself.
     */
    hide() {
        return this.links.hide();
    }

    /**
     * detailed information about all zones and its segments.
     *
     * @returns An array of Zones providing detailed information for each Zone.
     */
    info(): Zone[] {
        const zoneInfos = [];
        const multilink = this.links.getCollection();

        if (multilink) {
            const zones = multilink.getZones();
            zones.forEach((zone) => {
                zoneInfos.push(convertZone(zone));
            });
        }
        return zoneInfos;
    };


    setStyleGroup(styleGroup) {
        this.links.setMLStyle(styleGroup);
    }
}
