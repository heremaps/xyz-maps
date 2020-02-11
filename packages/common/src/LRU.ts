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

class Item<TYPE> {
    constructor( key: string, data: TYPE ) {
        this.key = key;
        this.data = data;
    }
    key: string;
    data: TYPE;
    next: Item<TYPE>;
    prev: Item<TYPE>;
}

Item.prototype.data = null;

Item.prototype.next = null;

Item.prototype.prev = null;


export default class LRU<TYPE> {
    constructor( max: number ) {
        this.max = max || 5e3;
        this._ = {};

        this.tail = null;
    }

    max: number;

    _: {[key:string]:Item<TYPE>};

    length: number = 0;

    head: Item<TYPE> = null;

    tail: Item<TYPE> = null;

    setSize( size: number ) {
        if ( this.length > size ) {
            let drop = this.length - size;

            while ( drop-- ) {
                this.remove( this.tail.key );
            }
        }

        this.max = size;
    }

    get( key: string ): TYPE {
        let item;
        let prev;
        let next;
        // item found
        if ( item = this._[key] ) {
            if ( item != this.head ) {
                if ( this.tail == item ) {
                    this.tail = item.next;
                }

                prev = item.prev;
                next = item.next;

                if ( prev ) {
                    prev.next = item.next||item;
                }

                if ( next ) {
                    next.prev = prev;
                }

                if ( prev = this.head ) {
                    prev.next = item;
                }
                // move item to head
                item.prev = this.head;

                item.next = null;

                this.head = item;
            }

            item = item.data;
        };

        return item;
    }

    toArray(): TYPE[] {
        let array = [];
        let item = this.tail;
        let i = 0;

        while ( item ) {
            array[i++] = item.data;
            item = item.next;
        }
        return array;
    }

    forEach( fnc: (value:TYPE, index:number)=>void ) {
        // console.warn('lru4each');

        let item = this.tail;
        let i = 0;

        while ( item ) {
            fnc( item.data, i++ );

            item = item.next;
        }
    }

    clear() {
        this._ = {};
        this.head = null;
        this.tail = null;
        this.length = 0;
    }

    remove( key:string ):TYPE|undefined {
        let item;
        let prev;
        let next;
        // item found
        if ( item = this._[key] ) {
            prev = item.prev;
            next = item.next;

            if ( prev ) {
                prev.next = next;
            }

            if ( next ) {
                next.prev = prev;
            }

            if ( !next ) {
                this.head = prev;
            }

            if ( !prev ) {
                this.tail = next;
            }

            delete this._[key];

            item = item.data;

            this.length--;
        }

        return item;
    }

    set( key:string, value:TYPE ):TYPE|undefined {
        let item;
        let prev;
        let oldItem;
        // item found
        if ( item = this._[key] ) {
            // update value
            item.data = value;

            if ( item != this.head ) {
                this.get(key);
            }
        } else {
            if ( this.length == this.max ) {
                oldItem = this.tail.data;

                delete this._[this.tail.key];
                this.tail = this.tail.next;
                this.tail.prev = null;
            } else {
                this.length++;
            }

            item = new Item( key, value);
            this._[key] = item;

            prev = this.head;

            // update head
            if ( prev ) {
                item.prev = prev;

                prev.next = item;
            } else {
                this.tail = item;
            }

            this.head = item;
        }

        return oldItem;
    }
};
