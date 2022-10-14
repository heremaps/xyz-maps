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

import RoutingPoint from './RoutingPoint';
import markerTools from '../marker/MarkerTools';
import {triggerEvent} from './triggerEvent';
import {Address} from './Address';
import {Place} from './Place';
import {Navlink} from '../link/Navlink';
import {EditableFeatureProvider, GeoJSONCoordinate} from '@here/xyz-maps-core';
import {JSUtils} from '@here/xyz-maps-common';
import {Location} from './Location';
import {Feature} from '@here/xyz-maps-editor';
import FeatureTools from '../feature/FeatureTools';
import {dragFeatureCoordinate} from '../oTools';

const DRAG_STOP = 'dragStop';
const DRAG_MOVE = 'dragMove';
const DRAG_START = 'dragStart';
const POINTER_UP = 'pointerup';
const POINTER_DOWN = 'pointerdown';
let linkTools;
let UNDEF;

type PlaceAddress = Place | Address;

const getPrivate = (feature, name?: string) => {
    let prv = feature.__;

    if (!prv) {
        prv = feature.__ = {
            isEditable: true,
            allowEdit: true,
            isGeoMod: false,
            isHovered: false,
            cLink: null,
            moved: false
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
}

const isPOI = (obj) => obj.class == 'PLACE';

const getRPoint = (obj): RoutingPoint => {
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
        location.editState('hovered', isPointerenter);
        if (!prv.isSelected) {
            if (isPointerenter) {
                showRoutingPoint(location, ev);
            } else {
                hideRoutingPoint(location, ev);
            }
        }
    }
}

function onPressmove(ev, dx, dy, ax, ay) {
    const feature = this;
    const prv = getPrivate(feature);
    const EDITOR = feature._e();

    if (prv.isSelected && !EDITOR._config.editRestrictions(feature, 1)) {
        if (!prv.moved) {
            // connect to a link if this object has link property, if not, do not connect to a link.
            if (tools.getRoutingData(feature).link != UNDEF) {
                tools.connect(feature, null);
            }
        }
        triggerEvent(feature, ev, 'display', prv.moved ? DRAG_MOVE : DRAG_START);

        let coordinate = <GeoJSONCoordinate>[...feature.geometry.coordinates];
        const altitude = EDITOR.getStyleProperty(feature, 'altitude');

        // place/address coordinates are "3d" in any case after being dragged.
        if (!altitude) {
            coordinate[2] = 0;
        }

        coordinate = dragFeatureCoordinate(ev.mapX, ev.mapY, feature, coordinate, EDITOR);

        tools._setCoords(feature, coordinate);

        prv.moved = true;
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

                triggerEvent(this, ev, 'display', moved ? DRAG_STOP : POINTER_UP);

                prv.moved = false;
            }
        },

        pointerdown: function(ev) {
            const prv = getPrivate(this);

            if (prv.allowEdit) {
                if (prv.isSelected) {
                    prv.moved = false;
                }
                triggerEvent(this, ev, 'display', POINTER_DOWN);
            }
        }

    },


    //* ************************************************** Internal only **************************************************

    // deHighlight: function( obj )
    deHighlight: function(feature: PlaceAddress) {
        const prv = getPrivate(feature);

        if (prv.selector) {
            feature._e().objects.overlay.remove(prv.selector);
        }
        prv.selector = null;

        if (prv.isSelected) {
            hideRoutingPoint(feature);

            prv.pressmove = null;

            prv.isSelected = false;
            // check for this.cLink as it's possible that there is no connected link on the map
            feature.editState('selected', false);

            if (prv.cLink) {
                linkTools.defaults(prv.cLink, feature.id);
            }
        }

        return feature;
    },

    _editable: function(feature: PlaceAddress, editable: boolean) {
        const prv = getPrivate(feature);

        if (editable != prv.allowEdit) {
            if (!editable) {
                // first dehighlight because it adds hoverevents!
                tools.deHighlight(feature);

                if (prv.isHovered) {
                    prv.isHovered.type = 'mouseout';
                    hideRoutingPoint(feature, prv.isHovered);
                }
            }

            prv.allowEdit = editable;
        }
    },

    _select: function(feature: PlaceAddress) {
        if (feature._e().objects.selection.select(feature)) {
            feature.editState('selected', true);

            getPrivate(feature).pressmove = onPressmove;

            tools.highlight(feature);

            showRoutingPoint(feature);
        }
    },

    _setCoords: function(feature: Feature, position: GeoJSONCoordinate) {
        return markerTools._setCoords(feature, position);
    },

    markAsRemoved: markerTools.markAsRemoved,

    markAsModified: function(feature: Feature, saveView?: boolean) {
        return FeatureTools.markAsModified(feature, getPrivate(feature), saveView);
    },

    _props: _props,

    //* ********************* internal link,loc only (used by container.highlight) **********************

    highlight: function(feature: PlaceAddress) {
        const prv = getPrivate(feature);

        if (!prv.selector) {
            const properties = {
                type: feature.class + '_SELECTOR',
                parentType: feature.class
            };

            const iEditor = feature._e();
            const zLayer = iEditor.display.getLayers().indexOf(iEditor.getLayer(feature));

            properties[feature.class] = {
                altitude: feature._e().getStyleProperty(feature, 'altitude'),
                zLayer
            };

            prv.selector = feature._e().objects.overlay.addCircle(
                <GeoJSONCoordinate>feature.geometry.coordinates,
                UNDEF, properties);
        }
        // this.show_routing_point();
    },

    //* *************************************** protected (rp) ****************************************

    getRoutingProvider: (feature: PlaceAddress | Location) => {
        const EDITOR = feature._e();
        const providerId = feature.getProvider().readRoutingProvider(feature,
            // deprecated fallback for MaphubProvider..
            EDITOR.layers.map((l) => <EditableFeatureProvider>l.getProvider())
        );
        return EDITOR.getProviderById(providerId);
    },

    getRoutingData: function(feature: PlaceAddress | Location) {
        const rp = feature.getProvider().readRoutingPoint(feature);

        // if (!rp.provider) {
        //     console.warn('no provider defined!');
        // }
        //
        // rp.layer = EDITOR.linkLayer.id;

        return rp;
    },

    setRoutingData: function(feature: Location) {
        const rPoint = getRPoint(feature);
        // get current link and routing point value and set the data
        const link = rPoint.getLink();
        const position = rPoint.coord();

        const prv = getPrivate(feature);

        prv.cLink = link;

        const d = Number('1e' + feature._e()._config.routingPointPrecision);
        const round = (n: number) => Math.round(n * d) / d;

        const newRP = position ? [
            round(position[0]),
            round(position[1]),
            position[2] | 0
        ] : [];

        const routingData = tools.getRoutingData(feature);

        const curRP = routingData.position || [];
        const linkId = link ? link.id : null;

        // only do history origin entry if routing point really changed
        if (
            routingData.link != linkId ||
            newRP[0] != round(curRP[0]) ||
            newRP[1] != round(curRP[1])
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
            tools._setCoords(feature, <GeoJSONCoordinate>feature.geometry.coordinates);
        }
    },

    //* ********************************* location specific internal **********************************
    connect: function(feature: PlaceAddress, link?: Navlink | false, rp?: GeoJSONCoordinate) {
        const prv = getPrivate(feature);

        if (prv.writeProp) {
            // currently in write routingpoint execution -> jump out!
            return;
        }

        const rPnt = getRPoint(feature);
        const currentLink = rPnt.getLink();
        const currentRP = (tools.getRoutingData(feature).position || []).slice();

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
        if (isPOI(feature) || prv.cLink) {
            tools.setRoutingData(feature);
        }

        if (prv.isSelected) {
            if (prv.cLink) {
                showRoutingPoint(feature);
            } else {
                hideRoutingPoint(feature);
            }
        }

        const newRP = tools.getRoutingData(feature).position || [];
        // make sure routingpoint has really changed before being marked as modified
        if (
            currentLink != prv.cLink ||
            currentRP[0] != newRP[0] ||
            currentRP[1] != newRP[1]
        ) {
            tools.markAsModified(feature, false);
        }
    },

    disconnect: function(feature: PlaceAddress) {
        let prv = getPrivate(feature);

        if (prv.writeProp) {
            // currently in write routingpoint execution -> jump out!
            return;
        }

        hideRoutingPoint(feature);

        getRPoint(feature).clearRoutingPoint();

        prv.cLink = null;

        // set pois to floating!
        if (!isPOI(feature)) {
            getRPoint(feature).setRoutingPoint();
        }

        tools.setRoutingData(feature);

        tools.markAsModified(feature, false);
    },

    getRoutingPosition: function(feature: PlaceAddress) {
        const rPnt = getRPoint(feature);
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
