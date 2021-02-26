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
    zoomlevel: 17,
    center: {
        longitude: -122.247131, latitude: 37.810442
    },

    // add layers to display
    layers: layers
});
/** **/

// Create a TileLayer with custom a layer style
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
    // customize the layer style
    style: {
        styleGroups: {
            // Highway
            'highway': [
                {'zIndex': 8, 'type': 'Line', 'stroke': '#E5B50B', 'strokeWidth': 18, 'strokeLinecap': 'butt'},
                {
                    'zIndex': 9,
                    'type': 'Line',
                    'stroke': '#1F1A00',
                    'strokeWidth': 18,
                    'strokeLinecap': 'butt',
                    'strokeDasharray': [12, 10]
                },
                {zIndex: 10, type: 'Line', stroke: '#F7FABF', strokeWidth: 10},
                {zIndex: 11, type: 'Text', textRef: 'properties.name', fill: '#3D272B'}
            ],
            // Primary road
            'primary': [
                {zIndex: 5, type: 'Line', stroke: '#AA84A4', strokeWidth: 18},
                {zIndex: 6, type: 'Line', stroke: '#C799E8', strokeWidth: 16},
                {zIndex: 7, type: 'Text', textRef: 'properties.name', fill: '#3D272B'}
            ],
            // Residential road
            'residential': [
                {zIndex: 2, type: 'Line', stroke: '#F9E4A8', strokeWidth: 14},
                {zIndex: 3, type: 'Line', stroke: '#FFFEED', strokeWidth: 12},
                {zIndex: 4, type: 'Text', textRef: 'properties.name', fill: '#3D272B'}
            ],
            // Trail
            'path': [
                {zIndex: 0, type: 'Line', stroke: '#FFFFFF', strokeWidth: 10},
                {zIndex: 1, type: 'Text', textRef: 'properties.name', fill: '#3D272B'}
            ]
        },
        assign: function(feature, zoomlevel) {
            let prop = feature.properties;
            return prop.type;
        }
    }
});

// Add the layer to the display
display.addLayer(myLayer);
