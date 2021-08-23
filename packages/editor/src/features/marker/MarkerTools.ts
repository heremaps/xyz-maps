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

import {Marker} from './Marker';
import {GeoJSONCoordinate} from '@here/xyz-maps-core';
import {Feature} from '../feature/Feature';
import FeatureTools from '../feature/FeatureTools';
import {Line} from '@here/xyz-maps-editor';

const DRAG_STOP = 'dragStop';
const DRAG_MOVE = 'dragMove';
const DRAG_START = 'dragStart';
const POINTER_UP = 'pointerup';
let UNDEF;

function triggerEvent(marker: Marker, ev, type: string) {
    marker._e().listeners.trigger(ev, marker, type);
}

function getPrivate(feature: Marker | Feature, name?: string) {
    let prv = feature.__;

    if (!prv) {
        prv = feature.__ = {
            isEditable: true,
            isGeoMod: false
        };
    }

    return name ? prv[name] : prv;
}

const tools = {


    private: getPrivate,

    _evl:
        {
            // Feature needs to be in selected state to make it draggable..
            // ..to makes sure map can still be dragged with many features in viewport..

            pointerdown: function() {
                const prv = getPrivate(this);
                prv.moved = false;
                prv.pdm = [0, 0];
            },

            pointerup: function(ev) {
                const prv = getPrivate(this);
                const moved = prv.moved;

                if (!prv.isSelected && this._e()._config['featureSelectionByDefault']) {
                    tools._select(this);
                } else if (moved) {
                    tools.markAsModified(this);
                }

                triggerEvent(this, ev,
                    moved
                        ? DRAG_STOP
                        : POINTER_UP
                );
            },

            pointerenter: function(e) {
                this._e().listeners.trigger(e, this);
            },
            pointerleave: function(e) {
                this._e().listeners.trigger(e, this);
            }

        },

    deHighlight: function(feature: Marker) {
        const prv = getPrivate(feature);


        if (prv.selector) {
            feature._e().objects.overlay.remove(prv.selector);

            prv.selector = null;

            prv.pointerdown = UNDEF;
            prv.pressmove = UNDEF;
        }
    },

    _editable: function(feture: Marker, e) {
        const prv = getPrivate(feture);

        if (e != UNDEF) {
            prv.isEditable = !!e;
        }

        tools.deHighlight(feture);

        return prv.isEditable;
    },


    _select: function(feature: Marker) {
        const EDITOR = feature._e();
        if (EDITOR.objects.selection.select(feature)) {
            const prv = getPrivate(feature);

            prv.pressmove = (ev, dx, dy, ax, ay) => {
                if (
                    prv.isEditable &&
                    prv.isSelected &&
                    !EDITOR._config.editRestrictions(feature/* this.getSimplified()*/, 1)
                ) {
                    EDITOR.map.pixelMove(
                        feature,
                        dx - prv.pdm[0],
                        dy - prv.pdm[1]
                    );

                    prv.pdm[0] = dx;
                    prv.pdm[1] = dy;

                    triggerEvent(feature, ev,
                        prv.moved
                            ? DRAG_MOVE
                            : DRAG_START
                    );

                    prv.moved = true;
                }
            };

            if (!prv.selector) {
                prv.selector = EDITOR.objects.overlay.addCircle(<GeoJSONCoordinate>feature.coord(), UNDEF, {
                    'type': 'MARKER_SELECTOR'
                });
            }
        }
    },

    _setCoords: function(feature: Feature, pos: GeoJSONCoordinate) {
        feature._e().objects.history.origin(feature);

        const selector = getPrivate(feature, 'selector');

        if (selector) {
            selector._provider.setFeatureCoordinates(selector, pos);
        }

        feature.getProvider().setFeatureCoordinates(feature, pos.slice());

        getPrivate(feature).isGeoMod = true;
    },

    markAsRemoved: function(feature: Marker) {
        feature._e().hooks.trigger('Feature.remove', {feature: feature}, feature.getProvider());
        feature.editState('removed', Date.now());

        tools.deHighlight(feature);
    },

    markAsModified: function(feature: Feature, saveView?: boolean) {
        return FeatureTools.markAsModified(feature, getPrivate(feature), saveView);
    }
};


export default tools;
