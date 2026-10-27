import {ImageProvider, LocalProvider, TerrainTileLayer, TileLayer} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {AreaShape, Editor, LineShape} from '@here/xyz-maps-editor';

const terrainLayer = new TerrainTileLayer({
    min: 2,
    max: 20,
    tileSize: 512,
    maxDataZoom: 15,
    elevation: {
        url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
        attribution: {
            label: 'AWS Terrain',
            url: 'https://github.com/tilezen/joerd/blob/master/docs/attribution.md'
        },
        encoding: 'terrarium',
        min: 8
    }
});
// Imagery and elevation are independent layers.
const imageryLayer = new TileLayer({
    min: 1,
    max: 20,
    tileSize: 512,
    provider: new ImageProvider({
        url: `https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/jpeg?apikey=${YOUR_API_KEY}&style=satellite.day&size=512`,
        attribution: '2025 HERE, Maxar'
    })
});
const terrainIcon = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 64'>
    <path d='M6 57c2-8 7-14 13-19 5-4 6-11 11-14 6-4 11 2 13 11v22Z'
        fill='#ffffff'/>
    <path d='M9 54c3-7 7-11 12-15 4-4 6-9 10-11 4-2 8 2 9 10v16Z'
        fill='#152432'/>
    <path d='M13 49c4-4 8-6 11-10 3-4 5-7 8-8 3-1 6 1 8 4'
        fill='none' stroke='#ffffff' stroke-width='2.2' stroke-linecap='round'/>
    <path d='M17 53c3-4 7-5 10-8 3-4 5-6 8-6'
        fill='none' stroke='#ffffff' stroke-width='2.2' stroke-linecap='round'/>
</svg>
`)}`;
const editableLayer = new TileLayer({
    min: 1,
    max: 20,
    provider: new LocalProvider({editable: true}),
    style: {
        styleGroups: {
            LineString: [{
                zIndex: 2, type: 'Line', stroke: '#ffdf00', strokeWidth: 6, altitude: 'terrain'
            }],
            Area: [{
                zIndex: 1, type: 'Polygon', fill: '#FFB400', opacity: 0.2,
                stroke: '#ffc107', strokeWidth: 3, altitude: 'terrain'
            }],
            Point: [
                {
                    zIndex: 3, type: 'Image', src: terrainIcon, width: 42, height: 56,
                    altitude: 'terrain', offsetZ: 42, offsetY: -14
                },
                {
                    zIndex: 4, type: 'Text', textRef: 'properties.name', font: 'bold 12px sans-serif',
                    fill: '#ffffff', stroke: '#000000', strokeWidth: 3, altitude: 'terrain', offsetZ: 28
                }, {
                    zIndex: 1, type: 'VerticalLine', stroke: '#000000', altitude: 'terrain', offsetZ: 48
                }, {
                    zIndex: 2, type: 'Sphere', fill: '#f00', altitude: 'terrain', radius: 6
                }]
        },
        assign: ({geometry}) => geometry.type.includes('Polygon') ? 'Area' : geometry.type
    }
});
const display = new Map(document.getElementById('map'), {
    center: {longitude: 12.366389, latitude: 47.421238},
    zoomlevel: 15,
    pitch: 55,
    maxPitch: 85,
    rotate: 25,
    singleWorldView: true,
    behavior: {pitch: true, rotate: true},
    layers: [terrainLayer, imageryLayer, editableLayer]
});
const editor = new Editor(display, {layers: [editableLayer]});
// Illustrative features near the Hahnenkamm, not an actual hiking route.
// Explicit altitude: 'terrain' also makes editor handles and dragging follow the terrain.
editor.addFeature([{
    type: 'Feature',
    properties: {},
    geometry: {
        type: 'LineString',
        coordinates: [
            [12.365718, 47.423392], [12.366132, 47.423532], [12.366572, 47.423562], [12.36726, 47.423443],
            [12.367985, 47.423482], [12.368294, 47.423562], [12.368323, 47.423793], [12.368356, 47.423911],
            [12.368574, 47.423984], [12.368839, 47.423957], [12.369158, 47.423902], [12.369294, 47.423992],
            [12.369096, 47.424113], [12.369046, 47.424272], [12.369215, 47.424438], [12.369507, 47.424681],
            [12.369775, 47.42482], [12.370103, 47.424683], [12.370428, 47.424486], [12.370556, 47.424194],
            [12.370524, 47.423823], [12.370535, 47.422528], [12.370333, 47.422029], [12.370031, 47.421587],
            [12.369457, 47.421113], [12.368764, 47.420795], [12.368234, 47.420585], [12.367779, 47.420241],
            [12.367318, 47.419843], [12.366597, 47.419392], [12.366597, 47.419192], [12.367752, 47.418224],
            [12.368088, 47.41791], [12.368354, 47.417534], [12.368291, 47.41701], [12.368336, 47.416925],
            [12.368498, 47.416948], [12.368723, 47.417175], [12.368872, 47.41744], [12.369045, 47.418332],
            [12.36919, 47.418371], [12.369223, 47.418154], [12.369494, 47.416614], [12.369274, 47.416092],
            [12.368783, 47.415467], [12.367632, 47.41437], [12.367358, 47.413787]
        ]
    }
}, {
    type: 'Feature',
    properties: {},
    geometry: {
        type: 'Polygon',
        coordinates: [[
            [12.363621, 47.423452], [12.363893, 47.424761], [12.365381, 47.425105], [12.367008, 47.424092], [12.36551, 47.42278], [12.363621, 47.423452]
        ]]
    }
}, {
    type: 'Feature',
    properties: {name: 'Hahnenkamm 1712m'},
    geometry: {type: 'Point', coordinates: [12.36490, 47.42384]}
}], editableLayer);
const drawingBoard = editor.getDrawingBoard();
const drawButton = document.getElementById('draw') as HTMLInputElement;
const drawAreaButton = document.getElementById('draw-area') as HTMLInputElement;
const cancelButton = document.getElementById('cancel') as HTMLInputElement;
const info = document.getElementById('info');
const editHint = 'Select a path, area or marker, then drag its handles to edit on terrain.';
const setDrawing = (active: boolean, mode?: string) => {
    drawButton.disabled = active;
    drawAreaButton.disabled = active;
    cancelButton.disabled = !active;
    info.innerText = active
        ? `Click the terrain to add ${mode === 'Area' ? 'area points' : 'path points'}, `
        + 'double-click the last point to finish.'
        : editHint;
};
const startDrawing = (mode) => {
    drawingBoard.start({mode});
    setDrawing(true, mode);
};
drawButton.onclick = () => startDrawing('Line');
drawAreaButton.onclick = () => startDrawing('Area');
// A double-click on the last drawing point creates the path, like the other
// DrawingBoard examples.
editor.addEventListener('pointerup', (event) => {
    if (!drawingBoard.isActive() || event.button !== 0) {
        return;
    }
    const lineShape = event.target;
    const areaShape = event.target;
    const isLine = (lineShape === null || lineShape === void 0 ? void 0 : lineShape.class) === 'LINE_SHAPE';
    const isArea = (areaShape === null || areaShape === void 0 ? void 0 : areaShape.class) === 'AREA_SHAPE';
    const shape = isArea ? areaShape : lineShape;
    const length = drawingBoard.getLength();
    if ((isLine || isArea)
        && length >= (isArea ? 3 : 2)
        && (shape as LineShape | AreaShape).getIndex() === length - 1) {
        const feature = drawingBoard.create();
        if (feature) {
            setDrawing(false);
            feature.select();
        }
    }
});
cancelButton.onclick = () => {
    drawingBoard.cancel();
    setDrawing(false);
};

setDrawing(false);
