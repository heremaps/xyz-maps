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

import MCrossing from '../API/MCrossing';
import {getDistance, intersectLineLine} from '../geometry';
import {geotools as geoTools} from '@here/xyz-maps-common';
import linkTools from '../features/link/NavLinkTools';

// TODO: REFACTOR!
function CrossingTester( HERE_WIKI, linkOrig ) {
    const that = this;
    let foundCrossings = [];
    const simpleCrossings = [];
    const onlyExsitingShape = false;
    const HERE_CROSSING = 'CROSSING';
    const HERE_CROSSING_CANDIDATE = HERE_CROSSING +'_CANDIDATE';
    let maxDistance;
    let shapeThreshold;
    let searchType;
    let relatedLink;
    let UNDEF;

    that.getRelatedLink = () => linkOrig;

    that.setRelatedLink = (l) => {
        if ( l ) {
            linkOrig = l;
            relatedLink = [linkOrig];
        }
    };

    that.setRelatedLink(linkOrig);

    function connectionsContainIds( connections, ids ) {
        for (const i in connections) {
            if ( ids.indexOf(connections[i].link.id)!= -1 ) {
                return true;
            }
        }
        return false;
    }
    function getNearestLineCandidate(link, shape, skipIds, lines) {
        let cLinks;
        var skipIds;
        let p;
        let nline;
        let cons;

        if ( skipIds === UNDEF ) {
            cLinks = link.getConnectedLinks( shape, true );

            skipIds = [link.id];

            for (const i in cLinks) {
                skipIds.push(cLinks[i].link.id);
            }
        }

        p = link.coord();

        nline = HERE_WIKI.objects.getNearestLine( p[shape], lines, {
            ignore: skipIds,
            maxDistance: maxDistance, // search radius in meter
            shapeThreshold: shapeThreshold, // shapeThreshold,
            onlyExsitingShape: onlyExsitingShape // (j == 0 || j == path.length-1) ? false : true
        });

        if (nline != null) {
            cons = nline.line.getConnectedLinks( nline.shpIndex, true);

            if ( connectionsContainIds(cons, skipIds) ) {
                skipIds.push( nline.line.id );

                return getNearestLineCandidate(link, shape, skipIds, lines);
            }
        }
        return nline;
    };

    function NvtCrossing( link, candidate, searchPnt, foundPnt ) {
        const crossing = this;
        let simplified = null;
        const fPnt = foundPnt || searchPnt;

        crossing.candidate = candidate;

        crossing.link = link;

        crossing.foundPnt = foundPnt;

        crossing.searchPnt = searchPnt;

        crossing.distance = !!foundPnt
            ? getDistance([searchPnt.x, searchPnt.y], [foundPnt.x, foundPnt.y])
            : 0;

        crossing.cx = (fPnt.x-searchPnt.x)/2+searchPnt.x;
        crossing.cy = (fPnt.y-searchPnt.y)/2+searchPnt.y;

        crossing.getSimplified = () => simplified || (simplified = new MCrossing(HERE_WIKI, that, crossing));
    };

    function checkRealCrossing( link, linkBBox, objs ) {
        let pCons = [];
        const linkPath = link.coord();

        function calcPathIntersections(path1, path2) {
            //  return Raphael.pathIntersection( path1, path2 );
            const results = [];
            let intersec;

            for ( let i = 0; i < path1.length-1; i++ ) {
                for ( let k = 0; k < path2.length-1; k++ ) {
                    intersec = intersectLineLine( path1[i], path1[i+1], path2[k], path2[k+1], true );
                    // result = {
                    //  x: x,
                    //  y: y
                    //  // // check if line segments are "connected"
                    //  // // this is a indication for overlapping shape..
                    //  // // ..which results results in crossing detected multiple times
                    //  // connected:
                    //  //  // crossing at existing geo1
                    //  //  ( ua == 0.0 || ua == 1.0 )       ||
                    //  //  // crossing at existing geo2
                    //  //  ( x == g2_1[0] && y == g2_1[1] ) ||
                    //  //  ( x == g2_2[0] && y == g2_2[1] )
                    // }


                    if ( intersec ) {
                        intersec.s1 = i+1;
                        intersec.s2 = k+1;

                        results.push( intersec );
                    }
                }
            }
            return results;
        }

        function getCrossings( l2 ) {
            let isCLink = false;
            const pcons = [];
            const intersections = calcPathIntersections( linkPath, l2.coord() );

            // filter out crossing duplicates. e.g. overlapping shapes.
            for ( var i = 0, j = 0, len = intersections.length; i < len-1; i++, j = i ) {
                const isec = intersections[i];
                let nextIsec;

                while ( ++j < len ) {
                    nextIsec = intersections[j];

                    if (
                        // !isec.connected       &&
                        isec[0] == nextIsec[0] &&
                        isec[1] == nextIsec[1] &&
                        Math.abs( nextIsec.s1 - isec.s1 ) <= 1 &&
                        Math.abs( nextIsec.s2 - isec.s2 ) <= 1
                    ) {
                        intersections.splice( j--, 1 );
                        len--;
                    }
                }
            }

            // filter out connected links...
            for ( var i = 0; i < intersections.length; i++ ) {
                isCLink = false;
                // filter out connected links!
                for ( let c = 0, clink; c<cLinks.length; c++ ) {
                    clink = cLinks[c];

                    if (
                        clink.link.id == l2.id &&

                        linkTools.isIntersection(
                            HERE_WIKI,
                            intersections[i],
                            clink.link.coord()[clink.index]
                        )
                    ) {
                        isCLink = true;
                        break;
                    }
                }

                if ( !isCLink ) {
                    pcons.push( new NvtCrossing( link, l2, {
                        x: intersections[i][0],
                        y: intersections[i][1]
                        // index: intersections[i]['s1']-1,
                        // index2: intersections[i]['s2']-1
                    }));
                }
            }

            return pcons;
        }

        // if the link doesn't exist anymore, we have to skip/ignore it.
        if ( !link.editState('removed') ) {
            const cLinks = link.getConnectedLinks( 0, true )
                .concat(
                    link.getConnectedLinks( linkPath.length-1, true )
                );

            // check for real crossings
            objs.forEach((el) => {
                pCons = pCons.concat( getCrossings(el) );
            });
        }
        return pCons;
    };

    function getSimplifiedCrossings() {
        simpleCrossings.length = 0;

        foundCrossings.forEach((x, i) => {
            simpleCrossings[i] = x.getSimplified();
        });

        return simpleCrossings;
    };

    function calculateCrossings( links ) {
        let foundX = []; let candidate;

        // create timestamp shared by all crossings
        that.createTS = +new Date;

        (links.length==UNDEF?[links]:links).forEach((link) => {
            // if the link doesn't exist anymore, we have to skip/ignore it.
            if ( !link.editState('removed') ) {
                if ( !searchType || searchType == HERE_CROSSING || searchType == HERE_CROSSING_CANDIDATE ) {
                    const lb = geoTools.extendBBox( link.getBBox(), maxDistance );
                    const features = HERE_WIKI.objects.getInBBox( lb, link.getProvider() );
                    const linkIndex = features.indexOf(link);

                    if ( linkIndex != -1 ) {
                        features.splice( linkIndex, 1 );
                    }

                    if ( searchType != HERE_CROSSING_CANDIDATE ) {
                        foundX = foundX.concat( checkRealCrossing(link, lb, features) );
                    }

                    // check for possible crossings (candidates)
                    if ( searchType != HERE_CROSSING ) {
                        link.coord().forEach((c, i) => {
                            if ( candidate = getNearestLineCandidate(link, i, UNDEF, features) ) {
                                foundX.push(
                                    new NvtCrossing(

                                        link,
                                        candidate.line,
                                        {
                                            x: c[0],
                                            y: c[1],
                                            index: i
                                        }, {
                                            x: candidate.point[0],
                                            y: candidate.point[1],
                                            index: candidate.shpIndex
                                        }
                                    )
                                );
                            }
                        });
                    }
                }
            }
        });

        // filter/remove for possible duplicates (overlapping existing shapes)
        for (let i = 0, j; i < (j=foundX.length); i++ ) {
            while (i < --j) {
                if (
                    foundX[i].cx == foundX[j].cx &&
                    foundX[i].cy == foundX[j].cy &&
                    foundX[i].candidate == foundX[j].candidate &&
                    foundX[j].distance == 0 &&
                    // it's a candidate..
                    foundX[j].foundPnt &&
                    foundX[i].searchPnt.x == foundX[j].searchPnt.x &&
                    foundX[i].searchPnt.y == foundX[j].searchPnt.y
                ) {
                    foundX.splice(j, 1);
                }
            }
        }
        return foundX;
    }

    that.clear = () => {
        that.createTS = 0;

        simpleCrossings.forEach((e) => {
            e.hide && e.hide();
        });
        foundCrossings.length = 0;
        simpleCrossings.length = 0;
    };

    that.getCrossings = (option, link) => {
        option = option || {};

        that.setRelatedLink(link);

        if ( !option.links ) {
            // if new search type or maxDistance is different from previous type, force to recalculate crossings
            if (
                searchType != option['class'] ||
                maxDistance != option['maxDistance']
            ) {
                that.createTS = 0;
            }

            that.cStyles = option['styles'] || {};
            searchType = option['class'];
        } else if ( option.croLink && option.links.length ) {
            // check if option.links is not empty, then remove the split link and add new links to related links array
            relatedLink = relatedLink.concat( option.links );
        }

        maxDistance = option['maxDistance'] || HERE_WIKI._config['XTestMaxDistance'] || 3;
        shapeThreshold = HERE_WIKI._config['minShapeDistance'];

        // calculate crossings if it is never calculated or link is modified after the calculation
        // if links is given, then force to do a calculating with the given links
        if ( !that.createTS || linkOrig.editState('modified') > that.createTS || option.links ) {
            that.clear();
            foundCrossings = calculateCrossings( relatedLink );
        }
        return getSimplifiedCrossings();
    };
}

export default CrossingTester;


// import MCrossing from '../API/MCrossing';
// import {getDistance, intersectLineLine} from '../geometry';
// import {geotools as geoTools} from '@here/xyz-maps-common';
// import linkTools from '../features/link/NavLinkTools';
//
// const HERE_CROSSING = 'CROSSING';
// const HERE_CROSSING_CANDIDATE = HERE_CROSSING + '_CANDIDATE';
// let UNDEF;
//
// function connectionsContainIds(connections, ids) {
//     for (const i in connections) {
//         if (ids.indexOf(connections[i].id) != -1) {
//             return true;
//         }
//     }
//     return false;
// }
//
// function calcPathIntersections(path1, path2) {
//     //  return Raphael.pathIntersection( path1, path2 );
//     const results = [];
//     let intersec;
//
//     for (let i = 0; i < path1.length - 1; i++) {
//         for (let k = 0; k < path2.length - 1; k++) {
//             intersec = intersectLineLine(path1[i], path1[i + 1], path2[k], path2[k + 1]);
//             // result = {
//             //  x: x,
//             //  y: y
//             //  // // check if line segments are "connected"
//             //  // // this is a indication for overlapping shape..
//             //  // // ..which results results in crossing detected multiple times
//             //  // connected:
//             //  //  // crossing at existing geo1
//             //  //  ( ua == 0.0 || ua == 1.0 )       ||
//             //  //  // crossing at existing geo2
//             //  //  ( x == g2_1[0] && y == g2_1[1] ) ||
//             //  //  ( x == g2_2[0] && y == g2_2[1] )
//             // }
//
//
//             if (intersec) {
//                 intersec.s1 = i + 1;
//                 intersec.s2 = k + 1;
//
//                 results.push(intersec);
//             }
//         }
//     }
//     return results;
// }
//
// function checkRealCrossing(link, linkBBox, objs) {
//     let pCons = [];
//     const linkPath = link.coord();
//
//     // if the link doesn't exist anymore, we have to skip/ignore it.
//     if (!link.editState('removed')) {
//         let cLinks = link.getConnectedLinks(0, true).concat(
//             link.getConnectedLinks(linkPath.length - 1, true)
//         );
//
//         // check for real crossings
//         objs.forEach((el) => {
//             pCons = pCons.concat(getCrossings(link, linkPath, el, cLinks));
//         });
//     }
//     return pCons;
// };
//
// function calculateCrossings(HERE_WIKI, links, searchType, maxDistance) {
//     let foundX = [];
//     let candidate;
//
//     (links.length == UNDEF ? [links] : links).forEach((link) => {
//         // if the link doesn't exist anymore, we have to skip/ignore it.
//         if (!link.editState('removed')) {
//             if (!searchType || searchType == HERE_CROSSING || searchType == HERE_CROSSING_CANDIDATE) {
//                 const lb = geoTools.extendBBox(link.getBBox(), maxDistance);
//                 const features = HERE_WIKI.objects.getInBBox(lb, link.getProvider());
//                 const linkIndex = features.indexOf(link);
//
//                 if (linkIndex != -1) {
//                     features.splice(linkIndex, 1);
//                 }
//
//                 if (searchType != HERE_CROSSING_CANDIDATE) {
//                     foundX = foundX.concat(checkRealCrossing(link, lb, features));
//                 }
//
//                 // check for possible crossings (candidates)
//                 if (searchType != HERE_CROSSING) {
//                     link.coord().forEach((c, i) => {
//                         if (candidate = getNearestLineCandidate(HERE_WIKI, link, i, UNDEF, features, maxDistance)) {
//                             foundX.push([link, candidate.line, {
//                                 x: c[0],
//                                 y: c[1],
//                                 index: i
//                             }, {
//                                 x: candidate.point[0],
//                                 y: candidate.point[1],
//                                 index: candidate.shpIndex
//                             }]);
//                         }
//                     });
//                 }
//             }
//         }
//     });
//
//     // filter/remove for possible duplicates (overlapping existing shapes)
//     for (let i = 0, j; i < (j = foundX.length); i++) {
//         while (i < --j) {
//             if (
//                 foundX[i].cx == foundX[j].cx &&
//                 foundX[i].cy == foundX[j].cy &&
//                 foundX[i].candidate == foundX[j].candidate &&
//                 foundX[j].distance == 0 &&
//                 // it's a candidate..
//                 foundX[j].foundPnt &&
//                 foundX[i].searchPnt.x == foundX[j].searchPnt.x &&
//                 foundX[i].searchPnt.y == foundX[j].searchPnt.y
//             ) {
//                 foundX.splice(j, 1);
//             }
//         }
//     }
//     return foundX;
// }
//
// function getCrossings(link, linkPath, candidate, cLinks) {
//     let isCLink = false;
//     const pcons = [];
//     const intersections = calcPathIntersections(linkPath, candidate.coord());
//
//     // filter out crossing duplicates. e.g. overlapping shapes.
//     for (var i = 0, j = 0, len = intersections.length; i < len - 1; i++, j = i) {
//         const isec = intersections[i];
//         let nextIsec;
//
//         while (++j < len) {
//             nextIsec = intersections[j];
//
//             if (
//                 // !isec.connected       &&
//                 isec[0] == nextIsec[0] &&
//                 isec[1] == nextIsec[1] &&
//                 Math.abs(nextIsec.s1 - isec.s1) <= 1 &&
//                 Math.abs(nextIsec.s2 - isec.s2) <= 1
//             ) {
//                 intersections.splice(j--, 1);
//                 len--;
//             }
//         }
//     }
//
//     // filter out connected links...
//     for (var i = 0; i < intersections.length; i++) {
//         isCLink = false;
//         // filter out connected links!
//         for (let clink of cLinks) {
//             if (
//                 clink.link.id == candidate.id &&
//                 linkTools.isIntersection(intersections[i], clink.link.coord()[clink.index])
//             ) {
//                 isCLink = true;
//                 break;
//             }
//         }
//
//         if (!isCLink) {
//             pcons.push([link, candidate, {
//                 x: intersections[i][0],
//                 y: intersections[i][1]
//                 // index: intersections[i]['s1']-1,
//                 // index2: intersections[i]['s2']-1
//             }]);
//         }
//     }
//
//     return pcons;
// }
//
// function getNearestLineCandidate(HERE_WIKI, link, shape, skipIds, within, maxDistance) {
//     const objHelper = HERE_WIKI.objects.tools;
//     let cLinks;
//     let p;
//     let nline;
//     let cons;
//
//     if (skipIds === UNDEF) {
//         cLinks = link.getConnectedLinks(shape, true);
//         skipIds = cLinks.map((connection) => connection.link.id);
//         skipIds.push(link.id);
//     }
//
//     p = link.coord();
//
//     nline = objHelper.getNearestLine(p[shape], {
//         ignore: skipIds,
//         maxDistance: maxDistance, // search radius in meter
//         shapeThreshold: HERE_WIKI._config['minShapeDistance'], // shapeThreshold,
//         onlyExsitingShape: false, // (j == 0 || j == path.length-1) ? false : true
//         lines: within
//     });
//
//     if (nline != null) {
//         cons = nline.line.getConnectedLinks(nline.shpIndex);
//         if (connectionsContainIds(cons, skipIds)) {
//             skipIds.push(nline.line.id);
//             return getNearestLineCandidate(HERE_WIKI, link, shape, skipIds, within, maxDistance);
//         }
//     }
//     return nline;
// };
//
// function CrossingTester(HERE_WIKI, linkOrig) {
//     const that = this;
//     let foundCrossings = [];
//     let maxDistance;
//     let searchType;
//     let relatedLink;
//
//
//     that.getRelatedLink = () => linkOrig;
//
//     that.setRelatedLink = (l) => {
//         if (l) {
//             linkOrig = l;
//             relatedLink = [linkOrig];
//         }
//     };
//
//     that.setRelatedLink(linkOrig);
//
//     that.clear = () => {
//         that.createTS = 0;
//
//         foundCrossings.forEach((e) => {
//             e.hide && e.hide();
//         });
//         foundCrossings.length = 0;
//     };
//
//     that.getCrossings = (option, link) => {
//         option = option || {};
//
//         that.setRelatedLink(link);
//
//         if (!option.links) {
//             // if new search type or maxDistance is different from previous type, force to recalculate crossings
//             if (
//                 searchType != option['class'] ||
//                 maxDistance != option['maxDistance']
//             ) {
//                 that.createTS = 0;
//             }
//
//             that.cStyles = option['styles'] || {};
//             searchType = option['class'];
//         } else if (option.croLink && option.links.length) {
//             // check if option.links is not empty, then remove the split link and add new links to related links array
//             relatedLink = relatedLink.concat(option.links);
//         }
//
//         maxDistance = option['maxDistance'] || HERE_WIKI._config['XTestMaxDistance'] || 3;
//
//         // calculate crossings if it is never calculated or link is modified after the calculation
//         // if links is given, then force to do a calculating with the given links
//         if (!that.createTS || linkOrig.editState('modified') > that.createTS || option.links) {
//             that.clear();
//             // create timestamp shared by all crossings
//             that.createTS = +new Date;
//
//             foundCrossings.length = 0;
//             for (let x of calculateCrossings(HERE_WIKI, relatedLink, searchType, maxDistance)) {
//                 const searchPnt = x[2];
//                 const foundPnt = x[3];
//                 const fPnt = foundPnt || searchPnt;
//
//                 foundCrossings.push(new MCrossing(HERE_WIKI, that, {
//                     candidate: x[1],
//                     link: x[0],
//                     foundPnt: foundPnt,
//                     searchPnt: searchPnt,
//                     distance: !!foundPnt ? getDistance([searchPnt.x, searchPnt.y], [foundPnt.x, foundPnt.y]) : 0,
//                     cx: (fPnt.x - searchPnt.x) / 2 + searchPnt.x,
//                     cy: (fPnt.y - searchPnt.y) / 2 + searchPnt.y
//                 }));
//             }
//             ;
//         }
//         // NEED TO ALWAYS PASS SAME ARRAY INSTANCE BECAUSE API USERS REPEAT CONNECT CROSSINGS
//         return foundCrossings;
//     };
// }
//
// export default CrossingTester;
