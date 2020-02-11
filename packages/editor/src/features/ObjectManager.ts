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
import SelectionHandler from './SelectionHandler';
import History from './History';
import ObjectOverlay from './Overlay';
import {createOverlayLayer, OverlayProvider} from '../providers/OverlayLayer';
import {split, SplitOptions} from './LinkSplitter';
import {layers, providers} from '@here/xyz-maps-core';
import {Map, JSUtils, geotools} from '@here/xyz-maps-common';
import {getPntOnLine, intersectBBox} from '../geometry';
import Navlink from './link/NavLink';
import {FeatureProvider} from '@here/xyz-maps-core/src/providers/FeatureProvider';

type TileLayer = layers.TileLayer;

type Point = [number, number, number?];

type NavlinkIds = String | Number;

type Options = {
    ignore?: NavlinkIds[]
    maxDistance?: number,
    shapeThreshold?: number,
    onlyExsitingShape?: boolean
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
    private iEdit;
    private display;
    private listen: boolean = false;
    private layers: Map<layers.TileLayer>;

    history: History;

    tools;
    selection;
    overlay: ObjectOverlay;

    constructor(HERE_WIKI, display) {
        const objManager = this;

        objManager.iEdit = HERE_WIKI;
        objManager.display = display;


        objManager.history = new History(HERE_WIKI);
        objManager.selection = new SelectionHandler(HERE_WIKI, display);

        const overlayLayer = createOverlayLayer(HERE_WIKI);

        objManager.overlay = new ObjectOverlay(overlayLayer);

        let layers: Map<layers.TileLayer> = new Map([[overlayLayer.id, overlayLayer]]);

        this.layers = layers;

        display.addLayer(overlayLayer, getOverlayIndex(display.getLayers()));


        objManager.arrangeOverlay = objManager.arrangeOverlay.bind(objManager);

        objManager.pointerListener = objManager.pointerListener.bind(objManager);

        HERE_WIKI.listeners.bind('_layerAdd', (ev) => {
            const layer = ev.detail.layer;
            layers.set(layer.id, layer);
        });

        HERE_WIKI.listeners.bind('_layerRemove', (ev) => {
            const layer = ev.detail.layer;
            layers.delete(layer.id);
            // CLEAR SELECTED OBJECTS OF LAYER IF NEEDED..
            // ..TO MAKE SURE THERE ARE NO LEFTOVERS IN OVERLAY
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

    // clear/cleanup simplified instances!
    clear() {

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

    getInBBox(bounds, searchInLayers?: FeatureProvider | TileLayer | TileLayer[]): any[] {
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
                for (let d = 0; d < layerResult.length; d++) {
                    result.push(layerResult[d]);
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
            params.split || !objManager.iEdit._config.editRestrictions(obj, 2)
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
                    return this.create(
                        obj, layer.getProvider(), UNDEF, UNDEF, idmap
                    );
                }

                return inserted;
            }
        }
    };

    create(objsDef, provider, prefIdx, historyRecovering, idMapping?: { [id: string]: string }) {
        const HERE_WIKI = this.iEdit;
        const objects = [];

        objsDef = objsDef instanceof Array ? objsDef : [objsDef];

        idMapping = idMapping || {};


        const createFeature = (feature) => {
            if (historyRecovering) {
                provider.blockFeature(feature, false);
            }
            feature = provider.addFeature(feature);
            // make sure it's real provider feature in case reject because of double add with same id..
            feature = provider.search(feature.id);

            if (!historyRecovering) { // make sure history is not creating objects for viewport recovering
                feature.editState('created', Date.now());

                oTools.markAsModified(feature, false);

                HERE_WIKI.objects.history.origin(feature, true);
            }
            objects.push(feature);

            return feature;
        };

        for (let index = 0; index < objsDef.length; index++) {
            let feature = objsDef[index];
            let defId = feature.id;
            let featureClass;

            if (!historyRecovering) {
                // make sure provider is creating new id (.prepareFeature) and can't be set from userspace...
                // states are only set from provider if no id is present...
                feature.id = UNDEF;
            }

            feature = provider.prepareFeature(feature);
            featureClass = provider.detectFeatureClass(feature);

            if (defId == UNDEF) {
                defId = feature.id;
            }

            idMapping[defId] = feature.id;


            feature = createFeature(feature);

            if (featureClass === 'NAVLINK') {
                // Make sure zlevels are set!
                feature.geometry.coordinates.forEach((c) => {
                    c[2] = c[2] ^ 0;
                });

                // in case of history recovering disable autofix to guarantee geometry is created 1:1 and not modified!
                if (!historyRecovering) {
                    oTools.fixGeo(feature, UNDEF, UNDEF, prefIdx);
                }
            } else if (featureClass === 'PLACE' || featureClass === 'ADDRESS') {
                // let obj = createFeature(feature);
                let routingPoint = oTools.getRoutingData(feature);
                let cLinkId = routingPoint.link;

                if (idMapping[cLinkId]) {
                    const provider = oTools.getRoutingProvider(feature);
                    const routingLink = provider && provider.search(idMapping[cLinkId]);

                    HERE_WIKI.objects.history.ignore(() => {
                        feature.getProvider().writeRoutingPoint(feature, routingLink, routingPoint.position);
                    });
                }
                // Address needs to be connected to link.
                // so if no link is defined automaticly get the next one..
                if (featureClass === 'ADDRESS') {
                    oTools.connect(feature);
                    if (!feature.getLink()) {
                        // no link could be found -> undo creation
                        // cleanup history
                        HERE_WIKI.objects.history.remove(feature);
                        provider.removeFeature(objects.pop());
                        HERE_WIKI.dump('No Link found within ' + HERE_WIKI._config['maxRoutingPointDistance'] + ' meters', 'warn');
                    }
                }
            }
        }
        // return objects.length>1 ? objects.items : objects.items[0];
        return objects.length > 1 ? objects : objects[0];
    };

    getNearestLine(point: Point, data: providers.EditableProvider | Navlink[], options?: Options) {
        const HERE_WIKI = this.iEdit;
        // overwrite default configuration
        options = JSUtils.extend({
            ignore: [],
            // search radius in meter
            maxDistance: Infinity,
            shapeThreshold: 0,
            onlyExsitingShape: false
            // lines: false
        }, options || {});

        const RESULT = {
            line: null,
            point: null,
            distance: Infinity,
            shpIndex: null,
            segmentNumber: null
        };

        const geopos = point;
        let bbox;

        let maxDistance = options.maxDistance;
        let searchBBox = maxDistance < Infinity
            ? geotools.getPointBBox(geopos, maxDistance)
            : null;

        if (data instanceof providers.EditableProvider) {
            data = this.getInBBox(searchBBox, data);
        }

        // const lines = options.lines || this.getInBBox(searchBBox, HERE_WIKI.linkLayer);

        point = HERE_WIKI.map.getPixelCoord(point);

        // if zLevels are defined -> check them!
        function getDistance(p1) {
            return (p1[2] === UNDEF || geopos[2] === UNDEF || p1[2] === geopos[2])
                ? geotools.distance(p1, geopos)
                : Infinity;
        };

        for (let line of data) {
            if (
                // check if link must be skipped
                options.ignore.indexOf(line.id) == -1
            ) {
                bbox = line.bbox;

                if (
                    maxDistance == Infinity ||
                    intersectBBox(
                        searchBBox[0], searchBBox[2], searchBBox[1], searchBBox[3],
                        bbox[0], bbox[2], bbox[1], bbox[3]
                    )
                ) {
                    const path = line.geometry.coordinates;
                    let // line.coord(),
                        foundSegment;
                    let minFoundDistance = options.maxDistance;
                    let foundShapeIndex;
                    const path2d = [];
                    let foundPoint;
                    var p;
                    let d;

                    for (let i = 0; i < path.length; i++) {
                        path2d[i] = HERE_WIKI.map.getPixelCoord(p = path[i]);

                        d = getDistance(p);

                        if (d < minFoundDistance) {
                            minFoundDistance = d;
                            foundShapeIndex = i;
                            foundSegment = (i > 0 && i - 1) ^ 0; // Math.max(0,i-1);
                            foundPoint = p;
                        }
                    }


                    if (
                        !options.onlyExsitingShape && (
                            // if no point is found already search for more...
                            (foundPoint == UNDEF || // if found already and within shapeTReshold we do not need to calculate..
                                minFoundDistance > options.shapeThreshold)
                        )
                    ) {
                        for (let i = 0; i < path2d.length - 1; i++) {
                            if (
                                p = getPntOnLine(path2d[i], path2d[i + 1], point)
                            ) {
                                p = HERE_WIKI.map.getGeoCoord(p);

                                // do not define zlevel to skip zlevel matching..
                                d = getDistance([p[0], p[1]]);

                                if (d < minFoundDistance) {
                                    minFoundDistance = d;
                                    foundShapeIndex = null;
                                    foundSegment = i;
                                    foundPoint = p;
                                }
                            }
                        }
                    }

                    if (foundPoint && minFoundDistance < RESULT.distance) {
                        RESULT.point = foundPoint;
                        RESULT.distance = minFoundDistance;
                        RESULT.shpIndex = foundShapeIndex;
                        RESULT.segmentNumber = foundSegment;
                        RESULT.line = line;

                        // set maxDistance so bbox checks can skip features..
                        maxDistance = geotools.distance(foundPoint, geopos);
                        searchBBox = geotools.getPointBBox(geopos, maxDistance);
                    }
                }
            }
        }


        return RESULT.line ? RESULT : null;
    };
}

export default ObjectManager;
