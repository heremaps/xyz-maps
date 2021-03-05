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
var myLayer = new TileLayer({
    min: 14,
    max: 20,
    provider: new SpaceProvider({
        level: 14,
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        }
    })
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -122.254528, latitude: 37.796249
    },

    // add layers to display
    layers: [backgroundLayer, myLayer]
});
/** **/

let highlightedFeature;

// click the button to pick a random line in current viewport and highlight it
document.querySelector<HTMLButtonElement>('#style').onclick = function() {
    if (highlightedFeature) {
        // restore the default style of the previous highlighted line feature
        myLayer.setStyleGroup(highlightedFeature);
    }
    // get all line in the current viewport
    let lines = <Feature[]>myLayer.search({rect: display.getViewBounds()});

    // pick a random line
    highlightedFeature = lines[Math.floor(lines.length * Math.random())];

    // highlight the line
    myLayer.setStyleGroup(highlightedFeature, [
        {zIndex: 4, type: 'Line', stroke: '#AA84A4', strokeWidth: 18, opacity: 0.9},
        {zIndex: 5, type: 'Line', stroke: '#C799E8', strokeWidth: 14, opacity: 0.9},
        {zIndex: 6, type: 'Text', textRef: 'properties.name', fill: '#3D272B', stroke: 'white', strokeWidth: 5}
    ]);
};
