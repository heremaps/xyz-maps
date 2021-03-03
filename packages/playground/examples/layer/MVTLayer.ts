import {MVTLayer} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 2,
    center: {
        longitude: -96.76883, latitude: 39.6104
    },
    // add layers to display
    layers: [
        new MVTLayer({
            name: 'mvt-world-layer',
            remote: {
                url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
                // optional settings:
                // max  : 16,     // max level for loading data
                // min  : 1       // min level for loading data
                // tileSize : 512 // 512|256 defines mvt tilesize in case it can't be automatically detected in url..
            },
            min: 1,
            max: 20,

            style: {

                backgroundColor: '#555555',

                styleGroups: {

                    'earth': [{zIndex: 1, type: 'Polygon', fill: '#555555'}],
                    'water': [{zIndex: 2, type: 'Polygon', fill: '#353535'}],
                    'landuse': [{zIndex: 3, type: 'Polygon', fill: '#666666'}],
                    'roads': [{zIndex: 4, type: 'Line', stroke: '#ffffff', strokeWidth: {14: 1, 15: '4m'}}],
                    'roadshighway': [{zIndex: 5, type: 'Line', stroke: '#ffffff', strokeWidth: {14: 1.5, 15: '8m'}}],
                    'buildings': [{zIndex: 7, type: 'Polygon', fill: '#999999'}]
                },

                assign: function(feature, level) {
                    var props = feature.properties;
                    var kind = props.kind;
                    var layer = props.layer; // the data layer of the feature
                    var geom = feature.geometry.type;

                    if (layer == 'water') {
                        if (geom == 'LineString' || geom == 'MultiLineString') {
                            return;
                        }
                    }
                    if (layer == 'roads') {
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
