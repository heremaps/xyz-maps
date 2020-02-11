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

import {JSUtils, global} from '@here/xyz-maps-common';
import {layers} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {eChanges} from './EChanges';
import {eFeatures} from './EFeatures';
import {eLayers} from './ELayers';
import DrawingManager from './MDrawingManager';
import legacyAPI from './Legacy';
import {eSearch, SearchOptions} from './ESearch';
import {eListeners} from './EListeners';
import {eObservers} from './EObservers';
import ZoneSelector from './MZoneSelector';
import InternalEditor from './../IEditor';
import {mergeOptions, EditorOptions} from './EditorOptions';
import {initHooks} from './../hooks/init';
import EditFeature from './../features/feature/Feature';

type TileLayer = layers.TileLayer;

const NULL = null;


//* *******************************************************************************************************


/**
 *  @class
 *  @public
 *  @classdesc
 *  A map editor is a class which enables the user to add, modify, delete and work with different kind of map
 *  objects. Changes can be committed to the backend database or only stay local.
 *
 *  @example
 *  //create Map display
 *  var display = new here.xyz.maps.Map( mapDiv, {
 *      zoomLevel : 19,
 *      center: {
 *          latitude: 50.10905256955773, longitude: 8.657339975607162
 *      },
 *      // add layers to display
 *      layers: layers
 *  });
 *
 *  // create the editor instance
 *  editor = new MapEditor( display, config);
 *
 *  @constructor
 *  @desc
 *  Create an instance of the editor which is the main class within maphub maps API, you have to interact with.
 *  A map editor is a class which enables the user to add, modify, delete and work with different kind of map
 *  objects. Changes can be committed to the backend database or only stay locally.
 *
 *  @param {Object} display
 *      The map display which could be instance of Here map or Tiger map.
 *  @param {here.xyz.maps.editor.Editor.Config} config
 *      The config object containing customized settings.
 *
 *  @expose
 *  @name here.xyz.maps.editor.Editor
 */


class Editor {
    active: (on?: boolean) => boolean;

    getOverlay: () => TileLayer;
    getZoneSelector: () => ZoneSelector;

    undo: (steps?: number) => void;
    redo: (steps?: number) => void;

    addLayer: (layer: TileLayer) => boolean;
    removeLayer: (layer: TileLayer) => boolean;

    getLayers: (i?: number) => TileLayer | TileLayer[];

    getDrawingBoard: () => DrawingManager;

    get: (key: string) => any;

    search: (options: SearchOptions) => EditFeature[];

    private _i: () => InternalEditor;

    constructor(display: Map, options: EditorOptions) {
        const that: Editor = this;

        options = mergeOptions(options || {});

        const optionLayers = options.layers;
        delete options.layers;

        JSUtils.loglevel = options['debug'] && 'debug';


        let HERE_WIKI = new InternalEditor(options, display);

        const GLOBAL_NAMESPACE = global.here.xyz.maps.editor; // HERE_WIKI.editorNS;

        // FOR DEVELOPMENT ONLY!
        // >>excludeStart("devMapEditorInit", pragmas.devMapEditorInit);
        that._i = () => HERE_WIKI;
        // >>excludeEnd("devMapEditorInit");

        that['addHook'] = (name, hook, provider?) => HERE_WIKI.hooks.add(name, hook, provider);
        that['removeHook'] = (name, hook, provider?) => HERE_WIKI.hooks.remove(name, hook, provider);
        that['getHooks'] = (name) => HERE_WIKI.hooks.get(name);

        initHooks(HERE_WIKI);

        JSUtils.extend(that, eChanges(HERE_WIKI));

        /**
         *  The DIV container for the Map Editor.
         *
         *  @public
         *  @expose
         *  @readonly
         *  @type Node
         *  @name here.xyz.maps.editor.Editor#container
         */
        that['container'] = display.getContainer();


        /**
         *  enable or disable the editor.
         *
         *  @public
         *  @expose
         *  @function
         *  @param {Boolean} on boolean value to enable or disable the editor
         *  @name here.xyz.maps.editor.Editor#active
         *  @return {boolean}
         *      current active state
         */
        that['active'] = (on?: boolean): boolean => {
            let isActive = <boolean>HERE_WIKI.observers.get('active');

            if (on != undefined) {
                on = !!on;

                if (on != isActive) {
                    isActive = on;
                    HERE_WIKI.objects.listenDisplay(on);
                    HERE_WIKI.observers.change('active', on, true);
                }
            }
            return isActive;
        };

        /**
         *  Destroys this editor.
         *
         *  @public
         *  @expose
         *  @function
         *  @name here.xyz.maps.editor.Editor#destroy
         */
        that['destroy'] = function() {
            // make sure all layer listeners are removed
            (<TileLayer[]>that.getLayers()).forEach(that.removeLayer);

            that.active(false);

            HERE_WIKI.destroy();

            // clear/null Editor's instance
            for (var i in that) delete that[i];

            return null;
        };

        JSUtils.extend(that, eLayers(HERE_WIKI, optionLayers));

        JSUtils.extend(that, eListeners(HERE_WIKI.listeners));

        JSUtils.extend(that, eObservers(HERE_WIKI.observers));

        JSUtils.extend(that, eFeatures(HERE_WIKI));

        /**
         *  Sets the desired zoomLevel.
         *
         *  @public
         *  @expose
         *  @function
         *  @param {number} zoomLevel
         *      The zoomLevel which should be set.
         *  @name here.xyz.maps.editor.Editor#setZoomLevel
         */
        that['setZoomLevel'] = (level: number) => {
            display.setZoomlevel(level);
        };

        /**
         *  Get the current zoomLevel.
         *
         *  @public
         *  @expose
         *  @function
         *  @return {number}
         *      The current zoomLevel.
         *  @name here.xyz.maps.editor.Editor#getZoomLevel
         */
        that['getZoomLevel'] = () => display.getZoomlevel();

        /**
         *  Convert pixel coordinate to geo coordinate.
         *
         *  @public
         *  @expose
         *  @function
         *  @param {here.xyz.maps.editor.PixelCoordinate} p
         *      The pixel coordinate.
         *  @return {here.xyz.maps.editor.GeoCoordinate}
         *      WGS84 Coordinate, object with properties latitude(as degree) and longitude(as degree)
         *  @name here.xyz.maps.editor.Editor#pixelToGeo
         */
        that['pixelToGeo'] = (p) => {
            const c = HERE_WIKI.map.getGeoCoord(p);
            return c ? new GLOBAL_NAMESPACE['GeoCoordinate'](c[0], c[1]) : NULL;
        };

        /**
         *  Convert geo coordinate to pixel coordinate.
         *
         *  @public
         *  @expose
         *  @function
         *  @param {here.xyz.maps.editor.GeoCoordinate} p
         *      WGS84 Coordinate, object with properties latitude(as degree) and longitude(as degree)
         *  @return {here.xyz.maps.editor.PixelCoordinate}
         *      The pixel coordinate.
         *  @name here.xyz.maps.editor.Editor#geoToPixel
         */
        that['geoToPixel'] = (p) => {
            const c = HERE_WIKI.map.getPixelCoord(p);
            return c ? new GLOBAL_NAMESPACE['PixelCoordinate'](c[0], c[1]) : NULL;
        };

        const drawingBoard = new DrawingManager(HERE_WIKI, HERE_WIKI.map, GLOBAL_NAMESPACE);

        /**
         *  get manager for drawing links or areas by mouse clicks.
         *
         *  @public
         *  @function
         *  @expose
         *  @name here.xyz.maps.editor.Editor#getDrawingBoard
         *  @return {here.xyz.maps.editor.Editor.drawingBoard}
         */
        that.getDrawingBoard = () => drawingBoard;

        const zoneSelector = new ZoneSelector(HERE_WIKI);

        /**
         *  get tool for selecting zones/sides at links.
         *
         *  @public
         *  @function
         *  @expose
         *  @name here.xyz.maps.editor.Editor#getZoneSelector
         *  @return {here.xyz.maps.editor.Editor.zoneSelector}
         */
        that.getZoneSelector = () => zoneSelector;

        /**
         *  Returns overlay layer for user interaction.
         *
         *  @public
         *  @function
         *  @expose
         *  @name here.xyz.maps.editor.Editor#getOverlay
         *  @return {here.xyz.maps.layers.TileLayer}
         */
        that.getOverlay = () => HERE_WIKI.objects.overlay.layer;

        /**
         *  Undo the latest change(s).
         *  One change entry can contain multiple object modifications.
         *  The changes are stores in the local storage.
         *  A {@link here.xyz.maps.editor.Editor#submit} request clears the local storage.
         *
         *  @function
         *  @public
         *  @param {number=} steps
         *      the number of change entries to undo, optional.
         *  @expose
         *  @name here.xyz.maps.editor.Editor#undo
         */
        that.undo = (steps) => {
            steps = Math.min(<number>that.get('history.current'), steps || 1);

            while (steps--) {
                HERE_WIKI.objects.history.recoverViewport(-1, !!steps);
            }
        };

        /**
         *  Redo the latest change(s).
         *  One change entry can contain multiple object modifications.
         *  The changes are stores in the local storage.
         *  A {@link here.xyz.maps.editor.Editor#submit} request clears the local storage.
         *
         *  @function
         *  @public
         *  @param {number=} steps
         *      the number of change entries to redo, optional.
         *  @expose
         *  @name here.xyz.maps.editor.Editor#redo
         */
        that.redo = (steps) => {
            steps = Math.min(that.get('history.length'), steps || 1);

            while (steps--) {
                HERE_WIKI.objects.history.recoverViewport(1, !!steps);
            }
        };

        JSUtils.extend(that, eSearch(HERE_WIKI));


        // TODO: remove legacy api..
        if (options.legacy) {
            legacyAPI(that, display);
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
    };
}

export default Editor;
