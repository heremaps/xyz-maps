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

import {Point as GeoPoint} from '../geo/Point';

/* eslint camelcase: ["error", {"allow": ["app_id","app_code"]}]*/
export interface GeoCoderOptions{
    app_id: string;
    app_code: string;
    host: string;
    version: string;
}
/**
 *  Configuration of Geocoder.
 *
 *  @public
 *  @interface
 *  @class
 *  @expose
 *  @name here.xyz.maps.service.Geocoder.Options
 */
/**
 * app id.
 *
 * @public
 * @expose
 * @name here.xyz.maps.service.Geocoder.Options#app_id
 * @type {string}
 */
/**
 * app code.
 *
 * @public
 * @expose
 * @name here.xyz.maps.service.Geocoder.Options#app_code
 * @type {string}
 */
/**
 * url to geo coder host.
 *
 * @public
 * @expose
 * @optional
 * @default 'geocoder.api.here.com'
 * @name here.xyz.maps.service.Geocoder.Options#host
 * @type {string}
 */
/**
 * geo coder version.
 *
 * @public
 * @expose
 * @optional
 * @default '6.2'
 * @name here.xyz.maps.service.Geocoder.Options#version
 * @type {string}
 */

function createXHR( url, onSuccess, onError ) {
    const req = new XMLHttpRequest();

    req.onload = function() {
        onSuccess( JSON.parse( this.responseText ) );
    };

    req.onreadystatechange = function() {
        // error but not timeout
        const status = this.status;

        if ( this.readyState == 4 && (status<200||status>=300) && status !== 0 ) {
            if ( onError ) {
                onError( this );
            }
        }
    };

    req.open('GET', url, true);

    req.send();

    return req;
}

/**
 *  providers geocode and reverse geocode services.
 *
 *  @class
 *  @expose
 *  @public
 *
 *  @param {here.xyz.maps.service.Geocoder.Options} config configurations for geocoder
 *  @name here.xyz.maps.service.Geocoder
 */
class GeoCoder {
    private url: string;
    private reverseUrl: string;
    private cfg: GeoCoderOptions;

    constructor( cfg: GeoCoderOptions ) {
        const format = '.json';

        cfg = cfg || <GeoCoderOptions>{};

        cfg['host'] = cfg['host'] || 'geocoder.api.here.com';

        cfg['version'] = cfg['version'] || '6.2';

        /**
         *  the url to the geocode service.
         *
         *  @expose
         *  @public
         *  @type {String}
         *  @name here.xyz.maps.service.Geocoder#url
         */
        this.url = 'https://' + cfg['host'] + '/' + cfg['version'] + '/geocode' + format;

        /**
         *  the url to the reverse geocode service.
         *
         *  @expose
         *  @public
         *  @type {String}
         *  @name here.xyz.maps.service.Geocoder#reverseUrl
         */
        this.reverseUrl = 'https://reverse.' + cfg['host'] + '/' + cfg['version'] + '/reversegeocode' + format;


        /**
         *  Current config of the Geocoder.
         *
         *  @expose
         *  @public
         *  @type {Object}
         *  @name here.xyz.maps.service.Geocoder#config
         */
        this.cfg = cfg;
    }

    /**
     *  create request url.
     *
     *  @expose
     *  @function
     *  @public
     *  @name here.xyz.maps.service.Geocoder#createUrl
     *  @param {String} baseUrl
     *  @param {Object} params additional params for request url
     *  @return {string} return request url
     */
    createUrl( baseUrl, params ) {
        let pStr = '';

        params = params || {};

        for ( const p in params ) {
            pStr += '&' + p + '=' + encodeURIComponent( params[p] );
        }

        return this.reverseUrl +
            // '?xnlp=CL_JSMv3.0.12.4' +
            '?app_id=' + this.cfg['app_id'] +
            '&app_code=' + this.cfg['app_code'] +
            pStr;
    };


    /**
     *  make geocode request.
     *
     *  @expose
     *  @function
     *  @public
     *  @name here.xyz.maps.service.Geocoder#geocode
     *  @param {Object} params additional params for request url
     *  @param {Function} onSuccess success callback
     *  @param {Function} onError error callback
     */
    geocode( params, onSuccess, onError ) {
        createXHR(
            this.createUrl( this.url, params ),
            onSuccess,
            onError
        );
    };


    /**
     *  make reverse geocode request.
     *
     *  @expose
     *  @function
     *  @public
     *  @name here.xyz.maps.service.Geocoder#reverseGeocode
     *  @param {Object} params additional params for request url
     *  @param {Function} onSuccess success callback
     *  @param {Function} onError error callback
     */
    reverseGeocode( params, onSuccess:(data:any)=>void, onError:(error:any)=>void ) {
        createXHR(
            this.createUrl( this.reverseUrl, params ),
            onSuccess,
            onError
        );
    };


    /**
     *  make reverse geocode request for ISO country code.
     *
     *  @expose
     *  @function
     *  @public
     *  @name here.xyz.maps.service.Geocoder#getIsoCountryCode
     *  @param {Object} location it is either an array [longitude, latitude] or an object literal {longitude: number, latitude: number}
     *  @param {Function} onSuccess success callback which contains iso country code
     *  @param {Function} onError error callback
     */
    getIsoCountryCode( location: number[]|GeoPoint, onSuccess: (isocc:string, data:any)=>void, onError:(error:any)=>void ) {
        const params = {
            'mode': 'retrieveAddresses',
            'maxresults': 1,
            'jsonattributes': 1
        };

        if ( location instanceof Array ) {
            params['prox'] = location[1] + ',' + location[0];
        } else {
            params['prox'] = location['latitude'] + ',' + location['longitude'];
        }

        this.reverseGeocode( params, (data) => {
            let isocc = null;

            try {
                isocc = data['response']['view'][0]['result'][0]['location']['address']['country'];
            } catch (e) {

            }

            if ( onSuccess ) {
                onSuccess( isocc, data );
            }
        }, onError );
    };
}


export default GeoCoder;
