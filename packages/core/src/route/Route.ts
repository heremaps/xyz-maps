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
import {AStar, AStarNode} from '@here/xyz-maps-common';
import {Feature, FeatureProvider, GeoJSONCoordinate} from '@here/xyz-maps-core';

type NodeData = { link: Feature, index: number };

type Node = AStarNode & { data: NodeData };

type Weight = (options: { feature: Feature; distance: number; from: number[]; to: number[]; direction: 'START_TO_END' | 'END_TO_START' }) => number;

// const defaultCoordinatesFilter = (feature: Feature<'LineString'>) => {
//     return [0, feature.geometry.coordinates.length - 1];
// };

export class PathFinder {
    static async findPath(
        provider: FeatureProvider,
        fromNode: Node,
        toNode: Node,
        isTurnAllowed: (turn: { from: NodeData, to: NodeData }) => boolean,
        weight?: Weight
        // filterCoordinates: ((feature: Feature) => number[]) | undefined = defaultCoordinatesFilter
    ): Promise<Node[]> {
        return new Promise((resolve, reject) => {
            // console.time('route');
            const getNeighbor = (node: Node): Node[] => {
                const point = node.point;
                const fromLink = node.data.link;
                const turn = {from: node.data, to: {link: null, index: null}};
                const neighbors: { point: number[], data: { link: Feature, index: number } }[] = [];
                const geoJSONFeatures = <Feature[]>provider.search({point: {longitude: point[0], latitude: point[1]}, radius: .5});
                for (const feature of geoJSONFeatures) {
                    if (feature.geometry.type != 'LineString' /* || feature.id == fromLink.id*/) continue;
                    const coordinates = <number[][]>feature.geometry.coordinates;
                    const firstCoordinateIndex = 0;
                    const lastCoordinateIndex = coordinates.length - 1;
                    const index = AStar.isPointEqual(point, coordinates[firstCoordinateIndex])
                        ? lastCoordinateIndex
                        : AStar.isPointEqual(point, coordinates[lastCoordinateIndex])
                            ? firstCoordinateIndex
                            : null;

                    if (index != null) {
                        const data = turn.to = {link: feature, index};

                        if (fromLink == feature || isTurnAllowed(turn)) {
                            neighbors.push({point: coordinates[index], data});
                        }
                    }
                }
                return neighbors;
            };

            const path = AStar.findPath(fromNode, toNode, getNeighbor, weight && ((a, b) => {
                return weight({
                    from: a.point,
                    to: b.point,
                    direction: b.data.index ? 'START_TO_END' : 'END_TO_START',
                    feature: b.data.link,
                    distance: AStar.calculateDistance(a.point, b.point)
                });
            })) as Node[];
            // console.timeEnd('route');
            resolve(path);
        });
    }
};
