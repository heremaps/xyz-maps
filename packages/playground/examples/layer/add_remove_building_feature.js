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
var buildingLayer = new TileLayer({
    min: 14,
    max: 19,
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
    zoomLevel: 17,
    center: {
        longitude: -122.160931, latitude: 37.434539
    },

    // add layers to display
    layers: [backgroundLayer, buildingLayer]
});
/** **/

var addedBuilding;

// click "Add Building"to add building, click "Remove Building" to remove the added building
document.querySelector('#buildingbutton').onclick = function() {
    if (!addedBuilding) {
        // Add point Feature
        addedBuilding = buildingLayer.addFeature(building);

        this.innerText = 'Remove Building';
    } else {
        // Remove the added building
        buildingLayer.removeFeature(addedBuilding);

        addedBuilding = null;

        this.innerText = 'Add Building';
    }
};

// building feature
var building = {
    geometry: {
        coordinates: [[[
            [-122.1621648, 37.4348761, 0],
            [-122.1613924, 37.4354213, 0],
            [-122.1610061, 37.4354086, 0],
            [-122.1598635, 37.4343905, 0],
            [-122.1598796, 37.4340796, 0],
            [-122.1606413, 37.4335301, 0],
            [-122.1610383, 37.4335428, 0],
            [-122.1621809, 37.4345694, 0],
            [-122.1621648, 37.4348761, 0]
        ]]],
        type: 'MultiPolygon'
    },
    type: 'Feature'
};
