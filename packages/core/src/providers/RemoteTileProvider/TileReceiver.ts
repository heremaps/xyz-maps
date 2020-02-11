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

import {Tile} from '../../tile/Tile';

let UNDEF;


type tileReceiver = (tile: Tile, error: any) => void;

class TileReceiver {
    private ready: boolean;
    private c = 0;
    private cbs: tileReceiver[] = [];
    private qks: string[];
    private tile;

    constructor(tile: Tile, loaderTiles: string[]) {
        this.qks = loaderTiles;

        this.tile = tile;
    }

    receive(subtile: Tile) {
        const receiver = this;

        if (!receiver.ready) {
            const tile = receiver.tile;

            const qks = receiver.qks;

            const i = qks.indexOf(subtile.quadkey);

            if (i != -1) {
                qks[i] = null;

                if (++receiver.c == qks.length) {
                    receiver.ready = true;

                    // in case of data has been already pushed to provider/tile.. (eg: add Feature by user via api.)
                    // ..clear processedData in any case to force rendering of display.
                    tile.processedData = UNDEF;

                    const err = subtile.error;

                    if (err) {
                        tile.error = err;
                    } else {
                        tile.data = tile.provider.search(tile.getContentBounds());
                    }

                    tile.loadStopTs = Date.now();

                    receiver.exec();

                    tile.onLoaded.length = 0;

                    receiver.qks = null;
                }
            }
        }
    };

    private exec() {
        const receiver = this;
        const cbs = receiver.cbs;
        const len = cbs.length;
        const tile = receiver.tile;

        let c = 0;

        while (c < len) {
            cbs[c++](tile, tile.error);
        }

        cbs.length = 0;
    };

    add(cb: tileReceiver) {
        const cbs = this.cbs;

        if (typeof cb == 'function' && cbs.indexOf(cb) == -1) {
            cbs.push(cb);
            return true;
        }
    };

    remove(cb: tileReceiver) {
        const cbs = this.cbs;
        const i = cbs.indexOf(cb);

        if (i != -1) {
            cbs.splice(i, 1);
        }

        return cbs.length;
    };
}

(<any>TileReceiver.prototype).ready = false;


export default TileReceiver;
