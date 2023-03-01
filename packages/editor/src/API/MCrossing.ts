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

import {getSegmentIndex, getDistance} from '../geometry';
import oTools from '../features/link/NavlinkTools';
import {GeoJSONCoordinate, GeoJSONFeature} from '@here/xyz-maps-core';
import {Navlink} from '../features/link/Navlink';
import CrossingTester from '../tools/CrossingTester';
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

function getIndex(line: Navlink, point: GeoJSONCoordinate) {
    const path = line.coord();

    for (let i = 0; i < path.length; i++) {
        if (point[0] == path[i][0] && point[1] == path[i][1]) {
            return i;
        }
    }
    return getSegmentIndex(path, point);
}

/**
 *
 * The Crossing represents the intersection point of 2 Navlink geometries.
 * A Crossing feature is an indication for a Road Intersection an can be used to detect and create missing intersections in a road network.
 * In case of 2 Navlink geometries are located very close to each other (but not intersecting), the Crossing represents a "CROSSING_CANDIDATE".
 * The threshold for the candidate detection can be configured with {@link EditorOptions.intersectionScale}
 */
class Crossing implements GeoJSONFeature {
    type: string = 'Feature';
    /**
     *  the feature class of the crossing. Can be either CROSSING or CROSSING_CANDIDATE.
     */
    readonly class: xClass.CROSSING | xClass.CROSSING_CANDIDATE;

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
    };

    private readonly _: {
        set?: any,
        iEditor: InternalEditor,
        xTester: CrossingTester,
        link: Navlink,
        searchPnt: GeoJSONCoordinate,
        foundPnt: GeoJSONCoordinate,
        candidate: Navlink
    };

    private getLinkIndex() {
        let prv = this._;
        return getIndex(prv.link, prv.searchPnt);
    }

    private getCandidateIndex() {
        let prv = this._;
        return getIndex(prv.candidate, prv.foundPnt || prv.searchPnt);
    }

    constructor(xTester: CrossingTester, link: Navlink, candidate: Navlink, searchPnt: GeoJSONCoordinate, foundPnt?: GeoJSONCoordinate) {
        const that = this;
        const {iEditor} = xTester;
        const fPnt: GeoJSONCoordinate = foundPnt || searchPnt;
        const centerGeo = [
            (fPnt[0] - searchPnt[0]) / 2 + searchPnt[0],
            (fPnt[1] - searchPnt[1]) / 2 + searchPnt[1]
        ];
        const centerPixel = iEditor.map.getPixelCoord(centerGeo);

        this._ = {
            iEditor,
            xTester,
            link,
            candidate,
            searchPnt,
            foundPnt
        };

        this.x = centerPixel[0];
        this.y = centerPixel[1];

        const isCandidate = !!foundPnt;

        foundPnt = foundPnt || searchPnt;

        const croSearchPntPixel = iEditor.display.geoToPixel(searchPnt[0], searchPnt[1]);
        const croFoundPntPixel = iEditor.display.geoToPixel(foundPnt[0], foundPnt[1]);

        this.distance = getDistance(
            [croSearchPntPixel.x, croSearchPntPixel.y],
            [croFoundPntPixel.x, croFoundPntPixel.y]
        );

        this.class = isCandidate ? xClass.CROSSING_CANDIDATE : xClass.CROSSING;

        that.type = 'Feature';

        that.geometry = isCandidate ? {
            type: 'LineString',
            coordinates: [searchPnt, foundPnt]
        } : {
            type: 'Point',
            coordinates: centerGeo
        };
    }

    /**
     * Get the Navlink feature which is crossed or treated as a crossing candidate.
     */
    getRelatedLink(): Navlink {
        // related link means the link to which the selected link could be connected on crossing indicator
        return this._.candidate;
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
        const {iEditor, xTester} = prv;
        const croLink = this.getLink();

        if (
            !croCandidate.id || !croLink.id || croCandidate.editState('removed') ||
            croCandidate.editState('modified') > xTester.createTS ||
            croLink.editState('removed') || croLink.editState('modified') > xTester.createTS
        ) {
            return false;
        }
        const isCandidate = this.class == xClass.CROSSING_CANDIDATE;
        const candidateIndexBeforeSplit = this.getCandidateIndex();
        const croFoundPnt = (prv.foundPnt || prv.searchPnt).slice();
        const newLinks = [];
        let shpIndex;
        let shp;

        // add new shape for real crossings
        if (!isCandidate) {
            shp = oTools.addShp(
                croLink,
                iEditor.map.clipGeoCoord(croFoundPnt),
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
                iEditor.map.clipGeoCoord(croFoundPnt),
                typeof candidateIndexBeforeSplit == 'number' ? candidateIndexBeforeSplit : UNDEF
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

        return xTester.getCrossings({links: newLinks, croLink: croLink});
    };

    /**
     * Show the crossing on the map.
     */
    show() {
        const crossing = this;
        const prv = crossing._;
        const {iEditor, xTester} = prv;
        const overlay = iEditor.objects.overlay;

        const createSet = (searchPnt, foundPnt, searchLine, foundLine) => {
            const cs = xTester.getStyle();
            const searchStroke = iEditor.getStyle(searchLine)[0].stroke;
            const foundStroke = iEditor.getStyle(foundLine)[0].stroke;
            const createPath = (style) => overlay.addPath([searchPnt, foundPnt], style);
            const createCircle = (p, style) => overlay.addCircle(p, style);
            const mouseUpTrigger = (ev) => iEditor.listeners.trigger(ev, crossing);

            const altitude = iEditor.getStyleProperty(searchLine, 'altitude');

            // if the search or found link is not found, return UNDEF
            if (searchStroke && foundStroke) {
                const container = [
                    createPath({...connector1, ...cs['connector1'], altitude}),
                    createPath({...connector2, ...cs['connector2'], altitude}),
                    createPath({...connector3, ...cs['connector3'], altitude}),
                    createCircle(searchPnt, {...search1, ...cs['search1'], altitude}),
                    createCircle(searchPnt, {...search2, fill: searchStroke, ...cs['search2'], altitude}),
                    createCircle(foundPnt, {...found, fill: foundStroke, stroke: foundStroke, ...cs['found'], altitude})
                ];
                container.forEach((el) => (<any>el).pointerup = mouseUpTrigger);
                return container;
            }
        };
        const croFoundPnt = prv.foundPnt || prv.searchPnt;
        const set = prv.set = prv.set || createSet(prv.searchPnt, croFoundPnt, this.getLink(), this.getRelatedLink());
        iEditor.objects.overlay.showFeature(set);
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
        return this._.link;
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
