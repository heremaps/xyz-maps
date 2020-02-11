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

import UIComponent from '../UIComponent';
import Details from './CopyrightDetails';
import {CopyrightSource} from './CopyrightSource';
import {global, Map} from '@here/xyz-maps-common';

const document = global.document;

const SHOW = true;
const HIDE = !SHOW;

const LAYER_TOGGLE_EVENTS = 'addLayer removeLayer';
const ZOOMLEVEL_EVENT = 'zoomlevel';

const MAX_SOURCE_WIDTH = 384;

const isVisible = (src: CopyrightSource | { scopes: any[] }, zoom: number) => {
    let scopes = src.scopes;
    let s = scopes.length;
    let scp;
    let min;
    let max;

    if (!s) {
        return SHOW;
    }

    while (scp = scopes[--s]) {
        const level = scp.layer.getProvider(zoom).level || zoom;

        min = scp.minLevel || -Infinity;
        max = scp.maxLevel || Infinity;

        if (level >= min && level <= max) {
            return SHOW;
        }
    }

    return HIDE;
};

const displayElement = (el: HTMLElement, show: boolean) => {
    el.style.display = show ? 'inline' : 'none';
};


let UNDEF;

type Source = {
    el: HTMLElement
    cnt: number
    scopes: any[]
    width: number
    label: string
};


class Copyright extends UIComponent {
    private $src: HTMLElement;
    private $here: HTMLElement;
    private $btn: HTMLElement;
    private sources: Map<Source> = new Map();
    private sLen: number = 0;

    private srcWidth: number = 0;

    private onZoomChange: (type: string, val: number, _val: number) => void;
    private onLayerChange: (ev) => void;
    private onResize: (ev) => void;

    private details: Details;

    constructor(element: HTMLElement, options, display) {
        super(element, options, display);

        const ui = this;
        ui.$src = ui.querySelector('.sources');
        ui.$here = ui.querySelector('.here');
        ui.$btn = ui.querySelector('.btn');

        this.details = new Details(element, {visible: false}, display);
    };

    enable() {
        let ui = this;
        super.enable();

        ui.display.addObserver(ZOOMLEVEL_EVENT, ui.onZoomChange = (type: string, zoom: number, _zoom: number) => {
            if (!(zoom % 1)) {
                const sources = ui.sources;
                sources.forEach((src) => {
                    displayElement(src.el, isVisible(src, zoom));
                });
                ui.showDetails(false);
                ui.handleOverflow();
            }
        });

        ui.display.addEventListener(LAYER_TOGGLE_EVENTS, ui.onLayerChange = (ev) => {
            let layer = ev.detail.layer;
            layer.getCopyright((copyright) => {
                // ui might have been destroyed in the meanwhile
                if (ui.active) {
                    if (ev.type == 'addLayer') {
                        copyright.forEach((copy) => ui.addSource(copy, layer));
                    } else {
                        copyright.forEach((copy) => ui.removeSource(copy, layer));
                    }
                }
            });
        });

        ui.display.addEventListener('resize', ui.onResize = () => ui.handleOverflow());
    };


    disable() {
        let ui = this;
        super.disable();
        ui.display.removeObserver(ZOOMLEVEL_EVENT, ui.onZoomChange);
        ui.display.removeEventListener(LAYER_TOGGLE_EVENTS, ui.onLayerChange);
        ui.display.removeEventListener('resize', ui.onResize);
    };

    private calcWidth(): number {
        const ui = this;
        const zoom = ui.display.getZoomlevel() ^ 0;
        const sources = ui.sources;
        let width = 0;
        sources.forEach((src) => {
            width += isVisible(src, zoom) && src.width;
        });
        return width;
    }

    private handleOverflow() {
        const ui = this;
        const $btn = ui.$btn;
        const width = ui.display.getWidth();
        const tacWidth = 132;
        const requiredWidth = ui.calcWidth();
        const availableWidth = (width - tacWidth) ^ 0;


        ui.$src.style.width = (availableWidth < requiredWidth
            ? availableWidth - 10
            : requiredWidth) + 'px';

        if (requiredWidth > Math.min(availableWidth, MAX_SOURCE_WIDTH)) {
            displayElement($btn, SHOW);
        } else {
            displayElement($btn, HIDE);
            ui.showDetails(false);
        }
    }

    private showDetails(show: boolean) {
        const ui = this;
        const details = ui.details;
        const zoom = ui.display.getZoomlevel();

        ui.$btn.innerText = show ? '-' : '+';

        if (show) {
            details.show();
            details.setData(ui.sources.values().filter((src) => isVisible(src, zoom)));
        } else {
            details.hide();
        }
    }

    private addSource(src: CopyrightSource, layer: any) {
        const ui = this;
        const sources = ui.sources;
        const label = src.label;
        const scopes = src.scopes;
        const zoom = ui.display.getZoomlevel() ^ 0;
        let source = sources.get(label);
        let el;

        if (!source) {
            el = document.createElement('span');
            el.className = this.prefixClass('.source').substr(1);

            el.innerText = '© ' + label;
            ui.$src.appendChild(el);
            source = {
                label: label,
                scopes: [],
                el: el,
                cnt: 1,
                width: el.getBoundingClientRect().width
            };
            sources.set(label, source);

            ui.sLen++;
            ui.srcWidth += source.width;
        } else {
            el = source.el;
            source.cnt++;
        }

        if (scopes != UNDEF) {
            scopes.forEach((scp) => source.scopes.push({
                minLevel: scp.minLevel,
                maxLevel: scp.maxLevel,
                layer: layer
            }));
        }
        displayElement(ui.$here, HIDE);
        displayElement(el, isVisible(source, zoom));

        ui.handleOverflow();
    };

    private removeSource(src, layer) {
        const ui = this;
        const label = src.label;
        const source = ui.sources.get(label);
        let removeScopes;
        let knownScopes;

        if (source) {
            knownScopes = source.scopes;

            if (removeScopes = src.scopes) {
                for (let r = 0, rScp; r < removeScopes.length; r++) {
                    rScp = removeScopes[r];
                    for (let k = 0, kScp; r < knownScopes.length; k++) {
                        kScp = knownScopes[k];
                        if (kScp.layer == layer && kScp.minLevel == rScp.minLevel && kScp.maxLevel == rScp.maxLevel) {
                            knownScopes.splice(k, 1);
                            break;
                        }
                    }
                }
            }


            if (!--source.cnt) {
                ui.$src.removeChild(source.el);

                // if (!ui.$src.children.length) {
                //     displayElement(ui.$divider, HIDE);
                // }

                ui.sources.delete(label);
                ui.handleOverflow();
                // delete ui.sources[label];
                if (!--ui.sLen) {
                    displayElement(ui.$here, SHOW);
                }
            }
        }
    };
};

Copyright.prototype.listeners = {

    '.btn':
        {
            'click': function(ev) {
                const $btn = this.$btn;
                const show = $btn.innerText == '+';
                this.showDetails(show);
            }
        }
};

Copyright.prototype.style = {

    '.copyright *': '\
        color: #fff;\
        font-family: arial;\
        opacity: 0.8;\
        text-decoration: none;',

    '.copyright': '\
        right: 0px;\
        bottom: 0px;\
        padding: 1px 4px;\
        margin: 0px;\
        background-color: rgba(0,0,0,.1);\
        position: absolute;\
        font-size: 11px;\
        line-height: 13px;\
        overflow: hidden;\
        white-space: nowrap;\
        user-select: none;',

    '.sources': '\
        width:auto;\
        max-width: ' + MAX_SOURCE_WIDTH + 'px;\
        float: left;\
        white-space: nowrap;\
        overflow: hidden;\
        text-overflow: ellipsis;\
        border-right: 2px;',

    '.btn': '\
        font-family: sans-serif;\
        font-weight: bold;\
        text-align: center;\
        height: 12px;\
        width: 12px;\
        float: left;\
        padding: 0px;\
        line-height: 9px;\
        margin: 1px 2px 0px;\
        background-color: inherit;\
        box-sizing: border-box;\
        border-radius: 3px;\
        border: 1px solid;',

    '.divider, .here, .source': '\
        white-space: nowrap;\
        padding-right: 4px;'
};


Copyright.prototype.templ =
    '<div class="copyright">\
        <span style="float: left; white-space: nowrap;">\
            <span class="sources"></span>\
            <span class="here">© 2019 HERE</span>\
         </span>\
        <span class="tac" style="float: right; white-space: nowrap;">\
            <span class="btn">+</span>\
            <span class="divider" style="white-space: nowrap;">|</span>\
            <a target="_blank" style="white-space: nowrap;" href="https://legal.here.com/us-en/terms/serviceterms/">Terms and Conditions</a>\
        </span>\
    </div>';


export default Copyright;
