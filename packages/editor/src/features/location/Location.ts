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

import {Feature} from '../feature/Feature';
import oTools from './LocationTools';
import {Navlink} from '../link/Navlink';
import {GeoJSONCoordinate} from '@here/xyz-maps-core';
import {Marker} from '../marker/Marker';

/**
 * @hidden
 */
export class Location extends Feature {
    readonly class: 'PLACE' | 'ADDRESS';

    constructor(feature, provider) {
        super(feature, provider);
    }

    /**
     *  Get the coordinate(s) of the feature.
     */
    coord(): GeoJSONCoordinate;
    /**
     *  Set the coordinate(s) of the feature.
     *
     *  @param coordinates - the coordinates that should be set.
     */
    coord(coordinate: GeoJSONCoordinate);

    coord(ccoordinate?: GeoJSONCoordinate): GeoJSONCoordinate {
        return super.coord(ccoordinate);
    }


    getBBox(): [number, number, number, number] {
        // because poi has display and routing point it's indexed as a line in r-tree for better search..
        // so the real bbox hast to be restored
        const geo = <[number, number]> this.geometry.coordinates;
        return [geo[0], geo[1], geo[0], geo[1]];
    };

    /**
     *  Get the Navlink Feature that the feature is linked to/ associated with.
     *
     *  @returns The Navlink Feature or null if the feature is not linked to a Navlink (floating).
     */
    getLink(): Navlink | null {
        const data = oTools.getRoutingData(this);
        let linkId = data.link;
        let link;

        if (linkId) {
            const provider = oTools.getRoutingProvider(this);
            link = provider && provider.search(data.link);
        }

        return link || null;
    };
}
