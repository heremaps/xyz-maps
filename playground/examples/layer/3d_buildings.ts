import {MVTLayer} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {longitude: -74.01137, latitude: 40.70613},
    // add layers to display
    layers: [
        new MVTLayer({
            name: 'mvt-world-layer',
            remote: {
                url: 'https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=' + YOUR_API_KEY
            },
            style: {
                backgroundColor: '#555555',

                styleGroups: {
                    'earth': [{zIndex: 1, type: 'Polygon', fill: '#555555'}],
                    'landuse': [{zIndex: 2, type: 'Polygon', fill: '#666666'}],
                    'water': [{zIndex: 3, type: 'Polygon', fill: '#353535'}],
                    'roads': [{zIndex: 4, type: 'Line', stroke: '#ffffff', strokeWidth: {14: 1, 15: '4m'}}],
                    'roadshighway': [{zIndex: 5, type: 'Line', stroke: '#ffffff', strokeWidth: {14: 1.5, 15: '8m'}}],
                    'buildings': [{
                        zIndex: 6,
                        type: 'Polygon',
                        fill: '#999999',
                        // define extrude in meters to display polygons with extrusion
                        extrude: (feature) => feature.properties.height || 0,
                        // define the base of the extrusion in meters offset from the ground
                        extrudeBase: (feature) => feature.properties.min_height || 0
                    }]
                },

                assign: (feature, level) => {
                    const props = feature.properties;
                    const kind = props.kind;
                    const layer = props.$layer; // the name of the layer in the mvt datasource.
                    const geom = feature.geometry.type;

                    if (layer == 'water') {
                        if (geom == 'LineString' || geom == 'MultiLineString') {
                            return;
                        }
                    } else if (layer == 'roads') {
                        if (kind == 'rail' || kind == 'ferry') {
                            return;
                        }
                        if (kind == 'highway') {
                            return layer + kind;
                        }
                    }
                    return layer;
                }
            }
        })
    ]
});
