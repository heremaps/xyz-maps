import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor, Place} from '@here/xyz-maps-editor';

/** setup the Map **/
let backgroundLayer = new MVTLayer({
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});

let buildingLayer = new TileLayer({
    min: 15,
    max: 20,
    provider: new SpaceProvider({
        id: 'Buildings',
        space: 'XhxKLZGL',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        level: 15
    })
});

let placeLayer = new TileLayer({
    min: 14,
    max: 20,
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
        longitude: 76.566647, latitude: 8.894019
    },
    // add layers to the@ display
    layers: [backgroundLayer, buildingLayer, placeLayer]
});

// setup the editor
const editor = new Editor(display, {layers: [placeLayer]});

/** **/

// the current highlighted build
var highlightedBuilding;

editor.addEventListener('dragStop', (e)=>{
    // reset the style of the current highlighted building
    if (highlightedBuilding) {
        buildingLayer.setStyleGroup(highlightedBuilding);
        highlightedBuilding = null;
    }
    const place = <Place>e.target;
    const position = place.coord();
    const screenPosition = display.geoToPixel(position[0], position[1]);

    // search for buildings that are located below the current position of the place
    const searchResults = display.getFeatureAt(screenPosition, {layers: [buildingLayer]});

    if (searchResults) {
        highlightedBuilding = searchResults.feature;

        // style and highlight the building
        buildingLayer.setStyleGroup(highlightedBuilding, [{
            zIndex: 0,
            type: 'Polygon',
            fill: '#36B2E5',
            stroke: 'black'
        }]);
    }
});
