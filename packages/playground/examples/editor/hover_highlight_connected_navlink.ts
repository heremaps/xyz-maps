import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor, Marker} from '@here/xyz-maps-editor';

/** setup the Map **/

let backgroundLayer = new MVTLayer({
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});
let lineLayer = new TileLayer({
    min: 14,
    max: 20,
    // Customized provider to provide navlinks
    provider: new SpaceProvider({
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        level: 14
    }),
    style: {
        styleGroups: {
            navlink: [
                {zIndex: 1, type: 'Line', stroke: '#1188DD', strokeWidth: 10},
                {zIndex: 2, type: 'Text', textRef: 'properties.name', fill: '#3D272B'}
            ]
        },
        assign: function(feature, zoomlevel) {
            return 'navlink';
        }
    }
});

let pointLayer = new TileLayer({
    min: 14,
    max: 20,
    // Customized provider to provide features
    provider: new SpaceProvider({
        space: '6CkeaGLg',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        level: 14
    }),
    style: {
        styleGroups: {
            place: [
                {'zIndex': 3, 'type': 'Circle', 'radius': 12, 'strokeWidth': 2, 'stroke': '#FFFFFF', 'fill': '#1188DD'}
            ]
        },
        assign: function(feature, zoomlevel) {
            return 'place';
        }
    }
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 19,
    center: {
        longitude: 76.59078, latitude: 8.87959
    },

    // add layers to display
    layers: [backgroundLayer, lineLayer, pointLayer]
});

// setup the editor
const editor = new Editor(display);

// add the layers to the editor to enable editing of the layer
editor.addLayer(pointLayer);
/** **/

let hoveredLine;

// add a pointerenter event listener to highlight the "routing link"
editor.addEventListener('pointerenter', (e) => {
    const feature = <Marker>e.target;
    // check if a point feature has been entered
    if (feature && feature.geometry.type == 'Point') {
        // get the "routing link"
        let line = editor.getFeature(feature.prop('routingLink'), lineLayer);

        // style the connected navlink if it exists
        if (line) {
            // store the current hovered line so we can remove highlight on pointerenter
            hoveredLine = line;
            // set the style to highlight
            lineLayer.setStyleGroup(hoveredLine, [{
                zIndex: 0,
                type: 'Line',
                stroke: '#BE6B65',
                strokeDasharray: 'none',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: 16
            }, {
                zIndex: 1,
                type: 'Line',
                stroke: '#E6A08C',
                strokeDasharray: 'none',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: 12
            }]);
        }
    }
});

editor.addEventListener('pointerleave', (e) => {
    // rest the style
    lineLayer.setStyleGroup(hoveredLine);
    hoveredLine = null;
});
