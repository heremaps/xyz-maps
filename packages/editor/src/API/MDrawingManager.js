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

import ClickDraw from '../tools/drawingBoards/ClickDraw';


const AREA = 'AREA';
const NAVLINK = 'NAVLINK';

/**
 *  Tool to manage drawing links or areas.
 *
 *  @expose
 *  @public
 *  @interface
 *  @class here.xyz.maps.editor.Editor.drawingBoard
 */
function MDrawingManager(HERE_WIKI, map, WIKI) {
    const that = this;
    const overlay = HERE_WIKI.objects.overlay;
    const clickDraw = new ClickDraw(overlay, HERE_WIKI, HERE_WIKI.display);
    let usedBoard = clickDraw;
    let isActive = false;

    /* ############################################# METHODS ##########################################################*/
    /**
     *  Add a point to link.
     *
     *  @public
     *  @expose
     *  @function
     *  @param {here.xyz.maps.editor.PixelCoordinate} pnt
     *      the point to add to link.
     *  @param {here.xyz.maps.editor.features.Navlink=} lnk
     *      the link to be split by the point, this link is given with the first point on link
     *  @name here.xyz.maps.editor.Editor.drawingBoard#addShape
     */
    that.addShape = (pnt, lnk) => {
        if (isActive) {
            usedBoard.addShape(HERE_WIKI.map.getGeoCoord(pnt), lnk);
        }
    };

    /**
     *  Remove the last shape point.
     *
     *  @public
     *  @expose
     *  @function
     *  @param {Number} idx
     *      the index of the shape point to be removed
     *  @name here.xyz.maps.editor.Editor.drawingBoard#removeShape
     */
    that.removeShape = (idx) => {
        isActive && usedBoard.removeShape(idx);
    };

    /**
     *  Get length of the link.
     *
     *  @public
     *  @expose
     *  @function
     *  @return {Number} Length of the link
     *  @name here.xyz.maps.editor.Editor.drawingBoard#getLength
     */
    that.getLength = () => usedBoard.getLength();


    /**
     *  Cancel drawing.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.editor.Editor.drawingBoard#cancel
     */
    that.cancel = () => {
        usedBoard.hide();
        isActive = false;
    };


    /**
     *  Set properties of the feature.
     *
     *  @public
     *  @expose
     *  @function
     *  @param {here.xyz.maps.editor.features.Navlink.Properties} properties
     *      properties the feature will be created with.
     *  @name here.xyz.maps.editor.Editor.drawingBoard#setProperties
     */
    that.setProperties = (properties) => {
        isActive && usedBoard.setAttributes(properties);
    };

    /**
     * @deprecated
     */
    that.setAttributes = that.setProperties;


    /**
     *  Create the drawn feature.
     *
     *  @public
     *  @expose
     *  @function
     *  @param {here.xyz.maps.editor.features.Feature.Properties=} properties
     *      properties of the feature
     *  @return {here.xyz.maps.editor.features.Navlink|here.xyz.maps.editor.features.Line|here.xyz.maps.editor.features.Area|undefined}
     *      drawn feature or undefined in case of feature can't be created because of invalid geometry
     *  @name here.xyz.maps.editor.Editor.drawingBoard#create
     */
    that.create = (a) => {
        if (isActive) {
            let feature = usedBoard.create(a);

            if (feature) {
                isActive = false;
            }
            return feature;
        }
    };

    /**
     *  Start the drawing board to enable drawing.
     *
     *  @public
     *  @expose
     *  @function
     *  @param {Object=} opt
     *  @param {(String|here.xyz.maps.editor.features.Navlink|here.xyz.maps.editor.features.Line|here.xyz.maps.editor.features.Area)=} opt.mode
     *      type of feature to draw. possible string values are: 'Line','Navlink' and 'Area'.
     *  @param {Array.<here.xyz.maps.layers.TileLayer.Style>=} opt.styleGroup for custom draw styling.
     *  @param {here.xyz.maps.editor.PixelCoordinate=} opt.position the first shape point
     *  @param {here.xyz.maps.editor.features.Navlink=} opt.connectTo link to which the drawn Navlink connects
     *  @param {here.xyz.maps.layers.TileLayer=} opt.layer layer where the feature should be created in.
     *  @param {Function=} opt.onFinish callback function for finish drawing the object
     *  @param {Function=} opt.onShapeAdd callback function for adding a shape point.
     *  @param {Function=} opt.onShapeRemove callback function for removing a shape point.
     *  @name here.xyz.maps.editor.Editor.drawingBoard#start
     */
    that.start = (opt) => {
        opt = opt || {};
        // options conversation to 'old' api

        const connectTo = opt['connectTo'];
        let mode = opt['mode'] || NAVLINK;

        if (typeof mode != 'string') {
            mode = mode === WIKI['features']['Area']
                ? AREA
                : NAVLINK;
        } else {
            mode = mode.toUpperCase();
        }

        opt.mode = mode;

        opt['attributes'] = opt['properties'] || opt['attributes'] || {};

        // by default set generalization in TouchDraw to 20 and in ClickDraw to 1
        // opt['generalization'] = opt['generalization']||1;
        if (!isActive) {
            usedBoard = opt['control'] == 'FREEHAND'
                ? touchDraw
                : clickDraw;

            opt.layer = opt.layer || HERE_WIKI.getLayerForClass(mode);

            if (mode != AREA || opt.layer) {
                HERE_WIKI.listeners.trigger('_clearOverlay');

                usedBoard.show.call(usedBoard, opt);
                isActive = usedBoard.isActive();

                if (opt['position']) {
                    that.addShape(opt['position'], connectTo);
                }
            }
        }

        return isActive;
    };

    /**
     *  Get state of the drawing board.
     *
     *  @public
     *  @expose
     *  @function
     *  @return {Boolean}
     *      current state of the drawing board
     *  @name here.xyz.maps.editor.Editor.drawingBoard#isActive
     */
    that.isActive = () => isActive;


    that.getGeometry = () => usedBoard.createGeom();
}

export default MDrawingManager;
