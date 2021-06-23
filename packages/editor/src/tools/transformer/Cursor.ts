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
import {Feature, FeatureProvider, GeoJSONCoordinate, GeoJSONFeature, Style} from '@here/xyz-maps-core';
import InternalEditor from '../../IEditor';
import Overlay from '../../features/Overlay';

export class Cursor extends Feature {
    protected _o: Overlay
    protected __: { [ev: string]: (e, dx?: number, dy?: number) => void }

    constructor(
        internalEditor: InternalEditor,
        position: GeoJSONCoordinate,
        overlay: Overlay,
        transformer,
        style: Style | Style[]
    ) {
        const geojson: GeoJSONFeature = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: position
            },
            properties: {}
        };

        super(geojson, <FeatureProvider>overlay.layer.getProvider());

        this._o = overlay;

        overlay.addFeature(this, style);
    }

    setPosition(lon, lat) {
        this.getProvider().setFeatureCoordinates(this, [lon, lat]);
    };

    getCenter() {
        return this.geometry.coordinates.slice();
    }

    hide() {
        this._o.hideFeature(this);
    };

    show() {
        this._o.showFeature(this);
    };

    remove() {
        this._o.remove(this);
    };
}
