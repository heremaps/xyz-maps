import {MVTLayer, LayerStyle} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

const style: LayerStyle = {
    backgroundColor: '#ECE0CA',

    lights: {
        // The default light configuration applied to all styles that don't explicitly define a "light" property.
        defaultLight: [{
            type: 'ambient',
            color: '#fff',
            intensity: 0.3
        }, {
            type: 'directional',
            color: '#fff',
            direction: [0, 0, 1],
            intensity: 1.0
        }, {
            type: 'directional',
            color: '#fff',
            direction: [-1, 0, 0],
            intensity: 0.2
        }],
        // Custom lighting setup specifically for the "buildings" style group.
        buildingLight: [{
            type: 'ambient',
            color: '#fff', // White ambient light to illuminate the buildings uniformly.
            intensity: 0.4 // Slightly stronger ambient light to soften shadows on buildings.
        }, {
            type: 'directional',
            color: '#fff', // Main directional light simulating sunlight on buildings.
            direction: [-1, -1, 1], // Coming from an angled direction to create realistic copper highlights.
            intensity: 0.6 // Moderate intensity for defining copper reflections and light behavior.
        }, {
            type: 'directional',
            color: '#fff', // Secondary light for filling in shadows and adding depth.
            direction: [1, 0, 0], // Horizontal direction to enhance shadow contrast and scene depth.
            intensity: 0.4 // Medium intensity to subtly complement the primary light.
        }]
    },
    styleGroups: {
        'buildings': [{
            zIndex: 7,
            type: 'Polygon',
            fill: 'rgba(145, 145, 145, 0.8)',
            stroke: 'rgba(80, 80, 80, 0.7)',
            // Using the custom 'buildingLight' lighting setup for this style group.
            light: 'buildingLight',
            // Specular color: Copper tone for reflections to simulate highlights from polished metal surfaces.
            specular: 'rgb(205, 127, 50)',
            // Shininess: Defines the reflectivity; higher value makes the surface appear more polished.
            shininess: 60,
            // Emissive color: A subtle dark grey emissive color to simulate ambient light without extra glow.
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

/** setup the Map Display **/
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -74.01137,
        latitude: 40.70613
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
    rotate: 30,
    layers: [new MVTLayer({
        name: 'mvt-world-layer',
        remote: {
            url: 'https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=' + YOUR_API_KEY
        },
        style
    })]
});
/** **/
