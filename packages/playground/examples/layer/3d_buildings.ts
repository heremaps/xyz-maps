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
                url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
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
                        extrude: (feature) => feature.properties.height || 25
                    }]
                },

                assign: (feature, level) => {
                    var props = feature.properties;
                    var kind = props.kind;
                    var layer = props.layer; // the data layer of the feature
                    var geom = feature.geometry.type;

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
