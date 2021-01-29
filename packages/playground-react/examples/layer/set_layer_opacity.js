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
    }),
    style: {
        styleGroups: {
            lineStyle: [
                {zIndex: 0, type: 'Line', opacity: 1, strokeWidth: 10, stroke: '#50A62B'}
            ]
        },
        assign: function() {
            return 'lineStyle';
        }
    }
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


var slider = document.getElementById('slider');
var sliderValue = document.getElementById('slidervalue');
/** **/

// new layer style
var style = {
    styleGroups: {
        newStyle: [
            {zIndex: 0, type: 'Line', opacity: 1, strokeWidth: 10, stroke: '#50A62B'}
        ]
    },
    assign: function() {
        return 'newStyle';
    }
};


slider.addEventListener('input', function(e) {
    // customize style
    style.styleGroups.newStyle[0].opacity = e.target.value / 100;

    // set layer style
    navlinkLayer.setStyle(style);

    // refresh layer
    display.refresh(navlinkLayer);

    // Value indicator
    sliderValue.textContent = e.target.value + '%';
});
