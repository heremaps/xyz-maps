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

import RoutingPoint from './RoutingPoint';
import markerTools from '../marker/MarkerTools';
import {JSUtils} from '@here/xyz-maps-common';
import {triggerEvent} from './triggerEvent';

let linkTools;
let UNDEF;


const getPrivate = (feature, name?: string) => {
    let prv = feature.__;

    if (!prv) {
        prv = feature.__ = {
            isEditable: true,
            allowEdit: true,

            isHovered: false,
            cLink: null,
            moved: false,
            prevDMove: null
        };
    }

    return name ? prv[name] : prv;
};


//* ***************************************************** PRIVATE ******************************************************

function _props(line, props) {
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
};


const toNTU = (c) => Math.round(c * 1e5) / 1e5;


const isPOI = (obj) => obj.class == 'PLACE';

const getRPoint = (obj) => {
    const prv = getPrivate(obj);

    if (prv._rp == null) {
        prv._rp = new RoutingPoint(obj, tools, linkTools);
    }

    return prv._rp;
};

// *********************************************************************************************************************


function showRoutingPoint(obj, ev?) {
    const isAddr = !isPOI(obj);
    const linkId = tools.getRoutingData(obj).link;
    const prv = getPrivate(obj);

    prv.isHovered = ev;

    // in case of invalid data a address is marked as floating ->
    // try to find nearest link in any case.
    const isFLoatingAddress = linkId || isAddr;

    if (linkId || isAddr) {
        const rPnt = getRPoint(obj);

        if (rPnt.updateRoutingPoint() || rPnt.setRoutingPoint()) {
            prv.cLink = rPnt.show();

            if (isFLoatingAddress) {
                tools.setRoutingData(obj);
            }
        }
    }

    if (ev) {
        triggerEvent(obj, ev);
    }
}

function hideRoutingPoint(obj, ev?) {
    const cLink = getPrivate(obj, 'cLink');

    getPrivate(obj).isHovered = !ev;


    if (cLink && linkTools.defaults(cLink, obj.id)) {
        if (linkTools.private(cLink, 'isSelected')) {
            linkTools.displayAsSelected(cLink);
        } else {
            // cLink.toggleHover( cLink.allowEdit );
        }
    }

    if (ev) {
        triggerEvent(obj, ev);
    }

    getRPoint(obj).hide();
}


function onHover(ev) {
    const location = this;
    const prv = getPrivate(location);
    const isPointerenter = ev.type == 'pointerenter';

    if (prv.allowEdit) {
        if (!prv.isSelected) {
            if (isPointerenter) {
                showRoutingPoint(location, ev);
            } else {
                hideRoutingPoint(this, ev);
            }
        }
        location.editState('hovered', isPointerenter);
    }
}

function onPressmove(ev, dx, dy, ax, ay) {
    const feature = this;
    const prv = getPrivate(feature);
    const EDITOR = feature._e();

    if (prv.isSelected && !EDITOR._config.editRestrictions(feature, 1)) {
        if (!prv.moved) {
            prv.moved = true;
            // connect to a link if this object has link property, if not, do not connect to a link.
            if (tools.getRoutingData(feature).link != UNDEF) {
                tools.connect(feature, null);
            }
            triggerEvent(feature, ev, 'display', 'dragStart');
        }

        const prevDMove = prv.prevDMove || [0, 0];
        const _dx = dx - prevDMove[0];
        const _dy = dy - prevDMove[1];

        EDITOR.map.pixelMove(feature, _dx, _dy);


        // var pixel = this._h.map.getEventsMapXY( ev, true );
        // pixel[2]  = this.geometry.coordinates[2];
        //
        // this.setCoordinates(
        //  this._h.map.getGeoCoord( pixel )
        // );


        prevDMove[0] = dx;
        prevDMove[1] = dy;

        prv.prevDMove = prevDMove;

        // move the connection line
        getRPoint(feature).updateStreetLine();
    }
}


const tools = {

    private: getPrivate,

    setLinkTools: function(lnkTools) {
        linkTools = lnkTools;
    },

    //* ************************************************** EVENTLISTENERS **************************************************

    _evl: {

        pointerenter: onHover,
        //* *************************************************************************
        pointerleave: onHover,

        dbltap: function(ev) {
            triggerEvent(this, ev);
        },

        pointerup: function dragStop(ev) {
            const prv = getPrivate(this);
            const moved = prv.moved;
            const EDITOR = this._e();

            if (prv.allowEdit) {
                if (!prv.isSelected) {
                    EDITOR.dump(this);

                    if (EDITOR._config['featureSelectionByDefault']) {
                        tools._select(this);
                    }
                }

                if (moved) {
                    getRPoint(this).show();

                    tools.markAsModified(this);
                }

                triggerEvent(this, ev, 'display', moved ? 'dragStop' : UNDEF);

                prv.moved = false;

                prv.prevDMove = null;
            }
        },

        pointerdown: function() {
            const prv = getPrivate(this);

            if (prv.allowEdit && prv.isSelected) {
                prv.moved = false;

                prv.prevDMove = null;
            }
        }

    },


    //* ************************************************** Internal only **************************************************

    // deHighlight: function( obj )
    deHighlight: function(obj) {
        const prv = getPrivate(obj);

        if (prv.selector) {
            obj._e().objects.overlay.remove(prv.selector);
        }
        prv.selector = null;

        if (prv.isSelected) {
            hideRoutingPoint(obj);

            prv.pressmove = null;

            prv.isSelected = false;
            // check for this.cLink as it's possible that there is no connected link on the map
            obj.editState('selected', false);

            if (prv.cLink) {
                linkTools.defaults(prv.cLink, obj.id);
            }
        }

        return obj;
    },

    // _editable: function( obj, e )
    _editable: function(obj, editable) {
        const prv = getPrivate(obj);

        if (editable != prv.allowEdit) {
            if (!editable) {
                // first dehighlight because it adds hoverevents!
                tools.deHighlight(obj);

                if (prv.isHovered) {
                    prv.isHovered.type = 'mouseout';
                    hideRoutingPoint(obj, prv.isHovered);
                }
            }

            prv.allowEdit = editable;
        }
    },


    // _select: function( obj ){
    _select: function(obj) {
        if (obj._e().objects.selection.select(obj)) {
            obj.editState('selected', true);

            getPrivate(obj).pressmove = onPressmove;

            tools.highlight(obj);

            showRoutingPoint(obj);
        }
    },


    // _setCoords: function( obj, pos )
    _setCoords: markerTools._setCoords,


    // markAsRemoved: function( obj )
    markAsRemoved: markerTools.markAsRemoved,


    // markAsModified: function( obj, saveView )
    markAsModified: markerTools.markAsModified,


    _props: _props,

    //* ********************* internal link,loc only (used by container.highlight) **********************

    highlight: function(obj) {
        const prv = getPrivate(obj);

        if (!prv.selector) {
            prv.selector = obj._e().objects.overlay.addCircle(obj.geometry.coordinates, UNDEF, {
                'type': obj.class + '_SELECTOR'
            });
        }

        // this.show_routing_point();
    },

    //* *************************************** protected (rp) ****************************************

    getRoutingProvider: (feature) => {
        const EDITOR = feature._e();
        const providerId = feature.getProvider().readRoutingProvider(feature,
            // deprecated fallback for MaphubProvider..
            EDITOR.layers.map((l) => l.getProvider())
        );
        return EDITOR.getProviderById(providerId);
    },

    getRoutingData: function(feature) {
        const rp = feature.getProvider().readRoutingPoint(feature);

        // if (!rp.provider) {
        //     console.warn('no provider defined!');
        // }
        //
        // rp.layer = EDITOR.linkLayer.id;

        return rp;
    },

    setRoutingData: function(feature) {
        const rPoint = getRPoint(feature);
        // get current link and routing point value and set the data
        const link = rPoint.getLink();
        const position = rPoint.coord();

        const prv = getPrivate(feature);

        prv.cLink = link;

        const newRP = position ? [
            toNTU(position[0]),
            toNTU(position[1]),
            position[2] | 0
        ] : [];

        const routingData = tools.getRoutingData(feature);

        const curRP = routingData.position || [];
        const linkId = link ? link.id : null;

        // only do history origin entry if routing point really changed
        if (
            routingData.link != linkId ||
            newRP[0] != toNTU(curRP[0]) ||
            newRP[1] != toNTU(curRP[1])
        ) {
            feature._e().objects.history.ignore(() => {
                // prevents infinity loop if rp writer is using .prop() function to set rp value
                // because .prop() will call connect to make sure
                // the connection gets created in case of rp val is changed
                prv.writeProp = true;
                feature.getProvider().writeRoutingPoint(feature,
                    link,
                    position
                        ? newRP
                        : position
                );
                delete prv.writeProp;
            });

            // also (re)set the display coordinates to make sure
            // point coordinates are getting changed and
            // correct new bbox for point is calculated.
            // Provider is taking care of bbox calculation.
            tools._setCoords(feature, feature.geometry.coordinates);
        }
    },

    //* ********************************* location specific internal **********************************
    connect: function(obj, link?, rp?) {
        const prv = getPrivate(obj);

        if (prv.writeProp) {
            // currently in write routingpoint execution -> jump out!
            return;
        }

        const rPnt = getRPoint(obj);
        const currentLink = rPnt.getLink();
        const currentRP = (tools.getRoutingData(obj).position || []).slice();

        if (currentLink) {
            linkTools.defaults(currentLink);
        }

        // connect to the given link
        if (link) {
            prv.cLink = rPnt.setRoutingPoint(link, rp);
        } else if (!(prv.cLink = rPnt.updateRoutingPoint()) && link !== false) {
            // simply update routing point if link is given as false
            // update routing point, if connected link is not found, connect to a link nearby
            prv.cLink = rPnt.setRoutingPoint();
        }

        // pntaddr are not allowed to be set as floated!
        if (isPOI(obj) || prv.cLink) {
            tools.setRoutingData(obj);
        }

        if (prv.isSelected) {
            if (prv.cLink) {
                showRoutingPoint(obj);
            } else {
                hideRoutingPoint(obj);
            }
        }

        const newRP = tools.getRoutingData(obj).position || [];
        // make sure routingpoint has really changed before being marked as modified
        if (
            currentLink != prv.cLink ||
            currentRP[0] != newRP[0] ||
            currentRP[1] != newRP[1]
        ) {
            tools.markAsModified(obj, false);
        }
    },

    disconnect: function(obj) {
        let prv = getPrivate(obj);

        if (prv.writeProp) {
            // currently in write routingpoint execution -> jump out!
            return;
        }

        hideRoutingPoint(obj);

        getRPoint(obj).clearRoutingPoint();

        prv.cLink = null;

        // set pois to floating!
        if (!isPOI(obj)) {
            getRPoint(obj).setRoutingPoint();
        }

        tools.setRoutingData(obj);

        tools.markAsModified(obj, false);
    },

    getRoutingPosition: function(obj) {
        const rPnt = getRPoint(obj);
        let rpPos = rPnt.coord();

        if (!rpPos) {
            rPnt.updateRoutingPoint();

            rpPos = rPnt.coord();
        }
        return rpPos && [
            rpPos[0],
            rpPos[1],
            rpPos[2] || 0
        ] || UNDEF;
    }
};

export default tools;
