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

import {Feature, GeoJSONBBox as BBox, GeoJSONCoordinate, StyleGroup} from '@here/xyz-maps-core';
import {geotools, JSUtils} from '@here/xyz-maps-common';
import {getPointAtLength, getTotalLength, getPntAt, getSegmentIndex} from '../../geometry';
import {calcRelPosOfPoiAtLink} from '../../map/GeoMath';
import locTools from '../location/LocationTools';
import {NavlinkShape} from './NavlinkShape';
import VirtualLinkShape from './VirtualShape';
import {Navlink} from './Navlink';
import {EditStates} from '../feature/Feature';
import FeatureTools from '../feature/FeatureTools';
import InternalEditor from '../../IEditor';
import {EDIT_RESTRICTION} from '../../API/EditorOptions';

type LocationId = string | number;

class ConnectLinksResult {
    targetSplittedInto?: [Navlink, Navlink];
    splittedInto?: [Navlink, Navlink];
}

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
            selectedShapes: [],

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

function triggerDisplayRefresh(line: Navlink, editStates?: {}, enforceDefault?: boolean) {
    if (editStates) {
        for (let s in editStates) {
            line.editState(<EditStates>s, editStates[s]);
        }
    }
    line._e().setStyle(line, enforceDefault ? 'default' : UNDEF);
}

function storeConnectedPoints(line: Navlink) {
    const prv = getPrivate(line);
    // store connected poi/addresses before geometry change to make sure they get modified after geo changed.
    // in case of link bbox and poi bbox doesn't intersect anymore...
    return tools.getConnectedObjects(line,
        geotools.mergeBBoxes(prv.prevBBox = prv.prevBBox || line.bbox.slice(), line.bbox)
    );
}

function changeGeometry(line, path: GeoJSONCoordinate[]) {
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
        // trigger display refresh if needed.
        shp.getLink()._e().setStyle(shp);
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

    deHighlight: function(line: Navlink) {
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
            getPrivate(line, 'selectedShapes').length = 0;
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
        const p1 = p[0];
        const p2 = p[p.length - 1];

        // is singlpoint geo just shift to prevent service from blocking with 409
        if (p1[0] == p2[0] && p1[1] == p2[1]) {
            p[0][0] += 1e-5;
            p[0][1] += 1e-5;
            changeGeometry(line, p);
        }
    },

    markAsModified: function(line: Navlink, saveView: boolean = true, visualize: boolean = true) {
        const wasAlreadyModded = line.editState('modified');
        const prv = getPrivate(line);

        if (prv.isGeoMod) {
            const coordinates = line.coord();

            storeConnectedPoints(line).forEach((cObj) => {
                const nrp = getPointAtLength(
                    coordinates,
                    getTotalLength(coordinates) * calcRelPosOfPoiAtLink(coordinates, locTools.getRoutingPosition(cObj)).offset
                );
                // connect to the line with new routing point when the link geometry is changed
                locTools.connect(cObj, line, nrp);
            });
        }

        FeatureTools.markAsModified(line, prv, saveView);

        if (!wasAlreadyModded) {
            triggerDisplayRefresh(line);

            if (!prv.isSelected && visualize) {
                tools.defaults(line);
            }
        }

        return line;
    },

    ignoreZ: (line: Navlink) => {
        return !line._e().getStyleProperty(line, 'altitude');
    },


    //* ****************************************** protected link/shape only *******************************************

    _props: _props,

    getConnectedObjects: function(link: Navlink, extendedBBox?: BBox) {
        // not working if place/address is located outside of link's bbox
        const iEdit = link._e();
        return iEdit.objects.getInBBox(
            geotools.extendBBox(extendedBBox || link.bbox, iEdit._config['maxRoutingPointDistance'])
        ).filter((el) => {
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
            new NavlinkShape(line, coordinate, i, tools)
        );
    },

    createShapes: function(line: Navlink) {
        const shapePnts = getPrivate(line, 'shps');
        const path = <GeoJSONCoordinate[]>line.geometry.coordinates;
        // line.getPath(),
        const length = path.length;

        if (!line.editState('removed')) {
            const isOverlapping = tools.checkOverlapping(line);

            if (!shapePnts.length) {
                for (let i = 0; i < length; i++) {
                    const shp = tools.createLinkShape(line, [...path[i]], i);

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

        if (!addShapePnts.length && !line.editState('removed') && !line._e()._config.editRestrictions(line, EDIT_RESTRICTION.GEOMETRY)) {
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

    moveShapeAtIndexTo: function(line: Navlink, index: number, position: number[], skipCLinks?: boolean): boolean {
        const path = line.coord();
        const shapePnts = getPrivate(line, 'shps');

        position = [...position];

        const [x, y, z] = position;

        const positionHasChanged = path[index][0] != x || path[index][1] != y || (path[index][2] || 0) != (z || 0);

        path[index][0] = x;
        path[index][1] = y;


        if (typeof z == 'number') {
            path[index][2] = z;
        }

        storeConnectedPoints(line);

        changeGeometry(line, path);

        tools.hideDirection(line);

        const shp = shapePnts[index];

        // if line is active also move the shape object
        if (!skipCLinks && shp) {
            line._e().objects.overlay.setFeatureCoordinates(shp, position);

            shp.__.cLinks.forEach((clinkData) => {
                let clink = clinkData.link;
                let isGeoModAllowed = !line._e()._config.editRestrictions(clink, EDIT_RESTRICTION.GEOMETRY);
                if (isGeoModAllowed) {
                    tools.moveShapeAtIndexTo(clink, clinkData.index, position);
                }
            });
            // update shape overlapping
            updateOverlapping(shp, tools.checkOverlapping(line, index));
        }

        return positionHasChanged;
    },

    //* **************************************** public area/link only ****************************************
    deleteShape: function(navlink: Navlink, shape: number | NavlinkShape, ignoreCheck?: boolean) {
        const index = typeof shape == 'number'
            ? shape
            : shape.getIndex();
        const path = navlink.coord();

        if (path.length > 2) {
            path.splice(index, 1);

            const prv = getPrivate(navlink);
            const shapes = prv.shps;

            if (shapes.length) {
                clearShp(navlink, shapes[index]);

                shapes.splice(index, 1);

                shapes.forEach((shp) => {// set new correct index
                    shp.__.index -= Number(shp.getIndex() >= index);
                });

                getPrivate(navlink, 'selectedShapes').splice(index, 1);
            }

            storeConnectedPoints(navlink);

            changeGeometry(navlink, path);

            // update/remove zlevels
            const zLevels = <number[]>navlink.getZLevels();
            zLevels.splice(index, 1);
            navlink._e().objects.history.batch(() => {
                navlink.getProvider().writeZLevels(navlink, zLevels);
            });

            if (!ignoreCheck) {
                tools.markAsModified(navlink);
            }

            if (prv.isSelected) {
                tools.refreshGeometry(navlink);
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

                    angle = 90 - geotools.calcBearing(p1, p2) - rotation;

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

    addShp: (
        link: Navlink,
        pos: [number, number, number?] | number[],
        index: number | null,
        newShapeIdxOnly: boolean,
        force?: boolean,
        preferSegment?: number
    ): number | false => {
        const path = link.coord();
        const EDITOR = link._e();
        const ignoreZ = tools.ignoreZ(link);
        const intersec = EDITOR.map.searchPointOnLine(path, pos, EDITOR._config['snapTolerance'], preferSegment, UNDEF, ignoreZ);

        index = typeof index == 'number'
            ? index
            : intersec?.index;

        if (!intersec?.existingShape || force) {
            const zLevels = <number[]>link.getZLevels();

            // if existing shape is forced to get added,
            // index needs to be adjusted because
            // index for existing shapes represents shape index..
            // ..while index for non existing shapes represents segment index
            if (intersec?.existingShape) {
                index = (<any>getSegmentIndex(path, pos)) + 1;
            }

            EDITOR.map.clipGeoCoord(pos);

            path.splice(index, 0, <[number, number, number?]>pos);

            rearrangeBlockedNodes(link, index);

            storeConnectedPoints(link);

            changeGeometry(link, path);

            // fallback for old non 3d zlevel passed in via coordinates z position
            let zLevel = Math.round(pos[2] < 10 && pos[2]) || 0;
            zLevels.splice(index, 0, zLevel);
            EDITOR.objects.history.batch(() => {
                link.getProvider().writeZLevels(link, zLevels);
            });
            // link.setZLevels(zLevels)

            const shapes = getPrivate(link, 'shps');

            if (shapes.length) {
                shapes.splice(
                    index,
                    0,
                    tools.createLinkShape(link, pos, index)
                );

                shapes.forEach((shp) => {// set new correct index
                    shp.__.index += Number(shp.getIndex() > index);
                });

                shapes.forEach((shp) => {// set new correct index
                    updateOverlapping(shp,
                        tools.checkOverlapping(link, shp.getIndex())
                    );
                });

                getPrivate(link, 'selectedShapes').splice(index, 0, false);
            }

            tools.refreshGeometry(link);
        } else {
            // no shape added -> don't overwrite index by false, if newShapIdxOnly is true
            if (!newShapeIdxOnly) {
                return false;
            }
        }

        return index;
    },

    snapShape: (linkShape: NavlinkShape, position: GeoJSONCoordinate, ignoreZ?: boolean, minShpDistance?: number): GeoJSONCoordinate => {
        const link = linkShape.getLink();
        const prv = getPrivate(linkShape);
        const internalEditor = link._e();
        const closeLinks = link.getProvider().search({
            point: position,
            radius: minShpDistance
        });
        let cLen = closeLinks.length;
        let cl;

        while (cl = closeLinks[--cLen]) {
            if (cl.class == 'NAVLINK' && cl.id != link.id && prv._cls.indexOf(cl) == -1 && cl.behavior('snapCoordinates')) {
                const x = internalEditor.map.searchPointOnLine(cl.geometry.coordinates, position, minShpDistance, UNDEF, minShpDistance, ignoreZ);
                if (x) {
                    if (ignoreZ) {
                        // reset to initial z value to ensure the line retains its original z geometry if it gets unsnapped later
                        x.point[2] = position[2] || 0;
                    }
                    return x.point;
                }
            }
        }
    },

    defaults: function(line: Navlink, selected?: LocationId, enforceDefault?: boolean) {
        const prv = getPrivate(line);

        if (selected && selected != prv._cPnt) {
            return false;
        }

        prv._cPnt = null;

        triggerDisplayRefresh(line, {
            'selected': false,
            'hovered': false
        }, enforceDefault);

        return line;
    },

    // used by: tr-editor
    hideDirection: function(line: Navlink) {
        const arrows = getPrivate(line, 'arrows');

        if (arrows) {
            for (let i = 0; i < arrows.length; i++) {
                line._e().objects.overlay.remove(arrows[i]);
            }
            arrows.length = 0;
        }

        return line;
    },

    fixGeo: function(
        line: Navlink,
        shapeToCheck?: number,
        ignoreSplitChildren?: Navlink[],
        preferShapeIndex?: number
    ) {
        return autoFixGeometry(line, shapeToCheck, ignoreSplitChildren, preferShapeIndex);
    },
    // used by: crossing + shape
    connectShpToLink: function(
        line: Navlink,
        shpIndex: number,
        toLink: Navlink,
        toPos: GeoJSONCoordinate,
        preferSegment?: number,
        ignoreZ: boolean = tools.ignoreZ(line)
    ): ConnectLinksResult {
        const splitInfo = new ConnectLinksResult();
        let newLinks;
        const objManager = line._e().objects;

        if (toLink.id != line.id) {
            const newToLinks = connectLinks(line, shpIndex, toLink, toPos, preferSegment, ignoreZ);
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

    isIntersection(EDITOR: InternalEditor, c1: number[], c2: number[], ignoreZ?: boolean) {
        const isecPrecision = Math.pow(10, EDITOR._config.intersectionScale);
        const round = (v) => Math.round(v * isecPrecision);
        return (
            round(c1[0]) == round(c2[0]) &&
            round(c1[1]) == round(c2[1]) &&
            (ignoreZ || round(c1[2] || 0) == round(c2[2] || 0))
        );
    }
};
// const moveShapeAtIndexTo = tools.moveShapeAtIndexTo;

// ********************************************** PRIVATE **********************************************


function autoFixGeometry(line: Navlink, shapeToCheck?: number, ignoreSplitChildren?: Navlink[], skipShapeIndex?: number) {
    const HERE_WIKI = line._e();
    const objManager = HERE_WIKI.objects;
    const ignoreAllCLinks = !ignoreSplitChildren;
    let k = shapeToCheck || 0;
    const zLevels = line.getZLevels();
    const pLength = (<number[]>zLevels).length;
    const stopAtShp = shapeToCheck === UNDEF ? pLength : k + 1;
    let AFInfo = true;
    let {snapTolerance} = HERE_WIKI._config;

    if (snapTolerance == UNDEF) {
        snapTolerance = 2;
    }


    function ignoreChild(c) {
        return ignoreAllCLinks || ignoreSplitChildren.indexOf(c) != -1;
    }

    function isCoordinateDuplicate(p1, p2, z1: number, z2: number, thresholdMeters: number = 1) {
        return Number(z1) == Number(z2) && HERE_WIKI.map.distance(p1, p2) <= thresholdMeters;
    }

    function validateShape(shpIndex) {
        if (skipShapeIndex == shpIndex) {
            return true;
        }

        function isNode(index) {
            return index == 0 || index == pathLength - 1;
        }

        function moveCLinksToTeardrop(shp: number) {
            const connectedLinks = line.getConnectedLinks(shp, true);
            for (let {link, index} of connectedLinks) {
                const positionHasChanged = tools.moveShapeAtIndexTo(link, index, TDCoord, true);
                if (positionHasChanged) {
                    tools.markAsModified(link, false);
                }
            }
            return connectedLinks;
        }

        const path = line.coord();
        const prv = getPrivate(line);
        const pathLength = path.length;
        let deleteShapeAt: false | number = false;
        let TDDetectedAt: false | number = false;
        let shapesInBetween;
        let TDCoord: GeoJSONCoordinate;

        for (let duplicateIndex = 0; duplicateIndex < pathLength; duplicateIndex++) {
            if (shpIndex != duplicateIndex) {
                const p1 = path[duplicateIndex];
                const p2 = path[shpIndex];

                // check if shp is close
                if (isCoordinateDuplicate(p1, p2, zLevels[duplicateIndex], zLevels[shpIndex], snapTolerance)) {
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
                            tools.moveShapeAtIndexTo(
                                line,
                                shpIndex == TDDetectedAt
                                    ? duplicateIndex
                                    : shpIndex,
                                TDCoord
                            );

                            triggerFeatureUnselected(line._e());

                            objManager.remove(tools.deHighlight(line));

                            clinks.forEach((cl) => {
                                if (!ignoreAllCLinks) {
                                    autoFixGeometry(cl.link, cl.index);
                                }
                            });
                        } else { // Performing Teardrop split
                            moveCLinksToTeardrop(shpIndex);

                            tools.moveShapeAtIndexTo(line, shpIndex, TDCoord);

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
                            tools.moveShapeAtIndexTo(link, cLinkInfo.index, [deleteX, deleteY], true);
                            hasCLinks = !ignoreChild(link);
                        });

                        tools.moveShapeAtIndexTo(
                            line,
                            shpIndex == duplicateIndex
                                ? duplicateIndex
                                : shpIndex,
                            [deleteX,
                                deleteY],
                            true
                        );

                        // delete useless shape geometry
                        tools.deleteShape(line, deleteShapeAt, true);

                        if (isNode(deleteShapeAt)) {
                            // move moved shape to deleted node position
                            if (!isNode(shpIndex) && shpIndex - 1 > 0) {
                                tools.moveShapeAtIndexTo(line, shpIndex - 1, [deleteX, deleteY], true);
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

function connectLinks(
    fromLink: Navlink,
    fromShpIndex: number,
    toLink: Navlink,
    toPos: GeoJSONCoordinate,
    preferSegment?: number,
    ignoreZ?: boolean
): [Navlink, Navlink] {
    const HERE_WIKI = fromLink._e();
    const path = fromLink.coord();
    let splittedLinks = null;
    // get clinks before changing geo!
    const connectedLinks = fromLink.getConnectedLinks(fromShpIndex, true);
    const [x, y, z] = toPos;
    const snapTolerance = HERE_WIKI._config['snapTolerance'];
    const crossing = HERE_WIKI.map.searchPointOnLine(toLink.coord(), toPos, snapTolerance, preferSegment, UNDEF, ignoreZ);

    path[fromShpIndex][0] = x;
    path[fromShpIndex][1] = y;
    path[fromShpIndex][2] = z || 0;

    tools._setCoords(fromLink, path);

    if (crossing) {
        const pnt = HERE_WIKI.map.clipGeoCoord(crossing.point);
        const isExistingShape = crossing.existingShape;
        // const blockShape = isExistingShape && isShpBlocked(toLink, crossing.index);
        // if (blockShape) {
        //     objectFactory.blockShapeAtIndex(fromLink, fromShpIndex);
        // }

        splittedLinks = HERE_WIKI.objects.splitLinkAt(
            isExistingShape ? {
                link: toLink,
                index: crossing.index,
                avoidSnapping: true,
                ignoreZ
            } : {
                link: toLink,
                point: pnt,
                preferSegment,
                avoidSnapping: true,
                ignoreZ
            }
        );

        tools.moveShapeAtIndexTo(fromLink, fromShpIndex, pnt);

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

            tools.moveShapeAtIndexTo(link, connection.index, pnt);

            autoFixGeometry(link, connection.index);

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
