/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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
import {Feature} from './features/feature/Feature';
import Editor from './API/Editor';
import {EditorProperties, DefaultEditorProperties} from './features/feature/EditorProperties';

import {Place} from './features/location/Place';
import {Address} from './features/location/Address';
import {Navlink} from './features/link/Navlink';
import {Line} from './features/line/Line';
import {Area} from './features/area/Area';
import {Marker} from './features/marker/Marker';


export * from './features/feature/Feature';
export * from './features/marker/Marker';
export * from './features/line/Line';
export * from './features/area/Area';
export * from './features/location/Place';
export * from './features/location/Address';
export * from './features/link/Navlink';
export * from './features/area/AreaShape';
export * from './features/feature/EditorProperties';
export * from './API/EditorEvent';

const NAVLINK = 'NAVLINK';
const AREA = 'AREA';
const MARKER = 'MARKER';
const PLACE = 'PLACE';
const ADDRESS = 'ADDRESS';
const LINE = 'LINE';
const objectTypeMapping = {};
let UNDEF;

objectTypeMapping[NAVLINK] = 'Navlink';
objectTypeMapping[AREA] = 'Area';
objectTypeMapping[PLACE] = 'Place';
objectTypeMapping[ADDRESS] = 'Address';
objectTypeMapping[MARKER] = 'Marker';
objectTypeMapping[LINE] = 'Line';


// support for legacy api
export const features = ((() => {
    function createObjDef(objType) {
        const toGeojsonCoordinates = (coordinates) => {
            let x = coordinates.x != UNDEF ? coordinates.x
                : coordinates.longitude != UNDEF ? coordinates.longitude
                    : coordinates[0];

            if (typeof x == 'number') {
                return coordinates;
            }
            const cpy = [];

            for (let c of coordinates) {
                cpy[cpy.length] = toGeojsonCoordinates(c);
            }
            return cpy;
        };

        function Obj(id, coords, properties) {
            const that = this;

            if (typeof id != 'number' && typeof id != 'string') {
                properties = coords;
                coords = id;
            } else {
                that.id = id;
            }

            that.type = 'Feature';

            that.class = objType;

            that.properties = JSUtils.extend({
                '@ns:com:here:editor': new DefaultEditorProperties()
            }, properties || {});

            that.geometry = {

                type: (objType == 'PLACE' || objType == 'ADDRESS' || objType == 'MARKER')
                    ? 'Point'
                    : objType == 'AREA'
                        ? 'MultiPolygon'
                        : 'LineString',

                coordinates: toGeojsonCoordinates(coords)
            };
        }

        Obj.prototype = Feature.prototype;

        return Obj;
    }

    const objects = {};

    for (const t in objectTypeMapping) {
        objects[objectTypeMapping[t]] = createObjDef(t);
    }

    return objects;
}))();

export {Editor};


const dns = 'here.xyz.maps.editor'.split('.');
let scp = global;

for (let i = 0; i < dns.length - 1; i++) {
    scp = scp[dns[i]] = scp[dns[i]] || {};
}
// support for deprecated legacy (namespace based) api interface
const editor = scp[dns.pop()] = {
    Editor: Editor,
    features: features,
    PixelCoordinate: function(x: number, y: number, z: number) {
        this.x = x;

        this.y = y;
        this.z = z || 0;
    },
    GeoCoordinate: function(lon: number, lat: number, z: number) {
        this.longitude = lon;
        this.latitude = lat;
        this.z = z || 0;
    }
};


const providers = global.here['xyz']['maps']['providers'];
// TODO: remove HACK required for geospace provider being editable...
// providers.EditableRemoteTileProvider.prototype.getFeatureClass =
providers.EditableFeatureProvider.prototype.getFeatureClass = function(feature) {
    switch (this.detectFeatureClass(feature)) {
    case 'NAVLINK':
        return Navlink;
    case 'PLACE':
        return Place;
    case 'ADDRESS':
        return Address;
    case 'AREA':
        return Area;
    case 'MARKER':
        return Marker;
    case 'LINE':
        return Line;
    default:
        return this.Feature;
    }
};

export default editor;
