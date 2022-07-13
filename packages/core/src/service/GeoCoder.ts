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

import {GeoPoint} from '../geo/GeoPoint';

/* eslint camelcase: ["error", {"allow": ["app_id","app_code"]}]*/

/**
 *  Options to configure the GeoCoder.
 */
export interface GeoCoderOptions {
    /**
     * the app id required for authentication.
     *
     */
    app_id: string;
    /**
     * the app code required for authentication.
     */
    app_code: string;
    /**
     * The url to the Geocoder host.
     *
     * @defaultValue 'geocoder.api.here.com'
     */
    host?: string;
    /**
     * the used Geocoder version.
     *
     * @defaultValue '6.2'
     */
    version?: string;
}

function createXHR(url, onSuccess, onError) {
    const req = new XMLHttpRequest();

    req.onload = function() {
        onSuccess(JSON.parse(this.responseText));
    };

    req.onreadystatechange = function() {
        // error but not timeout
        const status = this.status;

        if (this.readyState == 4 && (status < 200 || status >= 300) && status !== 0) {
            if (onError) {
                onError(this);
            }
        }
    };

    req.open('GET', url, true);

    req.send();

    return req;
}

/**
 * Provides basic geocode and reverse geocode functionality that allows you to:
 * - Obtain geocoordinates for addresses
 * - Obtain addresses or administrative areas for locations
 * - Obtain geocoordinates for known landmarks
 *
 * Uses the HERE Geocoder API.
 * @see https://developer.here.com/documentation/geocoder/dev_guide/topics/what-is.html
 */
class GeoCoder {
    /**
     *  the url to the geocode service.
     */
    private readonly url: string;
    /**
     *  the url to the reverse geocode service.
     */
    private readonly reverseUrl: string;
    /**
     *  Current set config of the Geocoder.
     */
    private cfg: GeoCoderOptions;

    /**
     *  @param options - Options to configure the GeoCoder.
     */
    constructor(options: GeoCoderOptions) {
        const format = '.json';

        options = options || <GeoCoderOptions>{};

        options['host'] = options['host'] || 'geocoder.api.here.com';

        options['version'] = options['version'] || '6.2';


        this.url = 'https://' + options['host'] + '/' + options['version'] + '/geocode' + format;

        this.reverseUrl = 'https://reverse.' + options['host'] + '/' + options['version'] + '/reversegeocode' + format;

        this.cfg = options;
    }

    /**
     *  create the request url.
     *
     *  @param baseUrl - the url to geocoder service (normal or reverse)
     *  @param params - additional params for request url
     *  @returns the request url
     */
    private createUrl(baseUrl, params) {
        let pStr = '';

        params = params || {};

        for (const p in params) {
            pStr += '&' + p + '=' + encodeURIComponent(params[p]);
        }

        return this.reverseUrl +
            // '?xnlp=CL_JSMv3.0.12.4' +
            '?app_id=' + this.cfg['app_id'] +
            '&app_code=' + this.cfg['app_code'] +
            pStr;
    };


    /**
     *  Reuquest the Geocoder Resource.
     *  {@link https://developer.here.com/documentation/geocoder/dev_guide/topics/resource-geocode.html}
     *
     *  @param params - additional parameters for geocode request
     *  @param onSuccess - success callback
     *  @param onError - error callback
     */
    geocode(params: { [name: string]: string | string[] | number | number[] },
        onSuccess: (data: any) => void,
        onError?: (error: any) => void
    ) {
        createXHR(
            this.createUrl(this.url, params),
            onSuccess,
            onError
        );
    };


    /**
     *  Request the reverse Geocode Resource.
     *  {@link https://developer.here.com/documentation/geocoder/dev_guide/topics/resource-reverse-geocode.html}
     *
     *  @param params - additional parameters for reverse geocode request
     *  @param onSuccess - success callback
     *  @param onError - error callback
     */
    reverseGeocode(params: { [name: string]: string | string[] | number | number[] },
        onSuccess: (data: any) => void,
        onError: (error: any) => void
    ) {
        createXHR(
            this.createUrl(this.reverseUrl, params),
            onSuccess,
            onError
        );
    };


    /**
     *  Request reverse geocode request to receive ISO country code for a geographical position.
     *
     *  @param position - it is either an array [longitude, latitude] or an object literal \{longitude: number, latitude: number\}
     *  @param onSuccess - success callback which contains the iso country code.
     *  @param onError - error callback
     */
    getIsoCountryCode(position: number[] | GeoPoint, onSuccess: (isocc: string, data: any) => void, onError: (error: any) => void) {
        const params = {
            'mode': 'retrieveAddresses',
            'maxresults': 1,
            'jsonattributes': 1
        };

        if (position instanceof Array) {
            params['prox'] = position[1] + ',' + position[0];
        } else {
            params['prox'] = position['latitude'] + ',' + position['longitude'];
        }

        this.reverseGeocode(params, (data) => {
            let isocc = null;

            try {
                isocc = data['response']['view'][0]['result'][0]['location']['address']['country'];
            } catch (e) {

            }

            if (onSuccess) {
                onSuccess(isocc, data);
            }
        }, onError);
    };
}


export {GeoCoder};
