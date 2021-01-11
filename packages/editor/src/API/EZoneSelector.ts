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

let UNDEF;


type ZoneSegment = {
    link: Navlink
    from: number;
    to: number;
    reversed: boolean;
}

/**
 * A zone represents a part/subsegment on a line geometry or multiple line geometries.
 * Its used by the ZoneSelector utility. {@link editor.ZoneSelector}
 */
export class Zone {
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
    from: number;
    /**
     * Relative end position on the line geometry.
     * 0.5 -> 50% -> middle, 1 -> 100% -> end
     * @default 1.0
     */
    to: number;
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
     * onChange callback providing detailed information about current state of the Zone.
     */
    onChange?: (ZoneSegments: ZoneSegment[]) => void;
    /**
     * A zone can consist of several segments.
     * A Segment provides detailed information on the affected Navlinks:
     * @example
     * ```
     * {
     *  link: Navlink
     *  from: number;
     *  to: number;
     *  reversed: boolean;
     * }
     * ```
     */
    segments: ZoneSegment[]

    markerStyle?;
    lineStyle?;

    constructor() {
    }
}


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

    private generateZoneSegments(zone) {
        const info = [];
        this.links.getCollection().getZoneSegments(zone).forEach((segment) => {
            info.push({
                'Link': segment[0],
                'from': segment[1],
                'to': segment[2],
                'reversed': segment[3]
            });
        });
        return info;
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
     * Adds and displays zones for editing.
     *
     * @param zone - display single or multiple zones at the geometry of the Navlink(s).
     */
    show(zone: Zone) {
        const zones = this.zones = zone instanceof Array ? zone : [].slice.call(arguments);

        zones.forEach((zone) => {
            const onChange = zone['onChange'];

            zone['from'] = zone['from'] || 0;

            zone['to'] = (zone['to'] == UNDEF ? 1 : zone['to']) || 0;


            for (let name of ['markerStyle', 'lineStyle']) {
                let style = zone[name];
                if (style && !Array.isArray(style)) {
                    zone[name] = [style];
                }
            }

            if (onChange) {
                zone['onChange'] = (zone) => {
                    onChange(this.generateZoneSegments(zone));
                };
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
     * @return  Array of Zones providing detailed information for each Zone.
     */
    info(): Zone[] {
        const zoneInfos = [];
        const multilink = this.links.getCollection();

        if (multilink) {
            const _zones = multilink.getZones();
            _zones.forEach((zone) => {
                const publicZone = zone._zone;
                publicZone['segments'] = this.generateZoneSegments(zone);
                zoneInfos.push(publicZone);
            });
        }

        return zoneInfos;
    };


    setStyleGroup(styleGroup) {
        this.links.setMLStyle(styleGroup);
    }
}
