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

import {getSegmentIndex, getDistance} from '../geometry';
import oTools from '../features/oTools';
import {GeoJSONCoordinate, GeoJSONFeature} from '@here/xyz-maps-core';
import {Navlink} from '@here/xyz-maps-editor';
import InternalEditor from '../IEditor';


enum xClass {
    CROSSING = 'CROSSING',
    CROSSING_CANDIDATE = 'CROSSING_CANDIDATE'
}

const WHITE = '#FFFFFF';
const RED = '#FF0000';
const BLACK = '#000000';

const connector1 = {
    'zIndex': 0,
    'type': 'Line',
    'stroke': RED,
    'strokeWidth': 14 + 8,
    'strokeLinecap': 'round',
    'opacity': .5
};
const connector2 = {
    'zIndex': 1,
    'type': 'Line',
    'stroke': WHITE,
    'strokeWidth': 14 + 4,
    'strokeLinecap': 'round',
    'opacity': .8
};
const connector3 = {
    'zIndex': 2,
    'type': 'Line',
    'stroke': BLACK,
    'strokeWidth': 14,
    'strokeLinecap': 'round',
    'opacity': .8
};
const search1 = {
    'zIndex': 3,
    'type': 'Circle',
    'stroke': RED,
    'strokeWidth': 1,
    'opacity': .5,
    'radius': 12,
    'fill': RED
};
const search2 = {
    'zIndex': 4,
    'type': 'Circle',
    'stroke': WHITE,
    'strokeWidth': 2,
    'opacity': 1,
    'radius': 10,
    'fill': WHITE
};
const found = {
    zIndex: 5,
    type: 'Circle',
    stroke: WHITE,
    radius: 3,
    fill: WHITE
};

let UNDEF;

function getIndex(lnk, pnt) {
    const path = lnk.coord();

    for (let i = 0; i < path.length; i++) {
        if (pnt.x == path[i][0] && pnt.y == path[i][1]) {
            return i;
        }
    }
    return getSegmentIndex(path, [pnt.x, pnt.y]);
}

/**
 *
 * The Crossing represents the intersection point of 2 Navlink geometries.
 * A Crossing feature is an indication for a Road Intersection an can be used to detect and create missing intersections in a road network.
 * In case of 2 Navlink geometries are located very close to each other (but not intersecting), the Crossing represents a "CROSSING_CANDIDATE".
 * The threshold for the candidate detection can be configured with {@link EditorOptions.intersectionScale}
 */
class Crossing implements GeoJSONFeature {
    type: 'Feature';
    /**
     *  the feature class of the crossing. Can be either CROSSING or CROSSING_CANDIDATE.
     */
    readonly class: xClass.CROSSING | xClass.CROSSING_CANDIDATE

    /**
     * the x coordinate of the crossing on screen in pixel.
     * @deprecated use display.geoToPixel to project the geographical coordinates of the crossing to pixels on screen.
     */
    readonly x: number;

    /**
     * the y coordinate of the crossing on screen in pixel.
     * @deprecated use display.geoToPixel to project the geographical coordinates of the crossing to pixels on screen.
     */
    readonly y: number;

    /**
     * The distance between two points which will be connected on current and related links.
     */
    readonly distance: number;

    /**
     * The geometry of the Crossing feature.
     */
    geometry: {
        /**
         * The type of the geometry.
         * For "CROSSINGS" the type is "Point", for "CROSSING_CANDIDATE" its "LineString".
         */
        type: 'Point' | 'LineString',
        /**
         * The coordinates of the crossing feature.
         */
        coordinates: GeoJSONCoordinate | GeoJSONCoordinate[]
    }

    private _: {
        set?: any,
        iEdit: any,
        xTest: any,
        x: any;
    }

    private getLinkIndex() {
        let {x} = this._;
        return getIndex(x.link, x.searchPnt);
    }

    private getCandidateIndex() {
        let {x} = this._;
        return getIndex(x.candidate, x.foundPnt || x.searchPnt);
    }

    constructor(HERE_WIKI: InternalEditor, crossingTester, crossing) {
        const that = this;
        this._ = {
            iEdit: HERE_WIKI,
            xTest: crossingTester,
            x: crossing
        };
        const pixelCenter = HERE_WIKI.map.getPixelCoord(crossing.cx, crossing.cy);

        this.x = pixelCenter[0];
        this.y = pixelCenter[1];

        const croSearchPnt = crossing.searchPnt;
        const croFoundPnt = crossing.foundPnt || croSearchPnt;
        const isCandidate = !!crossing.foundPnt;


        const croSearchPntPixel = HERE_WIKI.display.geoToPixel(croSearchPnt.x, croSearchPnt.y);
        const croFoundPntPixel = HERE_WIKI.display.geoToPixel(croFoundPnt.x, croFoundPnt.y);
        this.distance = getDistance(
            [croSearchPntPixel.x, croSearchPntPixel.y],
            [croFoundPntPixel.x, croFoundPntPixel.y]
        );

        this.class = isCandidate ? xClass.CROSSING_CANDIDATE : xClass.CROSSING;

        that.type = 'Feature';

        that.geometry = isCandidate ? {
            type: 'LineString',
            coordinates: [
                [croSearchPnt.x, croSearchPnt.y],
                [croFoundPnt.x, croFoundPnt.y]
            ]
        } : {
            type: 'Point',
            coordinates: [crossing.cx, crossing.cy]
        };
    }

    /**
     * Get the Navlink feature which is the crossed or treated as a crossing candidate.
     */
    getRelatedLink(): Navlink {
        // related link means the link to which the selected link could be connected on crossing indicator
        return this._.x.candidate;
    }

    /**
     * Connects the related Navlink features and creates an intersection.
     *
     * @returns Resulting array of new Crossing due to road network changes or false if none crossing is detected.
     */
    connect(): Crossing[] | false {
        // if the candidate or link is deleted or modified after the crossing is created, return, do nothing
        const croCandidate = this.getRelatedLink();
        const prv = this._;
        const {iEdit, xTest} = prv;
        const croLink = this.getLink();

        if (
            !croCandidate.id || !croLink.id || croCandidate.editState('removed') ||
            croCandidate.editState('modified') > xTest.createTS ||
            croLink.editState('removed') || croLink.editState('modified') > xTest.createTS
        ) {
            return false;
        }
        const isCandidate = this.class == xClass.CROSSING_CANDIDATE;
        const candidateIndexBeforeSplit = this.getCandidateIndex();
        const croFoundPnt = prv.x.foundPnt || prv.x.searchPnt;
        const newLinks = [];
        let shpIndex;
        let shp;

        // add new shape for real crossings
        if (!isCandidate) {
            shp = oTools.addShp(
                croLink,
                iEdit.map.clipGeoCoord([croFoundPnt.x, croFoundPnt.y]),
                null,
                true
            );
        }

        shpIndex = isCandidate ? this.getLinkIndex() : shp;

        // before connecting candidates, mark all moved links that connecting to the shape point as modified
        // do not connect if the index can not be found
        if (this.getLinkIndex() !== false) {
            if (isCandidate) {
                croLink.getConnectedLinks(shpIndex).forEach((clink) => {
                    oTools.markAsModified(clink, false, false);
                });
            }

            let splitInfo = oTools.connectShpToLink(
                croLink,
                shpIndex,
                croCandidate,
                iEdit.map.clipGeoCoord([croFoundPnt.x, croFoundPnt.y]),
                candidateIndexBeforeSplit,
                true
            );

            (splitInfo.splittedInto || []).forEach((splitChild) => {
                // only take not yet deleted(displayed) links for the update process.
                if (splitChild != null) {
                    newLinks.push(splitChild);
                }
            });
        }

        this.hide();

        for (const p in this) {
            if (p !== 'type') {
                this[p] = UNDEF;
            }
        }

        // @ts-ignore
        // this.isDeleted = true;

        return xTest.getCrossings({links: newLinks, croLink: croLink});
    };

    /**
     * Show the crossing on the map.
     */
    show() {
        const crossing = this;
        const prv = crossing._;
        const {iEdit, xTest} = prv;
        const overlay = iEdit.objects.overlay;

        const createSet = (searchPnt, foundPnt, searchLine, foundLine) => {
            const cs = xTest.cStyles;
            const searchStroke = this._.iEdit.getStyle(searchLine)[0].stroke;
            const foundStroke = this._.iEdit.getStyle(foundLine)[0].stroke;
            const createPath = (style) => overlay.addPath([[searchPnt.x, searchPnt.y], [foundPnt.x, foundPnt.y]], style);
            const createCircle = (p, style) => overlay.addCircle([p.x, p.y], style);
            const mouseUpTrigger = (ev) => iEdit.listeners.trigger(ev, crossing);

            // if the search or found link is not found, return UNDEF
            if (searchStroke && foundStroke) {
                const container = [
                    createPath({...connector1, ...cs['connector1']}),
                    createPath({...connector2, ...cs['connector2']}),
                    createPath({...connector3, ...cs['connector3']}),
                    createCircle(searchPnt, {...search1, ...cs['search1']}),
                    createCircle(searchPnt, {...search2, fill: searchStroke, ...cs['search2']}),
                    createCircle(foundPnt, {...found, fill: foundStroke, stroke: foundStroke, ...cs['found']})
                ];
                container.forEach((el) => el.pointerup = mouseUpTrigger);
                return container;
            }
        };
        const croFoundPnt = prv.x.foundPnt || prv.x.searchPnt;
        const set = prv.set = prv.set || createSet(prv.x.searchPnt, croFoundPnt, this.getLink(), this.getRelatedLink());
        iEdit.objects.overlay.showFeature(set);
    };

    /**
     * Hide the crossing on the map.
     */
    hide() {
        const prv = this._;
        const set = prv.set;
        set && set.forEach((el) => {
            el._provider.removeFeature(el);
        });
        prv.set = null;
    }

    /**
     * Get the Navlink feature of which the crossing belongs to.
     */
    getLink(): Navlink {
        return this._.x.link;
    }

    /**
     * Get all connected Navlink features which are connected (Intersection) to the related link that is treated as crossing candidate.
     * This method affects Crossings of type "CROSSING_CANDIDATE" only.
     */
    getConnectedLinks(): Navlink[] {
        return this.class == xClass.CROSSING_CANDIDATE ?
            this.getLink().getConnectedLinks(<number> this.getLinkIndex())
            : [];
    }
}

export {Crossing};
