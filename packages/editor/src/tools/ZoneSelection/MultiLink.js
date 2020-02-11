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
import {getTotalLength, getSubpath} from '../../geometry';
import oTools from '../../features/link/NavLinkTools';
let UNDEF;

function mergeConnectedPaths( path1, path2 ) {
    return path1.concat( path2.slice(1) );
}

function MultiLink( HERE_WIKI, overlay, link ) {
    const childs = [];
    const zones = [];
    let completePath;
    let multilink;
    const that = this;

    if ( link === UNDEF ) {
        return null;
    }

    function createStyle( zIndex, color, sw, sda ) {
        return {
            'zIndex': zIndex,
            'type': 'Line',
            'stroke': color,
            'strokeWidth': sw,
            'strokeDasharray': sda || 'none',
            'strokeLinejoin': 'round',
            'strokeLinecap': sda ? 'butt' : 'round'
        };
    }

    completePath = link.coord();

    const mlStyle = [
        createStyle( 0, 'white', 23 ),
        createStyle( 1, 'grey', 20 ),
        createStyle( 2, 'white', 3, [5, 4] )
    ];

    multilink = overlay.addPath( completePath, mlStyle );

    function refreshGeometry() {
        overlay.setFeatureCoordinates( multilink, completePath );
    };

    function show() {
        overlay.addFeature( multilink, mlStyle );
    }

    function hide() {
        overlay.remove( multilink );
    }

    hide();

    childs.push({
        from: 0,
        to: completePath.length-1,
        link: link,
        reversed: false
    });

    refreshGeometry();

    this.getChilds = () => childs;

    this.coord = () => completePath.map((c) => c.slice());
    //* **************************************************************************************

    function removeZones() {
        zones.forEach((zone) => {
            zone.remove();
        });
        zones.length = 0;
    }

    this.show = (_zones) => {
        removeZones();
        show();

        _zones.forEach((_zone) => {
            const side = _zone.side;
            const style = _zone.style||{};
            const color = style.stroke||'#ff4040';
            let zone;

            function onDragged() {
                if ( _zone['onChange'] ) {
                    _zone['onChange']( zone );
                }
            }

            if ( ['L', 'R', 'B'].indexOf(side) != -1 ) {
                zone = {

                    _zone: _zone,

                    line: overlay.addPath( [[0, 0], [0, 0]], [{
                        'zIndex': 4,
                        'type': 'Line',
                        'strokeWidth': 9,
                        'opacity': style.opacity||0.6,
                        'stroke': color
                    }]),

                    markers: [],

                    remove: function() {
                        overlay.remove( this.line );
                        this.markers[0].remove();
                        this.markers[1].remove();
                    },

                    locked: function() {
                        return !!_zone['locked'];
                    },

                    draw: function() {
                        let posM1 = zone.markers[0].getRelPos();
                        let posM2 = zone.markers[1].getRelPos();
                        const coordinates = that.coord();
                        const lenTotal = getTotalLength(coordinates);

                        if ( posM1 > posM2 ) {
                            // flip
                            const lb = posM1;
                            posM1 = posM2;
                            posM2 = lb;
                        }

                        overlay.setFeatureCoordinates( zone.line,
                            getSubpath(
                                coordinates,
                                posM1 * lenTotal,
                                posM2 * lenTotal
                            )
                        );
                    }
                };

                zone.markers.push(

                    new SelectionMarker(
                        HERE_WIKI,
                        overlay,
                        that,
                        side,
                        _zone['from'],
                        color,
                        zone.locked,
                        zone.draw,
                        onDragged
                    ),
                    new SelectionMarker(
                        HERE_WIKI,
                        overlay,
                        that,
                        side,
                        _zone['to'],
                        color,
                        zone.locked,
                        zone.draw,
                        onDragged
                    )
                );

                zones.push(zone);
                zone.draw();
            }
        });
    };
    //* **************************************************************************************
    this.addLink = (link) => {
        const newPath = link.coord();
        let debugInfo = 'CASE ';

        oTools.defaults( link );

        function match(c1, c2) {
            return c1[0] === c2[0] && c1[1] === c2[1];
        }

        function addChild(from, to, reversed) {
            if ( reversed ) {
                newPath.reverse();
            }

            if (from===0) {
                for ( let i=0; i<childs.length; i++ ) {
                    childs[i].from += to;
                    childs[i].to += to;
                }
                completePath = mergeConnectedPaths(newPath, completePath);
            } else {
                completePath = mergeConnectedPaths(completePath, newPath);
            }

            childs.unshift({
                from: from,
                to: to,
                link: link,
                reversed: !!reversed
            });
        }

        if ( match( newPath[newPath.length-1], completePath[0] ) ) {
            debugInfo += '0->N';
            addChild(0, newPath.length-1);
        } else if ( match(newPath[0], completePath[0]) ) {
            debugInfo += '0->0';
            addChild(0, newPath.length-1, true);
        } else if ( match(newPath[0], completePath[completePath.length-1]) ) {
            debugInfo += 'N->0';
            addChild(
                completePath.length-1,
                completePath.length+newPath.length-2
            );
        } else if ( match(newPath[newPath.length-1], completePath[completePath.length-1]) ) {
            debugInfo += 'N->N';

            addChild(
                completePath.length-1,
                completePath.length+newPath.length-2,
                true
            );
        }

        HERE_WIKI.dump(debugInfo);

        refreshGeometry();
    };
    //* **************************************************************************************


    this.destroy = () => {
        hide();
        removeZones();
    };

    //* **************************************************************************************


    this.coord = () => completePath;


    this.getZones = (marker, link) => zones;

    this.getZoneSegments = (zone) => {
        const m1 = zone.markers[0];
        const m2 = zone.markers[1];
        const segments = [];

        function flip(a) {
            const bak = a[0];
            a[0] = a[1];
            a[1] = bak;
        }

        childs.forEach((child) => {
            const mPos = [m1.getRelPosOfSubLink( child ), m2.getRelPosOfSubLink( child )];

            mPos[0] > mPos[1] && flip(mPos);

            if ( child.reversed ) {
                flip(mPos);
                mPos[0] = 1-mPos[0];
                mPos[1] = 1-mPos[1];
            }

            // 0 0 or 1 1 -> not on segment
            if ( mPos[0] !== mPos[1]) {
                segments.push([
                    child.link,
                    mPos[0],
                    mPos[1],
                    child.reversed
                ]);
            }
        });
        return segments;
    };
}

export default MultiLink;
