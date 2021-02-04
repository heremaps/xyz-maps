import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

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
    name: 'myLayer',
    min: 14,
    max: 20,
    provider: new SpaceProvider({
        name: 'SpaceProvider',
        level: 14,
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        }
    })
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomLevel: 16,
    center: {
        longitude: -122.285482, latitude: 37.819649
    },

    // add layers to display
    layers: [bgLayer, navlinkLayer]
});
/** **/

var swatches = document.querySelector('#swatches');
var colors = ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494', '#fed976', '#feb24c', '#fd8d3c', '#f03b20', '#bd0026'];

// new layer style
var style = {
    styleGroups: {
        newStyle: [
            {zIndex: 0, type: 'Line', opacity: 0.7, strokeWidth: 8, stroke: '#FFFFFF'}
        ]
    },
    assign: function() {
        return 'newStyle';
    }
};

colors.forEach(function(color) {
    // create color swatches
    var swatch = document.createElement('button');
    swatch.style.backgroundColor = color;

    swatch.addEventListener('click', function() {
        // customize style
        style.styleGroups.newStyle[0].stroke = color;

        // set layer style
        navlinkLayer.setStyle(style);

        // refresh layer
        display.refresh(navlinkLayer);
    });
    swatches.appendChild(swatch);
});
