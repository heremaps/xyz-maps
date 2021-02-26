import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';

// create a TileLayer using a SpaceProvider that's providing the map-data we want to edit.
const lineLayer = new TileLayer({
    min: 14,
    max: 20,
    provider: new SpaceProvider({
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        level: 15
    })
});

// setup the map display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        latitude: 37.796902,
        longitude: -122.217104
    },
    layers: [
        new MVTLayer({
            name: 'background-layer',
            min: 1,
            max: 20,
            remote: {
                url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
            }
        }),
        // add the TileLayer to the display
        lineLayer
    ]
});

// setup the editor
const editor = new Editor(display);

// To enable editing for the layer, we just need to add it to the editor.
editor.addLayer(lineLayer);
