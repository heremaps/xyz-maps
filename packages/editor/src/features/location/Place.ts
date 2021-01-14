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

import oTools from './LocationTools';
import {Location} from './Location';
import {JSUtils} from '@here/xyz-maps-common';
import {Navlink} from '@here/xyz-maps-editor';

/**
 * The Place Feature is a generic editable Feature with "Point" geometry.
 * In addition to the Marker Feature, the Place feature can have a "routing point" located on a Navlink geometry.
 * A Place can be linked/associated with a Navlink Feature.
 *
 * The Feature can be edited with the {@link Editor}.
 */
class Place extends Location {
    /**
     *  The feature class of a Place Feature is "PLACE".
     */
    readonly class: 'PLACE';

    constructor(feature, provider) {
        super(feature, provider);
    }

    /**
     *  Find the nearest routing point and assign it to the Place Feature.
     */
    createRoutingPoint() {
        const obj = this;

        if (!oTools.getRoutingData(obj).link) {
            oTools.connect(obj);

            if (oTools.getRoutingData(obj).link) {
                oTools.markAsModified(obj);
            }
        }
    };

    /**
     *  Remove the existing routing point from the Place Feature.
     */
    removeRoutingPoint() {
        const obj = this;

        if (oTools.getRoutingData(obj).link) {
            oTools.disconnect(obj);

            oTools.markAsModified(obj);
        }
    };

    prop(): { [name: string]: any };
    prop(property: string): any;
    prop(property: string, value: any): void;
    prop(properties: { [name: string]: any }): void;
    prop(props?, p?): { [name: string]: any } | void {
        const feature = this;
        const aLen = arguments.length;
        const properties = feature.getProvider().getFeatureProperties(feature);
        let isModified = false;

        // act as getter
        if (!aLen || aLen == 1 && typeof props == 'string') {
            props = props ? properties[props] : properties;

            return props != null && typeof props == 'object'
                ? JSUtils.extend(true, new props.constructor(), props)
                : props;
        }

        if (aLen == 2) {
            const p = {};
            p[props] = arguments[1];
            props = p;
        }

        for (const key in props) {
            const value = props[key];
            const isObj = typeof value == 'object';
            const curValue = properties[key];

            if (
                isObj && JSON.stringify(value) != JSON.stringify(curValue) ||
                !isObj && curValue !== value
            ) {
                if (!isModified) {
                    // first modify
                    feature._e().objects.history.origin(feature);
                    isModified = true;
                }

                properties[key] = value;
            }
        }

        // connect to a link if this object has link property, if not, disconnect possible previous connection.
        if (oTools.getRoutingData(feature).link) {
            oTools.connect(feature, null);
        } else {
            oTools.disconnect(feature);
        }


        if (isModified) {
            feature._e().setStyle(feature);

            oTools.markAsModified(feature);
        }
    };
}

(<any>Place).prototype.class = 'PLACE';

export {Place};
