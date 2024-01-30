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

import {BinaryHeap} from './BinaryHeap';
import {distance} from './geotools';

export type AStarNode = { point: number[], data?: any };

class Node implements AStarNode {
    point: number[];
    data?: any;
    // "real" cost to reach the node (start->node)
    g: number;
    // approximate cost to reach the goal node (node->goal)
    h: number;
    // total cost (g+h)
    f: number;
    parent: Node | null;

    id: number;

    constructor(point: number[], g: number, h: number, parent: Node | null = null) {
        this.point = point;
        this.g = g;
        this.h = h;
        this.f = g + h;
        this.parent = parent;
        this.id = AStar.pointKey(this);
    }
}

export class AStar {
    static precision = 1e5;

    static calculateDistance(point1: number[], point2: number[]): number {
        // const dx = point2[0] - point1[0];
        // const dy = point2[1] - point1[1];
        // return Math.sqrt(dx * dx + dy * dy);
        return distance(point1, point2);
    }

    private static weight(nodeA: AStarNode, nodeB: AStarNode): number {
        return AStar.calculateDistance(nodeA.point, nodeB.point);
    }

    static isPointEqual(point1: number[], point2: number[]): boolean {
        const precision = AStar.precision;
        return (point1[0] * precision ^ 0) === (point2[0] * precision ^ 0) && (point1[1] * precision ^ 0) === (point2[1] * precision ^ 0);
        // return point1[0] === point2[0] && point1[1] === point2[1];
    }

    static pointKey(node: AStarNode): number {
        const precision = AStar.precision;
        const point = node.point;
        return (point[0] * precision ^ 0) * 1e7 + (point[1] * precision ^ 0);
    }

    private static reconstructPath(current: Node) {
        const path: AStarNode[] = [];
        while (current !== null) {
            path.unshift(current);
            current = current.parent;
        }
        return path;
    }

    public static findPath(
        from: AStarNode,
        endNode: AStarNode,
        getNeighbors: (node: AStarNode) => AStarNode[],
        weight: (nodeA: AStarNode, nodeB: AStarNode) => number = AStar.weight
    ): AStarNode[] | null {
        const openList = new BinaryHeap<Node>((a, b) => a.f - b.f);
        const closedList = new Map<string | number, boolean>();
        // const startNode = new NavNode(start, 0, AStar.calculateDistance(start, endNode.point));
        const startNode = new Node(from.point, 0, Infinity);

        startNode.data = from.data;

        openList.push(startNode);

        const endNodeId = this.pointKey(endNode);

        while (openList.size() > 0) {
            const currentNode = openList.pop()!;

            if (currentNode.id === endNodeId) {
                // if (AStar.isPointEqual(currentNode.point, endNode.point)) {
                return this.reconstructPath(currentNode);
            }

            closedList.set(currentNode.id, true);

            for (const neighborNode of getNeighbors(currentNode)) {
                const {point, data} = neighborNode;
                const neighborKey = this.pointKey(neighborNode);

                if (closedList.has(neighborKey)) {
                    continue;
                }

                const g = currentNode.g + weight(currentNode, neighborNode);
                const h = weight(neighborNode, endNode);
                // const existingNodeIndex = openList.findIndex((node) => AStar.isPointEqual(node.point, point));
                const existingNodeIndex = openList.findIndex((node) => node.id == neighborKey);

                if (existingNodeIndex != -1) {
                    const existingNode = openList.get(existingNodeIndex);
                    if (g < existingNode.g) {
                        existingNode.g = g;
                        existingNode.h = h;
                        existingNode.f = g + h;
                        existingNode.parent = currentNode;
                        existingNode.data = data;
                        openList.adjustElement(existingNodeIndex);
                    }
                } else {
                    const newNode = new Node(point, g, h, currentNode);
                    newNode.data = data;
                    openList.push(newNode);
                }
            }
        }
        // no path found
        return null;
    }
}
