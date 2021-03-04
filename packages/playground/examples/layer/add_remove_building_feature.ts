import {MVTLayer, TileLayer, LocalProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
let backgroundLayer = new MVTLayer({
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});
let buildingLayer = new TileLayer({
    min: 14,
    max: 20,
    provider: new LocalProvider({
        name: 'my Provider'
    }),
    style: {
        styleGroups: {
            style: [
                {zIndex: 0, type: 'Polygon', fill: '#99CEFF', strokeWidth: 1, stroke: '#FFFFFF', opacity: 0.7}
            ]
        },
        assign: function(feature) {
            return 'style';
        }
    }
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -122.160931, latitude: 37.434539
    },

    // add layers to display
    layers: [backgroundLayer, buildingLayer]
});
/** **/

let addedPolygon;

// click the button to add/remove a polygon to the TileLayer
const button = <HTMLButtonElement>document.querySelector('#buildingbutton');
button.onclick = function() {
    if (!addedPolygon) {
        // add the polygon to the layer
        addedPolygon = buildingLayer.addFeature({
            geometry: {
                coordinates: [[[
                    [-122.1621648, 37.4348761],
                    [-122.1613924, 37.4354213],
                    [-122.1610061, 37.4354086],
                    [-122.1598635, 37.4343905],
                    [-122.1598796, 37.4340796],
                    [-122.1606413, 37.4335301],
                    [-122.1610383, 37.4335428],
                    [-122.1621809, 37.4345694],
                    [-122.1621648, 37.4348761]
                ]]],
                type: 'MultiPolygon'
            },
            type: 'Feature'
        });

        button.innerText = 'Remove Building';
    } else {
        // Remove the polygon from the TileLayer
        buildingLayer.removeFeature(addedPolygon);

        addedPolygon = null;

        button.innerText = 'Add Building';
    }
};


