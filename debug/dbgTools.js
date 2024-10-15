/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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
    window.toggleRotateAnimation = () => (window.afid == UNDEF) ? rotate() : stop();
    window.frames = 0;
    window.total_time = 0;
    window.renderTotalTime = 0;


    document.addEventListener('keydown', function(e) {
        if (e.code == 'KeyL') {
            animateLight();
        }
    });


    let running;
    let optimise = false;
    let dbgLayer;
    const dbgTools = {
        getDisplay() {
            return window.display || here.xyz.maps.Map.getInstances()[0];
        },
        getDebugLayer() {
            if (!dbgLayer) {
                dbgTools.getDisplay().addLayer(dbgLayer =
          new here.xyz.maps.layers.TileLayer({
              name: 'DbgLayer',
              min: 2, max: 30,
              pointerEvents: false,
              provider: new here.xyz.maps.providers.LocalProvider({editable: false})
          }));
            }
            return dbgLayer;
        },

        showCam: (id) => {
            id ||= '';
            const layer = dbgTools.getDebugLayer();
            const display = dbgTools.getDisplay();
            const center = display.getCenter();

            const camPosition = display.getCamera().position;
            const {longitude, latitude, altitude} = camPosition;

            layer.removeFeature({id: 'Cam' + id});
            layer.addFeature({
                id: 'Cam' + id,
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude, altitude]
                }
            }, [{
                zIndex: 1100,
                type: 'Box',
                width: 24,
                fill: '#5b5b56',
                stroke: 'white',
                altitude: true
            }, {
                zIndex: 1000,
                type: 'VerticalLine',
                stroke: '#676666FF'
            }, {
                zIndex: 1000,
                type: 'Circle',
                fill: '#000',
                radius: 8,
                opacity: .7,
                altitude: false,
                alignment: 'map'
            }]);

            layer.removeFeature({id: 'Cam-map-center' + id});
            layer.addFeature({
                id: 'Cam-map-center' + id,
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [center.longitude, center.latitude]
                }
            }, [{
                zIndex: 1000,
                type: 'Circle',
                fill: '#000',
                radius: 8,
                opacity: .7,
                alignment: 'map'
            }]);

            const topLeft = display.pixelToGeo(0, 0);
            const topRight = display.pixelToGeo(display.getWidth(), 0);
            const bottomLeft = display.pixelToGeo(0, display.getHeight());
            const bottomRight = display.pixelToGeo(display.getWidth(), display.getHeight());

            layer.removeFeature({id: 'Cam-center' + id});
            layer.addFeature({
                id: 'Cam-center' + id,
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [longitude, latitude, altitude],
                        [center.longitude, center.latitude, 0]
                    ]
                }
            }, [{
                zIndex: 1000,
                type: 'Line',
                stroke: '#676666FF',
                strokeWidth: 4,
                altitude: true
            }]);

            layer.removeFeature({id: 'Cam-lookAt' + id});
            layer.addFeature({
                id: 'Cam-lookAt' + id,
                type: 'Feature',
                geometry: {
                    type: 'MultiLineString',
                    coordinates: [[
                        [longitude, latitude, altitude],
                        [topLeft.longitude, topLeft.latitude, 0]
                    ], [
                        [longitude, latitude, altitude],
                        [topRight.longitude, topRight.latitude, 0]
                    ], [
                        [longitude, latitude, altitude],
                        [bottomLeft.longitude, bottomLeft.latitude, 0]
                    ], [
                        [longitude, latitude, altitude],
                        [bottomRight.longitude, bottomRight.latitude, 0]
                    ]
                    ]
                }
            }, [{
                zIndex: 1000,
                type: 'Line',
                stroke: '#FF7220FF',
                strokeWidth: 4,
                altitude: true
            }]);

            layer.removeFeature({id: 'Cam-plane' + id});
            layer.addFeature({
                id: 'Cam-plane' + id,
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [topLeft.longitude, topLeft.latitude, 0],
                        [topRight.longitude, topRight.latitude, 0],
                        [bottomRight.longitude, bottomRight.latitude, 0],
                        [bottomLeft.longitude, bottomLeft.latitude, 0],
                        [topLeft.longitude, topLeft.latitude, 0]
                    ]]
                }
            }, [{
                zIndex: 1000,
                type: 'Polygon',
                fill: 'rgba(0,0,0,.3)',
                stroke: '#FF7220FF',
                strokeWidth: 4
            }]);

            return camPosition;
        },

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

    let lightAnimated = false;
    const animateLight = () => {
        lightAnimated = !lightAnimated;
        const rotateZ = (p, rad) => {
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            p[0] = p[0] * cos - p[1] * sin;
            p[1] = p[0] * sin + p[1] * cos;
            return p;
        };

        const animate = () => {
            const display = dbgTools.getDisplay();
            const animateLayerLights = (layer) => {
                const lights = layer.getStyleManager().getLights();
                if (!lights) return;
                for (let name in lights) {
                    for (let light of lights[name]) {
                        if (light.direction) {
                            rotateZ(light.direction, Math.PI / 180);
                        }
                    }
                }
                layer.getStyleManager().setLights(lights);
            };
            display.getLayers().forEach(animateLayerLights);

            display.refresh();
            if (lightAnimated) requestAnimationFrame(animate);
        };
        if (lightAnimated) animate();
    };

    window.dbgTools = dbgTools;
})();
