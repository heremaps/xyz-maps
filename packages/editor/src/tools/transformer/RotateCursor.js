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

import oTools from '../../features/oTools';
import {geotools} from '@here/xyz-maps-common';

function RotateCursor( HERE_WIKI, position, overlay, transformer, style, hoverStyle ) {
    const cursor = overlay.addImage( position, style );
    let rotated;
    let items;
    let rotCenter;
    let initialBearing;
    let prevBearing;
    let obj;

    cursor.pressmove = (e, dx, dy, ax, ay) => {
        if ( !rotated ) {
            transformer.visible( !(rotated = true) );
        }

        const deltaBearing = geotools.calcBearing(

            rotCenter,
            HERE_WIKI.map.getGeoCoord(e.mapX, e.mapY)

        ) - initialBearing;


        for ( let i=0; i < items.length; i++ ) {
            obj = items[i];

            oTools._setCoords(
                obj,
                HERE_WIKI.map.rotateGeometry(
                    obj.geometry,
                    rotCenter,
                    deltaBearing - prevBearing
                )
            );
        }

        prevBearing = deltaBearing;
    };
    cursor.pointerdown = (e) => {// start
        rotated = false;

        rotCenter = transformer.getCenter();

        initialBearing = geotools.calcBearing(
            rotCenter,
            HERE_WIKI.map.getGeoCoord(e.mapX, e.mapY)
        );

        items = transformer.getObjects();

        prevBearing = 0;
    };
    cursor.pointerup = () => {
        if ( rotated ) {
            // rotate is not possible if only one point address or POI is in transformer
            if ( items.length > 1 || items[0].geometry.type != 'Point' ) {
                transformer.markObjsAsMod();
                transformer.objBBoxChanged();
            }
        }

        items = null;
        rotCenter = null;

        transformer.visible(true);
    };

    cursor.pointerenter =
    cursor.pointerleave = (e) => {
        const isMouseOver = e.type == 'pointerenter';

        document.body.style.cursor = isMouseOver ? 'move' : 'default';

        HERE_WIKI.setStyle( cursor, isMouseOver ? hoverStyle : style);
    };


    this.setPosition = (lon, lat) => {
        overlay.setFeatureCoordinates( cursor, [lon, lat] );
    };

    this.hide = () => {
        overlay.hideFeature( cursor );
    };

    this.show = () => {
        overlay.showFeature( cursor );
    };

    this.remove = () => {
        overlay.remove( cursor );
    };
}

export default RotateCursor;
