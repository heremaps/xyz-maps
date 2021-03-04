import {MVTLayer} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -122.48024, latitude: 37.77326
    },
    // add layers to the display
    layers: [
        new MVTLayer({
            name: 'background layer',
            min: 1,
            max: 20,
            remote: {
                url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
            }
        })
    ]
});
/** **/

let dragButton = <HTMLButtonElement>document.querySelector('#drag');
let zoomButton = <HTMLButtonElement>document.querySelector('#zoom');
let pitchButton = <HTMLButtonElement>document.querySelector('#pitch');
let infoElement = <HTMLDivElement>document.querySelector('#info');


let currentBehavior;

const showMapBehavior = () => {
    // get the current behavior settings.
    currentBehavior = display.getBehavior();
    // and display it in the infoElement
    infoElement.innerText = 'Current Behavior settings:' + JSON.stringify(currentBehavior, undefined, 4);
};

showMapBehavior();


// click the drag button to toggle the "drag" behavior setting.
// when drag is set to true, dragging the map by user interaction is allowed, otherwise false.
dragButton.onclick = function() {
    // toggle drag behavior setting
    display.setBehavior('drag', !currentBehavior.drag);

    // display the updated behavior settings
    showMapBehavior();

    // update the button text
    dragButton.innerText = currentBehavior.drag ? 'Disable Drag' : 'Enable Drag';
};

// click the zoom button to toggle the "zoom" behavior setting.
// when zoom is set to true, changing the map zoom by user interaction is allowed, otherwise false.
zoomButton.onclick = function() {
    // toggle zoom behavior setting
    display.setBehavior('zoom', !currentBehavior.zoom);

    // display the updated behavior settings
    showMapBehavior();

    // update the button text
    zoomButton.innerText = currentBehavior.zoom ? 'Disable Zoom' : 'Enable Zoom';
};


// click the zoom button to toggle the "pitch" behavior setting.
// when pitch is set to true, pitching the map zoom by user interaction is allowed, otherwise false.
pitchButton.onclick = function() {
    // toggle pitch behavior setting
    display.setBehavior('pitch', !currentBehavior.pitch);

    // display the updated behavior settings
    showMapBehavior();

    // update the button text
    pitchButton.innerText = currentBehavior.pitch ? 'Disable Pitch' : 'Enable Pitch';
};
