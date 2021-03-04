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
var pointLayer = new TileLayer({
    min: 4,
    max: 15,
    provider: new LocalProvider({}),
    style: {
        styleGroups: {
            style: [
                {zIndex: 0, type: 'Circle', stroke: '#FFFFFF', fill: '#6B6B6B', radius: 3},
                {
                    zIndex: 2,
                    type: 'Text',
                    fill: '#fa8548',
                    stroke: '#260704',
                    strokeWidth: 6,
                    font: '18px sans-serif',
                    textRef: 'properties.name'
                }
            ]
        },
        assign: function(feature) {
            return 'style';
        }
    }
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 6,
    center: {
        longitude: 9.610305, latitude: 51.067713
    },

    // add layers to display
    layers: [backgroundLayer, pointLayer]
});
/** **/

let addedPoints;

// click button to add/remove points to the TileLayer
const button = <HTMLButtonElement>document.querySelector('#pointbutton');
button.onclick = function() {
    if (!addedPoints) {
        // add the point features if they have not been added already
        addedPoints = pointLayer.addFeature(pointData);

        button.innerText = 'Remove Points';
    } else {
        // Remove the point features
        pointLayer.removeFeature(addedPoints);

        addedPoints = null;
        button.innerText = 'Add Points';
    }
};

// the points that should be added to the layer
let pointData = {
    'features': [{
        geometry: {
            coordinates: [13.404954, 52.520008],
            type: 'Point'
        },
        properties: {
            name: 'Berlin'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [11.576124, 48.137154],
            type: 'Point'
        },
        properties: {
            name: 'Munich'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [8.806422, 53.073635],
            type: 'Point'
        },
        properties: {
            name: 'Bremen'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [11.061859, 49.460983],
            type: 'Point'
        },
        properties: {
            name: 'Nuremberg'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [9.993682, 53.551086],
            type: 'Point'
        },
        properties: {
            name: 'Hamburg'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [7.589907, 50.360023],
            type: 'Point'
        },
        properties: {
            name: 'Koblenz'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [9.735603, 52.373920],
            type: 'Point'
        },
        properties: {
            name: 'Hanover'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [8.682127, 50.110924],
            type: 'Point'
        },
        properties: {
            name: 'Frankfurt'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [13.737262, 51.050407],
            type: 'Point'
        },
        properties: {
            name: 'Dresden'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [6.953101, 50.935173],
            type: 'Point'
        },
        properties: {
            name: 'Cologne'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [8.672434, 49.398750],
            type: 'Point'
        },
        properties: {
            name: 'Heidelberg'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [7.468429, 51.514244],
            type: 'Point'
        },
        properties: {
            name: 'Dortmund'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [8.403653, 49.006889],
            type: 'Point'
        },
        properties: {
            name: 'Karlsruhe'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [9.177023, 48.782321],
            type: 'Point'
        },
        properties: {
            name: 'Stuttgart'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [12.387772, 51.343479],
            type: 'Point'
        },
        properties: {
            name: 'Leipzig'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [9.680845, 50.555809],
            type: 'Point'
        },
        properties: {
            name: 'Fulda'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [12.101624, 49.013432],
            type: 'Point'
        },
        properties: {
            name: 'Regensburg'
        },
        type: 'Feature'
    }, {
        geometry: {
            coordinates: [11.323544, 50.979492],
            type: 'Point'
        },
        properties: {
            name: 'Weimar'
        },
        type: 'Feature'
    }],
    'type': 'FeatureCollection'
};
