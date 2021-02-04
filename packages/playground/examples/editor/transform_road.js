import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';

/** setup the Map **/
var bgLayer = new MVTLayer({
    name: 'background layer',
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});
var navlinkLayer = new TileLayer({
    name: 'Navlink Layer',
    min: 14,
    max: 20,
    // Customized provider to provide navlinks
    provider: new SpaceProvider({
        id: 'navlinkProvider',
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        level: 14
    })
});

// setup the Map Display
var display = new Map(document.getElementById('map'), {
    zoomLevel: 18,
    center: {
        longitude: -122.287607, latitude: 37.819121
    },

    // add layers to display
    layers: [bgLayer, navlinkLayer]
});

// setup the editor
var editor = new Editor(display);

// add navlink layer to editor, make layers editable
editor.addLayer(navlinkLayer);
/** **/

editor.addEventListener('pointerup', function(e) {
    // get the clicked feature
    var feature = e.target;
    // start the transform tool if it's "LINE" feature
    if (feature && feature.class == 'LINE') {
        feature.transform();
    }
});

var revertbutton = document.querySelector('#revert');

revertbutton.onclick = function() {
    // revert all changes
    editor.revert();
};
