import {MVTLayer} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 16,
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
    // add layers to display
    layers: [
        new MVTLayer({
            name: 'mvt-world-layer',
            remote: {
                url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
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
                    'tunnel': [{zIndex: 3, type: 'Line', stroke: '#ffffff', strokeWidth: {15: 4, 20: 16}, strokeDasharray: [4, 4]}],
                    'ferry': [{zIndex: 4, type: 'Line', stroke: '#164ac8', strokeWidth: 1}],
                    'highway': [{zIndex: 5, type: 'Line', stroke: 'white', strokeWidth: {10: 1.5, 15: 4, 16: '12m'}}],
                    'boundaries': [{zIndex: 6, type: 'Line', stroke: '#b3b1ad', strokeWidth: {10: 0.5, 20: 2}}],
                    'buildings': [{zIndex: 7, type: 'Polygon', fill: 'rgb(155,175,196)'}],
                    'roads': [{zIndex: 4, type: 'Line', stroke: '#ffffff', strokeWidth: {15: 1, 16: '5m'}}, {
                        zIndex: 6, type: 'Text', fill: '#222222',
                        font: '12px sans-serif',
                        strokeWidth: 4,
                        stroke: 'white', text: (f) => f.properties.name,
                        // Minimum distance in pixel between repeated text labels on line geometries.
                        // Applies per tile only. Default is 256 pixel.
                        repeat: 256,
                        // Alignment for Text. "map" aligns to the plane of the map.
                        alignment: 'map',
                        // Text with a higher priority (lower value) will be drawn before lower priorities (higher value)
                        // make sure "road labels" are drawn after "place labels".
                        priority: 2
                    }],
                    'places': [{
                        zIndex: 8,
                        type: 'Text',
                        text: (f) => f.properties.name,
                        stroke: 'white',
                        fill: 'black',
                        font: '18px sans-serif',
                        strokeWidth: 4,
                        // set collide property to false to enable label collision detection [default for "Text"]
                        collide: false,
                        // Alignment for Text. "viewport" aligns to the plane of the viewport/screen.
                        alignment: 'viewport',
                        // Text with a higher priority (lower value) will be drawn before lower priorities (higher value)
                        // In case of "place label" and "road label" are colliding "place label" will be draw
                        // because priority 1 is smaller than priority 2
                        priority: 1
                    }]
                },

                assign: (feature, zoom) => {
                    let props = feature.properties;
                    let kind = props.kind;
                    let layer = props.layer;
                    let geom = feature.geometry.type;

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
        })
    ]
});
