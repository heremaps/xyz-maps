import {MVTLayer, TileLayer, SpaceProvider, GeoJSONCoordinate} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor, Marker} from '@here/xyz-maps-editor';

/** setup the Map **/
let backgroundLayer = new MVTLayer({
    min: 1, max: 20,
    remote: {
        url: 'https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=' + YOUR_API_KEY
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
    }),
    style: {
        styleGroups: {
            Point: [{
                type: 'Circle', zIndex: 0, radius: 20, fill: '#ff7220', stroke: '#ff1d00aa', strokeWidth: 5
            }, {
                type: 'Text', zIndex: 1, text: ['get', 'counter'], fill: 'black', stroke: 'white', strokeWidth: 5, font: '22px sans-serif'
            }]
        },
        assign() {
            return 'Point';
        }
    }
});

myLayer.addFeature({
    id: 'myFeature',
    type: 'Feature',
    geometry: {
        type: 'Point',
        coordinates: [-116.85755, 33.03607]
    },
    properties: {
        counter: 0
    }
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

document.querySelector<HTMLButtonElement>('#change').onclick = function() {
    // Batch multiple changes to create a single history step
    editor.batch(()=>{
        const myFeature =<Marker>myLayer.search({id: 'myFeature'});
        // First change: Increment the 'counter' property of the feature by
        myFeature.prop('counter', myFeature.prop('counter') + 1);
        // Second change: Adjust the feature's position slightly to the right
        const currentPosition = <GeoJSONCoordinate>myFeature.coord();
        myFeature.coord([currentPosition[0] + 0.0001, currentPosition[1]]);
    });
};

document.querySelector<HTMLButtonElement>('#undo').onclick = () => editor.undo();

document.querySelector<HTMLButtonElement>('#redo').onclick = () => editor.redo();


