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

function MoveCursor( HERE_WIKI, position, overlay, transformer, style, hoverStyle ) {
    const cursor = overlay.addCircle( position, style );
    let items = null;
    let moved;
    let odx;
    let ody;

    cursor.pointerdown = () => {
        moved = false;

        odx = 0;
        ody = 0;

        items = transformer.getObjects();
    };

    cursor.pressmove = (e, dx, dy, ax, ay) => {
        moved = true;

        for ( let i=0; i<items.length; i++ ) {
            HERE_WIKI.map.pixelMove( items[i], dx - odx, dy - ody );
        }

        odx = dx;
        ody = dy;

        transformer.objBBoxChanged();
    };

    cursor.pointerup = () => {
        if ( moved ) {
            transformer.markObjsAsMod();
        }
        items = null;
    };

    this.setPosition = (lon, lat) => {
        overlay.setFeatureCoordinates( cursor, [lon, lat] );
    };
    this.getCenter = () => cursor.geometry.coordinates.slice();
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

export default MoveCursor;
