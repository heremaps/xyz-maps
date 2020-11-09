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

import SelectionMarker from './SelectionMarker';
import {getSubpath, getTotalLength} from '../../geometry';
import MultiLink from './MultiLink';
import {Zone} from '../../API/EZoneSelector';
import {features} from '@here/xyz-maps-core/';
import Overlay from '../../features/Overlay';

export class MultiZone {
    private _zone: Zone;
    private line: features.Feature;
    private markers: SelectionMarker[];
    private overlay: Overlay;
    private ml: MultiLink;

    constructor(multiLink: MultiLink, overlay, _zone: Zone) {
        this._zone = _zone;

        const style = JSON.parse(JSON.stringify(_zone.style || {}));
        const color = style.stroke = style.stroke || '#ff4040';
        const opacity = style.opacity = style.opacity || 0.6;

        this.ml = multiLink;

        const onDragged = () => {
            if (_zone['onChange']) {
                _zone['onChange'](<any> this);
            }
        };

        let side = _zone.side;

        this.line = overlay.addPath([[0, 0], [0, 0]], [{
            'zIndex': 4,
            'type': 'Line',
            'strokeWidth': 9,
            'opacity': opacity,
            'stroke': color
        }]);

        this.markers = [
            new SelectionMarker(
                overlay,
                multiLink,
                side,
                _zone['from'],
                style,
                () => this.locked(),
                () => this.draw(),
                onDragged
            ),
            new SelectionMarker(
                overlay,
                multiLink,
                side,
                _zone['to'],
                style,
                () => this.locked(),
                () => this.draw(),
                onDragged
            )
        ];
        this.overlay = overlay;
    }

    remove() {
        this.overlay.remove(this.line);
        this.markers[0].remove();
        this.markers[1].remove();
    }

    locked(): boolean {
        return !!this._zone.locked;
    }

    draw() {
        let posM1 = this.markers[0].getRelPos();
        let posM2 = this.markers[1].getRelPos();
        const coordinates = this.ml.coord();
        const lenTotal = getTotalLength(coordinates);

        if (posM1 > posM2) {
            // flip
            const lb = posM1;
            posM1 = posM2;
            posM2 = lb;
        }

        this.overlay.setFeatureCoordinates(this.line,
            getSubpath(coordinates, posM1 * lenTotal, posM2 * lenTotal)
        );
    }
}
