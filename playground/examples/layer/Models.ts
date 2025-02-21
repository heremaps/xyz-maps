import {LayerStyle, MVTLayer, TileLayer, LocalProvider, ModelStyle} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

const treeLayer = new TileLayer({
    provider: new LocalProvider(),
    style: {
        styleGroups: {
            'TreeModel': [<ModelStyle>{
                zIndex: 1,
                type: 'Model',
                // The 3D model file to be used for the tree.
                model: './assets/models/tree/tree.obj',
                // Rotate the tree model to align properly within the 3D world.
                rotate: [-Math.PI / 2, 0, 0],
                // Scaling the tree model uniformly by a factor of 2 on all axes to increase its size.
                scale: [2, 2, 2],
                // We apply extra specular highlights with a red tint, which will make the surface slightly more reflective.
                // Note: The provided specular value is combined (added) with the model's materials specular property.
                specular: [0.8, 0.1, 0.1],
                // A higher value here creates sharper, more focused reflections, simulating a glossier surface.
                // Note: The shininess value is combined (added) with the model's materials shininess property.
                shininess: 60
            }]
        },
        assign() {
            return 'TreeModel';
        }
    }
});

// add some trees to the layer.
treeLayer.addFeature([
    {type: 'Feature', geometry: {type: 'Point', coordinates: [-74.0145, 40.7036]}},
    {type: 'Feature', geometry: {type: 'Point', coordinates: [-74.0146, 40.70325]}},
    {type: 'Feature', geometry: {type: 'Point', coordinates: [-74.01465, 40.7035]}},
    {type: 'Feature', geometry: {type: 'Point', coordinates: [-74.01462, 40.7034]}}
]);

/** setup the "BaseLayer", Map Display and add the tree layer**/
const style: LayerStyle = {
    backgroundColor: '#ECE0CA',

    lights: {
        defaultLight: [{
            type: 'ambient',
            color: '#fff',
            intensity: 0.4
        }, {
            type: 'directional',
            color: '#fff',
            direction: [1, -1, 1],
            intensity: 0.4
        }, {
            type: 'directional',
            color: '#fff',
            direction: [1, 0, 0],
            intensity: 0.4
        }]
    },
    styleGroups: {
        'buildings': [{
            zIndex: 7,
            type: 'Polygon',
            fill: 'rgba(145, 145, 145, 0.8)',
            stroke: 'rgba(80, 80, 80, 0.7)',
            specular: 'rgb(205, 127, 50)',
            shininess: 60,
            emissive: 'rgb(30, 30, 30)',
            extrude: (feature) => feature.properties.height || 0,
            extrudeBase: (feature) => feature.properties.min_height || 0
        }],
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
        'roads': [{zIndex: 4, type: 'Line', stroke: '#ffffff', strokeWidth: {15: 1, 16: '5m'}}, {
            zIndex: 6, type: 'Text', fill: '#222222',
            font: '12px sans-serif',
            strokeWidth: 4,
            stroke: 'white', text: (f) => f.properties.name,
            repeat: 128,
            alignment: 'map',
            priority: 2
        }],
        'places': [{
            zIndex: 8,
            type: 'Text',
            text: (f) => f.properties.name,
            stroke: 'black',
            fill: 'white',
            font: '18px sans-serif',
            strokeWidth: 4,
            collide: false,
            alignment: 'viewport',
            priority: 1
        }]
    },
    assign: (feature, zoom) => {
        const props = feature.properties;
        const kind = props.kind;
        const layer = props.$layer;
        const geom = feature.geometry.type;

        if (layer == 'landuse') {
            switch (kind) {
            case 'pier':
            case 'hospital':
            case 'nature_reserve':
                return kind;
            case 'park':
            case 'garden':
            case 'pedestrian':
            case 'forrest':
                return 'park';
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
};

const display = new Map(document.getElementById('map'), {
    zoomlevel: 20,
    center: {
        longitude: -74.0143,
        latitude: 40.7036
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
    rotate: -50,
    layers: [new MVTLayer({
        name: 'mvt-world-layer',
        remote: {
            url: 'https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=' + YOUR_API_KEY
        },
        style
    }), treeLayer]
});
/** **/
