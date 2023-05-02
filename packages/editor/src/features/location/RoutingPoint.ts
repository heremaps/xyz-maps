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

import {
    isOnLine,
    movePointOnPath,
    getTotalLength,
    getPointAtLength
} from '../../geometry';
import {calcRelPosOfPoiAtLink} from '../../map/GeoMath';
import {triggerEvent} from './triggerEvent';
import InternalEditor from '../../IEditor';
import {Navlink} from '../link/Navlink';
import {Location} from './Location';
import {Feature, GeoJSONCoordinate} from '@here/xyz-maps-core';
import LocationTools from './LocationTools';
// will be set in constructor to avoid circular dep warnings
let locTools: typeof LocationTools;
let linkTools;
let UNDEF;

class NvtRoutingPoint {
    iEditor: InternalEditor;
    rpFeature: Feature;
    cLink: Navlink;
    streetLine: Feature;
    location: Location;
    routingPoint: number[];

    private ignoreZ: boolean;
    private dragged: boolean;

    constructor(location: Location, _locTools, lnkTools) {
        linkTools = lnkTools;
        locTools = _locTools;

        this.location = location;
        this.iEditor = location._e();
    }

    private updateDisplayedRoutingPoint() {
        const cLink = this.getLink();
        const position = this.coord();

        if (cLink) {
            const coordinates = cLink.coord();
            const linkLength = getTotalLength(coordinates);
            const cLinkPercentage = calcRelPosOfPoiAtLink(coordinates, position).offset ^ 0;
            const p1 = getPointAtLength(coordinates, linkLength * cLinkPercentage);
            const p2 = getPointAtLength(coordinates, linkLength * cLinkPercentage + (cLinkPercentage < 1 ? 1 : -1));

            if (p1[0] != p2[0] || p2[1] != p1[1]) {
                const {rpFeature} = this;
                // update rpFeature
                if (rpFeature) {
                    // update street line(red dashed line)
                    this.updateStreetLine();
                    this.iEditor.objects.overlay.setFeatureCoordinates(rpFeature, position.slice());
                }
            }
        }
    }

    private createDisplayedRoutingPoint(type: string, zLayer: number, locationProperties: {}) {
        const that = this;
        const iEditor = this.iEditor;

        function pointerDown() {
            that.dragged = false;
        }

        function pressMove(ev, dx, dy) {
            const {cLink, location, ignoreZ} = that;

            if (cLink && !iEditor._config.editRestrictions(location, 1)) {
                // let curPos = <GeoJSONCoordinate>dragFeatureCoordinate(ev.mapX, ev.mapY, this, this.geometry.coordinates, iEditor);


                if (!that.dragged) {
                    that.dragged = true;
                    triggerEvent(location, ev, 'routing', 'dragStart');
                }

                let {longitude, latitude} = iEditor.display.pixelToGeo(ev.mapX, ev.mapY);

                let result = iEditor.objects.searchLine([longitude, latitude], cLink.getProvider(), {
                    // maxDistance: 10 * 100
                    ignoreZ
                }, location.geometry.coordinates);


                if (!result) {
                    result = iEditor.objects.searchLine([longitude, latitude], [cLink], {ignoreZ}, location.geometry.coordinates);
                }


                if (result) {
                    const {line, point} = result;

                    if (line != cLink) {
                        linkTools.defaults(cLink);
                        linkTools.displayAsSelected(line, location.id, true);
                    }
                    that.setRoutingPoint(line, point);
                    that.updateDisplayedRoutingPoint();
                }
            }
        }

        function pointerUp(ev) {
            if (that.dragged) {
                locTools.setRoutingData(that.location);
                that.updateDisplayedRoutingPoint();
                locTools.markAsModified(that.location);
            }
            triggerEvent(that.location, ev, 'routing', that.dragged ? 'dragStop' : UNDEF);
        }

        that.rpFeature = that.iEditor.objects.overlay.addPoint(that.routingPoint.slice(), {type, zLayer, ...locationProperties});

        const car = <any>that.rpFeature;

        car.pointerdown = pointerDown;
        car.pressmove = pressMove;
        car.pointerup = pointerUp;

        return that.rpFeature;
    }

    updateStreetLine() {
        const {iEditor, location} = this;
        const {display} = iEditor;

        if (this.streetLine) {
            let displayPnt = location.coord();
            const prv = locTools.private(location);
            const position = this.coord();

            if (prv.isSelected) {
                const selectorStyle = iEditor.getStyle(prv.selector)[0] || {};
                const distance = selectorStyle['radius'] || selectorStyle['width'] / 2;
                const scaleByAltitude = selectorStyle['scaleByAltitude'];
                const displayWorld = display._g2w(displayPnt);
                const scaleDZ = display._scaleOffsetXYByAltitude(displayWorld, scaleByAltitude);
                displayPnt = display._w2g(movePointOnPath(
                    displayWorld,
                    display._g2w(position),
                    distance * scaleDZ
                ));
            }
            iEditor.objects.overlay.setFeatureCoordinates(this.streetLine, [position].concat([displayPnt]));
        }
    };

    getLink(): Navlink {
        return this.cLink;
    }

    coord(): GeoJSONCoordinate {
        return this.routingPoint;
    };

    show(): Navlink {
        const routingPoint = this;
        const {cLink, location, iEditor} = routingPoint;

        if (cLink) {
            const altitude = iEditor.getStyleProperty(location, 'altitude');
            const editorType = location.class;

            routingPoint.ignoreZ = !altitude;

            if (!routingPoint.rpFeature) {
                let zLayer = iEditor.display.getLayers().indexOf(iEditor.getLayer(routingPoint.getLink())) + 1;

                zLayer = !zLayer ? UNDEF : zLayer + 1;

                const locationProperties = {
                    parentType: editorType
                };
                locationProperties[editorType] = {altitude};

                routingPoint.streetLine = iEditor.objects.overlay.addPath([
                    location.coord().slice(),
                    this.routingPoint.slice()
                ],
                UNDEF, {
                    ...locationProperties,
                    type: editorType + '_LINE',
                    zLayer
                });

                routingPoint.rpFeature = this.createDisplayedRoutingPoint(editorType + '_ROUTING_POINT', zLayer, locationProperties);
            }


            routingPoint.updateDisplayedRoutingPoint();
            linkTools.displayAsSelected(cLink, location.id);
        }

        return routingPoint.cLink;
    };

    hide() {
        const that = this;
        const car = <any>that.rpFeature;
        const iEditor = that.iEditor;

        if (car) {
            car.pointerdown =
                car.pressmove =
                    car.pointerup = UNDEF;

            iEditor.objects.overlay.remove(car);
            iEditor.objects.overlay.remove(that.streetLine);

            that.rpFeature =
                that.streetLine = null;
        }
    };

    // initialize properties: cLink, routingPoint
    updateRoutingPoint(): Navlink {
        const routingData = locTools.getRoutingData(this.location);
        const linkId = routingData.link;
        const linkProvider = locTools.getRoutingProvider(this.location); // routingData.layer;
        const rp = routingData.position;
        let viewPoint;
        let path;

        this.cLink = this.routingPoint = null;

        // update routing point by data.link when cLink is not set/modified, otherwise use current cLink
        if (linkId && linkProvider) {
            // get connected link for Routing Point
            this.cLink = <Navlink>linkProvider.search(linkId);
        }

        // need to check here for existing link reference, otherwise calculate everything
        if (this.cLink) {
            // if routing point is available...
            if (rp) {
                // ...check if it is on the line
                path = this.cLink.coord();

                for (let i = 0; i < path.length - 1; i++) {
                    // if rp is found on link
                    if (isOnLine(
                        path[i],
                        path[i + 1],
                        rp,
                        1e-6 // NTU PRECISION
                    )) {
                        // rp is on line..we are happy and done =)
                        this.routingPoint = rp;

                        return this.cLink;
                    }
                }
                // ... if not readjust to line.
                // if rp is not on the link, calculate correct fitting rp by defined rp.
                viewPoint = rp;
            } else {
                // if no rp, calculate routing point by display point
                viewPoint = this.location.coord();
            }

            const foundRoutingPoint = this.iEditor.objects.getNearestLine(viewPoint, [this.cLink]);

            if (foundRoutingPoint) {
                this.cLink = foundRoutingPoint.line;
                this.routingPoint = foundRoutingPoint.point;
            }
        }

        return this.cLink;
    };


    searchLink() {
        const {iEditor, location} = this;
        const linkProvider = locTools.getRoutingProvider(location);
        return linkProvider && iEditor.objects.getNearestLine(location.coord(), linkProvider, {
            maxDistance: iEditor._config['maxRoutingPointDistance']
            // ignoreZ: !iEditor.getStyleProperty(location, 'altitude')
        });
    };

    setRoutingPoint(link?: Navlink, rp?: GeoJSONCoordinate) {
        // these properties are set when object connects to a link, the same in the method 'updateRoutingPoint'
        this.routingPoint = this.cLink = null;

        // connect to the link that is passed in from outside
        if (link) {
            this.cLink = link;
            this.routingPoint = rp;
        } else {
            // if link is not passed in, connect to the nearest link automatically
            const closeLink = this.searchLink();

            if (closeLink) {
                this.cLink = closeLink.line;
                this.routingPoint = closeLink.point;
            }
        }
        // return the link to which this object connects. return null, if no link is found.
        return this.cLink;
    };

    clearRoutingPoint() {
        this.cLink =
            this.routingPoint = null;

        this.hide();
    };
}

export default NvtRoutingPoint;
