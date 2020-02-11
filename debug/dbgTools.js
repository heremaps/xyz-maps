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

(function() {
    let UNDEF;
    //* **************************************************
    let alpha = 0;
    let _x;
    let _y;
    let r = 20;

    function stop() {
        console.log('stop');
        alpha = 0;
        _x = cx + r * Math.cos(r);
        _y = cy + r * Math.sin(r);
        cancelAnimationFrame(afid || 0);
        afid = UNDEF;
    }

    function rotate() {
        // afid = requestAnimationFrame(rotate);

        alpha = (alpha + 0.1) % 360;
        cx = innerWidth / 2;
        cy = innerHeight / 2;

        let x = cx + r * Math.cos(alpha);
        let y = cy + r * Math.sin(alpha);

        display.pan(x - _x, y - _y);

        _x = x;
        _y = y;

        afid = requestAnimationFrame(rotate);
    }

    window.onkeyup = function(e) {
        if (window.display) {
            if ((e.keyCode ? e.keyCode : e.which) == 65) { // a
                toggleRotateAnimation();
            }
        }
    };

    //* **************************************************
    window.toggleRotateAnimation = ()=> (window.afid == UNDEF) ? rotate() : stop();
    window.frames = 0;
    window.total_time = 0;
    window.renderTotalTime = 0;


    let running;
    let optimise = false;
    let testlayer;


    window.dbgTools = {


        start_fps: function(overlay, display) {
            if (running) {
                optimise = ___optimise();
                totalTime = frames = 0;
                return;
            }

            overlay.addEventListener('viewportReady', running = function(e) {
                console.log('avg %i ms -- (%i ms) optimise %s', (totalTime += renderTotalTime) / (++frames), renderTotalTime, optimise ? 'off' : 'on');
                window.renderTotalTime = 0;

                setTimeout(function() {
                    display.refresh(overlay);
                }, 0);
            });
        },

        stop_fps: function(overlay) {
            overlay.removeEventListener('viewportReady', running);
            running = false;
        },


        showDisplayTile: function(qk, index) {
            let ctx = document.querySelector('.tmc').getContext('2d');
            let dTile = displayTiles.get(qk);
            let tileCanvas = index != UNDEF ? dTile.c[index] : dTile.combine();
            let size = dTile.size;

            ctx.fillRect(0, 40, size + 14, size + 14);

            ctx.drawImage(tileCanvas.canvas || tileCanvas, 6, 47);

            return dTile;
        },

        syncDisplays: function(display1, display2) {
            let remote;
            display1.addObserver('center', (type, center) => {
                if (!remote) {
                    remote = true;
                    display2.setCenter(center);
                    remote = false;
                }
            });

            display2.addObserver('center', (type, center) => {
                if (!remote) {
                    remote = true;
                    display1.setCenter(center);
                    remote = false;
                }
            });


            display1.addObserver('zoomlevel', function(type, to) {
                if (!remote) {
                    remote = true;
                    display2.setZoomlevel(to);
                    remote = false;
                }
            });
            display2.addObserver('zoomlevel', function(type, to) {
                if (!remote) {
                    remote = true;
                    display1.setZoomlevel(to);
                    remote = false;
                }
            });
        }
    };
})();
