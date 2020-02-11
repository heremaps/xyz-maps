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

import {JSUtils} from '@here/xyz-maps-common';
import FeatureSubmitter from '../providers/FeatureSubmitter';
import {layers} from '@here/xyz-maps-core';

export const eChanges = (HERE_WIKI) => {
    let isCommitInProcess = false;

    //* *******************************************************************************************************
    function clearTiles() {
        const commited = HERE_WIKI.objects.history.getChanges();
        const clearBBoxes = [];
        let feature;
        let provider;

        for (const layerId in commited) {
            provider = HERE_WIKI.getProviderById(layerId);

            for (const id in commited[layerId]) {
                feature = provider.search(id);

                // make sure featKeeper is not protecting the feature from being cleared after commit..
                // and can be refreshed/replaced with latest version returned from backend...
                if (feature) {
                    delete feature.properties['@ns:com:here:editor'];
                }

                clearBBoxes.push(provider, commited[layerId][id].bbox);
            }
        }


        for (let i = 0; i < clearBBoxes.length; i += 2) {
            provider = clearBBoxes[i];
            provider.clear.apply(provider, clearBBoxes[i + 1]);
        }
    }

    function commitCallback(layers?) {
        clearTiles();

        HERE_WIKI.objects.history.clear(layers);

        HERE_WIKI.display.refresh();
    }

    //* *******************************************************************************************************
    function commitChanges(modobjs, onSuccess, onError, transactionID) {
        if (!isCommitInProcess) {
            HERE_WIKI.objects.selection.clearSelected();

            HERE_WIKI.observers.change('ready', isCommitInProcess);

            isCommitInProcess = true;
            // HERE_WIKI.domHandler.blockEvents( isCommitInProcess = true );


            const featureSubmitter = new FeatureSubmitter(HERE_WIKI);
            featureSubmitter.submit(
                modobjs,
                (data) => {
                    isCommitInProcess = false;
                    onSuccess.call(null, data);
                },
                (data) => {
                    isCommitInProcess = false;
                    onError.call(null, data);
                },
                transactionID
            );
        }
    }

    return {

        /**
         *  Revert changes, fetch data from repository.
         *
         *  @public
         *  @expose
         *  @function
         *  @name here.xyz.maps.editor.Editor#revert
         */
        revert: () => {
            // var steps = that.currentStep;

            let steps = HERE_WIKI.observers.get('history.current');

            while (steps--) {
                HERE_WIKI.objects.history.recoverViewport(-1, true);
            }

            commitCallback();
        },

        /**
         *  Submit changes, return object Ids of submitted objects. Reload and render objects.
         *
         *  @public
         *  @expose
         *  @param {Object=} options
         *  @param {function=} options.onSuccess - callback function which returns additional information about the commit process.
         *  @param {function=} options.onError - callback function in error case.
         *  @param {string=} options.transactionId - transactionId of submit bundle.
         *  @param {boolean=} [options.ignoreEventBlock=false] - In some special cases when events are blocked(sync is triggered), set this to true to force commiting objects.
         *
         *  @return {Boolean}
         *      true, if there are changes to be submitted, false otherwise.
         *  @function
         *  @name here.xyz.maps.editor.Editor#submit
         */

        submit: (param) => {
            // callback is only called when submitted
            let modobjs;
            let modified = false;
            const markerLayers = [];
            let unsubmitted = false;
            var param = param || {};
            const ignoreEventBlock = param['ignoreEventBlock'];
            let layer = param['layer'];
            const onError = param['onError'];
            const onSuccess = param['onSuccess'];
            const transactionID = param['transactionId'];

            function cbCommitChange(idMap) {
                // show current view
                commitCallback(unsubmitted ? markerLayers : null);

                onSuccess && onSuccess({
                    'permanentIDMap': idMap
                });
            };


            function cbCommitChangeError(e) {
                // show current view including changes
                onError && onError(e);
            };

            if (typeof ignoreEventBlock == 'function') throw new Error('Invalid parameter!');


            if (!!ignoreEventBlock || !isCommitInProcess) { // !HERE_WIKI.domHandler.eventsBlocked()){
                layer = layer instanceof Array ? layer : [layer];
                for (const i in layer) {
                    const l = layer[i];
                    if (l && l instanceof layers.TileLayer && l['type'] == 'MARKER') {
                        l['base'] && markerLayers.push(l['base']);
                        l['delta'] && markerLayers.push(l['delta']);
                        l['src'] && markerLayers.push(l['src']);
                    }
                }

                modobjs = HERE_WIKI.objects.history.getChanges();

                for (const lid in modobjs) {
                    if (markerLayers.length > 0 && markerLayers.indexOf(lid) < 0) {
                        unsubmitted = true;
                        delete modobjs[lid];
                    } else {
                        modified = true;
                    }
                }


                if (modified) { // are objects modified or deleted ?
                    // clear simplified instances!
                    HERE_WIKI.objects.clear();

                    commitChanges(modobjs, cbCommitChange, cbCommitChangeError, transactionID);
                    return true;
                }
            }
            return false;
        },

        /**
         *  Get information of all modified Objects.
         *  an array of modified objects will be return by this function.
         *
         *  @function
         *  @public
         *  @expose
         *  @return {Array}
         *      Array of modified objects.
         *  @name here.xyz.maps.editor.Editor#info
         */
        info: () => {
            const pool = [];
            const lc = HERE_WIKI.objects.history.getChanges();

            for (const layerId in lc) {
                for (const id in lc[layerId]) {
                    pool[pool.length] = JSUtils.clone(lc[layerId][id]);
                }
            }
            return pool;
        },

        /**
         *  Export information of all modified Objects. A Json string of modified Objects will be return by this function.
         *
         *  @function
         *  @public
         *  @expose
         *  @return {String}
         *      Json String of modified Objects.
         *  @name here.xyz.maps.editor.Editor#export
         */
        export: () => JSON.stringify(
            HERE_WIKI.objects.history.getChanges()
        ),

        /**
         *  Import information of Objects. A Json string of Objects is imported to the editor.
         *
         *  @function
         *  @public
         *  @expose
         *  @param {String} json
         *      Json string of featuress.
         *  @name here.xyz.maps.editor.Editor#import
         */
        import: (json) => {
            if (typeof json == 'string') {
                json = JSON.parse(json);
            }
            return HERE_WIKI.objects.history.import(json);
        }
    };
};
