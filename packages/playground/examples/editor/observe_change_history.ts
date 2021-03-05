import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';

/** setup the Map **/
let backgroundLayer = new MVTLayer({
    min: 1, max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});
let myLayer = new TileLayer({
    min: 14, max: 20,
    provider: new SpaceProvider({
        space: '6CkeaGLg',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        level: 14
    })
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {longitude: -116.85755, latitude: 33.03607},

    // add layers to display
    layers: [backgroundLayer, myLayer]
});

// setup the editor
const editor = new Editor(display);

// add the layer to the editor to enable editing of the layer
editor.addLayer(myLayer);
/** **/

// Observe the edit operation history for changes
editor.addObserver('history.current', function(name, currentStep, lastStep) {
    let historyInfo = {
        'Current Step': currentStep, // editor.get('history.current');
        'Total Steps': editor.get('history.length'),
        'Modified Features': editor.get('changes.length')
    };
    document.querySelector<HTMLDivElement>('#info').innerText = JSON.stringify(historyInfo, undefined, 4);
});

// add points to random position within the current screen
document.querySelector<HTMLButtonElement>('#add').onclick = function() {
    // convert from pixels on screen to a geographical coordinate.
    let geoJSONCoordinate = editor.toGeoJSONCoordinates({
        x: display.getWidth() * Math.random(),
        y: display.getHeight() * Math.random()
    });
    // add the point feature
    editor.addFeature({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: geoJSONCoordinate
        }
    });
};

document.querySelector<HTMLButtonElement>('#undo').onclick = () => editor.undo();

document.querySelector<HTMLButtonElement>('#redo').onclick = () => editor.redo();

document.querySelector<HTMLButtonElement>('#revert').onclick = () => editor.revert();

