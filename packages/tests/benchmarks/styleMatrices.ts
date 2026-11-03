import type {ModelStyle, HeatmapStyle} from '@here/xyz-maps-core';
import type {Style} from '../../display/src/displays/styleTools';

export interface FixtureStyle extends Style {
    depthTest?: boolean;
    strokeDashimage?: string;
    model?: ModelStyle['model'];
    modelId?: number;
    weight?: HeatmapStyle['weight'];
    intensity?: HeatmapStyle['intensity'];
    pointerEvents?: boolean;
    alphaMode?: ModelStyle['alphaMode'];
    alphaCutoff?: ModelStyle['alphaCutoff'];
    showWireframe?: ModelStyle['showWireframe'];
    showBBox?: ModelStyle['showBBox'];
    scale?: ModelStyle['scale'];
    rotate?: ModelStyle['rotate'];
    translate?: ModelStyle['translate'];
}

type Matrix = {
    family: string;
    base?: Partial<FixtureStyle>;
    variants: Partial<FixtureStyle>[];
    batches: number;
    extraDrawGroups?: number;
};

export const STYLE_MATRICES = {
    'rectangle-style-matrix': {family: 'rectangles', batches: 12, variants: [
        {}, {width: ['literal', '6m']}, {height: ['literal', '3m']}, {rotation: 70}, {fill: '#00ff00'}, {stroke: '#0000ff'},
        {strokeWidth: 2}, {opacity: 0.65}, {alignment: 'viewport'}, {offsetX: '3px'},
        {depthTest: false}, {pointerEvents: false}
    ]},
    'line-style-matrix': {family: 'lines', batches: 11, variants: [
        {}, {stroke: '#0000ff'}, {strokeWidth: 5}, {strokeWidth: '3m'}, {strokeLinecap: 'butt'},
        {strokeLinejoin: 'bevel'}, {strokeDasharray: [4, 2]}, {offset: '1m'}, {opacity: 0.65},
        {altitude: true}, {scaleByAltitude: true}, {pointerEvents: false}
    ]},
    'polygon-style-matrix': {family: 'polygons', batches: 7,
        base: {specular: '#303030', shininess: 8, emissive: '#010203'}, variants: [
            {}, {fill: '#00ff00'}, {opacity: 0.65}, {fillIntensity: 0.5},
            {specular: '#cccccc'}, {shininess: 16}, {emissive: '#112233'}
        ]},
    'extrude-style-matrix': {family: 'extrudes', batches: 9, variants: [
        {}, {extrude: 30}, {extrudeBase: 10}, {fill: '#00ff00'}, {stroke: '#00ff00'}, {strokeWidth: 3},
        {opacity: 0.7}, {fillIntensity: 0.5}, {specular: '#dddddd'}, {shininess: 16}, {emissive: '#343434'}
    ]},
    'text-style-matrix': {family: 'text', batches: 10, variants: [
        {}, {font: '14px monospace'}, {fill: '#00ff00'}, {stroke: '#0000ff'}, {strokeWidth: 2},
        {opacity: 0.7}, {alignment: 'viewport'}, {offsetX: '3m'}, {offsetZ: '2m'},
        {text: 'XYZ'}, {rotation: 30}, {pointerEvents: false}
    ]},
    'icon-style-matrix': {family: 'icons', batches: 5, variants: [
        {}, {width: 9}, {height: 8}, {rotation: 30}, {opacity: 0.7}, {alignment: 'map'},
        {offsetX: 3}, {depthTest: false}, {pointerEvents: false}
    ]},
    'box-style-matrix': {family: 'boxes', batches: 9, variants: [
        {}, {width: 9}, {height: 8}, {depth: 6}, {rotation: 30}, {fill: '#00ff00'}, {opacity: 0.7},
        {fillIntensity: 0.5}, {specular: '#dddddd'}, {shininess: 16}, {emissive: '#343434'}, {pointerEvents: false}
    ]},
    'sphere-style-matrix': {family: 'spheres', batches: 10, variants: [
        {}, {radius: '6m'}, {radius: 5, scaleByAltitude: true}, {fill: '#00ff00'}, {opacity: 0.7},
        {fillIntensity: 0.5}, {specular: '#dddddd'}, {shininess: 16}, {emissive: '#343434'}, {pointerEvents: false}
    ]},
    'vertical-line-style-matrix': {family: 'vertical-lines', batches: 5, variants: [
        {}, {stroke: '#0000ff'}, {strokeWidth: 3}, {offsetZ: '3m'}, {opacity: 0.7}
    ]},
    'heatmap-style-matrix': {family: 'heatmap', batches: 6, variants: [
        {}, {radius: 20}, {intensity: 0.9}, {opacity: 0.7},
        {fill: {type: 'LinearGradient', stops: {0: '#000000', 1: '#0000ff'}}},
        {pointerEvents: false}, {weight: 3}
    ]},
    'model-style-matrix': {family: 'model', batches: 12, extraDrawGroups: 3,
        base: {modelId: 1, altitude: true, depthTest: true, specular: '#303030', shininess: 8}, variants: [
            {}, {alphaMode: 'blend'}, {alphaMode: 'mask'}, {alphaCutoff: 0.25}, {showWireframe: true},
            {showBBox: true}, {specular: '#cccccc'}, {shininess: 16}, {emissive: '#112233'},
            {offsetX: 2}, {depthTest: false}, {pointerEvents: false},
            {scale: [2, 1, 1]}, {rotate: [0, 0.2, 0]}, {translate: [1, 2, 3]}, {modelId: 2}
        ]},
    'terrain-style-matrix': {family: 'terrain', batches: 7,
        base: {modelId: 1}, variants: [
            {}, {specular: '#cccccc'}, {shininess: 32}, {emissive: '#112233'}, {showWireframe: true},
            {pointerEvents: false}, {alphaMode: 'mask'}, {alphaMode: 'blend'}
        ], extraDrawGroups: 2}
} satisfies Record<string, Matrix>;

export type StyleMatrixScenario = keyof typeof STYLE_MATRICES;

export function isStyleMatrixScenario(kind: string): kind is StyleMatrixScenario {
    return Object.prototype.hasOwnProperty.call(STYLE_MATRICES, kind);
}

export function getStyleMatrix(kind: string): Matrix | undefined {
    return isStyleMatrixScenario(kind) ? STYLE_MATRICES[kind] : undefined;
}
