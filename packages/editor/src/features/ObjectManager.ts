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

import MapDisplay from '@here/xyz-maps-display';
import oTools from './oTools';
import linkTools from './link/NavlinkTools';
import locationTools from './location/LocationTools';
import SelectionHandler from './SelectionHandler';
import History from './History';
import ObjectOverlay from './Overlay';
import {createOverlayLayer, OverlayProvider} from '../providers/OverlayLayer';
import {split, SplitOptions} from './LinkSplitter';
import {
    TileLayer,
    FeatureProvider,
    EditableFeatureProvider,
    EditableRemoteTileProvider,
    GeoJSONCoordinate
} from '@here/xyz-maps-core';
import {Map, JSUtils, geotools, vec3} from '@here/xyz-maps-common';
import {getClosestPntOnLine, intersectBBox, rayIntersectPlane} from '../geometry';
import {Navlink} from './link/Navlink';
import InternalEditor from '../IEditor';
import {Feature} from './feature/Feature';
import {EDIT_RESTRICTION} from '../API/EditorOptions';

type Options = {
    ignore?: (feature: Navlink) => boolean
    maxDistance?: number,
    shapeThreshold?: number,
    ignoreZ?: boolean
};


type RemoveParams = {
    animation?: boolean;
    split?: boolean;
    save?: boolean
};

let UNDEF;

const POINTER_EVENTS = 'pointerenter pointerleave pointerup pressmove pointerdown dbltap';
const LAYER_EVENTS = 'addLayer removeLayer';

const getFeatureClass = (o) => o.class;

const getOverlayIndex = (layers) => {
    let len = layers.length;
    let prov;
    while (len--) {
        let layer = layers[len];
        if (prov = layer.getProvider()) {
            if (prov.class == 'NAVLINK') {
                return len + 1;
            }
        }
    }
    return layers.length;
};

class ObjectManager {
    private iEdit: InternalEditor;
    private display;
    private listen: boolean = false;
    private layers: Map<TileLayer>;

    history: History;

    tools;
    selection;
    overlay: ObjectOverlay;

    constructor(HERE_WIKI: InternalEditor, display: MapDisplay) {
        const objManager = this;

        objManager.iEdit = HERE_WIKI;
        objManager.display = display;


        objManager.history = new History(HERE_WIKI);
        objManager.selection = new SelectionHandler(HERE_WIKI, display);

        const overlayLayer = createOverlayLayer(HERE_WIKI);

        objManager.overlay = new ObjectOverlay(overlayLayer);

        let layers: Map<TileLayer> = new Map([[overlayLayer.id, overlayLayer]]);

        this.layers = layers;

        display.addLayer(overlayLayer, getOverlayIndex(display.getLayers()));


        objManager.arrangeOverlay = objManager.arrangeOverlay.bind(objManager);

        objManager.pointerListener = objManager.pointerListener.bind(objManager);

        HERE_WIKI.listeners.add('_layerAdd', (ev) => {
            const layer = ev.detail.layer;
            layers.set(layer.id, layer);

            const editLayers = layers.values().filter((layer) => layer !== overlayLayer);
            // Automatically display editor overlay features only when edit layers are visible.
            overlayLayer.min = Math.min(...editLayers.map(({min}) => min));
            overlayLayer.max = Math.max(...editLayers.map(({max}) => max));
        });

        HERE_WIKI.listeners.add('_layerRemove', (ev) => {
            const layer = ev.detail.layer;
            layers.delete(layer.id);
            // Clear selected objects from the layer if necessary to prevent leftover elements in the overlay.
            const curSelObj = HERE_WIKI.objects.selection.getCurSelObj();

            if (curSelObj && HERE_WIKI.getLayer(curSelObj) == layer) {
                HERE_WIKI.objects.selection.clearSelected();
            }
        });

        objManager.onMVCStart = objManager.onMVCStart.bind(objManager);
    }

    private onMVCStart() {
        // handle "keepFeatureSelection" config.. clear feature on vp change if configured..
        this.selection.unselectFeature();
    }

    splitLinkAt(options: SplitOptions) {
        return split(this.iEdit, options);
    };

    destroy() {
        const display = this.display;
        display.removeLayer(this.overlay.layer);
    };

    // always add the overlay directly above the link-layer
    // or on top if no link-layer is present.
    private arrangeOverlay(e) {
        const changeLayer = e && e.detail.layer;

        const display = this.display;
        const overlayLayer = this.overlay.layer;
        if (!display.getLayers) {
            // workaround: (timing critical) in case of display got destroyed..
            // ..and listener is waiting for async execution.
            return;
        }
        const layers = display.getLayers();
        const provider = changeLayer.getProvider();

        // ignore OverlayProviders from other editor instances..
        if (!(provider instanceof OverlayProvider)) {
            const linkLayerIndex = layers.map((l) => {
                const p = l.getProvider();
                return p && p.class;
            }).indexOf('NAVLINK');

            display.removeLayer(overlayLayer);
            if (linkLayerIndex >= 0) {
                // place on top of navlink layer
                display.addLayer(overlayLayer, linkLayerIndex + 1);
            } else {
                // place overlay on top!
                display.addLayer(overlayLayer);
            }
        }
    };

    private pointerListener(e) {
        const HERE_WIKI = this.iEdit;
        const o = e.target;
        const type = e.type;

        if (o) {
            const layer = e.detail.layer;

            if (!this.layers.has(layer.id)) {
                // if layer is not known by editor no further action is wanted
                // eg: ground trigger
                return;
            }

            const evl = oTools.getEventListener(o, type);

            if (evl) {
                e.stopPropagation();
                return evl.apply(o, arguments);
            }
        }

        if (/* type == 'tap' ||*/ type == 'pointerup' || type == 'dbltap') {
            HERE_WIKI.objects.selection.unselectFeature(
                HERE_WIKI._config['keepFeatureSelection'] == 'viewportChange'
            );
        }

        // trigger "Ground Event"
        HERE_WIKI.listeners.trigger(e, null);
    }

    // TODO: optimize to only listen used editor layers and not all display layers by default
    listenDisplay(on) {
        const display = this.display;

        const listening = this.listen;
        const globalPointerListener = this.pointerListener;
        const arrangeOverlay = this.arrangeOverlay;

        if (on) {
            if (!listening) {
                this.listen = true;
                display.addEventListener('mapviewchangestart', this.onMVCStart);
                display.addEventListener(POINTER_EVENTS, globalPointerListener);
                display.addEventListener(LAYER_EVENTS, arrangeOverlay);
            }
        } else if (listening) {
            this.listen = false;
            display.removeEventListener('mapviewchangestart', this.onMVCStart);
            display.removeEventListener(POINTER_EVENTS, globalPointerListener);
            display.removeEventListener(LAYER_EVENTS, arrangeOverlay);
        }
    };

    get(obj, layer?) {
        const HERE_WIKI = this.iEdit;

        if (!layer) {
            layer = HERE_WIKI.getLayer(obj);
        } else if (typeof layer != 'object') {
            // it's layer id (string/number)
            layer = HERE_WIKI.getLayer(layer);
        }

        if (typeof obj != 'object' && layer) {
            obj = layer.search(obj);
        }

        return obj && layer ? obj : null;
    };

    getInBBox(bounds, searchInLayers?: FeatureProvider | TileLayer | TileLayer[], filter?: (feature: Feature) => boolean): any[] {
        if (!bounds) {
            bounds = this.display.getViewBounds();
            bounds = [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat];
        }

        const offset = 1 / Math.pow(10, this.iEdit._config['intersectionScale']);
        bounds = [bounds[0] - offset, bounds[1] - offset, bounds[2] + offset, bounds[3] + offset];

        searchInLayers = searchInLayers || this.layers.values();

        const result = [];
        let layers = searchInLayers instanceof Array ? searchInLayers : [searchInLayers];
        let layerResult;

        for (let layer of layers) {
            if (layerResult = layer.search(bounds)) {
                for (let feature of layerResult) {
                    if (!filter || filter(feature)) {
                        result.push(feature);
                    }
                }
            }
        }

        return result;
    };

    remove(obj, params?: RemoveParams) {
        const objManager = this;
        let changed = false;
        params = params || {};

        if (
            // if delete is triggered by a split-operation -> edit-restriction should be ignored!
            params.split || !objManager.iEdit._config.editRestrictions(obj, EDIT_RESTRICTION.REMOVE)
        ) {
            const animation = params.animation == null ? true : params.animation;

            if (animation && oTools.private(obj, 'isSelected')) {
                objManager.selection.clearSelected();
            }

            if (getFeatureClass(obj)) {
                objManager.history.origin(obj);

                oTools.markAsRemoved(obj, animation);

                if (params.save) {
                    objManager.history.saveChanges();
                }
                changed = true;
            }

            const prov = obj.getProvider();

            if (
                // filter out non editable features (eg overlay features)
                obj.editState &&
                // no need to block newly created feature..
                !obj.editState('created')
            ) {
                prov.blockFeature(obj, true);
            }

            prov.removeFeature(obj);

            return changed;
        }
    };

    add(obj, layer, idmap) {
        const HERE_WIKI = this.iEdit;

        if (!obj.getProvider()) {
            if (typeof layer == 'string') { // --> layerId
                layer = this.layers.get(layer);
            } else if (!layer) {
                layer = HERE_WIKI.getLayerForClass(getFeatureClass(obj));
            }

            if (layer) {
                const id = obj.id;
                const inserted = id != UNDEF && layer.search(id);

                if (id == UNDEF || !inserted) {
                    return this.create({
                        feature: obj,
                        provider: layer.getProvider(),
                        idMap: idmap
                    });
                }

                return inserted;
            }
        }
    };

    create(options: {
        feature,
        provider: EditableFeatureProvider,
        preferIndex?: number,
        history?: boolean,
        zLevels?: number[],
        idMap?: { [id: string]: string };
    }) {
        // create(objsDef, provider, prefIdx, historyRecovering, idMapping?: { [id: string]: string }) {
        const HERE_WIKI = this.iEdit;
        const featureHistory = HERE_WIKI.objects.history;
        const objects = [];

        let objsDef = options.feature;
        if (!Array.isArray(objsDef)) {
            objsDef = [objsDef];
        }

        const idMapping = options.idMap || {};
        const {provider, preferIndex, history, zLevels} = options;

        const createFeature = (feature) => {
            if (history) {
                provider.blockFeature(feature, false);
            }
            feature = provider.addFeature(feature);
            // make sure it's real provider feature in case reject because of double add with same id..
            feature = provider.search(feature.id);

            if (!history) { // make sure history is not creating objects for viewport recovering
                feature.editState('created', Date.now());

                oTools.markAsModified(feature, false);

                // make sure feature is marked and gets initial flag before zlevels are written..
                // because history is not ignoring origin-setting.
                featureHistory.origin(feature, true);

                if (zLevels) {
                    featureHistory.batch(() => {
                        provider.writeZLevels(feature, zLevels);
                    });
                }
            }
            objects.push(feature);

            return feature;
        };

        for (let index = 0; index < objsDef.length; index++) {
            let feature = objsDef[index];
            let defId = feature.id;
            let featureClass;

            if (!history) {
                // ids can only be set from userspace if explicitly allowed by "enforceRandomFeatureId" ...
                // ... otherwise ids are only set by provider itself ...
                if (provider.enforceRandomFeatureId) {
                    feature.id = UNDEF;
                }
            }

            feature = provider.prepareFeature(feature);

            featureClass = provider.detectFeatureClass(feature);

            if (defId == UNDEF) {
                defId = feature.id;
            }

            idMapping[defId] = feature.id;

            feature = createFeature(feature);

            if (featureClass === 'NAVLINK') {
                // make sure altitude is set.
                feature.geometry.coordinates.forEach((c) => c[2] ||= 0);

                // in case of history recovering disable autofix to guarantee geometry is created 1:1 and not modified!
                if (!history) {
                    let valid = linkTools.fixGeo(feature, UNDEF, UNDEF, preferIndex);

                    if (valid === false) {
                        featureHistory.remove(feature);
                        provider.removeFeature(objects.pop());
                    }
                }
            } else if (featureClass === 'PLACE' || featureClass === 'ADDRESS') {
                // let obj = createFeature(feature);
                let routingPoint = locationTools.getRoutingData(feature);
                let cLinkId = routingPoint.link;

                if (idMapping[cLinkId]) {
                    const provider = locationTools.getRoutingProvider(feature);
                    const routingLink = provider && provider.search(idMapping[cLinkId]);

                    featureHistory.batch(() => {
                        feature.getProvider().writeRoutingPoint(feature, routingLink, routingPoint.position);
                    });
                }

                // Address needs to be connected to link.
                // If no link is defined -> automatically get the nearest available.
                if (
                    featureClass === 'ADDRESS'
                    && !history // in case of history recovering make sure the address is created untouched.
                ) {
                    locationTools.connect(feature);
                    if (!feature.getLink()) {
                        // no link could be found -> undo creation
                        // cleanup history
                        featureHistory.remove(feature);
                        provider.removeFeature(objects.pop());
                        HERE_WIKI.dump('No Link found within ' + HERE_WIKI._config['maxRoutingPointDistance'] + ' meters', 'warn');
                    }
                }
            }
        }
        // return objects.length>1 ? objects.items : objects.items[0];
        return objects.length > 1 ? objects : objects[0];
    };

    getNearestLine(position: number[], data: EditableRemoteTileProvider | Navlink[], options?: Options) {
        const {iEdit} = this;
        // overwrite default configuration
        options = JSUtils.extend({
            // search radius in meter
            maxDistance: Infinity,
            shapeThreshold: 0,
            ignoreZ: false
        }, options || {});

        const RESULT = {
            line: null,
            point: null,
            distance: Infinity,
            shpIndex: null,
            segmentNumber: null
        };
        let {maxDistance} = options;
        let searchBBox = maxDistance < Infinity
            ? geotools.getPointBBox(position, maxDistance)
            : null;

        if (data instanceof EditableFeatureProvider) {
            data = this.getInBBox(searchBBox, data);
        }

        for (let line of <Navlink[]>data) {
            // check if link must be skipped
            if (options.ignore && options.ignore(line)) continue;

            const {bbox} = line;

            if (
                maxDistance == Infinity ||
                intersectBBox(
                    searchBBox[0], searchBBox[2], searchBBox[1], searchBBox[3],
                    bbox[0], bbox[2], bbox[1], bbox[3]
                )
            ) {
                const crossing = iEdit.map.searchPointOnLine(line.geometry.coordinates as GeoJSONCoordinate[], position, -1, UNDEF, UNDEF, options.ignoreZ);

                if (crossing?.distance < Math.min(RESULT.distance, options.maxDistance)) {
                    RESULT.point = crossing.point;
                    RESULT.distance = crossing.distance;
                    RESULT.shpIndex = crossing.existingShape ? crossing.index : null;
                    RESULT.segmentNumber = crossing.index - Number(!crossing.existingShape);
                    RESULT.line = line;

                    // set maxDistance so bbox checks can skip features..
                    maxDistance = geotools.distance(crossing.point, position);
                    searchBBox = geotools.getPointBBox(position, maxDistance);
                }
            }
        }


        return RESULT.line ? RESULT : null;
    };


    searchLine(position: number[], data: EditableRemoteTileProvider | Navlink[], options?: Options, geo?) {
        const {iEdit} = this;
        // overwrite default configuration
        options = JSUtils.extend({
            // search radius in meter
            maxDistance: Infinity,
            shapeThreshold: 0,
            ignoreZ: false
        }, options || {});

        const RESULT = {
            line: null,
            point: null,
            distance: Infinity,
            shpIndex: null,
            segmentNumber: null
        };
        let {maxDistance, ignoreZ} = options;
        let searchBBox = maxDistance < Infinity
            ? geotools.getPointBBox(position, maxDistance)
            : null;

        if (data instanceof EditableFeatureProvider) {
            data = this.getInBBox(searchBBox, data, (f) => f.class == 'NAVLINK');
        }

        const {display} = iEdit;
        const {x, y} = display.geoToPixel(position[0], position[1]);
        const rayStart = display._unprj(x, y, -1);
        const rayEnd = display._unprj(x, y, 1.0);
        const rayDir = vec3.sub([], rayEnd, rayStart);

        for (let line of <Navlink[]>data) {
            // check if link must be skipped
            if (options.ignore && options.ignore(line)) continue;

            const {bbox} = line;

            if (!searchBBox || intersectBBox(
                searchBBox[0], searchBBox[2], searchBBox[1], searchBBox[3],
                bbox[0], bbox[2], bbox[1], bbox[3]
            )) {
                const coordinates = line.geometry.coordinates as GeoJSONCoordinate[];
                let c = coordinates[0];
                let l1 = display._g2w(c[0], c[1], ignoreZ ? 0 : c[2]);
                let l0;

                for (let i = 1; i < coordinates.length; i++) {
                    c = coordinates[i];
                    l0 = l1;
                    l1 = display._g2w(c[0], c[1], ignoreZ ? 0 : c[2]);

                    const [dx, dy] = vec3.sub([], l0, l1);

                    if (!dx && !dy) continue;

                    const plane1 = l0;
                    const plane2 = vec3.add([], l0, [-dy, dx, 0]);
                    const plane3 = l1;
                    const planeNormal = vec3.normalize([], vec3.cross([], vec3.sub([], plane3, plane2), vec3.sub([], plane1, plane2)));

                    let iPnt = rayIntersectPlane(rayDir, rayStart, planeNormal, plane1);
                    let pointPlane = display._w2g(iPnt);

                    iPnt = getClosestPntOnLine(plane1, plane3, iPnt, true);

                    let point = display._w2g(iPnt);

                    let distance = geotools.distance(point, pointPlane);


                    if (distance < Math.min(RESULT.distance, maxDistance)) {
                        RESULT.point = point;
                        RESULT.distance = distance;
                        // RESULT.shpIndex = crossing.existingShape ? crossing.index : null;
                        // RESULT.segmentNumber = crossing.index - Number(!crossing.existingShape);
                        RESULT.line = line;
                        // set maxDistance so bbox checks can skip features...
                        // maxDistance = geotools.distance(point, position);
                        // searchBBox = geotools.getPointBBox(position, maxDistance);
                    }
                }
            }
        }
        return RESULT.line ? RESULT : null;
    };
}

export default ObjectManager;
