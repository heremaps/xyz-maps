import {MVTLayer, TileLayer, IMLProvider, HeatmapStyle} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
const display = new Map(document.getElementById('map'), {
    zoomlevel: 18,
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

const heatMapLayer = new TileLayer({
    min: 2, max: 20,
    provider: new IMLProvider({
        layer: 'trees',
        catalog: 'hrn:here:data::olp-here:dh-showcase-amsterdam',
        level: 2,
        credentials: {
            apiKey: YOUR_API_KEY
        }
    }),
    style: {
        styleGroups: {
            Heatmap: [<HeatmapStyle>{
                zIndex: 0,
                type: 'Heatmap',
                fill: {
                    type: 'LinearGradient',
                    stops: {
                        1.0: 'white',
                        0.9: '#FCFBAE',
                        0.8: '#FAD932',
                        0.7: '#F26C19',
                        0.5: '#C41D6F',
                        0.3: '#70009C',
                        0.0: '#1E0073'
                    }
                },
                radius: {
                    2: 2,
                    20: 24
                },
                intensity: {
                    2: 0.1,
                    20: 1.0
                }
            }]
        },
        assign() {
            return 'Heatmap';
        }
    }
});

display.addLayer(heatMapLayer);
