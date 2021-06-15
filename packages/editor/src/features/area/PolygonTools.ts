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

import {getDistance, distanceToPolygon, getSegmentIndex, intersectLineLine, Point} from '../../geometry';
import {AreaShape} from './AreaShape';
import {VirtualAreaShape} from './VirtualShape';
import {Area} from './Area';
import {Feature, GeoJSONCoordinate} from '@here/xyz-maps-core';

let UNDEF;

function getPrivate(feature, name?: string) {
    let prv = feature.__;

    if (!prv) {
        prv = feature.__ = {
            isEditable: true,
            allowEdit: true,
            shapePnts: [],
            midShapePnts: []
        };
    }

    return name ? prv[name] : prv;
}


//* ***************************************************** PRIVATE ******************************************************

function removeShapes(area: Area) {
    const prv = getPrivate(area);
    const overlay = area._e().objects.overlay;

    tools.hideShape(prv.shapePnts, overlay);
    tools.hideShape(prv.midShapePnts, overlay);
}


function createShapes(
    area: Area,
    shapePnts: Feature[],
    polygons: GeoJSONCoordinate[][],
    creator: (p1: GeoJSONCoordinate, p2: GeoJSONCoordinate, polyIndex: number, shpIndex: number) => Feature
) {
    const overlay = area._e().objects.overlay;

    for (let p = 0; p < polygons.length; p++) {
        let poly = polygons[p];

        for (let i = 0; i < poly.length - 1; i++) {
            let shp = creator(poly[i], poly[i + 1], i, p);
            overlay.addFeature(shp);
            shapePnts.push(shp);
        }
    }
}


function addShapes(area: Area) {
    const shapePnts = getPrivate(area, 'shapePnts');
    const coordinates = tools.getCoords(area);


    for (let p = 0; p < coordinates.length; p++) {
        createShapes(area, shapePnts, coordinates[p],
            (p1, p2, pi, ci) => new AreaShape(
                area,
                p1[0],
                p1[1],
                [p, pi, ci],
                tools
            )
        );
    }
}


function addVShapes(area: Area) {
    const shapePnts = getPrivate(area, 'midShapePnts');
    const coordinates = tools.getCoords(area);

    for (let p = 0; p < coordinates.length; p++) {
        createShapes(area, shapePnts, coordinates[p],
            (p1, p2, pi, ci) => new VirtualAreaShape(
                area,
                (p1[0] + p2[0]) / 2,
                (p1[1] + p2[1]) / 2,
                [p, pi, ci],
                tools
            )
        );
    }
}

function refreshGeometry(area) {
    if (getPrivate(area, 'isSelected')) {
        removeShapes(area);

        addShapes(area);
        addVShapes(area);
    }
}


//* ************************************************** EVENTLISTENERS **************************************************

function onPointerHover(event) {
    const area = this;
    const prv = getPrivate(area);

    if (prv.allowEdit && !prv.isSelected) {
        area._e().listeners.trigger(event, area);
        // area.triggerEvents( event, area/*.getSimplified()*/ );
        // area.editState( 'hovered', event.type == "mouseover" );
        area.editState('hovered', event.type == 'pointerenter');

        area._e().setStyle(this);
    }
}

function onPointerUp(ev) {
    const area = this;
    const prv = getPrivate(area);

    if (!prv.isSelected) {
        if (this._e()._config['featureSelectionByDefault'] && prv.allowEdit) {
            tools._select(area);
        }
    }
    area._e().listeners.trigger(ev, area);
}


var tools = {

    private: getPrivate,

    _evl: {

        pointerenter: onPointerHover,

        pointerleave: onPointerHover,

        dbltap: onPointerUp,

        pointerup: onPointerUp

    },

    // deHighlight: function( obj )
    deHighlight: function(area) {
        const prv = getPrivate(area);

        if (prv.isSelected) {
            removeShapes(area);

            // area.toggleHover( true );

            area.editState('hovered', false);
            area.editState('selected', false);
            // display.setStyleGroup( feature );
            area._e().setStyle(area);

            prv.isSelected = false;
        }
    },

    // _editable: function( obj, e )
    _editable: function(area, editable) {
        const prv = getPrivate(area);

        if (editable && editable != prv.allowEdit) {
            // area.toggleHover(true);
            document.body.style.cursor = 'pointer';
        } else if (!editable && editable != prv.allowEdit) {
            tools.deHighlight(area);
            // area.toggleHover(false);
            document.body.style.cursor = 'default';
        }
        prv.allowEdit = editable;
    },


    // _select: function( obj ){
    _select: function(area) {
        const prv = getPrivate(area);

        if (!prv.isSelected) {
            area._e().objects.selection.select(area);

            area._e().dump(area, 'info');

            // area.toggleHover(false);

            // setOrgiginalStyle();
            prv.isSelected = true;

            area.editState('selected', true);

            // display.setStyleGroup( feature );
            area._e().setStyle(area);

            refreshGeometry(area);
        }
    },

    // _setCoords: function( obj, pos )


    _setCoords: function(feature, coords, refresh?: boolean) {
        // convert to MultiPolygon geometry in any case.
        if (typeof coords[0][0][0] == 'number') {
            coords = [coords];
        }
        // make sure geometries are closed.
        let p = coords.length;
        while (p--) {
            const poly = coords[p];
            let i = poly.length;

            while (i--) {
                const path = poly[i];
                path[path.length - 1] = path[0];
            }
        }

        feature._e().objects.history.origin(feature);

        if (feature.geometry.type == 'Polygon') {
            if (coords.length == 1) {
                coords = coords[0];
            } else {
                // transform/extend polygon into MultiPolygon
                feature.geometry.type = 'MultiPolygon';
            }
        }
        feature._provider.setFeatureCoordinates(feature, coords);

        if (refresh) {
            refreshGeometry(feature);
        }
    },


    // markAsRemoved: function( obj )
    markAsRemoved: function(area) {
        area._e().hooks.trigger('Feature.remove', {feature: area}, area.getProvider());
        area.editState('removed', Date.now());

        tools.deHighlight(area);
    },


    // markAsModified: function( obj, saveView )
    markAsModified: function(area, saveView?: boolean) {
        area.editState('modified', Date.now());
        // feature.properties.editStates.modified = Date.now();
        // feature.__.isModified = Date.now();

        if (saveView || saveView === UNDEF) {
            area._e().objects.history.saveChanges();
        }
        return area;
    },


    //* *************************************** public area/link only ****************************************
    deleteShape: function(area, shape) {
        const props = shape.properties;
        const coords = tools.getCoords(area);
        const path = coords[props.poly][props.hole];

        if (path.length <= 4) {
            return false;
        }

        path.splice(shape.getIndex(), 1);

        tools._setCoords(area, coords);

        tools.deHighlight(area);
        tools._select(area);
        tools.markAsModified(area);

        return true;
    },

    // **************************************** only used by area shape ****************************************

    getCoords: (area) => {
        let coords = area.coord();
        return area.geometry.type == 'Polygon' ? [coords] : coords;
    },

    isClockwise: (poly) => {
        let area = 0;

        for (let i = 0, j, len = poly.length - 1; i < len; i++) {
            j = (i + 1) % len;

            area += poly[i][0] * poly[j][1];
            area -= poly[j][0] * poly[i][1];
        }

        return area < 0;
    },

    getMaxSpace: function(area: Area, point: Point, coordinates: Point[]): number {
        const iEdit = area._e();
        const x = point[0];
        const y = point[1];
        let width = 1e5; // make sure rays are intersecting with polygon
        const rays: Point[] = [
            [x + width, y - width],
            [x - width, y + width],
            [x + width, y + width],
            [x - width, y - width]
        ];

        width = Infinity;

        for (let i = 0, len = coordinates.length - 1; i < len; i++) {
            const j = (i + 1) % len;
            const p3 = iEdit.map.getPixelCoord(coordinates[i]);
            const p4 = iEdit.map.getPixelCoord(coordinates[j]);
            let r = 0;

            while (r < 4) {
                const pi = intersectLineLine(rays[r++], rays[r++], p3, p4, true);

                if (pi) {
                    const d = getDistance(point, <Point>pi);

                    if (d < width) {
                        width = d ^ 0;
                    }
                }
            }
        }
        return width;
    },


    forEachAt: function(area: Area, point: GeoJSONCoordinate, forEach) {
        const EDITOR = area._e();
        const round = (c) => Math.round(c * 1e9);
        const lon = round(point[0]);
        const lat = round(point[1]);
        const areas = EDITOR.objects.getInBBox([point[0], point[1], point[0], point[1]], EDITOR.getLayer(area));
        const snapCoordinates = area.behavior('snapCoordinates');
        let len = areas.length;

        while (len--) {
            const cArea = areas[len];
            const coords = tools.getCoords(cArea);
            let poly = coords.length;

            while (poly--) {
                let e = coords[poly].length;

                while (e--) {
                    const exterior = coords[poly][e];
                    let c = exterior.length - 1;

                    while (c--) {
                        if (round(exterior[c][0]) == lon && round(exterior[c][1]) == lat) {
                            if (cArea == area || snapCoordinates && cArea.behavior('snapCoordinates')) {
                                forEach(cArea, poly, e, c, coords);
                            }
                        }
                    }
                }
            }
        }
    },

    // getConnectedAreas: function( area, poly, ring, index  )
    // {
    //
    //     function round( c ){
    //         return c * 1e9 +.5^0;
    //     }
    //
    //     var pnt  = area.coord()[poly][ring][index];
    //     var lon  = round( pnt[0] );
    //     var lat  = round( pnt[1] );
    //
    //     return EDITOR.objects.getInBBox( area.bbox, EDITOR.getLayer(area) ).filter(function( cArea ){
    //
    //         var coords = cArea.coord();
    //         var poly   = coords.length;
    //
    //         while(poly--)
    //         {
    //             var exterior = coords[poly][0];
    //             var c        = exterior.length;
    //
    //             while( c-- )
    //             {
    //                 if( round(exterior[c][0]) == lon && round(exterior[c][1]) == lat )
    //                 {
    //                     console.log('pass');
    //                     return cArea;
    //                 }
    //             }
    //
    //         }
    //
    //     })
    //
    // },

    getPoly: function(area, point) {
        let coords = tools.getCoords(area);
        let min = Infinity;
        let pi = null;

        for (let p = 0, d; p < coords.length; p++) {
            d = distanceToPolygon(point, coords[p][0]);
            if (d < min) {
                min = d;
                pi = p;
            }
        }

        return pi;
    },

    addVShapes: addVShapes,

    getShp: function(area, polyIdx, holeIdx, index) {
        const shapes = getPrivate(area, 'shapePnts');

        for (let i = 0, props; i < shapes.length; i++) {
            props = shapes[i].properties;

            if (
                props.poly == polyIdx &&
                props.index == index &&
                props.hole == holeIdx
            ) {
                return shapes[i];
            }
        }
    },

    addShp: function(area, pos, polyIdx, holeIdx, index) {
        const coords = tools.getCoords(area);
        const poly = coords[polyIdx][holeIdx];
        const idx = typeof index == 'number'
            ? index
            : <number>getSegmentIndex(poly, pos) + 1;


        // filter out possible duplicate
        for (let i = 0; i < poly.length; i++) {
            if (poly[i][0] == pos[0] && poly[i][1] == pos[1]) {
                return false;
            }
        }

        poly.splice(idx, 0, pos);

        // area.attr('path', path);

        tools._setCoords(area, coords);

        // var shapes = prv.shapePnts;
        //
        // if( shapes.length )
        // {
        //     var startIdx = null;
        //
        //     shapes.forEach(function(shp, i){// set new correct index
        //         var shpProps = shp.properties;
        //
        //         if( shpProps.poly == polyIdx && shpProps.hole == holeIdx )
        //         {
        //             if( startIdx == null )
        //             {
        //                 startIdx = i;
        //             }
        //             shpProps.index += Number( shpProps.index >= idx );
        //         }
        //
        //     });
        //
        //     shapes.splice(
        //         startIdx + idx,
        //         0,
        //         new AreaShape( EDITOR, area, pos[0], pos[1], idx )
        //     );
        // }


        refreshGeometry(area);


        return idx;
    },

    hideShape: function(shp, overlay) {
        if (!(shp instanceof Array)) {
            shp = [shp];
        }

        for (let s = 0; s < shp.length; s++) {
            overlay.remove(shp[s]);
        }

        shp.length = 0;
    },

    willSelfIntersect: (polygon: Point[], shpPos: Point, index: number): boolean => {
        let i0 = index == 0 ? polygon.length - 2 : index - 1;
        let i1 = index + 1;
        for (let g = 0, g1, l = polygon.length - 1; g < l; g++) {
            g1 = g + 1;

            if (i1 == l) {
                if (g && g < i0) {
                    if (intersectLineLine(shpPos, polygon[i1], polygon[g], polygon[g + 1])) {
                        return true;
                    }
                }
            } else if (g != i1) {
                g1 %= l;
                if (index != g1 && g != index) {
                    if (intersectLineLine(shpPos, polygon[i1], polygon[g], polygon[g1])) {
                        return true;
                    }
                }
            }

            if (g > index) {
                g1 %= l;
                if (g1 != i0 && g != i0) {
                    if (intersectLineLine(polygon[i0], shpPos, polygon[g], polygon[g1])) {
                        return true;
                    }
                }
            } else if (g1 < i0 && g != index) {
                if (intersectLineLine(polygon[i0], shpPos, polygon[g], polygon[g1])) {
                    return true;
                }
            }
        }
        return false;
    },

    validateGeometry: (polygon: Point[]): boolean => {
        for (let i = 1; i < polygon.length - 1; i += 1) {
            if (tools.willSelfIntersect(polygon, polygon[i], i)) {
                return false;
            }
        }
        return true;
    }

};

export default tools;
