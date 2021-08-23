/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
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

import {JSUtils, global} from '@here/xyz-maps-common';
import {
    GeoPoint,
    TileLayer,
    PixelPoint,
    EditableRemoteTileProvider,
    GeoRect,
    GeoJSONFeature,
    GeoJSONCoordinate,
    GeoJSONBBox, EditableFeatureProvider
} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {DrawingBoard} from './DrawingBoard';
import {RangeSelector} from './ERangeSelector';
import InternalEditor from '../IEditor';
import {mergeOptions, EditorOptions} from './EditorOptions';
import {initHooks} from '../hooks/init';
import {Feature} from '../features/feature/Feature';
import {EditorEvent} from './EditorEvent';
import FeatureSubmitter from '../providers/FeatureSubmitter';
import {FeatureContainer, Container} from '../features/Container';

import {Address} from '../features/location/Address';
import {Area} from '../features/area/Area';
import {Marker} from '../features/marker/Marker';
import {Place} from '../features/location/Place';
import {Line} from '../features/line/Line';
import {Navlink} from '../features/link/Navlink';
import {CoordinatesUpdateHook, NavlinkDisconnectHook, NavlinkSplitHook, FeatureRemoveHook} from '../Hooks';


type EditableProvider = EditableRemoteTileProvider;

const NULL = null;
const NAVLINK = 'NAVLINK';

let UNDEF;

const getIdentifier = (l) => {
    const featureClass = l.class;
    return featureClass == NAVLINK ? NAVLINK : String(featureClass) + (l['src'] || (l['base'] + l['delta']) || l['id']);
};


const toggleProviderHooks = (toggle: 'add' | 'remove', provider, HERE_WIKI) => {
    const provHooks = provider.hooks;

    if (provHooks) {
        for (let name in provHooks) {
            let hooks = provHooks[name];

            if (!(hooks instanceof Array)) {
                hooks = [hooks];
            }
            for (let hook of hooks) {
                HERE_WIKI.hooks[toggle](name, hook, provider);
            }
        }
    }
};

const clearTiles = (internalEditor: InternalEditor) => {
    const commited = internalEditor.objects.history.getChanges();
    const clearBBoxes = [];
    let feature;
    let provider;
    for (const layerId in commited) {
        provider = internalEditor.getProviderById(layerId);

        for (const id in commited[layerId]) {
            feature = provider.search(id);

            if (provider._clearOnCommit) {
                // make sure featKeeper is not protecting the feature from being cleared after commit..
                // and can be refreshed/replaced with latest version returned from backend...
                if (feature) {
                    delete feature.properties['@ns:com:here:editor'];
                }
                clearBBoxes.push(provider, commited[layerId][id].bbox);
            } else if (feature) {
                // make sure edit states are reset
                feature.properties['@ns:com:here:editor'] = {};
            }
        }
    }

    for (let i = 0; i < clearBBoxes.length; i += 2) {
        provider = clearBBoxes[i];
        provider.clear.apply(provider, clearBBoxes[i + 1]);
    }
};

const clear = (internalEditor: InternalEditor) => {
    clearTiles(internalEditor);
    internalEditor.objects.history.clear();
    internalEditor.display.refresh();
};

const commitChanges = (internalEditor: InternalEditor, modobjs, onSuccess, onError, transactionID) => {
    if (!internalEditor.isCommitInProcess) {
        internalEditor.objects.selection.clearSelected();
        internalEditor.observers.change('ready', internalEditor.isCommitInProcess);
        internalEditor.isCommitInProcess = true;

        const featureSubmitter = new FeatureSubmitter(internalEditor);
        featureSubmitter.submit(
            modobjs,
            (data) => {
                internalEditor.isCommitInProcess = false;
                onSuccess.call(null, data);
            },
            (data) => {
                internalEditor.isCommitInProcess = false;
                onError.call(null, data);
            },
            transactionID
        );
    }
};

/**
 * The Editor is an API for editing map data that can be used to easily access, add, remove and edit various types of map data.
 * Changes can be automatically synchronized with various remote backends services.
 * It offers various tools for manipulating map-data through user interaction.
 */
export default class Editor {
    private _i: () => InternalEditor;

    /**
     * The HTMLElement used by the Map Editor.
     */
    container: HTMLElement;

    /**
     * @param display - the map display to be used with the map editor.
     * @param options - options to customize the map editor.
     *
     * @example
     * ```
     *  import {Map} from '@here/xyz-maps-display';
     *  import {Editor} from '@here/xyz-maps-editor';
     *
     *  //create map display
     *  const display = new Map( mapDiv, {
     *      zoomLevel : 19,
     *      center: {
     *          longitude: 8.53422,
     *          latitude: 50.16212
     *      },
     *      // add layers to display
     *      layers: layers
     *  });
     *
     * // create the map editor
     * editor = new Editor( display, {
     *      // add the layers that should be edited
     *     layers: layers
     * });
     * ```
     */
    constructor(display: Map, options?: EditorOptions) {
        const that: Editor = this;

        options = mergeOptions(options || {});

        const optionLayers = options.layers;
        delete options.layers;

        JSUtils.loglevel = options['debug'] && 'debug';


        let HERE_WIKI = new InternalEditor(options, display);

        // FOR DEVELOPMENT ONLY!
        // >>excludeStart("devMapEditorInit", pragmas.devMapEditorInit);
        that._i = () => HERE_WIKI;
        // >>excludeEnd("devMapEditorInit");

        initHooks(HERE_WIKI);

        that.container = display.getContainer();

        if (optionLayers instanceof Array) {
            optionLayers.forEach((layer) => this.addLayer(layer));
        }

        that['active'](true);

        // make sure (public) observers have a chance to register for initial active change observing.
        setTimeout(() => {
            const observers = HERE_WIKI.observers;
            const active = observers.get('active');
            const force = <boolean>active;
            // only trigger active if it's still active, otherwise active false has been set public and
            // was triggered already...
            observers.change('active', active, force);

            // in case of no layer is set we need to trigger ready manually
            if (!HERE_WIKI.layers.length) {
                observers.change('ready', true);
            }
        }, 0);
    }


    /**
     * enable or disable the editor.
     *
     * @param active - true to enable or false to disable the editor
     *
     * @returns the current active state
     */
    active(active?: boolean): boolean {
        let iEditor = this._i();
        let isActive = <boolean>iEditor.observers.get('active');

        if (active != undefined) {
            active = !!active;

            if (active != isActive) {
                isActive = active;
                iEditor.objects.listenDisplay(active);
                iEditor.observers.change('active', active, true);
            }
        }
        return isActive;
    };

    /**
     * Add an EventListener to the editor.
     * Valid Events are: "tap", "dbltap", "pointerup", "pointerenter", "pointerleave", "featureUnselected", "error", "dragStart", "dragStop".
     *
     * Additional details about the different events:
     * - "tap", "pointerup", "dbltap": These events are thrown when the user taps (or double taps) on any feature or the map itself.
     * - "pointerenter", "pointerleave": Occurs when a pointer enters or leaves the hit test area of a map feature.
     * - "featureUnselected": This event is fired when a feature gets unselected automatically by the Editor ( eg: automatic linksplit ).
     * - "error": The event is fired when error occurs.
     * - "dragStart": The event is fired when the user starts dragging an Address, Place, Marker or a shape-point of a Navlink/Area.
     * - "dragStop": The event is fired when the user finishes dragging of a Address, Place, Marker or a shape-point of a Navlink/Area.
     *
     * @param type - A string representing the event type to listen for.
     * @param listener - the listener function that will be called when an event of the specific type occurs
     */
    addEventListener(type: string, listener: (event: EditorEvent) => void);

    /**
     * Add an Error EventListener to the editor.
     * @param type - the EventListener type is "error"
     * @param listener - the listener function that will be called when an Error occurs
     */
    addEventListener(type: 'error', listener: (event: Error) => void);

    addEventListener(type: string, listener: (event: any) => void, context?) {
        const {listeners} = this._i();
        // filter internal events (_internalEventName)
        const supported = listeners.supported().filter((ev) => ev[0] != '_');

        String(type).split(' ').forEach((t) => {
            if (supported.indexOf(t) > -1) {
                listeners.add.call(listeners, t, listener, context);
            } else {
                JSUtils.dump(t + ' is not a valid event. Use: ' + supported.join(', '), 'warn');
            }
        });
    }

    /**
     * Remove an EventListener from the layer.
     * Valid Events are: "tap", "dbltap", "pointerup", "pointerenter", "pointerleave", "featureUnselected", "error", "dragStart", "dragStop".
     *
     * @param type - A string which specifies the type of event for which to remove an event listener.
     * @param listener - The listener function of the event handler to remove from the editor.
     */
    removeEventListener(type: string, listener: (event: EditorEvent | Error) => void) {
        const {listeners} = this._i();
        listeners.remove.apply(listeners, arguments);
    }

    /**
     *  Add a feature to the editor.
     *
     *  @param feature - the feature to be added to the map.
     *  @param layer - the layer the feature should be added to.
     *  @param origin - offsets the geometry of the feature.
     *
     *  @returns the feature that was successfully added to the map
     */
    addFeature(
        feature: GeoJSONFeature | Feature,
        layer?: TileLayer,
        origin?: GeoPoint | PixelPoint
    ): Address | Area | Marker | Place | Line | Navlink;
    /**
     *  Add features to the editor.
     *
     *  @param features - the features to be added to the map.
     *  @param layer - the layer the features should be added to.
     *  @param origin - offsets the geometry of the features.
     *
     *  @returns the features that were successfully added to the map
     */
    addFeature(
        features: GeoJSONFeature | Feature | (GeoJSONFeature | Feature)[],
        layer?: TileLayer,
        origin?: GeoPoint | PixelPoint
    ): Address | Area | Marker | Place | Line | Navlink | FeatureContainer;

    /**
     *  Add features to map editor.
     *
     *  @param layerMap - a map where the layerId is the key and the value are the feature(s) that should be added to the respective layer.
     *  @param origin - allows to translate features by origin offset.
     *
     *  @returns the feature(s) that were successfully added to map
     */
    addFeature(
        layerMap: {
            [layerId: string]: GeoJSONFeature | Feature | (GeoJSONFeature | Feature)[]
        },
        layer?: TileLayer,
        origin?: GeoPoint | PixelPoint
    ): Address | Area | Marker | Place | Line | Navlink | FeatureContainer;

    addFeature(feature, layer?, origin?) {
        const iEdit = this._i();
        const args = arguments;
        const added = [];
        const idmap = {};
        let layermap = {};
        let created;
        let offset;

        const isCoordinate = (c) => {
            return c.x != UNDEF && c.y != UNDEF || c.longitude != UNDEF && c.latitude != UNDEF;
        };
        const prepareCoordinates = (c, offset) => {
            if (isCoordinate(c)) {
                c = iEdit.map.getGeoCoord(c);
            }
            if (typeof c[0] == 'number') {
                c[0] += offset[0];
                c[1] += offset[1];
                return iEdit.map.clipGeoCoord(c);
            }
            const coordinates = [];

            for (let i = 0; i < c.length; i++) {
                coordinates[i] = prepareCoordinates(c[i], offset);
            }

            return coordinates;
        };


        const addFeature = (feature, layer) => {
            const layerid = layer && layer.id;
            const features = layermap[layerid] = layermap[layerid] || [];
            features.push(feature);
        };

        if (feature.type == 'Feature') {
            addFeature(feature, layer);
        } else if (feature instanceof Array) {
            feature.forEach((f) => addFeature(f, layer));
        } else {
            layermap = feature;
            for (let id in layermap) {
                feature = layermap[id];
                if (feature.type == 'Feature') {
                    layermap[id] = [feature];
                }
            }
        }

        origin = args[args.length - 1];

        if (isCoordinate(origin)) {
            origin = iEdit.map.getGeoCoord(origin);

            const vb = iEdit.display.getViewBounds();

            offset = [
                origin[0] - vb.minLon,
                origin[1] - vb.maxLat
            ];
        } else {
            offset = [0, 0];
        }

        for (let layerId in layermap) {
            let features = layermap[layerId];

            features.forEach((feature) => {
                const geom = feature.geometry;
                geom.coordinates = prepareCoordinates(geom.coordinates, offset);

                if (feature.type == 'Feature' && !(feature instanceof Feature)) {
                    feature = new Feature(feature);
                }

                if (feature = iEdit.objects.add(feature, layerId == 'undefined' ? UNDEF : layerId, idmap)) {
                    created = true;
                    added.push(feature);
                }
            });
        }

        if (created) {
            iEdit.objects.history.saveChanges();
        }


        return added.length > 1 ? this.createFeatureContainer.apply(this, added) : added[0];
    }

    /**
     * Add a hook function that will be called during the execution of the editing operation.
     *
     * Possible operation types are: 'Navlink.disconnect', 'Navlink.split', 'Feature.remove', 'Coordinates.remove'
     *
     * @param type - the type of the operation
     * @param hook - the hook function that should be called
     * @param provider - If a provider is defined, the hook is only called if features of the provider are affected by the operation
     */
    addHook(
        type: string,
        hook: NavlinkSplitHook | NavlinkDisconnectHook | FeatureRemoveHook | CoordinatesUpdateHook,
        provider?: EditableFeatureProvider
    ) {
        return this._i().hooks.add(type, hook, provider);
    };

    /**
     * Remove a specific hook for the desired editing operation.
     *
     * Possible operation types are: 'Navlink.disconnect', 'Navlink.split', 'Feature.remove', 'Coordinates.remove'
     *
     * @param type - the type of the operation
     * @param hook - the hook function to remove
     * @param provider - If a provider is defined, the hook is only called if features of the provider are affected by the operation
     */
    removeHook(
        type: string,
        hook: NavlinkSplitHook | NavlinkDisconnectHook | FeatureRemoveHook | CoordinatesUpdateHook,
        provider?: EditableFeatureProvider
    ) {
        return this._i().hooks.remove(type, hook, provider);
    };

    /**
     * Get all registered hooks for the desired operation.
     *
     * @param type - the type of the operation
     */
    getHooks(type: string): (NavlinkSplitHook | NavlinkDisconnectHook | FeatureRemoveHook | CoordinatesUpdateHook)[] {
        return this._i().hooks.get(type);
    };


    /**
     * Get a feature by id and layer.
     *
     * @param featureId - the id of the feature
     * @param layerId - the id of the layer or the layer itself to which the feature belongs.
     *
     * @returns the found feature in the map, otherwise null.
     */
    getFeature(featureId: string | number, layerId: string | TileLayer) {
        const obj = this._i().objects.get(featureId, layerId);
        return obj || null;
    }

    /**
     * Create a FeatureContainer.
     *
     * @returns feature container
     */
    createFeatureContainer(...features: Feature[]): FeatureContainer {
        const container = new Container(this._i());
        container.push(features);
        return container;
    }

    /**
     * Clears the current selected feature.
     *
     * @returns the cleared Feature or null of none is selected.
     */
    clearFeatureSelection(): Feature | null {
        const cleared = this._i().objects.selection.clearSelected();
        return cleared || null;
    }

    // support for legacy/deprecated api
    clearObjectSelection: () => Feature | null;

    /**
     * Search for feature(s) in the provider.
     *
     * @param options - configure the search
     *
     * @example
     * ```typescript
     * // searching by id:
     * provider.search({id: 1058507462})
     * // or:
     * provider.search({ids: [1058507462, 1058507464]})
     *
     * // searching by point and radius:
     * provider.search({
     *  point: {longitude: 72.84205, latitude: 18.97172},
     *  radius: 100
     * })
     *
     * // searching by Rect:
     * provider.search({
     *  rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876}
     * })
     *
     * // remote search:
     * provider.search({
     *  rect:  {
     *    minLon: 72.83584,
     *    maxLat: 18.97299,
     *    maxLon: 72.84443,
     *    minLat: 18.96876
     *  },
     *  remote: true, // force provider to do remote search if feature/search area is not cached locally
     *  onload: function(result){
     *   // search result is only return in this callback function if features are not found in cache.
     *  }
     * })
     * ```
     * @returns array containing the found features
     */
    search(options: {
        /**
         * search feature by id.
         */
        id?: number | string,
        /**
         * Array of feature ids to search.
         */
        ids?: number[] | string[],
        /**
         * Geographical center point of the circle to search in. options.radius must be defined.
         */
        point?: GeoPoint,
        /**
         * Radius of the circle in meters, it is used in "point" search.
         */
        radius?: number,
        /**
         * Geographical Rectangle to search in. [minLon, minLat, maxLon, maxLat] | GeoRect.
         */
        rect?: GeoRect | GeoJSONBBox
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean,
        /**
         * Callback function for "remote" search.
         */
        onload?: (result: Feature[] | null) => void,
        /**
         * function for optional result filtering.
         */
        filter?: (feature: Feature[]) => boolean,
        /**
         * Layers to search in.
         */
        layers?: TileLayer[]
    }): Feature[] {
        const iEditor = this._i();
        const result = [];
        let feature;

        if (typeof options == 'object') {
            const filter = options['filter'];
            const searchLayers = options['layers'] || iEditor.layers;
            let l = searchLayers.length;

            while (l--) {
                let layerResult = searchLayers[l].search(options);

                if (!(layerResult instanceof Array)) {
                    layerResult = [layerResult];
                }
                let resultLength = layerResult.length;

                while (feature = layerResult[--resultLength]) {
                    if (!filter || filter(feature)) {
                        result.push(feature);
                    }
                }
            }
        }
        return result;
    }

    /**
     * add a TileLayer to the editor and enable editing of its map data.
     * @param layer - the layer to be added to editor.
     *
     * @returns true indicates layer has been added successfully, otherwise false.
     */
    addLayer(layer: TileLayer): boolean {
        if (layer) {
            const iEditor = this._i();
            const layerMap = iEditor.layerMap;
            const prov = <EditableProvider>layer.getProvider();

            if (prov && prov.__type == 'FeatureProvider' && prov.editable && (
                !layerMap[getIdentifier(prov)] ||
                // @ts-ignore TODO: remove class property
                prov.class == NAVLINK
            )) {
                if (prov._e instanceof InternalEditor) {
                    if (prov._e === iEditor) {
                        return false;
                    }
                    throw (new Error('Provider already in use by another editor'));
                }

                prov._e = iEditor;
                // @ts-ignore TODO: remove class property
                layer.class = prov.class;

                iEditor.listeners.trigger('_layerAdd', {
                    layer: layer
                });

                layerMap[getIdentifier(prov)] = layer;

                iEditor.layers.push(layer);

                // add provider Hooks if defined.
                toggleProviderHooks('add', prov, iEditor);

                return true;
            }
        }
        return false;
    };

    /**
     * Get all layers that are added to the editor.
     *
     * @returns Array if layers that are added to the editor.
     */
    getLayers(): TileLayer[];
    /**
     * Get a specific Layer at the index in the layer list of the editor.
     *
     * @returns the respective layer at index
     */
    getLayers(index: number): TileLayer;

    getLayers(index?: number): TileLayer | TileLayer[] {
        const {layers} = this._i();
        return index ? layers[index] : layers.slice();
    }

    /**
     * Remove a layer from the editor.
     *
     * layer - the layer to be removed from the map editor.
     * Editing get disabled for the layer.
     *
     * @returns true indicates layer is removed successfully, otherwise false.
     */
    removeLayer(layer: TileLayer): boolean {
        if (layer) {
            const iEditor = this._i();
            const {layerMap, layers} = iEditor;

            let prov = <EditableProvider>layer.getProvider();

            const lid = getIdentifier(prov);

            if (prov.__type == 'FeatureProvider' && prov.editable && layerMap[lid]) {
                iEditor.listeners.trigger('_layerRemove', {
                    layer: layer
                });

                delete layerMap[lid];

                layers.splice(layers.indexOf(layer), 1);

                toggleProviderHooks('remove', prov, iEditor);

                delete prov._e;
                return true;
            }
        }
        return false;
    };

    /**
     * This method registers an observer for the property named by the caller.
     * Supported observables: 'active', 'ready', 'history.current', 'history.length', 'changes.length'
     *
     * @param name - The name of the property to observe.
     *
     * @param observer - the observer function that is called when the value of the observable changes.
     */
    addObserver(
        name: 'active' | 'ready' | 'history.current' | 'history.length' | 'changes.length',
        observer: (
            /**
             * the name of the property that was modified, created or deleted
             */
            name: 'active' | 'ready' | 'history.current' | 'history.length' | 'changes.length',
            /**
             * the new value of the observable property
             */
            value: any,
            /**
             * the old/previous value of the observable property
             */
            prevValue: any
        ) => void
    ) {
        this._i().observers.addObserver(name, observer, arguments[2]/* context? */);
    }

    /**
     * This method retrieves the current value of a observable property.
     *
     * @param key - The name of the property whose value is to be retrieved
     * @returns value - The retrieved value of the property or undefined if no such property exists
     */
    get(key: 'active' | 'ready' | 'history.current' | 'history.length' | 'changes.length'): any {
        return this._i().observers.get(key);
    }

    /**
     * This method removes the observer for the property.
     * Supported observables: 'active', 'ready', 'history.current', 'history.length', 'changes.length'
     *
     * @param name - The name of the property that should no longer be observed
     * @param observer - The observer function to be removed
     */
    removeObserver(
        name: 'active' | 'ready' | 'history.current' | 'history.length' | 'changes.length',
        observer: (
            /**
             * the name of the property that was modified, created or deleted
             */
            name: 'active' | 'ready' | 'history.current' | 'history.length' | 'changes.length',
            /**
             * the new value of the observable property
             */
            value: any,
            /**
             * the old/previous value of the observable property
             */
            prevValue: any
        ) => void
    ) {
        this._i().observers.removeObserver(name, observer, arguments[2]/* context? */);
    }

    /**
     * Destroy the map editor
     */
    destroy(): void {
        const that = this;
        let iEditor = that._i();
        // make sure all layer listeners are removed
        (<TileLayer[]>that.getLayers()).forEach((layer) => that.removeLayer(layer));

        that.active(false);

        iEditor.destroy();

        // clear/null Editor's instance
        for (let i in that) delete that[i];
        // @ts-ignore
        that.__proto__ = {};

        return null;
    };

    /**
     * Sets the desired zoomLevel.
     *
     * @deprecated - use the map display directly {@link display.Map.setZooomlevel}
     * @param zoomLevel - The zoomlevel that the map should zoom to.
     */
    setZoomLevel(zoomlevel: number) {
        this._i().display.setZoomlevel(zoomlevel);
    };

    /**
     * Get the current zoomLevel.
     *
     * @deprecated - use the map display directly {@link display.Map.getZoomlevel}
     * @returns The current zoomLevel of the map.
     */
    getZoomLevel(): number {
        return this._i().display.getZoomlevel();
    }

    /**
     * Convert a pixel position relative to the current mapview on screen to a geographical coordinate.
     *
     * @param coordinate - The coordinate on screen in pixels.
     * @returns the geographical coordinate
     */

    pixelToGeo(coordinate: PixelPoint | [number, number, number?]): GeoPoint {
        const c = this._i().map.getGeoCoord(coordinate);
        return c ? new GeoPoint(c[0], c[1]) : NULL;
    };

    /**
     * Convert geographical coordinate to a pixel coordinate relative to the current mapview on screen.
     *
     * @param coordinate - the geographical coordinate
     * @returns The pixel coordinate.
     */
    geoToPixel(coordinate: GeoPoint | [number, number, number?]): PixelPoint {
        const c = this._i().map.getPixelCoord(coordinate);
        return c ? new PixelPoint(c[0], c[1]) : NULL;
    };

    /**
     * Revert changes, fetch data from repository.
     */
    revert() {
        const iEditor = this._i();
        let steps = <number>iEditor.observers.get('history.current');

        while (steps--) {
            iEditor.objects.history.recoverViewport(-1, true);
        }
        clear(iEditor);
    }

    /**
     * get the DrawingBoard to enable mouse/touch based drawing of the geometry for Line, Navlink or Area features.
     */
    getDrawingBoard(): DrawingBoard {
        const iEdit = this._i();
        const drawingBoard = iEdit._db = iEdit._db || new DrawingBoard(iEdit);
        return drawingBoard;
    }


    /**
     * @hidden
     * @deprecated Use editor.getRangeSelector();
     */
    getZoneSelector(): RangeSelector {
        return this.getRangeSelector();
    }

    /**
     * get the tool for selecting ranges on Navlink features.
     */
    getRangeSelector(): RangeSelector {
        const iEdit = this._i();
        return iEdit._rngSel = iEdit._rngSel || new RangeSelector(iEdit);
    }

    /**
     * Returns the overlay TileLayer used for user interaction with the editable map features.
     *
     * @returns the TileLayer containing all "UI" features used for user interaction with the map features.
     */
    getOverlay(): TileLayer {
        return this._i().objects.overlay.layer;
    };

    /**
     * Undo the latest change operation(s).
     * One change operation can contain multiple feature modifications.
     * The changes are stored and managed locally.
     *
     * Submitting {@link Editor.submit} modified Feature(s) to the remote will clear the local change history.
     *
     * @param steps - the number of change operations to undo.
     */
    undo(steps?: number) {
        steps = Math.min(<number> this.get('history.current'), steps || 1);

        while (steps--) {
            this._i().objects.history.recoverViewport(-1, !!steps);
        }
    };

    /**
     * Redo the latest change operation(s).
     * One change operation can contain multiple feature modifications.
     *
     * The changes are stored and managed locally.
     * Submitting {@link Editor.submit} modified Feature(s) to the remote will clear the local change history.
     *
     * @param steps - the number of change operations to redo.
     */
    redo(steps?: number) {
        steps = Math.min(this.get('history.length'), steps || 1);

        while (steps--) {
            this._i().objects.history.recoverViewport(1, !!steps);
        }
    };


    /**
     * Submit changes, return object Ids of submitted objects. Reload and render objects.
     *
     * @param options - submit options
     *
     * @returns true, if there are changes to be submitted, false otherwise.
     */
    submit(options: {
        /**
         * callback function which returns additional information about the commit process.
         */
        onSuccess?: (data) => void,
        /**
         * callback function that gets called in case of an error.
         */
        onError?: (Error) => void,
        /**
         * transactionId that will be attached to all features of the submit operation.
         */
        transactionId?: string,
    }): boolean {
        // callback is only called when submitted
        let modobjs;
        let modified = false;
        const markerLayers = [];
        let unsubmitted = false;
        options = options || {};
        const ignoreEventBlock = options['ignoreEventBlock'];
        let layer = options['layer'];
        const onError = options['onError'];
        const onSuccess = options['onSuccess'];
        const transactionID = options['transactionId'];
        const iEditor = this._i();

        function cbCommitChange(idMap) {
            // show current view
            clear(iEditor);

            iEditor.listeners.trigger('_afterSubmit');

            onSuccess && onSuccess({
                'permanentIDMap': idMap
            });
        }


        function cbCommitChangeError(e) {
            iEditor.listeners.trigger('_afterSubmit');
            // show current view including changes
            onError && onError(e);
        }

        if (typeof ignoreEventBlock == 'function') throw new Error('Invalid parameter!');


        if (!!ignoreEventBlock || !iEditor.isCommitInProcess) {
            layer = layer instanceof Array ? layer : [layer];
            for (const i in layer) {
                const l = layer[i];
                if (l && l instanceof TileLayer && l['type'] == 'MARKER') {
                    l['base'] && markerLayers.push(l['base']);
                    l['delta'] && markerLayers.push(l['delta']);
                    l['src'] && markerLayers.push(l['src']);
                }
            }

            modobjs = iEditor.objects.history.getChanges();

            for (const lid in modobjs) {
                if (markerLayers.length > 0 && markerLayers.indexOf(lid) < 0) {
                    unsubmitted = true;
                    delete modobjs[lid];
                } else {
                    modified = true;
                }
            }

            // are objects modified or deleted ?
            if (modified) {
                iEditor.listeners.trigger('_beforeSubmit');
                commitChanges(iEditor, modobjs, cbCommitChange, cbCommitChangeError, transactionID);
                return true;
            }
        }
        return false;
    }

    /**
     * Get information of all modified Features of the editor.
     *
     * @returns Array of modified objects.
     */
    info(): Feature[] {
        const iEditor = this._i();
        const pool = [];
        const lc = iEditor.objects.history.getChanges();

        for (const layerId in lc) {
            for (const id in lc[layerId]) {
                pool[pool.length] = JSUtils.clone(lc[layerId][id]);
            }
        }
        return pool;
    }

    /**
     * Export data of all modified features.
     *
     * @returns A JSON encoded string containing all modified features and its respective layer information.
     */
    export(): string {
        const iEditor = this._i();
        return JSON.stringify(
            iEditor.objects.history.getChanges()
        );
    }

    /**
     * Import Features to the editor that have previously been exported with {@link Editor.export}.
     *
     * @param json - A JSON encoded string containing all modified features and its respective layer information.
     */
    import(json: string) {
        const iEditor = this._i();
        if (typeof json == 'string') {
            json = JSON.parse(json);
        }
        return iEditor.objects.history.import(json);
    }


    /**
     * Convert a PixelPoint on the screen or a GeoPoint to a geographical Coordinate in GeoJSON format [number,number,number?].
     *
     * @example
     * ```typescript
     * // create a Feature at a specific position of the current mapview on the screen.
     * editor.addFeature({
     *     type: 'Feature',
     *     geometry: {
     *         type: 'Point',
     *         coordinates: editor.toGeoJSONCoordinates({x: 300, y:300})
     *     }
     * })
     * ```
     *
     * @param coordinates - the pixel and/or geographical coordinate(s) to convert.
     */
    toGeoJSONCoordinates(coordinates: PixelPoint | GeoPoint | GeoJSONCoordinate): GeoJSONCoordinate;
    /**
     * Convert PixelPoints or a GeoPoints to a geographical Coordinates in GeoJSON format [number,number,number?].
     *
     * @example
     * ```typescript
     * // create a Feature at a specific position of the current mapview on the screen.
     * editor.addFeature({
     *     type: 'Feature',
     *     geometry: {
     *         type: 'LineString',
     *         coordinates: editor.toGeoJSONCoordinates([{x: 300, y:300},{longitude:50.1, latitude:8.5}])
     *     }
     * })
     * ```
     *
     * @param coordinates - the pixel and/or geographical coordinate(s) to convert.
     */
    toGeoJSONCoordinates(coordinates: (PixelPoint | GeoPoint | GeoJSONCoordinate)[]): GeoJSONCoordinate[];
    /**
     * Convert PixelPoints or a GeoPoints to a geographical Coordinates in GeoJSON format [number,number,number?].
     *
     * @example
     * ```
     * // create a Feature at a specific position of the current mapview on the screen.
     * editor.addFeature({
     *   type: 'Feature',
     *     geometry: {
     *       type: 'Polygon',
     *         coordinates: editor.toGeoJSONCoordinates([
     *           [{x:10, y:10}, {longitude:50.1, latitude:8.5}, {x:90, y:90}, {x:10,y:90}, {x:10, y:10}]
     *         ])
     *     }
     * })
     * ```
     * @param coordinates - the pixel and/or geographical coordinate(s) to convert.
     */
    toGeoJSONCoordinates(coordinates: (PixelPoint | GeoPoint | GeoJSONCoordinate)[][]): GeoJSONCoordinate[][];
    /**
     * Convert PixelPoints or a GeoPoints to a geographical Coordinates in GeoJSON format [number,number,number?].
     *
     * @example
     * ```typescript
     * // create a Feature at a specific position of the current mapview on the screen.
     * editor.addFeature({
     *     type: 'Feature',
     *     geometry: {
     *         type: 'MultiPolygon',
     *         coordinates: editor.toGeoJSONCoordinates([
     *           [
     *             [{x:10, y:10}, {longitude:50.1, latitude:8.5}, {x:90, y:90}, {x:10,y:90}, {x:10, y:10}]
     *           ]
     *         ])
     *     }
     * })
     * ```
     * @param coordinates - the pixel and/or geographical coordinate(s) to convert.
     */
    toGeoJSONCoordinates(coordinates: (PixelPoint | GeoPoint | GeoJSONCoordinate)[][][]): GeoJSONCoordinate[][][];

    toGeoJSONCoordinates(
        coordinates: PixelPoint | GeoPoint | GeoJSONCoordinate |
            (PixelPoint | GeoPoint | GeoJSONCoordinate)[] |
            (PixelPoint | GeoPoint | GeoJSONCoordinate)[][] |
            (PixelPoint | GeoPoint | GeoJSONCoordinate)[][][]
    ): GeoJSONCoordinate | GeoJSONCoordinate[] | GeoJSONCoordinate[][] | GeoJSONCoordinate[][][] {
        if (Array.isArray(coordinates) && typeof coordinates[0] != 'number') {
            let geojsonCoordinates = [];
            for (let coordinate of <(PixelPoint | GeoPoint | GeoJSONCoordinate)[]>coordinates) {
                geojsonCoordinates.push(this.toGeoJSONCoordinates(coordinate));
            }
            return geojsonCoordinates;
        } else {
            return this._i().map.getGeoCoord(<PixelPoint | GeoPoint | GeoJSONCoordinate>coordinates);
        }
    }
}


// support for legacy/deprecated api
Editor.prototype.clearObjectSelection = Editor.prototype.clearFeatureSelection;
