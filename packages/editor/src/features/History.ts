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
import Feature from './feature/Feature';

const EDITOR_NS = '@ns:com:here:editor';

type Snapshot = { [layerId: string]: { [id: string]: Feature } };

class SnapshotStorage {
    private steps: { [index: number]: Snapshot };

    constructor() {
        this.steps = {};
    }

    private clone(json) {
        return json ? JSON.parse(JSON.stringify(json)) : json;
    }

    add(step: number, layerId: string, feature: Feature) {
        // var layerId   = feature.properties.layerId;
        const data = this.steps[step] || {};
        const layerData = data[layerId] = data[layerId] || {};
        const id = feature.id;

        if (!layerData[id]) {
            // console.log('..REMO remembered',feature.id,'in',step);
            layerData[id] = feature;
            this.set(step, data);
            return true;
        }
    };

    remove(step: number, layerId: string, feature: Feature): boolean {
        try {
            let data = this.steps[step][layerId];
            let id = feature.id;
            if (data[id]) {
                delete data[id];
                this.set(step, this.steps[step]);
                return true;
            }
        } catch (e) {
        }
        return false;
    }

    get(step: number): Snapshot {
        return this.clone(this.steps[step]);
    }

    set(step: number, data: Snapshot) {
        this.steps[step] = this.clone(data);
    };

    clear() {
        const steps = this.steps;
        for (const s in steps) {
            delete steps[s];
        }
    };
}

//* *****************************************************************************************

const getEditStates = (geojson) => {
    return geojson.properties[EDITOR_NS];
};

const createGeoJSON = (feature) => {
    const cpy = feature.toJSON();
    const editStates = getEditStates(cpy);

    cpy.class = feature.class;

    if (editStates) {
        // do not copy over editStates
        delete editStates.hovered;
        delete editStates.selected;
    }

    return cpy;
};
//* *****************************************************************************************

const getModifiedObjects = (changesOfCurrentStep): { data: Snapshot, length: number } => {
    const pool: Snapshot = {};
    let count = 0;

    for (const layerId in changesOfCurrentStep) {
        pool[layerId] = {};

        for (const id in changesOfCurrentStep[layerId]) {
            pool[layerId][id] = createGeoJSON(changesOfCurrentStep[layerId][id]);
            count++;
        }
    }
    return {
        data: pool,
        length: count
    };
};

const isGhost = (o) => {
    const editStates = getEditStates(o);
    return editStates.created && editStates.removed;
    // o = o.__;
    // return o.isCreated && o.isDeleted;
};

const isObjectModified = (o) => {
    const editStates = getEditStates(o);
    return editStates.modified || editStates.removed || editStates.split || editStates.created;
    // o = o.__;
    // return !!(o.isModified || o.isDeleted || o.isSplit || o.isCreated);
};

//* *****************************************************************************************


class History {
    private iEdit;

    private current = 0;
    private total = 0;
    private storage: SnapshotStorage;
    private changes = {};
    private cached = null; // change data cached for performance reasons..
    private _a = true; // active

    private updateObservers(force?: boolean) {
        let history = this;
        let observers = history.iEdit.observers;

        observers.change('changes.length', history.getLength());

        observers.change('history.length', history.total);

        observers.change('history.current',
            // HERE_WIKI.observers.change( 'currentChangeStep',
            history.current,
            // set force to make sure observers are triggered...
            // even if step is 0 already in case of revert...
            force
        );
    }

    constructor(HERE_WIKI) {
        const history = this;

        history.iEdit = HERE_WIKI;
        history.storage = new SnapshotStorage();
    }


    getTotal(): number {
        return this.total;
    }

    getLength(): number {
        const totalChangeSet = this.getChanges();
        let changed = 0;

        for (const layerid in totalChangeSet) {
            for (const id in totalChangeSet[layerid]) {
                // filter out origins...
                if (!getEditStates(totalChangeSet[layerid][id]).origin) {
                    changed++;
                }
            }
        }

        return changed;
    };


    remove(feature) {
        const providerId = feature.getProvider().id;
        if (this.storage.remove(this.current, providerId, feature)) {
            delete this.changes[providerId][feature.id];
            this.cached = null;
        }
    }

    origin(feature, initialCreation?: boolean) {
        const id = feature.id;
        const layerId = feature.getProvider().id;
        const storage = this.storage;
        const currentChanges = this.changes;
        const currentStep = this.current;
        const previousStorage = storage[currentStep];
        let layerChangeStep = currentChanges[layerId];


        if (!layerChangeStep) {
            layerChangeStep = currentChanges[layerId] = {};
        }

        layerChangeStep[id] = feature;


        // check if origin is already known/stored in storage
        if (!previousStorage || !previousStorage[layerId] || !previousStorage[layerId][id]) {
            const geojson = createGeoJSON(feature);
            const editStates = getEditStates(geojson);

            if (initialCreation) {
                // mark new objects in prior step before the creation as deleted for undo removal.
                editStates['removed'] = true;
            }

            editStates['origin'] = true;

            storage.add(currentStep, layerId, geojson);
        }
    };

    saveChanges(): number {
        const history = this;
        let changed = 0;

        if (history.active()) {
            history.cached = null;

            let modified = getModifiedObjects(history.changes);

            // only create changestep if data has changed
            if (changed = modified.length) {
                const current = ++history.current;

                history.storage.set(current, modified.data);

                if (current > history.total) {
                    history.total++;
                } else {
                    history.total = current;
                }

                history.iEdit.dump('History step saved...', current, 'warn');

                history.changes = {};

                history.updateObservers();
            }
        }
        return changed;
    };

    getChanges() {
        if (!this.cached) {
            const storage = this.storage;
            const current = this.current;
            const modified = {};

            for (let s = 1, step; s <= current; s++) {
                step = storage.get(s);

                // filter out origins..
                for (const layerId in step) {
                    for (const id in step[layerId]) {
                        const obj = step[layerId][id];

                        if (isGhost(obj)) {
                            if (modified[layerId] && modified[layerId][id]) {
                                delete modified[layerId][id];
                            }
                        } else if (isObjectModified(obj)) {
                            (modified[layerId] = modified[layerId] || {})[id] = obj;
                        }
                    }
                }
            }
            this.cached = modified;
        }
        return this.cached;
    };

    clear() {
        const history = this;
        // TODO: only clear per layer needed ?
        history.storage.clear();
        history.current = 0;
        history.total = 0;
        history.changes = {};
        history.cached = null;
        this.updateObservers(true);
    };

    import(data) {
        const history = this;
        const storage = history.storage;

        for (const layerId in data) {
            for (const id in data[layerId]) {
                const found = history.iEdit.objects.get(id, layerId);

                if (found) {
                    history.origin(found);
                } else {
                    // if object is not present in provider
                    // -> create origin object in current save set for later for undo removal/delete.
                    const cpy = JSUtils.extend(true, {}, data[layerId][id]);
                    const editStates = cpy.properties[EDITOR_NS] = cpy.properties[EDITOR_NS] || {};
                    editStates.removed = true;
                    editStates.origin = true;

                    storage.add(history.current, layerId, cpy);
                }
            }
        }

        history.total = ++history.current;

        storage.set(history.current, data);


        history.recoverViewport(0);
    };

    recoverViewport(stepOffset, skipObservers?) {
        const t = +new Date;
        const stepToRecover = this.current + stepOffset;
        const snapshot = this.storage.get(stepToRecover);
        const layers = [];
        const HERE_WIKI = this.iEdit;

        this.cached = null;

        if (stepToRecover >= 0 && stepToRecover <= this.total) {
            HERE_WIKI.objects.selection.unselectFeature();

            HERE_WIKI.dump(arguments, stepToRecover, 'REBUILDED VIEW IN', +new Date - t, 'ms');

            // clearSelectedFeature
            if (HERE_WIKI.objects.selection.getCurSelObj()) {
                HERE_WIKI.listeners.trigger('featureUnselected', {'featureUnselected': true});
            }


            HERE_WIKI.objects.selection.clearSelected();

            // sort snapshot. Links need to be handled first to make sure all other features having dependencies to
            // links can be restored correctly. (eg: Place/Address routing point)
            const features = [];
            for (let layerId in snapshot) {
                let layerSnapshot = snapshot[layerId];
                for (let id in layerSnapshot) {
                    let feature = layerSnapshot[id];
                    features[feature.class == 'NAVLINk' ? 'unshift' : 'push']({
                        provider: HERE_WIKI.getProviderById(layerId),
                        feature: feature
                    });
                }
            }

            for (let {feature, provider} of features) {
                let existing = provider.search(feature.id);

                if (existing) {
                    provider.removeFeature(existing);
                }

                const editStates = getEditStates(feature);

                if (!editStates.removed) {
                    feature = HERE_WIKI.objects.create(feature, provider, undefined, true);

                    // copy over editstates because create new feature forces empty editstates
                    for (const e in editStates) {
                        feature.properties[EDITOR_NS][e] = editStates[e];
                    }

                    // set the correct states! isModifed, isDeleted, isSplit, isRemoved
                    // HERE_WIKI.display.setStyleGroup( found, o._style, true );
                    HERE_WIKI.setStyle(feature);
                }
            }

            this.current = stepToRecover;

            if (!skipObservers) {
                this.updateObservers();
            }
        }
    };

    active(active?: boolean) {
        if (arguments.length) {
            this._a = !!active;
        }
        return this._a;
    };

    ignore(operation: () => void) {
        let a = this.active();
        this.active(false);
        operation();
        this.active(a);
    };
}


export default History;
