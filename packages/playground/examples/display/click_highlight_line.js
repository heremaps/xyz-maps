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
const spaceLayer = new TileLayer({
    name: 'myLayer',
    min: 14,
    max: 20,
    provider: new SpaceProvider({
        name: 'SpaceProvider',
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
        longitude: -122.254537, latitude: 37.796982
    },

    // add layers to display
    layers: [backgroundLayer, spaceLayer]
});
/** **/

let clickedFeature;
// the style to highlight the clicked line
const selectedStyle = [{
    zIndex: 0,
    type: 'Line',
    opacity: 0.7,
    strokeWidth: 16,
    stroke: '#FFFFFF'
}];


// add an pointerup event listener to the map
display.addEventListener('pointerup', (ev)=>{
    // make sure to restore the default style of the previously clicked feature
    if (clickedFeature) {
        spaceLayer.setStyleGroup(clickedFeature);
    }

    // If a feature is clicked
    if (ev.target) {
        clickedFeature = ev.target;

        // Set new feature style if mouse clicks on a feature
        spaceLayer.setStyleGroup(clickedFeature, selectedStyle);
    }
});


