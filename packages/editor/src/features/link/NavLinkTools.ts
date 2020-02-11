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

import {isCoordinateDuplicate, getPointAtLength, getTotalLength, getPntAt, getSegmentIndex} from '../../geometry';
import {calcRelPosOfPoiAtLink} from '../../map/GeoMath';
import locTools from '../location/LocationTools';
import LinkShape from './Shape';
import VirtualLinkShape from './VirtualShape';
import {geotools} from '@here/xyz-maps-common';
import {JSUtils} from '@here/xyz-maps-common';
import Navlink from './Navlink';
import {EditStates} from '../feature/Feature';

type BBox = [number, number, number, number];
type Coordinate = [number, number, number?];

type LocationId = string | number;

class ConnectLinksResult {
    targetSplittedInto?: [Navlink, Navlink];
    splittedInto?: [Navlink, Navlink];
};

let UNDEF;


const getPrivate = (feature, name?: string) => {
    let prv = feature.__;

    if (!prv) {
        prv = feature.__ = {

            isSelected: false,
            isEditable: true,
            allowEdit: true,

            shps: [],
            vShps: [],

            isHovered: null,

            _cPnt: null,
            arrows: null,
            prevBBox: null,
            isGeoMod: false,

            dh: null, // direction hint
            xt: null // crossing tester
        };
    }

    return name ? prv[name] : prv;
};


//* ***************************************************** PRIVATE ******************************************************

function _props(line: Navlink, props?) {
    const aLen = arguments.length;
    const userProps = line.getProvider().getFeatureProperties(line);

    if (aLen > 1) {
        if (aLen == 2 && typeof props == 'string') {
            return userProps[props];
        }

        if (aLen == 3) {
            const key = props;
            props = {};
            props[key] = arguments[2];
        }

        line._e().objects.history.origin(line);

        JSUtils.extend(userProps, props);
    }

    return userProps;
}


const isCPoiSelected = (line: Navlink) => {
    const pois = tools.getConnectedObjects(line);

    for (let i = 0; i < pois.length; i++) {
        if (locTools.private(pois[i], 'isSelected')) {
            return true;
        }
    }
};

function handleEvent(ev) {
    const line = this;
    const type = ev.type;

    if (
        getPrivate(line, 'allowEdit') &&
        line._e()._config['featureSelectionByDefault'] && (
            // type == 'click'     ||
            (type == 'dbltap' || type == 'pointerup')
            // || type == 'mouseup' ||type == 'pressup'
        )
    ) {
        tools._select(line);
    }

    line._e().listeners.trigger(ev, line);
}

function triggerDisplayRefresh(line: Navlink, editStates?: {}) {
    if (editStates) {
        for (let s in editStates) {
            line.editState(<EditStates>s, editStates[s]);
        }
    }


    line._e().setStyle(line, UNDEF);
}

function storeConnectedPoints(line) {
    const prv = getPrivate(line);
    const prevBBox = prv.prevBBox = prv.prevBBox || line.bbox.slice();

    // store connected poi/addresses before geometry change to make sure they get modified after geo changed.
    // in case of link bbox and poi bbox doesn't intersect anymore...

    return tools.getConnectedObjects(line,
        geotools.mergeBBoxes(prevBBox, line.bbox)
    );
}

function changeGeometry(line, path: Coordinate[]) {
    getPrivate(line).isGeoMod = true;

    line._e().objects.history.origin(line);

    line._provider.setFeatureCoordinates(line, path);
}

function rearrangeBlockedNodes(line, index) {
    // fix blockednode indexes
    const bn = _props(line, 'bn') || [];

    for (let i = 0; i < bn.length; i++) {
        bn[i] += bn[i] >= index;
    }
}

function clearShp(line, shp) {
    line._e().objects.overlay.remove(shp);

    if (shp.class) {
        for (const m in shp) {
            if (
                m != 'id' &&
                m != 'type' &&
                m != 'class' &&
                m != 'properties' &&
                m != 'geometry'
            ) {
                shp[m] = UNDEF;
            }
        }

        shp['isDeleted'] = true;
    }
}

function updateOverlapping(shp, ol) {
    const wasOverlapping = shp.__.ol;

    shp.properties['isOverlapping'] = ol;

    if (wasOverlapping != (shp.__.ol = ol)) {
        // tirgger display refresh if needed.
        shp.getLink()._e().setStyle(shp, UNDEF);
    }
}

function triggerFeatureUnselected(EDITOR) {
    EDITOR.listeners.trigger('featureUnselected', {'featureUnselected': true});
}

//* ************************************************** EVENTLISTENERS **************************************************

function onPointerEnter(ev) {
    const line = this;
    const prv = getPrivate(line);

    if (prv.allowEdit) {
        document.body.style.cursor = 'Pointer';

        prv.isHovered = ev;

        handleEvent.call(line, ev);

        triggerDisplayRefresh(line, {'hovered': true});
    }
}

function onPointerLeave(ev) {
    const line = this;
    const prv = getPrivate(line);

    if (prv.allowEdit) {
        document.body.style.cursor = 'default';

        handleEvent.call(line, ev);

        if (
            !prv.isSelected && !isCPoiSelected(line)
        ) {
            triggerDisplayRefresh(line, {'hovered': false});
        }

        prv.isHovered = null;
    }
}


var tools = {


    private: getPrivate,

    _evl: {

        pointerenter: onPointerEnter,

        pointerleave: onPointerLeave,

        dbltap: handleEvent,

        pointerup: handleEvent

    },


    //* ************************************************** Internal only **************************************************

    deHighlight: function(line) {
        if (getPrivate(line, 'isSelected')) {
            // line.toggleHover( line.allowEdit );

            triggerDisplayRefresh(line, {'selected': false, 'hovered': false});

            tools.removeShapePnts(line);
            tools.hideDirection(line);
        }

        return line;
    },

    _editable: function(line: Navlink, editable: boolean) {
        const prv = getPrivate(line);

        if (editable != prv.allowEdit) {
            if (!editable) {
                const isHovered = prv.isHovered;

                if (isHovered) {
                    isHovered.type = 'mouseout';

                    onPointerLeave.call(isHovered.target, isHovered);
                }

                tools.deHighlight(line);
            }

            prv.allowEdit = editable;
        }
    },

    _select: function(line: Navlink) {
        if (!getPrivate(line, 'isSelected')) {
            line._e().objects.selection.select(line);

            line._e().dump(line, 'info');

            tools.refreshGeometry(line);
        }
    },

    _setCoords: function(line: Navlink, coords) {
        let len = coords.length;

        while (len--) {
            coords[len][2] = coords[len][2] || 0;
        }

        storeConnectedPoints(line);

        changeGeometry(line, coords);

        tools.refreshGeometry(line);
    },

    markAsRemoved: function(line: Navlink) {
        line._e().hooks.trigger('Feature.remove', {feature: line}, line.getProvider());

        line.editState('removed', Date.now());

        tools.hideDirection(line);

        // remove connections of all connected objects
        storeConnectedPoints(line).forEach((cObj) => {
            locTools.disconnect(cObj);
        });

        tools._editable(line, false);

        const p = line.coord();
        // use slice to drop and ignore zLevel to duplicate detection
        const p1 = p[0].slice(0, 2);
        const p2 = p[p.length - 1].slice(0, 2);

        // is singlpoint geo just shift to prevent service from blocking with 409
        if (isCoordinateDuplicate(p1, p2)) {
            p[0][0] += .00001;
            p[0][1] += .00001;

            changeGeometry(line, p);
        }
    },

    markAsModified: function(line: Navlink, saveView: boolean = true, visualize: boolean = true) {
        // if (saveView === UNDEF) {
        //     saveView = true;
        // }
        // if (visualize === UNDEF) {
        //     visualize = true;
        // }

        const wasAlreadyModded = line.editState('modified');
        const prv = getPrivate(line);

        line.editState('modified', Date.now());

        if (prv.isGeoMod) {
            const coordinates = line.coord();

            storeConnectedPoints(line).forEach((cObj) => {
                const nrp = getPointAtLength(
                    coordinates,
                    getTotalLength(coordinates) *
                    calcRelPosOfPoiAtLink(coordinates, locTools.getRoutingPosition(cObj)).offset
                );

                // connect to the line with new routing point when the link geometry is changed
                locTools.connect(cObj, line, nrp);
            });

            prv.isGeoMod = false;
        }

        if (!wasAlreadyModded) {
            triggerDisplayRefresh(line);

            if (!prv.isSelected && visualize) {
                tools.defaults(line);
            }
        }

        if (saveView) {
            line._e().objects.history.saveChanges();
        }

        return line;
    },


    //* ****************************************** protected link/shape only *******************************************

    _props: _props,

    getConnectedObjects: function(link: Navlink, extendedBBox?: BBox) {
        // not working if poi is located ouside of link's bbox
        return link._e().objects.getInBBox(extendedBBox || link.bbox)
            .filter((el) => {
                const featureClass = el.class;

                if (featureClass == 'PLACE' || featureClass == 'ADDRESS') {
                    return el.getLink() == link;
                }
            });
    },

    refreshGeometry: function(line: Navlink) {
        tools.removeShapePnts(line);

        if (getPrivate(line, 'isSelected')) {
            tools.displayAsSelected(line);
            tools.showDirection(line);
            tools.createShapes(line);
            tools.createAddShapePnts(line);
        }
    },

    checkOverlapping(line: Navlink, index?: number) {
        const path = line.coord();
        const allShapes = index == UNDEF;
        const start = allShapes
            ? 1
            : index;
        let stop = allShapes
            ? path.length - 1
            : start + 1;
        const overlapping = [];

        if (stop == path.length) {
            stop--;
        }

        const links = line._e().objects.getInBBox(line.bbox, line.getProvider());
        let len = links.length;
        let link;

        while (len--) {
            link = links[len];

            if (link.id != line.id && link.class == 'NAVLINK') {
                for (let i = start; i < stop; i++) {
                    for (let j = 0, p = link.coord(); j < p.length; j++) {
                        if (path[i][0] == p[j][0] && path[i][1] == p[j][1]) {
                            overlapping.push(i);

                            break;
                        }
                    }
                }
            }
        }

        return allShapes ? overlapping : !!overlapping.pop();
    },

    createLinkShape: function(line: Navlink, coordinate, i) {
        return line._e().objects.overlay.addFeature(
            new LinkShape(line, coordinate, i, tools)
        );
    },

    createShapes: function(line: Navlink) {
        const shapePnts = getPrivate(line, 'shps');
        const path = line.geometry.coordinates;
        // line.getPath(),
        const length = path.length;


        if (!line.editState('removed')) {
            const isOverlapping = tools.checkOverlapping(line);

            if (!shapePnts.length) {
                for (let i = 0; i < length; i++) {
                    // const shp = new LinkShape(line, [path[i][0], path[i][1]], i, tools);

                    const shp = tools.createLinkShape(line, [path[i][0], path[i][1]], i);

                    updateOverlapping(shp, (<number[]>isOverlapping).indexOf(i) >= 0);

                    shapePnts[i] = shp;
                }
            } else {
                // manual force indecies refresh
                shapePnts.forEach((s, i) => {
                    debugger;
                    s.__.cLinks = line.getConnectedLinks(i, true);
                });
            }
        }
    },

    createAddShapePnts: function(line: Navlink) {
        const addShapePnts = getPrivate(line, 'vShps');

        if (!addShapePnts.length && !line.editState('removed') && !line._e()._config.editRestrictions(line, 1)) {
            const path = line.geometry.coordinates;

            for (let i = 1, p1, p2; i < path.length; i++) {
                p1 = path[i - 1];
                p2 = path[i];

                addShapePnts.push(
                    line._e().objects.overlay.addFeature(
                        new VirtualLinkShape(line, getPntAt(p1, p2, .5), i, tools)
                    )
                );
            }
        }
    },


    removeShapePnts: function(line: Navlink, onlyAddShps?: boolean, id?: string) {
        function clearShapes(shapes) {
            for (let i = 0; i < shapes.length; i++) {
                if (shapes[i].id != id) {
                    clearShp(line, shapes[i]);
                }
            }
            shapes.length = 0;
        }

        const prv = getPrivate(line);
        const addShapes = prv.vShps;

        if (!onlyAddShps) {
            clearShapes(prv.shps);
        }

        if (addShapes.length || onlyAddShps) {
            clearShapes(addShapes);
        }

        return line;
    },

    moveShapeAtIndexTo: function(line: Navlink, index: number, x: number, y: number, skipCLinks?: boolean) {
        const path = line.coord();
        const shapePnts = getPrivate(line, 'shps');

        path[index][0] = x;
        path[index][1] = y;

        storeConnectedPoints(line);

        changeGeometry(line, path);

        tools.hideDirection(line);

        const shp = shapePnts[index];

        // if line is active also move the shape object
        if (!skipCLinks && shp) {
            line._e().objects.overlay.setFeatureCoordinates(shp, [x, y]);

            shp.__.cLinks.forEach((clinkData) => {
                let clink = clinkData.link;
                let isGeoModAllowed = !line._e()._config.editRestrictions(clink, 1);
                if (isGeoModAllowed) {
                    tools.moveShapeAtIndexTo(clink, clinkData.index, x, y);
                }
            });
            // update shape overlapping
            updateOverlapping(shp, tools.checkOverlapping(line, index));
        }

        return path;
    },

    //* **************************************** public area/link only ****************************************
    deleteShape: function(line: Navlink, shape: number | LinkShape, ignoreCheck?: boolean) {
        const index = typeof shape == 'number'
            ? shape
            : shape.getIndex();
        const path = line.coord();

        if (path.length > 2) {
            path.splice(index, 1);

            const prv = getPrivate(line);
            const shapes = prv.shps;

            if (shapes.length) {
                clearShp(line, shapes[index]);

                shapes.splice(index, 1);

                shapes.forEach((shp) => {// set new correct index
                    shp.__.index -= Number(shp.getIndex() >= index);
                });
            }

            storeConnectedPoints(line);

            changeGeometry(line, path);

            if (!ignoreCheck) {
                tools.markAsModified(line);
            }

            if (prv.isSelected) {
                tools.refreshGeometry(line);
            }
        }
    },
    // also used by transformer
    showDirection: function(line: Navlink) {
        if (!line.editState('removed')) {
            const dir = ('' + line.getProvider().readDirection(line)).toUpperCase();
            let path;
            let p1;
            let p2;
            let rotation;
            let angle;

            tools.hideDirection(line);

            if (dir == 'START_TO_END') rotation = 90;
            else if (dir == 'END_TO_START') rotation = -90;

            if (rotation != UNDEF) {
                const prv = getPrivate(line);
                const arrows = prv['arrows'] = [];

                path = line.geometry.coordinates;

                for (let i = 0; i < path.length - 1; i++) {
                    p1 = path[i];
                    p2 = path[i + 1];

                    angle = geotools.calcBearing(p1, p2) - rotation;

                    arrows.push(
                        line._e().objects.overlay.addPoint(getPntAt(p1, p2, .5), {
                            type: 'NAVLINK_DIRECTION',
                            bearing: angle
                        })
                    );
                }
            }
        }
        return line;
    },

    // also used by location
    displayAsSelected: function(line: Navlink, selected?: LocationId, skipToggleHover?: boolean) {
        const prv = getPrivate(line);

        if (!prv.isSelected) {
            prv._cPnt = selected;
        }

        triggerDisplayRefresh(line, {'selected': true});

        // if (!skipToggleHover) {
        //     console.warn('NEED TO HANDLE TOGGLE HOVER!');
        //     // tools.toggleHover( line, false );
        // }
    },

    //* ********************************************** public **********************************************

    addShp: function(line: Navlink, pos, index, newShapeIdxOnly, force, preferSegment?) {
        const path = line.coord();
        const EDITOR = line._e();
        const intersec = EDITOR.map.calcCrossingAt(path, pos, EDITOR._config['minShapeDistance'], preferSegment);

        index = typeof index == 'number'
            ? index
            : intersec.index;

        if (!intersec.existingShape || force) {
            // if existing shape is forced to get added,
            // index needs to be adjusted because
            // index for existing shapes represents shape index..
            // ..while index for non existing shapes represents segment index
            if (intersec.existingShape) {
                index = (<any>getSegmentIndex(path, pos)) + 1;
            }

            // zLevels.splice( index, 0,
            pos[2] = pos[2] || 0; // set Zlevel 0 if not defined
            // );

            EDITOR.map.clipGeoCoord(pos);

            path.splice(index, 0, pos);

            rearrangeBlockedNodes(line, index);

            storeConnectedPoints(line);

            changeGeometry(line, path);

            const shapes = getPrivate(line, 'shps');

            if (shapes.length) {
                shapes.splice(
                    index,
                    0,
                    tools.createLinkShape(line, pos, index)
                );

                shapes.forEach((shp) => {// set new correct index
                    shp.__.index += Number(shp.getIndex() > index);
                });

                shapes.forEach((shp) => {// set new correct index
                    updateOverlapping(shp,
                        tools.checkOverlapping(line, shp.getIndex())
                    );
                });
            }

            tools.refreshGeometry(line);
        } else {
            // no shape added -> don't overwrite index by false, if newShapIdxOnly is true
            if (!newShapeIdxOnly) {
                index = false;
            }
            ;
        }

        return index;
    },

    defaults: function(line, selected?) {
        const prv = getPrivate(line);

        if (selected && selected != prv._cPnt) {
            return false;
        }

        prv._cPnt = null;

        triggerDisplayRefresh(line, {
            'selected': false,
            'hovered': false
        });

        return line;
    },

    // used by: tr-editor
    hideDirection: function(line) {
        const arrows = getPrivate(line, 'arrows');

        if (arrows) {
            for (let i = 0; i < arrows.length; i++) {
                line._e().objects.overlay.remove(arrows[i]);
            }
            arrows.length = 0;
        }

        return line;
    },

    fixGeo: function(line, shapeToCheck, ignoreSplitChildren, preferShapeIndex?: number) {
        return autoFixGeometry(line, shapeToCheck, ignoreSplitChildren, preferShapeIndex);
    },
    // used by: crossing + shape
    connectShpToLink: function(line, shpIndex, toLink, toPos, preferSegment, animate, ignoreZLevel): ConnectLinksResult {
        const splitInfo = new ConnectLinksResult();
        let newLinks;
        const objManager = line._e().objects;

        if (toLink.id != line.id) {
            const newToLinks = connectLinks(
                line,
                shpIndex,
                toLink,
                preferSegment,
                toPos,
                animate,
                ignoreZLevel
            );

            // connectLinks returns ...
            // null    -> no connection has been done (no intersection created) because toLink not in range..
            // false   -> no intersection created due to autofix is preventing... (road with 2 nodes at same position)
            //            geo is snapping to closest node..
            // [c1,c2] -> splitted childs of toLink after intersection creation

            if (newToLinks === null) {
                return null;
            }

            // if not a node -> linksplit
            if (shpIndex > 0 && shpIndex < line.geometry.coordinates.length - 1) {
                if (getPrivate(line, 'isSelected')) {
                    triggerFeatureUnselected(line._e());
                }

                tools.deHighlight(line);

                newLinks = objManager.splitLinkAt({
                    link: line,
                    index: shpIndex
                });
            }

            // handle possible "road with 2 nodes at same position" (singlepoint geo) problem (e.g: connect-helper snaps to node..)
            const path = line.geometry.coordinates;

            if (
                path.length == 2 &&
                path[0][0] == path[1][0] &&
                path[0][1] == path[1][1]
            ) {
                // autoFixGeometry( this._h, line, shpIndex, true );
                // line.markAsRemoved();
                objManager.remove(line);
            }

            tools.markAsModified(line);

            if (getPrivate(line, 'isSelected')) {
                tools.refreshGeometry(line);
            }

            if (newToLinks) {
                splitInfo.targetSplittedInto = newToLinks;
            }

            if (newLinks) {
                splitInfo.splittedInto = newLinks;
            }
        }
        return splitInfo;
    },

    isIntersection(EDITOR, c1, c2) {
        const isecPrecision = Math.pow(10, EDITOR._config['intersectionScale']);
        const round = (v) => Math.round(v * isecPrecision);
        return round(c1[0]) == round(c2[0]) && round(c1[1]) == round(c2[1]);
    }
};
const moveShapeAtIndexTo = tools.moveShapeAtIndexTo;

// ********************************************** PRIVATE **********************************************


function autoFixGeometry(line: Navlink, shapeToCheck, ignoreSplitChildren, skipShapeIndex?: number) {
    const HERE_WIKI = line._e();
    const objManager = HERE_WIKI.objects;
    const ignoreAllCLinks = ignoreSplitChildren === true;
    let k = shapeToCheck || 0;
    const zLevels = line.getZLevels();
    const pLength = zLevels.length;
    const stopAtShp = shapeToCheck === UNDEF ? pLength : k + 1;
    let AFInfo = true;
    const minShpDistance = HERE_WIKI._config['minShapeDistance'] || 2;

    function ignoreChild(c) {
        return ignoreAllCLinks ? ignoreAllCLinks : ignoreSplitChildren.indexOf(c) != -1;
    }

    function isCoordinateDuplicate(p1, p2, threshold) {
        threshold = threshold || 1;
        return p1[2] == p2[2] && HERE_WIKI.map.distance(p1, p2) <= threshold;
    }

    function validateShape(shpIndex) {
        if (skipShapeIndex == shpIndex) {
            return true;
        }

        function isNode(index) {
            return index == 0 || index == pathLength - 1;
        }

        function moveCLinksToTeardrop(shp: number) {
            const clnks = line.getConnectedLinks(shp, true);
            clnks.forEach((connection) => {
                const link = connection.link;
                tools.markAsModified(link, false);
                moveShapeAtIndexTo(link, connection.index, TDCoord[0], TDCoord[1], true);
            });

            return clnks;
        }

        const path = line.coord();
        const prv = getPrivate(line);
        const pathLength = path.length;
        let deleteShapeAt: false | number = false;
        let TDDetectedAt: false | number = false;
        let shapesInBetween;
        let TDCoord;

        for (let duplicateIndex = 0; duplicateIndex < pathLength; duplicateIndex++) {
            if (shpIndex != duplicateIndex) {
                const p1 = path[duplicateIndex];
                const p2 = path[shpIndex];
                // check if shp is close
                if (isCoordinateDuplicate(p1, p2, minShpDistance /* , zLevels[duplicateIndex], zLevels[shpIndex]*/)) { // ***** UNCOMMENT FOR ZLEVEL CONSIDERATION ***** //
                    //                     if( VectorHelpers.isCoordinateDuplicate( p1, p2, minShpDistance /*, zLevels[duplicateIndex], zLevels[shpIndex]*/ ) ){   // ***** UNCOMMENT FOR ZLEVEL CONSIDERATION ***** //
                    // identified duplicate candidate
                    shapesInBetween = Math.abs(shpIndex - duplicateIndex) - 1;

                    // NODE TO NODE
                    if (isNode(duplicateIndex) && isNode(shpIndex)) {
                        if (shapesInBetween == 1) {
                            // useless geo
                            deleteShapeAt = shpIndex;
                        } else {
                            // TDDetectedAt = duplicateIndex > shpIndex ? duplicateIndex : shpIndex;
                            TDDetectedAt = duplicateIndex;
                        }
                    } else if (isNode(shpIndex)) {
                        // NODE TO SHAPE
                        if (shapesInBetween <= 1) {
                            deleteShapeAt = shpIndex;
                        } else {
                            // useless segment
                            TDDetectedAt = duplicateIndex;
                        }
                    } else if (isNode(duplicateIndex)) { // SHAPE TO NODE
                        if (shapesInBetween == 1 && shpIndex > duplicateIndex) { // directions
                            deleteShapeAt = duplicateIndex; // useless segment
                        }
                        if (shapesInBetween == 0) {
                            deleteShapeAt = shpIndex;
                        } else if (shapesInBetween > 0) {
                            TDDetectedAt = shpIndex;
                        } else {
                            deleteShapeAt = duplicateIndex;
                        } // useless segment
                    } else {
                        // SHAPE TO SHAPE
                        if (shapesInBetween == 0) {
                            deleteShapeAt = shpIndex;
                        } else {
                            // TDDetectedAt = duplicateIndex > shpIndex ? duplicateIndex : shpIndex;
                            TDDetectedAt = duplicateIndex;
                        }
                    }

                    if (TDDetectedAt !== false) {
                        let additionalSplitAt: number;
                        let children;
                        let child;

                        TDCoord = path[TDDetectedAt];

                        if (pathLength == 2) { // remove useless singlepoint/samepoint geo
                            const clinks = moveCLinksToTeardrop(shapeToCheck);
                            moveShapeAtIndexTo(
                                line,
                                shpIndex == TDDetectedAt
                                    ? duplicateIndex
                                    : shpIndex,
                                TDCoord[0],
                                TDCoord[1]
                            );

                            triggerFeatureUnselected(line._e());

                            objManager.remove(tools.deHighlight(line));

                            clinks.forEach((cl) => {
                                if (!ignoreAllCLinks) {
                                    autoFixGeometry(cl.link, cl.index, true);
                                }
                            });
                        } else { // Performing Teardrop split
                            moveCLinksToTeardrop(shpIndex);

                            moveShapeAtIndexTo(line, shpIndex, TDCoord[0], TDCoord[1]);

                            // Teardrop split (tds)
                            children = objManager.splitLinkAt({
                                link: line, index:
                                    TDDetectedAt === pathLength - 1 || TDDetectedAt === 0
                                        ? ~~(pathLength / 2) // NODE TO NODE (RING) -> split in middle
                                        : TDDetectedAt // REAL TEARDROP
                            });
                            // check the children
                            children.forEach((child, ci) => {
                                autoFixGeometry(
                                    child,
                                    UNDEF,
                                    ignoreSplitChildren.concat(line, children[Number(ci == 0)])
                                );
                            });

                            child = children[Number(shpIndex >= TDDetectedAt)];

                            if (
                                // make sure child asn't been removed in the meanwhile because of child's auto fixing
                            // (additonal split could have been applied already).
                                !child.editState('removed') &&
                                Math.abs(shpIndex - TDDetectedAt) >= 2
                            ) {
                                // resulting childs of tds split is virtual connected at Shape(Not Node) -> split again!
                                child.coord().forEach((c, csi: number) => {
                                    if (c[0] == TDCoord[0] && c[1] == TDCoord[1]) {
                                        additionalSplitAt = csi;
                                    }
                                });

                                if (additionalSplitAt) {
                                    objManager.splitLinkAt({link: child, index: additionalSplitAt});
                                }
                            }
                        }
                        return false;
                    } else if (deleteShapeAt !== false) {
                        const deleteX = path[duplicateIndex][0];
                        const deleteY = path[duplicateIndex][1];
                        let hasCLinks = false;

                        // reposition clinks of node before it gets deleted
                        line.getConnectedLinks(deleteShapeAt, true).forEach((cLinkInfo) => {
                            const link = cLinkInfo.link;
                            tools.markAsModified(link, false);
                            tools.moveShapeAtIndexTo(link, cLinkInfo.index, deleteX, deleteY, true);
                            hasCLinks = !ignoreChild(link);
                        });

                        moveShapeAtIndexTo(
                            line,
                            shpIndex == duplicateIndex
                                ? duplicateIndex
                                : shpIndex,
                            deleteX,
                            deleteY,
                            true
                        );

                        // delete useless shape geometry
                        tools.deleteShape(line, deleteShapeAt, true);

                        if (isNode(deleteShapeAt)) {
                            // move moved shape to deleted node position
                            if (!isNode(shpIndex) && shpIndex - 1 > 0) {
                                moveShapeAtIndexTo(line, shpIndex - 1, deleteX, deleteY, true);
                            }

                            if (prv.isSelected) {
                                tools.refreshGeometry(line);
                            }

                            // if node has clinks addtional split is needed
                            if (hasCLinks && path.length > 2) {
                                objManager.splitLinkAt({
                                    link: line,
                                    index: duplicateIndex - Number(deleteShapeAt === 0)
                                });
                            }
                        }
                        // calc transformed index
                        const dif = shpIndex - duplicateIndex;
                        let transformedShpIndex;

                        if (dif > 0) {
                            transformedShpIndex = shpIndex - 1 - shapesInBetween;
                        } else if (dif < 0) {
                            transformedShpIndex = shpIndex + shapesInBetween;
                        }

                        return transformedShpIndex;
                    }
                }
            }
        }
        // valid ?
        return true;
    }

    if (!line.editState('removed') && k < pLength) {
        ignoreSplitChildren = (ignoreAllCLinks || !ignoreSplitChildren) ? [] : ignoreSplitChildren;


        for (k; k < stopAtShp; k++) {
            if ((AFInfo = validateShape(k)) !== true) {
                break;
            }
        }
    }

    // returns
    // 1. number of corrected/fixed/switched Shape index or..
    // 2. true if geo hasn't been touched or..
    // 3. false is geometry is split or deleted
    return AFInfo;
}


//* *************************************************************************

function isShpBlocked(line, index) {
    return (_props(line, 'bn') || []).indexOf(
        index == line.geometry.coordinates.length - 1 ? 'N' : index
    ) != -1;
}

//* *************************************************************************

function connectLinks(fromLink: Navlink, fromShpIndex, toLink, preferSegment, toPos, animate, ignoreZLevel): [Navlink, Navlink] {
    const HERE_WIKI = fromLink._e();
    const path = fromLink.coord();
    // get clinks before changing geo!
    const connectedLinks = fromLink.getConnectedLinks(fromShpIndex, true);
    const x = toPos[0];
    const y = toPos[1];
    // var considerZlevel = toPos[2] !== UNDEF; // ***** UNCOMMENT FOR ZLEVEL CONSIDERATION *****
    const snapTolerance = HERE_WIKI._config['minShapeDistance'];

    const crossing = HERE_WIKI.map.calcCrossingAt(toLink.coord(), toPos, snapTolerance, preferSegment);
    const pnt = HERE_WIKI.map.clipGeoCoord(crossing.point);
    let splittedLinks = null;
    const isExistingShape = crossing.existingShape;
    const blockShape = isExistingShape && isShpBlocked(toLink, crossing.index);

    path[fromShpIndex][0] = x;
    path[fromShpIndex][1] = y;


    tools._setCoords(fromLink, path);

    // if (blockShape) {
    //     objectFactory.blockShapeAtIndex(fromLink, fromShpIndex);
    // }

    if (crossing.index !== null) {
        // TODO: wait for MC to allow zlevels SUPPORT
        // ***** UNCOMMENT FOR ZLEVEL CONSIDERATION ***** //
        //            var toZLevel = isExistingShape ? toLink.zLevels[pnt.index] : determineZLevelForSegment(toLink, pnt.index);
        //            if(ignoreZLevel) // ignore zlevel..force connection! reset level to 0.
        //                toZLevel = 0;
        //
        //            // if no zlevel could be determined for crossingpoint (virtual shape) -> do not connect anymore!
        //            if( toZLevel === null )
        //                return null;
        //
        //            if( considerZlevel ){
        //                // if calc intersection is snagged to existing geo -> need to check for matching zlevels..
        //                // ..otherwise snag is not valid!
        //                if( toZLevel !== toPos.z )
        //                    return null;
        //
        //                // if connection is made to newly created shape(virtual shape) reset zlevels
        //                fromLink.zLevels[fromShpIndex] = isExistingShape ? toPos.z : 0;
        //            }


        // splittedLinks = this._h.objects.factory.splitLinkAt.call( objectFactory,
        splittedLinks = HERE_WIKI.objects.splitLinkAt(
            isExistingShape ?
                {
                    link: toLink,
                    index: crossing.index,
                    avoidSnapping: true
                } : {
                    link: toLink,
                    point: pnt,
                    preferSegment: preferSegment,
                    avoidSnapping: true
                }
        );

        moveShapeAtIndexTo(fromLink, fromShpIndex, pnt[0], pnt[1]);

        //   ------
        //   \    /
        //   \ | /    -->
        //     |
        //     |

        connectedLinks.forEach((connection) => {
            // ***** UNCOMMENT FOR ZLEVEL CONSIDERATION ***** //
            //                if( considerZlevel )
            //                    clinkInfo.link.zLevels[clinkInfo.shp] = fromLink.zLevels[fromShpIndex];

            const link = connection.link;

            moveShapeAtIndexTo(link, connection.index, pnt[0], pnt[1]);

            autoFixGeometry(link, connection.index, true);

            // if (blockShape) {
            //     objectFactory.blockShapeAtIndex(link, connection.index);
            // }

            tools.markAsModified(link, false, false);

            tools.defaults(link);
        });
    }

    // return false if link itself hasn't been splitted...
    // else the point doesn't hit the line! returns null
    return splittedLinks;
}


export default tools;
