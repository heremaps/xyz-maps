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

import oTools from './oTools';
import InternalEditor from '../IEditor';
import EditFeature from './feature/Feature';

export default class SelectionHandler {
    private s: EditFeature[] = [];
    private ie: InternalEditor;
    private display;

    // stores feature that got cleared because of provider's visibilty changed (zoomlevel config)
    // will lead to automatic reselect if provider gets visible again.
    private zClearFeat: EditFeature = null;

    private add(feature: EditFeature) {
        oTools.private(feature).isSelected = true;
        this.s.push(feature);
    }
    private remove(feature: EditFeature) {
        const {s} = this;
        oTools.private(feature).isSelected = false;
        s.splice(s.indexOf(feature), 1);
    }

    constructor(HERE_WIKI: InternalEditor, display) {
        this.ie = HERE_WIKI;
        this.display = display;

        const that = this;

        // handle delselection of mapobject and it's overlay ui elements if data provider visibility is changed.
        // e.g. zoomlevel min max setting of provider.
        // only needed if keepFeatureSelection config is set, otherwise objects always become deselected.
        if (HERE_WIKI._config['keepFeatureSelection']) {
            let curZoomLevel = display.getZoomlevel();

            // use mapviewchangeend event instead ov zoomlevel observer to work around swm limitations..
            // objects are getting added during zoom animation in swm position is shifted during animation..
            display.addEventListener('mapviewchangeend', () => {
                const level = display.getZoomlevel();

                if (level != curZoomLevel) {
                    const sel = that.getCurSelObj() || that.zClearFeat;
                    let prov;
                    let min;

                    if (sel) {
                        prov = sel.getProvider();
                        min = prov.minLevel;

                        if (curZoomLevel >= min) {
                            if (level < min) {
                                that.clearSelected();
                                that.zClearFeat = sel;
                            }
                        } else if (level >= min) {
                            oTools._select(sel);
                        }
                    }
                }

                curZoomLevel = level;
            });
        }
    };

    select(feature: EditFeature) {
        const that = this;
        const curzl = that.display.getZoomlevel();
        const prov = <any>feature.getProvider();
        // TODO: remove =)
        // only allow object selection if feature's layer is visible to prevent visbility of created overlayobjects.
        if (curzl >= prov.minLevel && curzl <= prov.maxLevel) {
            that.clearSelected();
            this.add(feature);
            return true;
        }

        that.zClearFeat = feature;
    };

    getCurSelObj(): EditFeature {
        return this.s[0];
    }


    unselectFeature(force?: boolean) {
        let that = this;
        let obj;
        const iEditor = that.ie;

        if (force || !iEditor._config['keepFeatureSelection']) {
            if (obj = that.getCurSelObj()) {
                // clear possible displayed crossings form link's crossingtester
                const xTester = oTools.private(obj, 'xt');

                if (xTester) {
                    xTester.clear();
                }

                iEditor.listeners.trigger('featureUnselected', {'featureUnselected': true});
            }

            that.clearSelected();
        }
    };

    clearSelected(): EditFeature {
        let sel;
        let selected = this.s;
        const iEditor = this.ie;

        iEditor.listeners.trigger('_clearOverlay');

        selected.forEach((curEl) => {
            const deHighlight = oTools.getTool(curEl, 'deHighlight');

            // for all other objects
            if (deHighlight) {
                sel = curEl;
                deHighlight(curEl, true);
                // curEl.deHighlight( true );
                this.remove(curEl);
            }
            oTools.private(curEl).isSelected = false;
        });

        selected.length = 0;

        this.zClearFeat = null;

        iEditor.transformer.hide();

        return sel;
    };
}
