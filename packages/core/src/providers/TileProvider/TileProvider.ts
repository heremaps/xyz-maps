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

import {Tile} from '../../tile/Tile';
import {TileStorage} from '../../storage/TileStorage';
import Level2TileStorage from '../../storage/Level2Storage';
import {Listener} from '@here/xyz-maps-common';
import {TileProviderOptions} from './TileProviderOptions';

const TILESIZE = 256;
const DEFAULT_EXPIRE_SECONDS = Infinity;
let UNDEF;

const intersectBBox = (ax, ax2, ay, ay2, bx, bx2, by, by2) => {
    return ax <= bx2 && bx <= ax2 && ay <= by2 && by <= ay2;
};

/**
 * The TileProvider is an abstract Provider that serves map-data partitioned in {@link Tiles}.
 */
export default abstract class TileProvider {
    __type: string;
    /**
     * The id of the Provider
     */
    id?: string;

    /**
     * The name of the Provider.
     */
    name?: string;

    /**
     * default tile margin.
     */
    margin?: number = 0;

    level: number;

    Tile = Tile;

    size = TILESIZE;

    storage: TileStorage;

    expire = DEFAULT_EXPIRE_SECONDS;

    listeners: Listener;

    clipped: boolean = false;

    protected abstract dataType: string;

    abstract _removeTile(tile: Tile, triggerEvent: boolean);

    /**
     * Get a tile by quadkey.
     *
     * @param quadkey - quadkey of the tile
     * @param callback - the callback function
     * @returns the Tile is returned if its already cached locally
     */
    abstract getTile(quadkey: string, callback: (tile: Tile, error?: any) => void);


    /**
     * @param options - options to configure the provider
     */
    constructor(options: TileProviderOptions) {
        const provider = this;

        options = options || {};

        for (var c in options) {
            this[c] = options[c];
        }

        if (this.id == UNDEF) {
            (<any> this).id = 'TP-' + (Math.random() * 1e6 ^ 0);
        }

        provider.storage = options.storage || new Level2TileStorage(provider.level);

        provider.initStorage(provider.storage);

        // this.storage = new TileStorage( this['minLevel'], this['level'] );

        this.listeners = new Listener(['clear', 'error']);
    };

    protected dispatchEvent(type: string, detail: { [name: string]: any, provider?: TileProvider }) {
        detail.provider = this;
        const event = new CustomEvent(type, {
            detail: detail
        });
        this.listeners.trigger(type, event, true);
    }

    initStorage(storage: TileStorage) {
        // if cachelevel/loadinglevel is defined we need to make sure all respective subtiles get cleared.
        storage.onDrop(
            // make sure tile drop also works in case of storage is shared between multiple providers
            (tile) => tile.provider._removeTile(tile)
        );
    };

    /**
     * Add an EventListener to the provider.
     * Valid events: "clear" and "error"
     *
     * The detail property of the Event gives additional information about the event.
     * detail.provider is a reference to the provider onto which the event was dispatched and is set for all events.
     *
     * @param type - A string representing the event type to listen for
     * @param listener - the listener function that will be called when an event of the specific type occurs
     */
    addEventListener(type: string, listener: (e: CustomEvent) => void, _c?) {
        return this.listeners.add(type, listener, _c);
    }

    /**
     * Remove an EventListener from the provider.
     * Valid events:  "clear" and "error"
     *
     * @param type - A string which specifies the type of event for which to remove an event listener.
     * @param listener - The listener function of the event handler to remove from the provider.
     */
    removeEventListener(type: string, listener: (e: CustomEvent) => void, _c?) {
        return this.listeners.remove(type, listener, _c);
    }

    /**
     * Clear all features in.
     */
    clear(bbox?) {
        this.storage.clear();
    };

    /**
     * Get a locally cached tile by quadkey.
     *
     * @param quadkey - the quadkey of the tile
     */
    getCachedTile(quadkey: string): Tile {
        return this.storage.get(quadkey);
    };


    /**
     * Set the tile margin in pixel.
     *
     * @param tileMargin - the tileMargin
     */
    setMargin(tileMargin: number = 0) {
        this.margin = Number(tileMargin);
        // clear cached content bounds of tile to allow margin update
        this.storage.forEach((tile) => tile.cbnds = null);
    };

    /**
     * get cached tile by bounding box.
     *
     * @param bbox - array of coordinates in order: [minLon, minLat, maxLon, maxLat]
     * @param zoomlevel - get tiles at specified tileMargin
     * @returns array of {@link Tiles}
     */
    getCachedTilesOfBBox(bbox: number[], zoomlevel?: number): Tile[] {
        const minLon = bbox[0];
        const minLat = bbox[1];
        const maxLon = bbox[2];
        const maxLat = bbox[3];
        const tiles = [];

        zoomlevel = zoomlevel ^ 0;

        this.storage.forEach((tile) => {
            const tBounds = tile.getContentBounds();
            if (
                intersectBBox(
                    tBounds[0], tBounds[2], tBounds[1], tBounds[3],
                    minLon, maxLon, minLat, maxLat
                )
                && (!zoomlevel || tile.z == zoomlevel)
            ) {
                tiles[tiles.length] = tile;
            }
        });

        return tiles;
    };

    /**
     * Set config for provider.
     *
     * @param options - options to set
     */
    config(options: TileProviderOptions) {
        options = options || {};

        for (const c in options) {
            this.config[c] = options[c];
        }
        return this;
    };

    /**
     * Create a new Tile.
     *
     * @param quadkey - the quadkey of the tile to create
     */
    createTile(quadkey: string): Tile {
        const tile = new this.Tile(
            quadkey,
            this.dataType,
            this.clipped,
            this.expire
        );

        tile.provider = this;

        return tile;
    };
}

TileProvider.prototype.__type = 'Provider';
