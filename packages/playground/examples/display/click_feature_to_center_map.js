import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
var myLayer = new TileLayer({
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
            myStyle: [{
                zIndex: 2,
                type: 'Circle',
                radius: 12,
                strokeWidth: 2,
                stroke: '#FFFFFF',
                fill: '#1188DD'
            }]
        },
        assign: function(feature) {
            return 'myStyle';
        }
    }
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -122.227791, latitude: 37.781058
    },
    // add layers to display
    layers: [
        new MVTLayer({
            name: 'background layer',
            min: 1,
            max: 20,
            remote: {
                url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
            }
        }),
        myLayer
    ]
});

/** **/

let selectedFeature;

// create a pointerup event listener and add it to the display
display.addEventListener('pointerup', (ev) => {
    // check if a feature has been clicked
    if (ev.target) {
        // in case a feature has already been highlighted by a previous click, we reset it's style
        if (selectedFeature) {
            myLayer.setStyleGroup(selectedFeature);
        }
        const bbox = ev.target.bbox;
        // center the map on the feature ( center of features bounding box )
        display.setCenter((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2);

        selectedFeature = ev.target;
        // highlight the feature
        myLayer.setStyleGroup(selectedFeature, [
            {'zIndex': 2, 'type': 'Circle', 'radius': 12, 'strokeWidth': 2, 'stroke': '#FFFFFF', 'fill': '#DD8811'}
        ]);
    }
});


