/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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
import {JSUtils} from '@here/xyz-maps-common';
import oTools from '../features/oTools';

const WHITE = '#FFFFFF';
const RED = '#FF0000';
const BLACK = '#000000';
let UNDEF;

/**
 *  The interface that represents crossings(links cross with each other) and crossing candidates(another link is close
 *  enough to a shape point of this link, check {@link here.xyz.maps.editor.Editor.Config|intersectionScale})
 *
 *  @public
 *  @interface
 *  @class
 *  @expose
 *  @name here.xyz.maps.editor.features.Crossing
 */
function CrossingsInterface(HERE_WIKI, crossingTester, crossing) {
    const that = this;
    const overlay = HERE_WIKI.objects.overlay;
    const croLink = crossing.link;
    const croCandidate = crossing.candidate;
    const croSearchPnt = crossing.searchPnt;
    const croFoundPnt = crossing.foundPnt || croSearchPnt;
    const isCandidate = !!crossing.foundPnt;
    const minSize = 14;
    const pixelCenter = HERE_WIKI.map.getPixelCoord(crossing.cx, crossing.cy);
    let set;

    const connector1 = {
        'zIndex': 0,
        'type': 'Line',
        'stroke': RED,
        'strokeWidth': minSize + 8,
        'strokeLinecap': 'round',
        'opacity': .5
    };
    const connector2 = {
        'zIndex': 1,
        'type': 'Line',
        'stroke': WHITE,
        'strokeWidth': minSize + 4,
        'strokeLinecap': 'round',
        'opacity': .8
    };
    const connector3 = {
        'zIndex': 2,
        'type': 'Line',
        'stroke': BLACK,
        'strokeWidth': minSize,
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

    function getStrokeStyle(obj) {
        const style = HERE_WIKI.getStyle(obj);

        return style[0]['stroke'];
    }

    function createSet(searchPnt, foundPnt, searchLine, foundLine, simple) {
        const cs = crossingTester.cStyles;
        const searchStroke = getStrokeStyle(searchLine);
        const foundStroke = getStrokeStyle(foundLine);
        const extend = JSUtils.extend;

        extend(connector1, cs['connector1']);
        extend(connector2, cs['connector2']);
        extend(connector3, cs['connector3']);
        extend(search1, cs['search1']);
        extend(search2, {fill: searchStroke}, cs['search2']);
        extend(found, {fill: foundStroke, stroke: foundStroke}, cs['found']);

        function createPath(style) {
            return overlay.addPath([[searchPnt.x, searchPnt.y], [foundPnt.x, foundPnt.y]], style);
        }

        function createCircle(p, style) {
            return overlay.addCircle([p.x, p.y], style);
        }

        function mouseUpTrigger(ev) {
            HERE_WIKI.listeners.trigger(ev, simple);
        }

        // if the search or found link is not found, return UNDEF
        if (searchStroke && foundStroke) {
            const container = [
                createPath(connector1),
                createPath(connector2),
                createPath(connector3),
                createCircle(searchPnt, search1),
                createCircle(searchPnt, search2),
                createCircle(foundPnt, found)
            ];

            container.forEach((el) => {
                el.pointerup = mouseUpTrigger;
            });

            return container;
        }
    }

    function getLinkIndex() {
        return getIndex(croLink, croSearchPnt);
    }

    function getCandidateIndex() {
        return getIndex(croCandidate, croFoundPnt);
    }

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
     *  the feature class of the crossing. Can be either CROSSING or CROSSING_CANDIDATE.
     *
     *  @readonly
     *  @type {String}
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.features.Crossing#class
     */

    that.class = 'CROSSING' + (isCandidate ? '_CANDIDATE' : '');


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

    /**
     *  Position of this crossing or crossing candidate in Pixel on x axis.
     *
     *  @readonly
     *  @type {Number}
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.features.Crossing#x
     */
    that.x = pixelCenter[0];

    /**
     *  Position of this crossing or crossing candidate in Pixel on y axis.
     *
     *  @readonly
     *  @type {Number}
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.features.Crossing#y
     */
    that.y = pixelCenter[1];


    /**
     *  Get the NAVLINK object which is representing the link the current link will be connected to.
     *
     *  @function
     *  @return {here.xyz.maps.editor.features.Navlink}
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.features.Crossing#getRelatedLink
     */
    that.getRelatedLink = () => // related link means the link to which the selected link could be connected on crossing indicator
        croCandidate;

    /**
     *  The distance between two points which will be connected on current and related links.
     *
     *  @readonly
     *  @type {Number}
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.features.Crossing#distance
     */

    const croSearchPntPixel = HERE_WIKI.display.geoToPixel(
        croSearchPnt.x,
        croSearchPnt.y
    );
    const croFoundPntPixel = HERE_WIKI.display.geoToPixel(
        croFoundPnt.x,
        croFoundPnt.y
    );
    that.distance = getDistance(
        [croSearchPntPixel.x, croSearchPntPixel.y],
        [croFoundPntPixel.x, croFoundPntPixel.y]
    );
    // that.distance = crossing.distance;


    /**
     *  Connect the current link with the related link at this crossing or crossing candidate. After connecting the
     *  crossing, it will also recalculate crossings.
     *
     *  @function
     *  @return {Array<here.xyz.maps.editor.features.Crossing>}
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.features.Crossing#connect
     */
    that.connect = () => {
        // if the candidate or link is deleted or modified after the crossing is created, return, do nothing
        if (
            !croCandidate.id || !croLink.id || croCandidate.editState('removed') ||
            croCandidate.editState('modified') > crossingTester.createTS ||
            croLink.editState('removed') || croLink.editState('modified') > crossingTester.createTS
        ) {
            return false;
        }

        const candidateIndexBeforeSplit = getCandidateIndex();
        let splitInfo = {};
        const newLinks = [];
        let shp;
        let shpIndex;

        // add new shape for real crossings
        if (!isCandidate) {
            shp = oTools.addShp(
                croLink,
                HERE_WIKI.map.clipGeoCoord([croFoundPnt.x, croFoundPnt.y]),
                null,
                true
            );
        }
        ;

        shpIndex = isCandidate ? getLinkIndex() : shp;

        // before connecting candidates, mark all moved links that connecting to the shape point as modified
        // do not connect if the index can not be found
        if (getLinkIndex() !== false) {
            if (isCandidate) {
                croLink.getConnectedLinks(shpIndex).forEach((clink) => {
                    oTools.markAsModified(clink, false, false);
                });
            }

            splitInfo = oTools.connectShpToLink(
                croLink,
                shpIndex,
                croCandidate,
                HERE_WIKI.map.clipGeoCoord([croFoundPnt.x, croFoundPnt.y]),
                candidateIndexBeforeSplit,
                false,
                true
            );

            (splitInfo.splittedInto || []).forEach((splitChild) => {
                // only take not yet deleted(displayed) links for the update process.
                if (splitChild != null) {
                    newLinks.push(splitChild);
                }
            });
        }

        // line.autoFixGeometry = function( shapeToCheck, ignoreSplitChildren, preferShapeIndex ){

        // croLink.autoFixGeometry();
        // croLink.markAsModified( false );

        that.hide();

        for (const p in that) {
            if (p !== 'type') {
                that[p] = UNDEF;
            }
        }

        that.isDeleted = true;

        return crossingTester.getCrossings({
            links: newLinks,
            croLink: croLink
        });
    };

    /**
     *  Show this crossing or crossing candidate on the map.
     *
     *  @function
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.features.Crossing#show
     */
    that.show = () => {
        set = set || createSet(croSearchPnt, croFoundPnt, croLink, croCandidate, that);
        HERE_WIKI.objects.overlay.showFeature(set);
    };

    /**
     *  Hide this crossing or crossing candidate on the map.
     *
     *  @function
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.features.Crossing#hide
     */
    that.hide = () => {
        set && set.forEach((el) => {
            el._provider.removeFeature(el);
        });
        set = null;
    };

    /**
     *  Get the NAVLINK object which is representing the link this crossing or crossing candidate is located on.
     *
     *  @function
     *  @return {here.xyz.maps.editor.features.Navlink}
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.features.Crossing#getLink
     */
    that.getLink = () => croLink;


    /**
     *  Get NAVLINK objects which connect to this crossing or crossing candidate.
     *
     *  @function
     *  @return {Array<here.xyz.maps.editor.features.Navlink>}
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.features.Crossing#getConnectedLinks
     */
    that.getConnectedLinks = () => {
        return isCandidate ? croLink.getConnectedLinks(getLinkIndex()) : [];
    };
}

export default CrossingsInterface;
