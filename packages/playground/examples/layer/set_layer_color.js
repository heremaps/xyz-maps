import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
let backgroundLayer = new MVTLayer({
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});


// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 16,
    center: {
        longitude: -122.285482, latitude: 37.819649
    },

    // add layers to display
    layers: [backgroundLayer]
});
/** **/

let lineLayer = new TileLayer({
    min: 14,
    max: 20,
    provider: new SpaceProvider({
        level: 14,
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        }
    }),
    // by default all features of a TileLayer will be displayed with the assign style of the layer.style
    style: {
        styleGroups: {
            lineStyle: [
                {zIndex: 0, type: 'Line', opacity: 0.7, strokeWidth: 8, stroke: '#bd0026'}
            ]
        },
        assign: function() {
            return 'lineStyle';
        }
    }
});

const colors = ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494', '#fed976', '#feb24c', '#fd8d3c', '#f03b20', '#bd0026'];

colors.forEach(function(color) {
    // create color swatches
    var swatch = document.createElement('button');
    swatch.style.backgroundColor = color;

    // update set the new layer style on click
    swatch.addEventListener('click', () => {
        let style = lineLayer.getStyle();

        // update the style
        style.styleGroups.lineStyle[0].stroke = color;

        // set layer style
        lineLayer.setStyle(style);

        // refresh the layer
        display.refresh(lineLayer);
    });

    document.querySelector('#swatches').appendChild(swatch);
});


// add the layer to the display
display.addLayer(lineLayer);
