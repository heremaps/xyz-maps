import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
const backgroundLayer = new MVTLayer({
    name: 'background layer',
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});
const lineLayer = new TileLayer({
    min: 14,
    max: 20,
    provider: new SpaceProvider({
        level: 14,
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        }
    }),
    style: {
        styleGroups: {
            myStyle: [
                {zIndex: 0, type: 'Line', stroke: '#A88E71', strokeWidth: 18},
                {zIndex: 1, type: 'Line', stroke: '#FEAD9D', strokeWidth: 12},
                {zIndex: 2, type: 'Text', fill: '#000000', textRef: 'properties.name'}
            ]
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
        longitude: -122.254537, latitude: 37.796982
    },
    // add the layers to the display
    layers: [backgroundLayer, lineLayer]
});
/** **/


// the style to highlight a currently hovered line
const hoverStyle = [
    {zIndex: 3, type: 'Line', stroke: '#CB668E', strokeWidth: 24},
    {zIndex: 4, type: 'Line', stroke: '#F090B3', strokeWidth: 18},
    {zIndex: 5, type: 'Text', fill: '#000000', text: 'hovered'}
];

// add a pointerenter event-listener to the display
display.addEventListener('pointerenter', function(evt) {
    if (evt.target) {
        // set the highlight style for the feature
        lineLayer.setStyleGroup(evt.target, hoverStyle);
    }
});

// add a pointerleave event-listener to the display
display.addEventListener('pointerleave', function(evt) {
    if (evt.target) {
        // restore the default style of the feature
        lineLayer.setStyleGroup(evt.target);
    }
});

