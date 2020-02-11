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

import {JSUtils, geotools} from '@here/xyz-maps-common';
import {providers, features} from '@here/xyz-maps-core';
import GeoFence from './GeoFence';
import NavLink from './NavLink';
import {FeatureProvider} from '@here/xyz-maps-core/src/providers/FeatureProvider';


const NS_EDITOR = '@ns:com:here:editor';

type GeoJSONFeature = {
    type: 'Feature',
    geometry: any,
    properties?: {}
}

type LinkShapeProperties = {
    isNode: boolean;
    isConnected: boolean;
    parent: NavLink;
};

let linkTools;
let geoFence;
let UNDEF;


type ConnectedLinkDetails = { link: NavLink, index: number };

type EventHandler = (e, dx?: number, dy?: number) => void;

type PrivateData = {
    line: NavLink,
    _cls: NavLink[],
    cLinks: ConnectedLinkDetails[],
    drg: boolean,
    x: number,
    y: number,
    index: number,
    dblclick: EventHandler,
    pressmove: EventHandler,
    pointerdown: EventHandler,
    pointerup: EventHandler,
    pointerenter: EventHandler;
    pointerleave: EventHandler;
}

const getPrivate = (shp: any): PrivateData => {
    return shp.__ || (shp.__ = {});
};


//* *************************************************************************
const toggleFillStrokeColors = (obj) => {
    // var style = EDITOR.objects.getStyleGroup(obj.json);
    // EDITOR.setStyle(obj,[[0,defaultStyles]]);
    // var attrs = obj.attr();
    // obj.attr({ fill: attrs.stroke, stroke: attrs.fill });
};

const connectShpToNearestLink = (line: NavLink, index: number) => {
    const coordinate = line.coord()[index];
    const ignore = <NavLink[]>line.getConnectedLinks(index);
    const EDITOR = line._e();
    let connectionCandidate;
    let foundPos;

    ignore.push(line);

    // coordinate.slice(0,2), // do not pass zlevel to skip zlevel check..
    connectionCandidate = EDITOR.objects.getNearestLine(coordinate, line.getProvider(), {
        maxDistance: EDITOR._config['autoConnectShapeDistance'],
        ignore: ignore.map((link) => link.id)
    });


    if (connectionCandidate != null) { // check for selfconnect
        foundPos = connectionCandidate.point;

        foundPos[2] = coordinate[2] || 0;

        if (linkTools.connectShpToLink(
            line,
            index,
            connectionCandidate = connectionCandidate.line,
            foundPos
        ) === null) {
            connectionCandidate = null;
        }
    }
    return connectionCandidate;
};

//* *************************************************************************

function handleEvent(ev, type?) {
    getPrivate(this).line._e().listeners.trigger(ev, this/* ._simplified*/, type);
}

function onMouseDownShape() {
    const shapePnt = this;
    var prv = getPrivate(shapePnt);
    const line = prv.line;
    const EDITOR = line._e();

    prv._cls = prv.cLinks.map((cl) => cl.link);

    prv.drg = false;

    const coord = this.geometry.coordinates;
    const startPixel = EDITOR.display.geoToPixel.apply(EDITOR.display, coord);
    var prv = getPrivate(shapePnt);

    prv.x = startPixel.x;
    prv.y = startPixel.y;


    toggleFillStrokeColors(shapePnt);

    EDITOR.dump(shapePnt);

    linkTools.removeShapePnts(line, true);

    EDITOR.listeners.trigger('_clearOverlay');

    linkTools.hideDirection(line);

    // disable mouse events for all connected links of the shape
    // shapePnt.cLinks.forEach(function(cl){
    //     cl.link.toggleHover(false);
    // });

    // line.toggleHover(false);

    geoFence = new GeoFence(EDITOR, coord[0], coord[1]);
}


function onMouseMoveShape(ev, dx, dy) {
    const shp = this;
    const prv = getPrivate(shp);
    const link = prv.line;
    const EDITOR = link._e();
    const cfg = EDITOR._config;

    let curPos = EDITOR.map.getGeoCoord(
        prv.x + dx,
        prv.y + dy
    );


    if (!cfg.editRestrictions(link, 1)) {
        if (geoFence.isPntInFence(curPos)) {
            !geoFence.isHidden() && geoFence.hide();

            if (cfg['autoSnapShape']) {
                const searchSnapDistanceMeter = (21 - EDITOR.display.getZoomlevel()) * 2;
                // var searchSnapDistanceMeter = 4;
                const closeLinks = link.getProvider().search({point: curPos, radius: searchSnapDistanceMeter});

                let cLen = closeLinks.length;
                let cl;

                while (cl = closeLinks[--cLen]) {
                    if (cl.id != link.id && prv._cls.indexOf(cl) == -1) {
                        const f = EDITOR.map.calcCrossingAt(
                            cl.geometry.coordinates,
                            curPos,
                            cfg['minShapeDistance'],
                            UNDEF,
                            searchSnapDistanceMeter
                        );

                        if (f && f.index != UNDEF) {
                            curPos = f;
                            break;
                        }
                    }
                }
            }

            linkTools.moveShapeAtIndexTo(link, prv.index, curPos[0], curPos[1]);

            if (!prv.drg) {
                prv.drg = true;
                handleEvent.call(shp, ev, 'dragStart');
            }
            // just handle the visuals. real marking as modified is done in dragstop
            // cLinks.forEach(function(cl){ cl.link.markAsModified( false, false ) });
        } else if (geoFence.isHidden()) {
            geoFence.show();
        }
    }
}


function onMouseUpShape(ev) {
    const shp = this;
    const prv = getPrivate(shp);
    let index = prv.index;
    const isMoved = prv.drg;
    let isModified = false;
    const line = prv.line;
    let isGeoAutoFixed = false;
    let indexChanged = false;
    const orgCLinks = prv.cLinks;
    let connected;
    let AFInfo;

    toggleFillStrokeColors(shp);

    prv._cls = null;

    // reenabale mouse move event for all connected links of the shape
    // orgCLinks.forEach(function(cl){
    //     cl.link.toggleHover( true )
    // });

    if (isMoved) {
        AFInfo = linkTools.fixGeo(line, index);

        if (typeof AFInfo == 'boolean') {
            isGeoAutoFixed = !AFInfo;
        } else {
            isGeoAutoFixed = AFInfo >= 0;

            if (indexChanged = (index != AFInfo)) {
                // index switched
                index = AFInfo;
            }
        }
    }

    linkTools.showDirection(line);

    if (geoFence.isHidden() && !isGeoAutoFixed && isMoved) {
        connected = connectShpToNearestLink(line, index);
    }

    if (!connected) {
        // check if shape is moved
        if (isMoved) {
            // if link hast been del or split due to autoGeofix use original CLinks otherwise get current CLinks
            (AFInfo === false ? orgCLinks : line.getConnectedLinks(index, true))
                .forEach((clink) => {
                    // if index of cLinks has changed refresh geometry is also needed to calc correct new shape indices
                    const cAFInfo = linkTools.fixGeo(clink.link, clink.index);

                    indexChanged = typeof cAFInfo == 'number' || !cAFInfo || indexChanged;

                    // just handle the visuals. real marking/ viewport save is done later..
                    linkTools.markAsModified(clink.link, false, false);
                });
            isModified = true;
        }
        linkTools.createAddShapePnts(line);
    }

    if (geoFence) {
        geoFence.remove();
    }


    prv.drg = false;

    // refresh geometry to update shape objects with correct indices and cLinks
    if (indexChanged || isMoved) {
        linkTools.refreshGeometry(line);
    }

    // make sure valid shape object is available even if shape changed due to geometry restrictions
    line._e().listeners.trigger(
        ev,

        line.editState('removed')
            ? shp// _simplified
            : linkTools.private(line, 'shps')[index], // ._simplified,

        isMoved
            ? 'dragStop'
            : undefined
    );

    if (isModified) {
        // ...finally save the viewport
        linkTools.markAsModified(line, true, false);
    }
}

function mouseOutHandler() {
    const shapePnt = this;
    const prv = getPrivate(shapePnt);
    document.body.style.cursor = 'default';

    prv.cLinks.forEach((cl) => {
        linkTools.defaults(cl.link);
    });

    delete this.properties[NS_EDITOR].hovered;

    prv.line._e().setStyle(this);
}


function mouseInHandler() {
    const shapePnt = this;
    const prv = getPrivate(shapePnt);
    const EDITOR = prv.line._e();

    document.body.style.cursor = 'move';

    prv.cLinks.forEach((cl) => {
        const style = EDITOR.getStyle(cl.link);

        for (let s = 0; s < style.length; s++) {
            style[s].opacity = 0.5;
        }
        EDITOR.setStyle(cl.link, style);
    });

    this.properties[NS_EDITOR].hovered = true;

    EDITOR.setStyle(this);
}


//* *************************************************************************

/**
 *  The interface represents link shape point.
 *  @class
 *  @public
 *  @expose
 *
 *  @name here.xyz.maps.editor.features.Navlink.Shape
 */
class LinkShape extends features.Feature {
    class: 'NAVLINK_SHAPE';
    properties: LinkShapeProperties;

    private __: PrivateData;

    constructor(line: NavLink, pos, i, lnkTools) {
        linkTools = lnkTools;

        // const connectedLinks = EDITOR.objects.tools.getCLinksForShape(line, i);
        const EDITOR = line._e();
        const connectedLinks = line.getConnectedLinks(i, true);

        // const overlay = EDITOR.objects.overlay;
        const isNode = (i == 0 || i == line.geometry.coordinates.length - 1);

        const shapePnt: GeoJSONFeature = {

            type: 'Feature',

            geometry: {
                type: 'Point',

                coordinates: pos.slice()
            },
            properties: {

                'isNode': isNode,

                'isConnected': !!connectedLinks.length,

                '@ns:com:here:editor': {},

                'NAVLINK': {
                    'properties': JSUtils.extend(true, {}, line.properties),
                    'style': EDITOR.getStyle(line)
                },

                'parent': line
            }
        };

        // TODO: cleanup provider add/attach to feature
        super(shapePnt, <FeatureProvider>EDITOR.objects.overlay.layer.getProvider());

        const prv = getPrivate(this);

        prv.index = i;
        prv.line = line;
        prv.drg = false;
        // store connected link-shapes of current shape for moving
        prv.cLinks = <ConnectedLinkDetails[]>connectedLinks;

        prv.dblclick = handleEvent;

        prv.pressmove = onMouseMoveShape;

        prv.pointerdown = onMouseDownShape;

        prv.pointerup = onMouseUpShape;


        if (!EDITOR._config.editRestrictions(line, 1)) {
            prv.pointerenter = mouseInHandler;
            prv.pointerleave = mouseOutHandler;
        }
    }


    /**
     *  Get the link to which this object belongs.
     *
     *  @public
     *  @expose
     *  @return {here.xyz.maps.editor.features.Navlink}
     *      link
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink.Shape#getLink
     */
    getLink() {
        return this.properties.parent;
    }

    /**
     *  Checks if shape is start or end shape (Node) of the link
     *
     *  @public
     *  @expose
     *  @return {boolean}
     *      true if node
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink.Shape#isNode
     */
    isNode() {
        return this.properties.isNode;
    };

    /**
     *  Checks if shape is overlapping with shape of other link.
     *
     *  @public
     *  @expose
     *  @return {boolean}
     *      true if it overlapps with another shape, false otherwise.
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink.Shape#isOverlapping
     */
    isOverlapping() {
        return linkTools.checkOverlapping(
            this.properties.parent,
            this.getIndex()
        );
    };

    /**
     *  Get the index of the shape point.
     *
     *  @public
     *  @expose
     *  @return {number}
     *      The index of the shape point.
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink.Shape#getIndex
     */
    getIndex() {
        return getPrivate(this).index;
    };

    /**
     *  Show turn restrictions of the selected link shape point.
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink.Shape#editTurnRestrictions
     *  @return {here.xyz.maps.editor.features.TurnRestriction}
     */
    editTurnRestrictions() {
        if (this.isNode()) {
            return this.getLink().editTurnRestrictions(this.getIndex())[0];
        }
    };

    /**
     *  Get an array of NAVLINKs representing the links which are connected to this shape point.
     *
     *  @public
     *  @expose
     *  @return {Array.<here.xyz.maps.editor.features.Navlink>}
     *      An array of link objects.
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink.Shape#getConnectedLinks
     */
    getConnectedLinks() {
        return this.getLink().getConnectedLinks(this.getIndex());
    };


    /**
     *  Remove this object.
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink.Shape#remove
     */
    remove() {
        const link = this.getLink();

        if (!link._e()._config.editRestrictions(link || this, 2)) {
            linkTools.deleteShape(link, this);
        }
    };

    /**
     *  Disconnect the selected link from the other connected links at this shape point.
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink.Shape#disconnect
     */
    disconnect() {
        const shape = this;
        const prv = getPrivate(shape);
        const EDITOR = prv.line._e();

        if (shape.isNode() && prv.cLinks.length) {
            const line = prv.line;
            const index = prv.index;
            const coords = line.coord();
            const p1 = coords[index];
            const p2 = coords[index + (!index ? 1 : -1)];
            const bearing = 90 - geotools.calcBearing(p1, p2);
            const pnt = EDITOR.map.movePoint(
                p1,
                EDITOR._config['disconnectShapeDistance'],
                bearing
            );


            EDITOR.hooks.trigger('Navlink.disconnect', {
                link: line,
                index: index
            }, line.getProvider());

            coords[index][0] = pnt[0];
            coords[index][1] = pnt[1];

            linkTools._setCoords(line, coords);
            linkTools.fixGeo(line);
            linkTools.refreshGeometry(line);
            linkTools.markAsModified(line);
        }
    };


    /**
     *  Splits the link. The selected shape will become ref/nref node of the newly created links. Only available
     *  if possible.
     *
     *  @public
     *  @expose
     *  @return {Array.<here.xyz.maps.editor.features.Navlink>}
     *      An array of link objects.
     *
     *  @example
     *  var links = shapePoint.splitLink();
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Navlink.Shape#splitLink
     */
    splitLink() {
        let childs;
        const link = this.getLink();
        const EDITOR = link._e();

        if (!this.isNode()) {
            childs = EDITOR.objects.splitLinkAt({
                link: link,
                index: this.getIndex()
            });

            if (childs.length) {
                // function animate(line, index) {
                //  var p = line.coord(),
                //      index1 = index == 0 ? 0 : p.length - 1,
                //      animation = 'elastic',
                //      duration = 250,
                //      distance = 0.00001,
                //      index2 = index1 == 0 ? 1 : p.length - 2,
                //      pnt = VectorHelpers.getPointAtLength(p, index1 == 0
                //              ? distance
                //              : (VectorHelpers.getTotalLength(p) - distance)
                //      ),
                //      _pnt = p[index1].slice(0);
                //
                //  p[index1][0] = pnt[0],
                //  p[index1][1] = pnt[1];
                //
                //  line.animate(p, duration, animation, function () {
                //      p[index1][0] = _pnt[0];
                //      p[index1][1] = _pnt[1];
                //      line.animate(p, duration, animation);
                //  });
                //  //      outLine.animate( path., 600, 'elastic' );
                // }
                //
                // animate(links[0], -1);
                // animate(links[1], 0);

                EDITOR.objects.history.saveChanges();
            }
        }
        return childs;
    };
}


/**
 *  identify the feature class: "NAVLINK_SHAPE"
 *
 *  @readonly
 *  @public
 *  @expose
 *  @type {String}
 *
 *  @name here.xyz.maps.editor.features.Navlink.Shape#class
 */

LinkShape.prototype.class = 'NAVLINK_SHAPE';

export default LinkShape;
