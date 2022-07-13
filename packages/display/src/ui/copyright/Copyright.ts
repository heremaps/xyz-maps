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

import UIComponent from '../UIComponent';
import Details from './CopyrightDetails';
import {CopyrightSource, CopyrightSourceScope} from './CopyrightSource';
import {global, Map, JSUtils} from '@here/xyz-maps-common';
import {Map as Display} from '../../Map';
// @ts-ignore
import defaultOwner from 'ui-default-cOwner';
// @ts-ignore
import tacUrl from 'ui-tac-url';

const document = global.document;
const SHOW = true;
const HIDE = !SHOW;
const LAYER_TOGGLE_EVENTS = 'addLayer removeLayer';
const ZOOMLEVEL_EVENT = 'zoomlevel';
const MAX_SOURCE_WIDTH = 384;

const isVisible = (src: CopyrightSource | { scopes: CopyrightSourceScope[] }, zoom: number) => {
    let scopes = src.scopes;
    let s = scopes.length;
    let scp: CopyrightSourceScope;
    let min;
    let max;

    if (!s) {
        return SHOW;
    }

    while (scp = scopes[--s]) {
        const provider = scp.layer.getProvider(zoom);
        const level = provider && provider.level || zoom;

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
    scopes: CopyrightSourceScope[]
    width: number
    label: string
};

type TACOptions = {
    label?: string;
    url: string | false;
}

type CopyrightOptions = {
    visible?: boolean,
    defaultOwner?: string,
    termsAndConditions?: TACOptions
}

const defaultOptions: CopyrightOptions = {

    defaultOwner: defaultOwner,
    termsAndConditions: {
        label: 'Terms and Conditions',
        url: tacUrl || false
    }
};

class Copyright extends UIComponent {
    private $src: HTMLElement;
    private $cDefault: HTMLElement;
    private $btn: HTMLElement;
    private sources: Map<Source> = new Map();
    private sLen: number = 0;

    private srcWidth: number = 0;

    private onZoomChange: (type: string, val: number, _val: number) => void;
    private onLayerChange: (ev) => void;
    private onResize: (ev) => void;

    private details: Details;

    protected opt: CopyrightOptions;

    constructor(element: HTMLElement, options: CopyrightOptions, display: Display) {
        super(element, JSUtils.extend(true, JSUtils.clone(defaultOptions), options), display);

        const ui = this;
        const {termsAndConditions, defaultOwner} = ui.opt;

        ui.$src = ui.querySelector('.sources');
        ui.$cDefault = ui.querySelector('.cDefault');
        ui.$btn = ui.querySelector('.btn');

        this.details = new Details(element, {visible: false}, display);

        this.setDefaultOwner(defaultOwner);
        this.setTermsAndConditions(termsAndConditions);
    };

    private setTermsAndConditions(options: TACOptions) {
        const {url, label} = options;
        const termsEl = this.querySelector('.terms');

        if (url) {
            termsEl.lastChild.href = url;
            if (label) {
                termsEl.lastChild.innerText = label;
            }
        } else {
            displayElement(termsEl, HIDE);
        }
    }

    private setDefaultOwner(owner: string) {
        if (typeof owner == 'string') {
            this.setOwnerLabel(this.$cDefault, owner);
        }
    }

    enable() {
        let ui = this;
        super.enable();

        ui.map.addObserver(ZOOMLEVEL_EVENT, ui.onZoomChange = (type: string, zoom: number, _zoom: number) => {
            if (Math.abs((zoom ^ 0) - (_zoom ^ 0))) {
                const sources = ui.sources;
                sources.forEach((src) => {
                    displayElement(src.el, isVisible(src, zoom));
                });
                ui.showDetails(false);
                ui.handleOverflow();
            }
        });

        ui.map.addEventListener(LAYER_TOGGLE_EVENTS, ui.onLayerChange = (ev) => {
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

        ui.map.addEventListener('resize', ui.onResize = () => ui.handleOverflow());
    };


    disable() {
        let ui = this;
        super.disable();
        ui.map.removeObserver(ZOOMLEVEL_EVENT, ui.onZoomChange);
        ui.map.removeEventListener(LAYER_TOGGLE_EVENTS, ui.onLayerChange);
        ui.map.removeEventListener('resize', ui.onResize);
    };

    getSourceLabelsString() {
        const zoom = this.map.getZoomlevel() ^ 0;
        let str = '';
        for (let src of this.sources.values()) {
            if (isVisible(src, zoom)) str += `\u00A9 ${src.label} `;
        }
        return str;
    }

    getColors(): { color: string, backgroundColor: string } {
        return {
            color: window.getComputedStyle(this.$cDefault).getPropertyValue('color'),
            backgroundColor: window.getComputedStyle(this.html).getPropertyValue('background-color')
        };
    }

    calcWidth(): number {
        const ui = this;
        const zoom = ui.map.getZoomlevel() ^ 0;
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
        const width = ui.map.getWidth();
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
        const zoom = ui.map.getZoomlevel();

        ui.$btn.innerText = show ? '-' : '+';

        if (show) {
            details.show();
            details.setData(ui.sources.values().filter((src) => isVisible(src, zoom)));
        } else {
            details.hide();
        }
    }

    private setOwnerLabel(el: HTMLElement, label: string) {
        el.innerText = '\u00A9 ' + label;
    }

    private addSource(src: CopyrightSource, layer: any) {
        const ui = this;
        const sources = ui.sources;
        const label = src.label;
        const scopes = src.scopes;
        const zoom = ui.map.getZoomlevel() ^ 0;
        let source = sources.get(label);
        let el;

        if (!source) {
            el = document.createElement('span');
            el.className = this.prefixClass('.source').substr(1);

            ui.setOwnerLabel(el, label);

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
        displayElement(ui.$cDefault, HIDE);
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

                ui.sources.delete(label);
                ui.handleOverflow();

                if (!--ui.sLen) {
                    displayElement(ui.$cDefault, SHOW);
                }
            }
        }
    };
}

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
        color: rgba(255,255,255,.8);\
        font-family: arial;\
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
        display: none;\
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

    '.terms, .cDefault, .source': '\
        white-space: nowrap;\
        padding-right: 4px;'
};


Copyright.prototype.templ =
    '<div class="copyright">\
        <span style="float: left; white-space: nowrap;">\
            <span class="sources"></span>\
            <span class="cDefault"></span>\
         </span>\
        <span class="tac" style="float: right; white-space: nowrap;">\
            <span class="btn">+</span>\
            <span class="terms" style="white-space: nowrap;">|\
            <a target="_blank" style="white-space: nowrap;" href="">Terms and Conditions</a></span>\
        </span>\
    </div>';


export default Copyright;
