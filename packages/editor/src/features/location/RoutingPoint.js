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

import {
    getSegmentIndex,
    isOnLine,
    movePointOnPath,
    getTotalLength,
    getPointAtLength
} from '../../geometry';
import {calcRelPosOfPoiAtLink, calcSideOfLine} from '../../map/GeoMath';

import {triggerEvent} from './triggerEvent';

let linkTools;
let UNDEF;


function detectRPDisplaySide(rPnt, location) {
    let displaySide = null;
    const cLink = rPnt.getLink();
    // detect the side of the display-point relative to the street:
    if (cLink) {
        // use helper to get the assigned SegmentIndex of the point
        const path = cLink.coord();
        const segmentId = getSegmentIndex(path, rPnt.coord());

        if (segmentId !== false) {
            var p1 = path[segmentId];
            var p2 = path[segmentId + 1];
        }
        if (p1 !== UNDEF && p2 !== UNDEF) {
            displaySide = calcSideOfLine(location.coord(), p1, p2);
        }
    }

    return displaySide;
}


function NvtRoutingPoint(location, locTools, lnkTools) {
    linkTools = lnkTools;
    const that = this;
    const EDITOR = location._e();
    let car;
    let streetLine;
    let cLink;
    let routingPoint;

    //* *************************************************************************


    function clickCar() {
        this.prevDMove = null;
        car.moved = false;
    };

    function moveCar(ev, dx, dy, ax, ay) {
        const prevDMove = this.prevDMove || [0, 0];
        const _dx = dx - prevDMove[0];
        const _dy = dy - prevDMove[1];

        if (cLink && !EDITOR._config.editRestrictions(location, 1)) {
            const pixel = EDITOR.map.getEventsMapXY(ev);
            const curPos = EDITOR.map.getGeoCoord(
                pixel[0] + _dx, // scale,
                pixel[1] + _dy // / scale
            );

            // skip/ignore zlevel matching for nearest line search..
            curPos.pop();

            const nearestPnt = EDITOR.objects.getNearestLine(curPos, [cLink]);


            const isAtEnd = [0, location.geometry.coordinates.length - 1].indexOf(nearestPnt.shpIndex) != -1;

            if (!car.moved) {
                car.moved = true;
                triggerEvent(location, ev, 'routing', 'dragStart');
            }

            if (!isAtEnd) {
                that.setRoutingPoint(cLink, nearestPnt.point);
            }


            // debugger;

            if (nearestPnt.distance > 1 || isAtEnd) {
                // the mouseposition is nearer to another line
                const nearestStreet = EDITOR.objects.getNearestLine(curPos, cLink.getProvider(), {
                    ignore: [cLink],
                    maxDistance: 10
                });

                if (nearestStreet && (nearestStreet.distance < nearestPnt.distance || isAtEnd)) {
                    linkTools.defaults(cLink);

                    // connect to a new link
                    that.setRoutingPoint(
                        nearestStreet.line,
                        nearestStreet.point
                    );

                    linkTools.displayAsSelected(nearestStreet.line, location.id, true);

                    return;
                }
            }

            if (!isAtEnd) {
                updateRoutingPointIcon();
            }
        }

        prevDMove[0] = dx;
        prevDMove[1] = dy;

        this.prevDMove = prevDMove;
    };

    function releaseCar(ev) {
        if (car.moved) {
            locTools.setRoutingData(location);

            updateRoutingPointIcon(detectRPDisplaySide(that, location));

            locTools.markAsModified(location);
        }

        triggerEvent(location, ev, 'routing', car.moved ? 'dragStop' : UNDEF);
    };

    that.getLink = () => cLink;

    that.coord = () => routingPoint;

    that.show = () => {
        if (cLink && !car) {
            const editorType = location.class;

            streetLine = EDITOR.objects.overlay.addPath([
                location.coord().slice(),
                routingPoint.slice()
            ],
            UNDEF, {
                type: editorType + '_LINE'
            });


            car = EDITOR.objects.overlay.addPoint(routingPoint.slice(), {
                type: editorType + '_ROUTING_POINT'
            });

            car.pointerdown = clickCar;
            car.pressmove = moveCar;
            car.pointerup = releaseCar;
        }

        if (cLink) {
            updateRoutingPointIcon(detectRPDisplaySide(that, location));

            linkTools.displayAsSelected(cLink, location.id);
        }

        return cLink;
    };

    that.hide = () => {
        if (car) {
            car.pointerdown =
                car.pressmove =
                    car.pointerup = UNDEF;

            EDITOR.objects.overlay.remove(car);
            EDITOR.objects.overlay.remove(streetLine);

            car =
                streetLine = null;
        }
    };


    // initialize properties: cLink, routingPoint
    that.updateRoutingPoint = () => {
        const routingData = locTools.getRoutingData(location);
        const linkId = routingData.link;
        const linkProvider = locTools.getRoutingProvider(location); // routingData.layer;
        const rp = routingData.position;
        let viewPoint;
        let path;

        cLink = routingPoint = null;

        // update routing point by data.link when cLink is not set/modified, otherwise use current cLink
        if (linkId && linkProvider) {
            // get connected link for Routing Point
            cLink = linkProvider.search(linkId);
        }

        // need to check here for existing link reference, otherwise calculate everything
        if (cLink) {
            // if routing point is available...
            if (rp) {
                // ...check if it is on the line
                path = cLink.coord();

                for (let i = 0; i < path.length - 1; i++) {
                    // if rp is found on link
                    if (isOnLine(
                        path[i],
                        path[i + 1],
                        rp,
                        1e-6 // NTU PRECISION
                    )) {
                        // rp is on line..we are happy and done =)
                        routingPoint = rp;

                        return cLink;
                    }
                }


                // ... if not readjust to line.
                // if rp is not on the link, calculate correct fitting rp by defined rp.
                viewPoint = rp;
            } else {
                // if no rp, calculate routing point by display point
                viewPoint = location.coord();
            }

            const foundRoutingPoint = EDITOR.objects.getNearestLine(viewPoint, [cLink]);

            if (foundRoutingPoint) {
                cLink = foundRoutingPoint.line;
                routingPoint = foundRoutingPoint.point;
            }
        }

        return cLink;
    };


    that.searchLink = () => {
        const linkProvider = locTools.getRoutingProvider(location);
        return linkProvider && EDITOR.objects.getNearestLine(location.coord(), linkProvider, {
            maxDistance: EDITOR._config['maxRoutingPointDistance']
        });
    };

    that.setRoutingPoint = (link, rp) => {
        // these properties are set when object connects to a link, the same in the method 'updateRoutingPoint'
        routingPoint = cLink = null;

        // connect to the link that is passed in from outside
        if (link) {
            cLink = link;
            routingPoint = rp;
        } else {
            // if link is not passed in, connect to the nearest link automatically
            const closeLink = that.searchLink();

            if (closeLink) {
                cLink = closeLink.line;
                routingPoint = closeLink.point;
            }
        }
        // return the link to which this object connects. return null, if no link is found.
        return cLink;
    };

    that.clearRoutingPoint = () => {
        cLink =
            routingPoint = null;

        that.hide();
    };


    that.updateStreetLine = () => {
        if (streetLine) {
            let display = location.coord();
            const prv = locTools.private(location);

            if (prv.isSelected) {
                const selectorStyle = (EDITOR.getStyle(prv.selector)[0] || [])[1] || {};

                display = EDITOR.map.getGeoCoord(
                    movePointOnPath(
                        EDITOR.map.getPixelCoord(display),
                        EDITOR.map.getPixelCoord(routingPoint),
                        selectorStyle['radius'] || selectorStyle['width'] / 2
                    )
                );
            }

            EDITOR.objects.overlay.setFeatureCoordinates(
                streetLine,
                [routingPoint].concat([display])
            );
        }
    };


    function updateRoutingPointIcon(disSide) {
        if (cLink) {
            const coordinates = cLink.coord();
            const linkLength = getTotalLength(coordinates);
            const cLinkPercentage = calcRelPosOfPoiAtLink(coordinates, routingPoint).offset ^ 0;
            const p1 = getPointAtLength(coordinates, linkLength * cLinkPercentage);
            const p2 = getPointAtLength(coordinates, linkLength * cLinkPercentage + (cLinkPercentage < 1 ? 1 : -1));

            if (p1[0] != p2[0] || p2[1] != p1[1]) {
                // update car
                if (car) {
                    // update street line(red dashed line)
                    that.updateStreetLine();

                    EDITOR.objects.overlay.setFeatureCoordinates(
                        car,
                        routingPoint.slice()
                    );
                }
            }
        }
    }
}

export default NvtRoutingPoint;
