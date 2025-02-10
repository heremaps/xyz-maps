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

import oTools from './oTools';
import InternalEditor from '../IEditor';
import {Feature} from './feature/Feature';

export default class SelectionHandler {
    private s: Feature[] = [];
    private ie: InternalEditor;
    private display;

    private add(feature: Feature) {
        oTools.private(feature).isSelected = true;
        this.s.push(feature);
    }
    private remove(feature: Feature) {
        const {s} = this;
        oTools.private(feature).isSelected = false;
        s.splice(s.indexOf(feature), 1);
    }

    constructor(HERE_WIKI: InternalEditor, display) {
        this.ie = HERE_WIKI;
        this.display = display;
    };

    select(feature: Feature) {
        const zoomlevel = this.display.getZoomlevel();
        const layer = this.ie.getLayer(feature);

        // only allow object selection if feature's layer is visible/displayed.
        if (zoomlevel >= layer?.min && zoomlevel <= layer?.max) {
            this.clearSelected();
            this.add(feature);
            return true;
        }
    };

    getCurSelObj(): Feature {
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

    clearSelected(): Feature {
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

        iEditor.transformer.hide();

        iEditor._rngSel?.hide();

        return sel;
    };
}
