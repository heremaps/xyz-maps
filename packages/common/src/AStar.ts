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

export type AStarNode = { readonly id?: string|number; point: number[], data?: any };

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

    id: number | string;

    constructor(point: number[], g: number, h: number, parent: Node | null = null, data: any) {
        this.point = point;
        this.g = g;
        this.h = h;
        this.f = g + h;
        this.parent = parent;
        this.data = data;
    }
}

export class AStar {
    static precision = 1e5;

    static calculateDistance(point1: number[], point2: number[]): number {
        const dx = point2[0] - point1[0];
        const dy = point2[1] - point1[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    private static weight(nodeA: AStarNode, nodeB: AStarNode): number {
        return AStar.calculateDistance(nodeA.point, nodeB.point);
    }

    static isPointEqual(point1: number[], point2: number[]): boolean {
        const precision = AStar.precision;
        return (point1[0] * precision ^ 0) === (point2[0] * precision ^ 0) && (point1[1] * precision ^ 0) === (point2[1] * precision ^ 0);
        // return point1[0] === point2[0] && point1[1] === point2[1];
    }

    static pointKey(node: AStarNode): number | string {
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
        end: AStarNode,
        getNeighbors: (node: AStarNode) => AStarNode[],
        weight: (nodeA: AStarNode, nodeB: AStarNode) => number = AStar.weight,
        pointKey: (node: AStarNode) => (string | number) = AStar.pointKey,
        isEndNode: (node: AStarNode, endNode: AStarNode) => boolean = (node, endNode) => node.id === endNode.id
    ): AStarNode[] | null {
        const createNode = (point: number[], g: number, h: number, parent: Node | null = null, data?: any) => {
            const node = new Node(point, g, h, parent, data);
            node.id = pointKey(node);
            return node;
        };
        const openList = new BinaryHeap<Node>((a, b) => a.f - b.f);
        const closedList = new Map<string | number, boolean>();

        const endNode = createNode(end.point, 0, Infinity, null, end.data);
        const endNodeId = endNode.id;

        openList.push(createNode(from.point, 0, Infinity, null, from.data));

        while (openList.size() > 0) {
            const currentNode = openList.pop()!;

            if (isEndNode(currentNode, endNode)) {
                // if (currentNode.data.link == endNode.data.link) {
                // if (currentNode.id === endNodeId) {
                return this.reconstructPath(currentNode);
            }

            closedList.set(currentNode.id, true);

            const neighbors = getNeighbors(currentNode);

            for (const neighborNode of neighbors) {
                const {point, data} = neighborNode;
                const neighborKey = pointKey(neighborNode);

                if (closedList.has(neighborKey)) {
                    continue;
                }
                const g = currentNode.g + weight(currentNode, neighborNode);
                const h = weight(neighborNode, endNode); // heuristic
                // const h = 0; // heuristic

                const existingNodeIndex = openList.findIndex((node) => AStar.isPointEqual(node.point, point));
                // const existingNodeIndex = openList.findIndex((node) => node.id == neighborKey);

                if (existingNodeIndex != -1) {
                    const existingNode = openList.get(existingNodeIndex);
                    if (g >= existingNode.g) {
                        continue;
                    }
                    existingNode.g = g;
                    existingNode.h = h;
                    existingNode.f = g + h;
                    existingNode.parent = currentNode;
                    existingNode.data = data;
                    openList.adjustElement(existingNodeIndex);
                } else {
                    const newNode = createNode(point, g, h, currentNode, data);
                    openList.push(newNode);
                }
            }
        }
        // no path found
        return null;
    }
}
