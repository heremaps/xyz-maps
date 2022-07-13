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

import oTools from './LocationTools';
import {Location} from './Location';
import {JSUtils} from '@here/xyz-maps-common';

/**
 * The Address Feature is a generic editable Feature with "Point" geometry.
 * In addition to the Marker Feature, the Place feature must have a "routing point" located on a Navlink geometry.
 * A Address must be linked/associated with a Navlink Feature.
 *
 * The Feature can be edited with the {@link Editor}.
 */
class Address extends Location {
    /**
     *  The feature class of an Address Feature is "ADDRESS".
     */
    readonly class: 'ADDRESS';

    prop(): { [name: string]: any };
    prop(property: string): any;
    prop(property: string, value: any): void;
    prop(properties: { [name: string]: any }): void;
    prop(props?, p?): { [name: string]: any } | void {
        const feature = this;
        let isModified = false;
        const aLen = arguments.length;
        const properties = feature.getProvider().getFeatureProperties(feature);

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


        // in case of routingpoint properties have changed, make sure connection is created or updated.
        oTools.connect(feature, null);


        if (isModified) {
            feature._e().setStyle(feature);

            oTools.markAsModified(feature);
        }
    };
}

(<any>Address).prototype.class = 'ADDRESS';

export {Address};
