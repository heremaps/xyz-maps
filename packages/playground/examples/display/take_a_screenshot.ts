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
    })
];
// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -122.227791,
        latitude: 37.781058
    },
    // add layers to display
    layers: layers
});
/** **/

const captureButton = <HTMLButtonElement>document.querySelector('#capture');
// add an event handler to the capture button to take a snapshot on click
captureButton.onclick = function() {
    display.snapshot((snapshot: HTMLCanvasElement) => {
        const previewImage = <HTMLImageElement>document.querySelector('#preview');
        previewImage.src = snapshot.toDataURL();
    }, 64, 64, 480, 360);
};
