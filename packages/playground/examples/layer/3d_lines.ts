import {MVTLayer, TileLayer, LocalProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup layers and display **/
var baseMapLayer = new MVTLayer({
    name: 'mvt-world-layer',
    remote: {
        url: 'https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=' + YOUR_API_KEY
    },
    style: {
        backgroundColor: '#ECE0CA',
        styleGroups: {
            'landuse': [{zIndex: 0, type: 'Polygon', fill: '#ECE0CA'}],
            'pier': [{zIndex: 1, type: 'Polygon', fill: '#ECE0CA', stroke: '#c8b89d', strokeWidth: 2}],
            'park': [{zIndex: 1, type: 'Polygon', fill: '#c8dd97'}],
            'nature_reserve': [{zIndex: 1, type: 'Polygon', fill: '#dadeb0'}],
            'hospital': [{zIndex: 1, type: 'Polygon', fill: '#f3d3d3'}],
            'water': [{zIndex: 2, type: 'Polygon', fill: 'rgb(120,188,237)'}],
            'path': [{zIndex: 3, type: 'Line', stroke: '#c8b89d', strokeWidth: '1m'}],
            'tunnel': [{
                zIndex: 3,
                type: 'Line',
                stroke: '#ffffff',
                strokeWidth: {15: 4, 20: 16},
                strokeDasharray: [4, 4]
            }],
            'ferry': [{zIndex: 4, type: 'Line', stroke: '#164ac8', strokeWidth: 1}],
            'highway': [{
                zIndex: 5,
                type: 'Line',
                stroke: 'white',
                repeat: 128,
                strokeWidth: {10: 1.5, 15: 4, 16: '12m'}
            }],
            'boundaries': [{zIndex: 6, type: 'Line', stroke: '#b3b1ad', strokeWidth: {10: 0.5, 20: 2}}],
            'buildings': [{
                zIndex: 7, type: 'Polygon', fill: 'rgb(170,170,170)', stroke: 'rgb(30,30,30)',
                // define extrude in meters to display polygons with extrusion
                extrude: function(feature) {
                    return feature.properties.height || 0;
                },
                // define the base of the extrusion in meters offset from the ground
                extrudeBase: function(feature) {
                    return feature.properties.min_height || 0;
                }
            }],
            'roads': [{zIndex: 4, type: 'Line', stroke: '#ffffff', strokeWidth: {15: 1, 16: '5m'}}, {
                zIndex: 6, type: 'Text', fill: '#222222',
                font: '12px sans-serif',
                strokeWidth: 4,
                stroke: 'white', text: function(f) {
                    return f.properties.name;
                },
                // Minimum distance in pixel between repeated text labels on line geometries.
                // Applies per tile only. Default is 256 pixel.
                repeat: 128,
                // Alignment for Text. "map" aligns to the plane of the map.
                alignment: 'map',
                // Text with a higher priority (lower value) will be drawn before lower priorities (higher value)
                // make sure "road labels" are drawn after "place labels".
                priority: 2
            }],
            'places': [{
                zIndex: 8,
                type: 'Text',
                text: function(f) {
                    return f.properties.name;
                },
                stroke: 'black',
                fill: 'white',
                font: '18px sans-serif',
                strokeWidth: 4,
                // set collide property to false to enable label collision detection [default]
                collide: false,
                // Alignment for Text. "viewport" aligns to the plane of the viewport/screen.
                alignment: 'viewport',
                // Text with a higher priority (lower value) will be drawn before lower priorities (higher value)
                // In case of "place label" and "road label" are colliding "place label" will be draw
                // because priority 1 is smaller than priority 2
                priority: 1
            }]
        },
        assign: function(feature, zoom) {
            const props = feature.properties;
            const kind = props.kind;
            const layer = props.$layer; // the name of the layer in the mvt datasource.
            const geom = feature.geometry.type;

            if (layer == 'landuse') {
                switch (kind) {
                case 'pier':
                    return 'pier';
                case 'nature_reserve':
                    return 'nature_reserve';
                case 'park':
                case 'garden':
                case 'pedestrian':
                case 'forrest':
                    return 'park';
                case 'hospital':
                    return 'hospital';
                default:
                    return 'landuse';
                }
            }
            if (layer == 'water') {
                if (geom == 'LineString' || geom == 'MultiLineString') {
                    return;
                }
            } else if (layer == 'roads') {
                if (kind == 'rail' || kind == 'ferry') {
                    return;
                }
                if (props.is_tunnel && zoom > 13) {
                    return 'tunnel';
                }
                if (kind == 'highway' || kind == 'path') {
                    return kind;
                }
            }
            return layer;
        }
    }
});

let myLayer = new TileLayer({
    min: 12,
    max: 25,
    provider: new LocalProvider({})
});

// setup the Map Display
let display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -73.9945, latitude: 40.70653
    },
    behavior: {
        // allow map pitch by user interaction (mouse/touch)
        pitch: true,
        // allow map rotation by user interaction (mouse/touch)
        rotate: true
    },
    // set initial map pitch in degrees
    pitch: 50,
    // set initial map rotation in degrees
    rotate: -30,
    layers: [baseMapLayer, myLayer]
});
/** **/

myLayer.addFeature({
    type: 'Feature',
    geometry: {
        type: 'LineString',
        coordinates: [
            [-74.002702802, 40.710598034, 0],
            [-74.001064925, 40.709409354, 10],
            [-73.999368589, 40.708072037, 30],
            [-73.998337217, 40.707269634, 50],
            [-73.994388147, 40.704101076, 50],
            [-73.993370346, 40.703288338, 30],
            [-73.992433968, 40.702557893, 20],
            [-73.990074216, 40.700727506, 0]
        ]
    },
    properties: {}
}, [{
    zIndex: 0,
    type: 'Line',
    stroke: 'red',
    strokeWidth: 20,
    // The altitude defines the distance in the vertical direction between the ground plane at 0 meters and the geometry/style.
    // If altitude is set to true, the altitude from the feature's geometry coordinates will be used automatically.
    altitude: true
}]);

myLayer.addFeature({
    type: 'Feature',
    geometry: {
        type: 'LineString',
        coordinates: [
            [-73.994162405, 40.713611968, 0],
            [-73.992594341, 40.710810259, 20],
            [-73.991922309, 40.709621632, 40],
            [-73.991455206, 40.708815681, 50],
            [-73.99084753, 40.707690504, 50],
            [-73.990110349, 40.706346307, 50],
            [-73.989383129, 40.705092706, 50],
            [-73.988730161, 40.703847997, 30],
            [-73.988170135, 40.702892752, 20],
            [-73.986798064, 40.700387849, 0]
        ]
    },
    properties: {}
}, [{
    zIndex: 2,
    type: 'Line',
    stroke: 'red',
    strokeWidth: 20,
    // The altitude defines the distance in the vertical direction between the ground plane at 0 meters and the geometry/style.
    // If altitude is set to true, the altitude from the feature's geometry coordinates will be used automatically.
    altitude: true
}, {
    zIndex: 1,
    // Use a VerticalLine for better visualization of the actual height of the geometry
    type: 'VerticalLine',
    stroke: 'black'
}, {
    zIndex: 0,
    type: 'Circle',
    radius: 3,
    fill: 'rgba(0,0,0,0.4)',
    alignment: 'map'
}]);

