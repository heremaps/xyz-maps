import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor, LineShape} from '@here/xyz-maps-editor';

/** setup the Map **/
let backgroundLayer = new MVTLayer({
    min: 1,
    max: 20,
    remote: {
        url: 'https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=' + YOUR_API_KEY
    }
});
let lineLayer = new TileLayer({
    min: 14,
    max: 20,
    provider: new SpaceProvider({
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        level: 14
    }),
    style: {
        styleGroups: {
            LineString: [{
                zIndex: 0, type: 'Line', strokeWidth: 14, stroke: '#660808', altitude: true
            }, {
                zIndex: 1, type: 'Line', strokeWidth: 10, stroke: '#ef683e', altitude: true
            }]
        },
        assign: (feature, zoom) => feature.geometry.type
    }
});

// setup the Map Display
var display = new Map(document.getElementById('map'), {
    zoomlevel: 18,
    center: {
        longitude: -122.287607, latitude: 37.819121
    },
    behavior: {
        // allow map pitch by user interaction (mouse/touch)
        pitch: true,
        // allow map rotation by user interaction (mouse/touch)
        rotate: true
    },
    // set initial map pitch in degrees
    pitch: 50,
    // set initial map rotation in degrees
    rotate: 30,
    // add layers to display
    layers: [backgroundLayer, lineLayer]
});

// setup the editor
const editor = new Editor(display, {layers: [lineLayer]});
/** **/


let keyPressed = false;

document.addEventListener('keydown', (e) => {
    if (e.code.startsWith('Shift')) {
        keyPressed = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code.startsWith('Shift')) {
        keyPressed = false;
    }
});


editor.addEventListener('pointerdown', (e) => {
    // get the clicked feature
    const feature = <LineShape>e.target;
    // check if we clicked a Line feature
    if (feature && feature.class == 'LINE_SHAPE') {
        if (keyPressed) {
            // The drag axis across which the LineShape is dragged upon user interaction.
            feature.behavior('dragAxis', 'Z');
        } else {
            // The normal of the plane over which the LineShape is dragged upon user interaction.
            feature.behavior('dragPlane', 'XY');
        }
    }
});
