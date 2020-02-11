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

import BasicTile from '../BasicTile';


// const STATE_NOT_READY     = 0;
// const STATE_PREVIEW_READY = 1;
// const STATE_PREAPARING    = 2;
// const STATE_READY         = 3;
// const STATE_EMPTY         = 4;

let UNDEF;

class CanvasTile extends BasicTile {
    private c: CanvasRenderingContext2D[];

    bPool: any;

    // private tasks: {[id: string]: any};

    private _c: boolean;
    private _ready: boolean;

    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;

    size: number;

    constructor(bPool, quadkey, layers, size, backgroundColor) {
        super();

        let layerCnt = layers.length;

        this.c = new Array(layerCnt);
        // this.p = new Array(layerCnt);

        this.init(quadkey, layers);

        this.size = size;

        this.bPool = bPool;

        this.ctx = bPool.claimCtx(size); // this.claimContext();

        this.canvas = this.ctx.canvas;

        this.ctx.fillStyle = backgroundColor;
    }

    destroy( index?: number ) {
        if ( index!=UNDEF ) {
            if ( c = this.c[index] ) {
                if ( c.canvas ) {
                    this.bPool.releaseCtx( c );
                }

                this.c[index] = UNDEF;
            }
        } else {
            let i = this.c.length;
            var c;


            while ( i-- ) {
                if ( c = this.c[i] ) {
                    if ( c.canvas ) {
                        this.bPool.releaseCtx( c );

                        this.c[i] = UNDEF;
                    }
                }
            }
        }
    };

    init( quadkey: string, layers) {
        super.init(quadkey, layers);

        let layerCnt = layers.length;

        this.c.length = layerCnt;

        while ( layerCnt-- ) {
            this.c[layerCnt] = UNDEF;
        }

        this._c = false;

        this._ready = false;

        // this.quadkey = quadkey;

        // this.size = size;

        // this.layers = layers;

        // this.tasks = {};
    };


    dirty( index, canvas? ) {
        let prevCtx = this.c[index];
        let update = canvas != prevCtx;


        if ( canvas && prevCtx && update ) {
            // in case of canvas is set and a previous canvas is already present
            // make sure canvas get's released for reuse!
            // e.g. previous: preview canvas (tile-preview) -> now: Image(tile)

            this.destroy( index );
        }

        if ( !canvas ) {
            update = true;
            canvas = this.c[index];
        }

        let ready = true;

        if ( update ) {
            // if(this.quadkey == window.THE_QK)
            //     console.log('* ...','setLayer',index,'...');

            this.c[index] = canvas;


            this._c = false;

            // this._c = true;
            // var start = 0;
            //
            // if( index < this.vi )
            // {
            //     this.ctx.clearRect( 0, 0, this.size, this.size );
            //     start = 0;
            // }
            // else
            // {
            //     start = this.vi;
            // }
            //
            // for( var c = start; c < this.c.length; c++ )
            // {
            //     if( this.c[c] )
            //     {
            //         if(this.quadkey == '12020330203212100')
            //             console.log('*','draw',c,' - ', ++cnt);
            //
            //         this.vi = c+1;
            //
            //         this.ctx.drawImage( this.c[c], 0, 0, this.size, this.size );
            //     }
            //     else
            //     {
            //         ready = false;
            //     }
            // }
        }

        // this.setReady( index, true );
        // this.r[index] = true;
        // this.ready = ready;
    };

    clear( index ) {
        let ctx;

        if ( ctx = this.c[index] ) {
            // make sure it's canvas context and filter image elements
            if ( ctx.setTransform ) {
                this.bPool.releaseCtx( ctx );
            }

            this.c[index] = UNDEF;

            this.preview(index, UNDEF);

            // this.state(index,false);
            this.ready(index, false);

            this._c = false;

            this.combine();
        }
    };


    getContext( index ) {
        if ( !this.c[index] ) {
            this.c[index] = this.bPool.claimCtx( this.size );// .getContext('2d');

            // this.c[index] = this.claimContext();//.getContext('2d');
        }
        // else
        // {
        // this.c[index].getContext('2d').fillStyle='red';
        // this.c[index].getContext('2d').fillRect(0,0,256,256);

        // this.c[index].getContext('2d').clearRect( 0, 0, this.size, this.size );
        // }

        // this.r[index] = false;

        return this.c[index]; // .getContext('2d');
    };


    getData( index ) {
        return this.c[index] && (
            this.c[index].canvas || this.c[index]
        );
    };

    combine() {
        let tc = this;
        let size = tc.size;
        let imgData;

        if ( !tc._c ) {
            tc._c = true;

            // tc.ctx.clearRect( 0, 0, size, size );
            tc.ctx.fillRect( 0, 0, size, size );

            for ( let c = 0; c < tc.c.length; c++ ) {
                if ( imgData = this.getData(c) ) {
                    tc.ctx.drawImage(
                        imgData,
                        0,
                        0,
                        size,
                        size
                    );
                }
            }
        }


        // for( var c = 0; c < this.c.length; c++ )
        // {
        //     if( this.c[c] )
        //     {
        //         this.ctx.drawImage(this.c[c],0,0);
        //     }
        //
        // }

        return tc.canvas;
    };

    addLayer( index ) {
        super.addLayer(index);
        let dTile = this;

        dTile.c.splice( index, 0, UNDEF );

        dTile._c = false;

        dTile._ready = false;
    };

    removeLayer( index ) {
        super.removeLayer(index);

        let dTile = this;

        this.destroy(index);

        dTile.c.splice( index, 1 );

        dTile._c = false;
    };
}

export default CanvasTile;
