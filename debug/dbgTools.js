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
    const animations = {
        animations: [],
        afid: 0,
        animateMap() {
            if (!this.animations.length) return;
            this.animations.forEach((animator) => animator());
            this.afid = requestAnimationFrame(() => this.animateMap());
        },
        toggleAnimation(animation) {
            const index = this.animations.indexOf(animation);
            if (index == -1) {
                this.animations.push(animation);
                if (this.animations.length == 1) {
                    this.animateMap();
                }
            } else {
                this.animations.splice(index, 1);
                if (!this.animations.length) {
                    cancelAnimationFrame(this.afid);
                }
            }
        }
    };


    function panAnimation() {
        const alpha = panAnimation.alpha = ((panAnimation.alpha || 0) + 0.1) % 360;
        cx = innerWidth / 2;
        cy = innerHeight / 2;
        const r = 20;
        const x = cx + r * Math.cos(alpha);
        const y = cy + r * Math.sin(alpha);
        dbgTools.getDisplay().pan(x - panAnimation._x || 0, y - panAnimation._y || 0);
        panAnimation._x = x;
        panAnimation._y = y;
    }

    const rotateAnimation = () => {
        const display = dbgTools.getDisplay();
        display.rotate((display.rotate() + .4) % 360);
    };

    let lightAnimationSpeed = 1;
    const animateLight = () => {
        const rotateZ = (p, rad) => {
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            p[0] = p[0] * cos - p[1] * sin;
            p[1] = p[0] * sin + p[1] * cos;
            return p;
        };


        const display = dbgTools.getDisplay();
        const animateLayerLights = (layer) => {
            const lights = layer.getStyleManager().getLights();
            if (!lights) return;
            for (let name in lights) {
                for (let light of lights[name]) {
                    if (light.direction) {
                        rotateZ(light.direction, lightAnimationSpeed * Math.PI / 180);
                    }
                }
            }
            layer.getStyleManager().setLights(lights);
        };
        display.getLayers().forEach(animateLayerLights);
        display.refresh();
    };
    //* **************************************************
    window.frames = 0;
    window.total_time = 0;
    window.renderTotalTime = 0;


    document.addEventListener('keydown', function(e) {
        switch (e.code) {
        case 'KeyL':
            animations.toggleAnimation(animateLight);
            break;
        case 'KeyR':
            animations.toggleAnimation(rotateAnimation);
            break;
        case 'KeyA':
            animations.toggleAnimation(panAnimation);
            break;
        }
    });


    let running;
    let optimise = false;
    let dbgLayer;
    const dbgTools = {
        animateLight(speed) {
            lightAnimationSpeed = speed ?? 1;
            animations.toggleAnimation(animateLight);
        },
        getDisplay() {
            return window.display || here.xyz.maps.Map.getInstances()[0];
        },
        getDebugLayer() {
            if (!dbgLayer) {
                const map = dbgTools.getDisplay();
                map.addLayer(dbgLayer =
          new here.xyz.maps.layers.TileLayer({
              name: 'DbgLayer',
              min: 2, max: 30,
              pointerEvents: false,
              adaptiveGrid: true,
              tileSize: 512,
              provider: new here.xyz.maps.providers.LocalProvider({editable: false})
          }));
                map._display.layers.get(dbgLayer).skipDbgGrid = true;
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
                fill: '#fff',
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
                fill: '#F0F',
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
        },

        drawTile: (quadkey, color) => {
            const {tileUtils} = here.xyz.maps;
            const [minLon, minLat, maxLon, maxLat] = tileUtils.getGeoBounds.apply(tileUtils, tileUtils.quadToGrid(quadkey));
            const layer = dbgTools.getDebugLayer();
            layer.removeFeature({id: `tile:${quadkey}`});
            layer.addFeature({
                id: `tile:${quadkey}`,
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [minLon, minLat],
                        [minLon, maxLat],
                        [maxLon, maxLat],
                        [maxLon, minLat],
                        [minLon, minLat]
                    ]]
                }
            }, [{
                zIndex: 1000,
                type: 'Polygon',
                fill: color || '#FF722055',
                stroke: '#FF7220',
                strokeWidth: 10
            }]);
        }
    };

    window.dbgTools = dbgTools;
})();
