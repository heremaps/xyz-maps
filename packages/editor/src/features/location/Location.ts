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

import Marker from '../marker/Marker';
import oTools from './LocationTools';

class Location extends Marker {
    constructor(feature, provider) {
        super(feature, provider);
    }

    getBBox(): [number, number, number, number] {
        // because poi has display and routing point it's indexed as a line in r-tree for better search..
        // so the real bbox hast to be restored
        const geo = <[number, number]> this.geometry.coordinates;
        return [geo[0], geo[1], geo[0], geo[1]];
    };

    /**
     *  Get the link to which the feature is attached.
     *
     *  @public
     *  @expose
     *  @return {here.xyz.maps.editor.features.Navlink}
     *      The link to which the POI is attached.
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Location#getLink
     */
    getLink() {
        const data = oTools.getRoutingData(this);
        let link = data.link;

        if (link) {
            const provider = oTools.getRoutingProvider(this);
            link = provider && provider.search(data.link);
        }

        return link || null;
    };
}


export default Location;
