/*
 * Copyright (C) 2019-2023 HERE Europe B.V.
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
import {AStar, AStarNode, geotools} from '@here/xyz-maps-common';
import {Feature, FeatureProvider} from '@here/xyz-maps-core';

type NodeData = { link: Feature, index: number };

type Node = AStarNode & { data: NodeData };

type Weight = (options: {
    feature: Feature;
    distance: number;
    from: number[];
    to: number[];
    direction: 'START_TO_END' | 'END_TO_START'
}) => number;

// const defaultCoordinatesFilter = (feature: Feature<'LineString'>) => {
//     return [0, feature.geometry.coordinates.length - 1];
// };

type Turn = { from: NodeData, to: NodeData };

export class PathFinder {
    static async findPath(
        provider: FeatureProvider,
        fromNode: Node,
        toNode: Node,
        isTurnAllowed: (turn: Turn) => boolean,
        weight?: Weight
    ): Promise<Node[]> {
        return new Promise((resolve, reject) => {
            const filterConnectedFeatures = (fromLink, i: number, result) => {
                const fromCoordinates = fromLink.geometry.coordinates;
                const point = fromCoordinates[i];
                const geoJSONFeatures = <Feature[]>provider.search({point: {longitude: point[0], latitude: point[1]}, radius: .5});
                const turn = {from: {link: fromLink, index: i}, to: null};

                for (const feature of geoJSONFeatures) {
                    if (feature.geometry.type != 'LineString' || feature == fromLink) continue;

                    const coordinates = <number[][]>feature.geometry.coordinates;
                    const lastCoordinateIndex = coordinates.length - 1;
                    const index = AStar.isPointEqual(point, coordinates[0])
                        ? lastCoordinateIndex
                        : AStar.isPointEqual(point, coordinates[lastCoordinateIndex])
                            ? 0
                            : null;

                    if (index != null) {
                        const data = turn.to = {link: feature, index};
                        if (isTurnAllowed(turn)) {
                            result.push({point: coordinates[index], data});
                        }
                    }
                }
                return result;
            };

            let first = true;
            const getNeighbor = (node: Node): Node[] => {
                const fromLink = node.data.link;
                const neighbors: Node[] = [];

                // if (!node.parent) {
                if (first) {
                    first = false;
                    filterConnectedFeatures(fromLink, 0, neighbors);
                    filterConnectedFeatures(fromLink, fromLink.geometry.coordinates.length - 1, neighbors);
                    return neighbors;
                }

                filterConnectedFeatures(fromLink, node.data.index, neighbors);
                return neighbors;
            };

            // console.time('xyz-route');
            const path = AStar.findPath(
                fromNode,
                toNode,
                getNeighbor,
                weight ? (a, b) => {
                    return weight({
                        from: a.point,
                        to: b.point,
                        direction: b.data.index ? 'START_TO_END' : 'END_TO_START',
                        feature: b.data.link,
                        distance: geotools.distance(a.point, b.point)
                    });
                } : (a, b) => geotools.distance(a.point, b.point),
                (node: Node) => {
                    let id = node.data.link.id;
                    if (node.data.index > 0) {
                        id += ':R';
                    }
                    return id;
                },
                (node: Node, endNode: Node) => node.data.link == endNode.data.link
            ) as Node[];
            // console.timeEnd('xyz-route');
            resolve(path);
        });
    }
};
