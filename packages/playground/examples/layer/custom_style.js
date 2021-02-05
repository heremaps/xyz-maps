import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
/** setup the Map **/
// configure layers
var layers = [
    new MVTLayer({
        min: 1,
        max: 20,
        remote: {
            url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
        }
    })
];
// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomLevel: 17,
    center: {
        longitude: -122.247131, latitude: 37.810442
    },

    // add layers to display
    layers: layers
});
/** **/

// Create data layer
var myLayer = new TileLayer({
    min: 14,
    max: 20,
    provider: new SpaceProvider({
        level: 14,
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        }
    }),

    // Customize layer style
    style: {
        styleGroups: {
            // Define new style for navlinks
            default: [
                {'zIndex': 0, 'type': 'Line', 'stroke': '#E5B50B', 'strokeWidth': 18, 'strokeLinecap': 'butt'},
                {
                    'zIndex': 1,
                    'type': 'Line',
                    'stroke': '#1F1A00',
                    'strokeWidth': 18,
                    'strokeLinecap': 'butt',
                    'strokeDasharray': [12, 10]
                },
                {zIndex: 2, type: 'Line', stroke: '#F7FABF', strokeWidth: 10},
                {zIndex: 3, type: 'Text', textRef: 'properties.name', fill: '#3D272B'}
            ]
        },

        assign: function(feature, zoomlevel) {
            return 'default';
        }
    }
});

// Add the layer to display
display.addLayer(myLayer);
