import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
var layers = [
    new MVTLayer({
        name: 'background layer',
        min: 1,
        max: 20,
        remote: {
            url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
        }
    }),
    new TileLayer({
        name: 'my Navlink Layer',
        min: 14,
        max: 20,
        provider: new here.xyz.maps.providers.SpaceProvider({
            id: 'NavlinkProvider',
            level: 14,
            space: '6HMU19KY',
            credentials: {
                access_token: YOUR_ACCESS_TOKEN
            }
        }),

        style: {
            styleGroups: {
                myStyle: [
                    {'zIndex': 1, 'type': 'Line', 'strokeWidth': 6, 'stroke': '#1188DD'},
                    {'zIndex': 0, 'type': 'Line', 'strokeWidth': 10, 'stroke': '#F0F0F0'},
                    {zIndex: 2, type: 'Text', fill: '#000000', textRef: 'properties.name'}
                ]
            },
            assign: function(feature) {
                return 'myStyle';
            }
        }
    }),
    new TileLayer({
        name: 'mySecondLayer',
        min: 14,
        max: 20,
        provider: new SpaceProvider({
            id: 'PlaceProvider',
            level: 14,
            space: '6CkeaGLg',
            credentials: {
                access_token: YOUR_ACCESS_TOKEN
            }
        }),

        style: {
            styleGroups: {
                myStyle: [
                    {
                        'zIndex': 2,
                        'type': 'Circle',
                        'radius': 12,
                        'strokeWidth': 2,
                        'stroke': '#FFFFFF',
                        'fill': '#1188DD'
                    }
                ]
            },
            assign: function(feature) {
                return 'myStyle';
            }
        }
    })
];
// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomLevel: 17,
    center: {
        longitude: -122.227791, latitude: 37.781058
    },

    // add layers to display
    layers: layers
});
/** **/

// create a event handler to pointerup
function eventHandler(evt) {
    // Click on a feature
    if (evt.target) {
        // reset style of last clicked feature
        if (clickedDetail) {
            clickedDetail.layer.setStyleGroup(clickedDetail.feature);
        }

        var bbox = evt.target.bbox;
        // set map center
        display.setCenter((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2);

        clickedDetail = evt.detail;
        // highlight clicked feature
        clickedDetail.layer.setStyleGroup(
            evt.target,
            clickFeatureStyle[evt.target.geometry.type]
        );
    }
}

// add event listener to pointerup
display.addEventListener('pointerup', eventHandler);

var clickedDetail;
var clickFeatureStyle = {
    LineString: [
        {'zIndex': 1, 'type': 'Line', 'strokeWidth': 6, 'stroke': '#DD8811'},
        {'zIndex': 0, 'type': 'Line', 'strokeWidth': 10, 'stroke': '#F0F0F0'},
        {zIndex: 2, type: 'Text', fill: '#000000', textRef: 'properties.name'}
    ],
    Point: [
        {'zIndex': 2, 'type': 'Circle', 'radius': 12, 'strokeWidth': 2, 'stroke': '#FFFFFF', 'fill': '#DD8811'}
    ]
};
