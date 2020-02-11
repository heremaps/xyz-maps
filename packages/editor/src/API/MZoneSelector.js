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

import MapObject from '../features/feature/Feature';
import MultiSelector from '../tools/ZoneSelection/MultiSelector';
let UNDEF;
/**
 *  The interface for parameter of zones/sides tool at links.
 *  @public
 *  @class
 *  @expose
 *  @name here.xyz.maps.editor.features.Zone
 */
// var zone = function(){
/**
     *  Side of Zone on Link.
     *  "L" | "R" | "B" -> Left, Right or Both sides.
     *
     *  @type {string}
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.features.Zone#side
     */
// this.side = 0;

/**
     *  Start position in decimal % at link of the zone.
     *
     *  @type {Number}
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.features.Zone#from
     */
// this.from = 0.0;

/**
     *  End position in decimal % at link of the zone.
     *
     *  @type {Number}
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.features.Zone#to
     */
// this.to = 1.0;

/**
     *  Ability to lock the zone and prevent dragging.
     *
     *  @type {Boolean}
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.editor.features.Zone#locked
     */
// this.locked = false;

/**
     *  Apply custom styling of Zone.
     *  Objects of key value pairs.
     *
     *  @public
     *  @expose
     *  @type object
     *  @name here.xyz.maps.editor.features.Zone#style
     */
// this.style = {};

/**
     *  onChange callback providing detailed information about current state of zone.
     *
     *  @public
     *  @expose
     *  @function
     *  @param {function} callback
     *  @name here.xyz.maps.editor.features.Zone#onChange
     */
// this.onChange = function(){}
// };


/**
 *  The interface to the tool for selecting zones/sides at links.
 *
 *  @expose
 *  @public
 *  @constructor
 *  @name here.xyz.maps.editor.Editor.zoneSelector
 */
function ZoneSelector( HERE_WIKI ) {
    const that = this;
    const multiselector = new MultiSelector( HERE_WIKI, HERE_WIKI.objects.overlay );
    let zones;

    /**
     *  Add link(s) to zoneselector tool.
     *
     *  @public
     *  @expose
     *  @function
     *  @param {here.xyz.maps.editor.features.Navlink} links
     *      single or multiple links to add
     *  @name here.xyz.maps.editor.Editor.zoneSelector#add
     */
    that.add = function( links ) {
        links = links instanceof Array
            ? links
            : [].slice.call(arguments);

        for ( let i = 0; i < links.length; i++ ) {
            if ( links[i] instanceof MapObject ) {
                multiselector.addLink( links[i] );
            }
        }
    };

    /**
     *  Adds and displays zones for editing.
     *
     *  @public
     *  @expose
     *  @function
     *  @param {here.xyz.maps.editor.features.Zone} zones
     *      display single or multiple zones at link(s).
     *  @name here.xyz.maps.editor.Editor.zoneSelector#show
     */
    that.show = function( _zones ) {
        zones = _zones instanceof Array ? _zones : [].slice.call(arguments);

        zones.forEach((zone) => {
            const onChange = zone['onChange'];

            zone['from'] = zone['from']||0;

            zone['to'] = (zone['to'] == UNDEF ? 1 : zone['to'] )||0;

            if ( onChange ) {
                zone['onChange'] = (zone) => {
                    onChange(generateZoneSegments(zone));
                };
            }
        });

        multiselector.show( zones );
    };

    /**
     *  hides all zones and links.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.editor.Editor.zoneSelector#hide
     */
    that.hide = multiselector.hide;

    function generateZoneSegments(zone) {
        const info = [];
        multiselector.getCollection().getZoneSegments(zone).forEach((segment) => {
            info.push({
                'Link': segment[0],
                'from': segment[1],
                'to': segment[2],
                'reversed': segment[3]
            });
        });
        return info;
    }

    /**
     *  detailed information about all zones and segments.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.editor.Editor.zoneSelector#info
     *  @return {Array.<Object>} zone information
     */
    that.info = () => {
        const zoneInfos = [];
        const multilink = multiselector.getCollection();

        if ( multilink ) {
            const _zones = multilink.getZones();
            _zones.forEach((zone) => {
                const publicZone = zone._zone;
                publicZone['segments'] = generateZoneSegments(zone);
                zoneInfos.push(publicZone);
            });
        }

        return zoneInfos;
    };
}

export default ZoneSelector;


