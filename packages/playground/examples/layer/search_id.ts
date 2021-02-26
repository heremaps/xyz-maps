import {MVTLayer, TileLayer, SpaceProvider, Feature} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
let backgroundLayer = new MVTLayer({
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});
var placeLayer = new TileLayer({
    min: 14,
    max: 20,
    provider: new SpaceProvider({
        level: 14,
        space: '6CkeaGLg',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        }
    }),
    style: {
        styleGroups: {
            myPlace: [{
                zIndex: 0,
                type: 'Circle',
                radius: 8,
                fill: '#2eb4ff',
                stroke: '#0050b0',
                strokeWidth: 2
            }, {
                zIndex: 0,
                type: 'Text',
                fill: '#fff',
                stroke: '#0050b0',
                strokeWidth: 5,
                font: '13px sans-serif',
                text: (feature) => feature.id,
                priority: 5
            }]
        },
        assign: (feature) => 'myPlace'
    }
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -122.253324, latitude: 37.795146
    },

    // add layers to the display
    layers: [backgroundLayer, placeLayer]
});
/** **/

placeLayer.addEventListener('viewportReady', function(ev) {
    // Search a specific feature by id
    const feature = <Feature>placeLayer.search({id: 'yzTilZp7Z3VqlCNO'});
    // Set style to highlight the feature
    placeLayer.setStyleGroup(feature, [{
        zIndex: 0,
        type: 'Text',
        fill: '#ffffff',
        stroke: '#ff5a30',
        font: '18px sans-serif',
        strokeWidth: 5,
        text: (feature) => feature.id,
        priority: 1
    }]);
});
