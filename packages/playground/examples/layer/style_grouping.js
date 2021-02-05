import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
const display = new Map(document.getElementById('map'), {
    zoomLevel: 17,
    center: {
        longitude: -122.280617,
        latitude: 37.826376
    },
    layers: [
        new MVTLayer({
            min: 1,
            max: 20,
            remote: {
                url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
            }
        })
    ]
});
/** **/

// Create a TileLayer that's using a SpaceProvider
var myLayer = new TileLayer({
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
    // customize layer style
    style: {
        // Define a set of styles for different road types
        styleGroups: {
            // Highway
            'highway': [
                {zIndex: 0, type: 'Line', stroke: '#AA84A4', strokeWidth: 18},
                {zIndex: 1, type: 'Line', stroke: '#C799E8', strokeWidth: 16},
                {zIndex: 2, type: 'Text', textRef: 'properties.name', fill: '#3D272B'}
            ],
            // Primary road
            'primary': [
                {zIndex: 0, type: 'Line', stroke: '#AA84A4', strokeWidth: 18},
                {zIndex: 1, type: 'Line', stroke: '#C799E8', strokeWidth: 16},
                {zIndex: 2, type: 'Text', textRef: 'properties.name', fill: '#3D272B'}
            ],
            // Residential road
            'residential': [
                {zIndex: 0, type: 'Line', stroke: '#F9E4A8', strokeWidth: 14},
                {zIndex: 1, type: 'Line', stroke: '#FFFEED', strokeWidth: 12},
                {zIndex: 2, type: 'Text', textRef: 'properties.name', fill: '#3D272B'}
            ],
            // Trail
            'path': [
                {zIndex: 1, type: 'Line', stroke: '#FFFFFF', strokeWidth: 10},
                {zIndex: 2, type: 'Text', textRef: 'properties.name', fill: '#3D272B'}
            ],
            // pedestrian or pedestrian and emergency vehicle only
            'Pedestrianonly': [
                {zIndex: 1, type: 'Line', stroke: '#D6D3CC', strokeWidth: 3},
                {zIndex: 2, type: 'Text', textRef: 'properties.name', fill: '#3D272B'}
            ]
        },
        assign: function(feature, zoomlevel) {
            var prop = feature.properties;
            var navlinkType = prop.type;
            // if the navlink is pedestrian only
            if (prop.pedestrianOnly) {
                navlinkType = 'Pedestrianonly';
            }

            return navlinkType;
        }
    }
});

// Add the layer to display
display.addLayer(myLayer);
