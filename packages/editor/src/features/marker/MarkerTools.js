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

const DRAG_STOP = 'dragStop';
const DRAG_MOVE = 'dragMove';
const DRAG_START = 'dragStart';
const POINTER_UP = 'pointerup';
let UNDEF;

function triggerEvent(marker, ev, type) {
    marker._e().listeners.trigger(ev, marker, type);
}

function getPrivate(feature, name) {
    let prv = feature.__;

    if (!prv) {
        prv = feature.__ = {
            isEditable: true
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

            // ,tap: function(e)
            // {
            //     EDITOR.listeners.trigger( e, this );
            // }

        },

    deHighlight: function(obj) {
        const prv = getPrivate(obj);


        if (prv.selector) {
            obj._e().objects.overlay.remove(prv.selector);

            prv.selector = null;

            prv.pointerdown = UNDEF;
            prv.pressmove = UNDEF;
        }
    },

    _editable: function(obj, e) {
        const prv = getPrivate(obj);

        if (e != UNDEF) {
            prv.isEditable = !!e;
        }

        tools.deHighlight(obj);

        return prv.isEditable;
    },


    _select: function(obj) {
        const EDITOR = obj._e();
        if (EDITOR.objects.selection.select(obj)) {
            const prv = getPrivate(obj);

            prv.pressmove = (ev, dx, dy, ax, ay) => {
                if (
                    prv.isEditable &&
                    prv.isSelected &&
                    !EDITOR._config.editRestrictions(obj/* this.getSimplified()*/, 1)
                ) {
                    EDITOR.map.pixelMove(
                        obj,
                        dx - prv.pdm[0],
                        dy - prv.pdm[1]
                    );

                    prv.pdm[0] = dx;
                    prv.pdm[1] = dy;

                    triggerEvent(obj, ev,
                        prv.moved
                            ? DRAG_MOVE
                            : DRAG_START
                    );

                    prv.moved = true;
                }
            };


            if (!prv.selector) {
                prv.selector = EDITOR.objects.overlay.addCircle(obj.coord(), UNDEF, {
                    'type': 'MARKER_SELECTOR'
                });
            }
        }
    },

    _setCoords: function(obj, pos) {
        obj._e().objects.history.origin(obj);

        const selector = getPrivate(obj, 'selector');

        if (selector) {
            selector._provider.setFeatureCoordinates(selector, pos);
        }

        // // window.PMAP = {};
        // var coords = this.geometry.coordinates;
        // var pid    = coords[0]+'|'+coords[1];
        // var stacks = PMAP[pid];
        //
        // console.log(pid,stacks);
        //
        // if( stacks )
        // {
        //     // stacks.splice( stacks.indexOf(this), 1 )[0]._style = UNDEF;
        //
        //     delete stacks[this.id];
        //
        //     stacks.length--;
        //
        //     // if( !stacks.length )
        //     {
        //         delete PMAP[pid];
        //     }
        //
        //
        //     for( var id in stacks )
        //     {
        //         if( id != 'length' )
        //         {
        //             stacks[id]._style = UNDEF;
        //             // HERE_WIKI.display.setStyleGroup( stacks[id] );
        //         }
        //
        //
        //     }
        //
        // }
        // this._style = UNDEF;

        obj._provider.setFeatureCoordinates(obj, pos.slice());
    },

    markAsRemoved: function(obj) {
        obj._e().hooks.trigger('Feature.remove', {feature: obj}, obj.getProvider());
        obj.editState('removed', Date.now());

        tools.deHighlight(obj);

        // obj._provider.removeFeature( obj );
    },

    markAsModified: function(obj, saveView) {
        obj.editState('modified', Date.now());

        if (saveView == UNDEF || saveView) {
            obj._e().objects.history.saveChanges();
        }
        return obj;
    }


};


export default tools;
