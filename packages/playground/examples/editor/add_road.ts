import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor, LineShape} from '@here/xyz-maps-editor';

/** setup the Map **/
let backgroundLayer = new MVTLayer({
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
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
    })
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        latitude: 37.76620, longitude: -122.159958
    },

    // add layers to display
    layers: [backgroundLayer, lineLayer]
});

// setup the editor
const editor = new Editor(display, {layers: [lineLayer]});

/** **/

/**
 * add a new navlink by clicking on map, double click to finish drawing
 */
let infoTag = <HTMLElement>document.querySelector('#info');
let createButton = <HTMLElement>document.querySelector('#newroad');

// get the drawing board util of the editor
let drawingBoard = editor.getDrawingBoard();

// start the "drawing mode" on button click
createButton.onclick = function() {
    drawingBoard.start({
        mode: 'Line' // we want to draw a "Line" Feature.
    });
    // hide this button
    createButton.style.display = 'none';
    infoTag.innerText = 'Click map to add shape points, double click to finish drawing';
};

// listen the editor for pointerup events so we can recognize when the last drawn shape is clicked
// to automatically create a new line feature with the drawn geometry
editor.addEventListener('pointerup', function(event) {
    // make sure its a left click
    if (drawingBoard.isActive() && event.button == 0) {
        let feature = <LineShape>event.target;

        if (feature.class == 'LINE_SHAPE') {
            // get the number of shape points
            let length = feature.getLength();

            // create the line if last shape is clicked
            if (length > 1 && feature.getIndex() == length - 1) {
                // create the line
                let line = drawingBoard.create({properties: {optional: 'just drawn'}});
            }
            createButton.style.display = 'block';
            infoTag.innerText = 'Click Start button to draw new road';
        }
    }
});
