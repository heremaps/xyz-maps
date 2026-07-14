import {MVTLayer, TileLayer, LocalProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor, Marker} from '@here/xyz-maps-editor';

/** setup the Map **/
let backgroundLayer = new MVTLayer({
    min: 1,
    max: 20,
    remote: {
        url: 'https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=' + YOUR_API_KEY
    }
});
const pointLayer = new TileLayer({
    min: 1,
    max: 20,
    provider: new LocalProvider({
        editable: true
    }),
    style: {
        styleGroups: {
            Point: [{
                zIndex: 1,
                type: 'Box',
                width: 20,
                fill: '#ffde22',
                stroke: '#fc4f30',
                strokeWidth: 2,
                altitude: true
            }, {
                zIndex: 1,
                // Use a VerticalLine for better visualization of the actual height of the geometry
                type: 'VerticalLine',
                stroke: '#fc4f30'
            }, {
                zIndex: 0,
                // Use a translucent black circle without altitude to act as the "shadow" on the ground plane
                type: 'Circle',
                radius: 3,
                fill: 'black',
                opacity: 0.6,
                alignment: 'map',
                altitude: false
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
    layers: [backgroundLayer, pointLayer]
});

// setup the editor
const editor = new Editor(display, {layers: [pointLayer]});


const createRandomPoints = (size, vp, maxHeight: number = 100) => {
    const getRandom = (min, max) => Math.random() * (max - min) + min;
    const points = [];
    while (size--) {
        points[size] = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [
                    getRandom(vp.minLon, vp.maxLon),
                    getRandom(vp.minLat, vp.maxLat),
                    Math.round(getRandom(0, maxHeight))
                ]
            }
        };
    }
    return points;
};

// create 50 Points with random height in the current viewport.
pointLayer.addFeature(createRandomPoints(50, display.getViewBounds()));
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
    const feature = <Marker>e.target;
    // check if we clicked a Marker feature
    if (feature && feature.class == 'MARKER') {
        if (keyPressed) {
            // The drag axis across which the LineShape is dragged upon user interaction.
            feature.behavior('dragAxis', 'Z');
        } else {
            // The normal of the plane over which the LineShape is dragged upon user interaction.
            feature.behavior('dragPlane', 'XY');
        }
    }
});
