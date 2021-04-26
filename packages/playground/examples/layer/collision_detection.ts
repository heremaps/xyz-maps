import {MVTLayer} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 8,
    center: {
        longitude: -96.76883, latitude: 39.6104
    },
    // add layers to display
    layers: [
        new MVTLayer({
            remote: {
                url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
            },
            style: {
                backgroundColor: '#555555',

                styleGroups: {
                    'earth': [{zIndex: 1, type: 'Polygon', fill: '#555555'}],
                    'water': [{zIndex: 2, type: 'Polygon', fill: '#353535'}],
                    'landuse': [{zIndex: 3, type: 'Polygon', fill: '#666666'}],
                    'roads': [{zIndex: 4, type: 'Line', stroke: '#939393', strokeWidth: {14: 1, 15: '4m'}}],
                    'roadshighway': [{zIndex: 5, type: 'Line', stroke: '#939393', strokeWidth: {14: 1, 15: '8m'}}],
                    'buildings': [{zIndex: 7, type: 'Polygon', fill: '#999999'}],
                    'places': [{
                        zIndex: 8,
                        type: 'Rect',
                        width: 20,
                        fill: '#AEEF45',
                        // set collide property to false to enable the collision detection.
                        collide: false,
                        priority: 2
                    }, {
                        zIndex: 8,
                        type: 'Rect',
                        width: 20,
                        fill: '#AEEF45',
                        rotation: 45,
                        // If the collision detection is enabled for multiple Styles within the same StyleGroup, the respective Styles are
                        // handled as a single Object ("CollisionGroup") where the combined bounding-box is determined automatically.
                        collide: false
                    }, {
                        zIndex: 8,
                        type: 'Circle',
                        radius: 18,
                        stroke: '#AEEF45',
                        strokeWidth: 2,
                        collide: false,
                        // If the collision detection is enabled for multiple Styles within the same StyleGroup,
                        // the highest priority (lowest value) is used.
                        priority: 1
                    }, {
                        zIndex: 9,
                        type: 'Circle',
                        radius: 5,
                        fill: '#fff',
                        // allow collisions and disable the collision detection
                        collide: true
                    }]
                },

                assign: (feature, level) => {
                    let props = feature.properties;
                    let geom = feature.geometry.type;
                    let kind = props.kind;
                    let layer = props.layer; // the data layer of the feature

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
