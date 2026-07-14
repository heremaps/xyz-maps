import {MVTLayer, IMLProvider, ClusterTileLayer, ClusterFeature, CircleStyle, TextStyle, Feature} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
const display = new Map(document.getElementById('map'), {
    zoomlevel: 14,
    center: {
        longitude: 4.89381,
        latitude: 52.32723
    },
    // add layers to display
    layers: [
        new MVTLayer({
            name: 'mvt-world-layer',
            remote: {
                url: 'https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=' + YOUR_API_KEY
            },
            min: 1,
            max: 20,
            style: {
                backgroundColor: '#555555',
                styleGroups: {

                    'earth': [{zIndex: 1, type: 'Polygon', fill: '#555555'}],
                    'water': [{zIndex: 2, type: 'Polygon', fill: '#353535'}],
                    'landuse': [{zIndex: 3, type: 'Polygon', fill: '#666666'}],
                    'roads': [{zIndex: 4, type: 'Line', stroke: '#555', strokeWidth: {14: 1, 15: '4m'}}],
                    'roadshighway': [{zIndex: 5, type: 'Line', stroke: '#555', strokeWidth: {14: 1.5, 15: '8m'}}],
                    'buildings': [{zIndex: 7, type: 'Polygon', fill: '#999999'}]
                },
                assign: function(feature, level) {
                    const props = feature.properties;
                    const kind = props.kind;
                    const layer = props.$layer; // the name of the layer in the mvt datasource.
                    const geom = feature.geometry.type;

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
/** **/

const dataProvider = new IMLProvider({
    layer: 'trees',
    catalog: 'hrn:here:data::olp-here:dh-showcase-amsterdam',
    level: 2,
    credentials: {
        apiKey: YOUR_API_KEY
    }
});


// See ClusterTileLayerOptions.createProperties and ClusterTileLayerOptions.aggregateProperties for custom Property aggregation.

const clusterRadius = 32;

const clusterLayer = new ClusterTileLayer({
    min: 2,
    max: 20,
    clusterMaxZoom: 15,
    clusterRadius,
    provider: dataProvider,
    style: {
        styleGroups: {
            'Cluster': [<CircleStyle>{
                zIndex: 10,
                type: 'Circle',
                radius: clusterRadius,
                fill: 'rgba(94,237,76,0.8)',
                stroke: 'rgba(37,202,17,0.6)',
                strokeWidth: 5
            }, <TextStyle>{
                zIndex: 20,
                type: 'Text',
                collide: true,
                text: ({properties}) => `${properties.clusterSize}`,
                fill: 'white',
                stroke: 'green',
                font: '16px sans-serif',
                strokeWidth: 4
            }],
            'Point': [<CircleStyle>{
                zIndex: 9,
                type: 'Circle',
                radius: 6,
                fill: 'rgba(94,237,76,0.8)'
            }]
        },
        assign: ({properties}: Feature['properties'], level) => {
            return properties.isCluster && (<ClusterFeature['properties']>properties).clusterSize > 1 ? 'Cluster' : 'Point';
        }
    }
});

display.addLayer(clusterLayer);
