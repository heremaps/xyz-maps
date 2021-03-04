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
        name: 'myLayer',
        min: 14,
        max: 20,
        provider: new SpaceProvider({
            level: 14,
            space: '6HMU19KY',
            credentials: {
                access_token: YOUR_ACCESS_TOKEN
            }
        })
    }),
    new TileLayer({
        name: 'mySecondLayer',
        min: 14,
        max: 20,
        provider: new SpaceProvider({
            level: 14,
            space: '6CkeaGLg',
            credentials: {
                access_token: YOUR_ACCESS_TOKEN
            }
        })
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

const infoElement = <HTMLDivElement>document.querySelector('#info');

// create a pointerup event listener and add it to the display
display.addEventListener('pointerup', function(ev) {
    // Click on a feature
    if (ev.target) {
        var properties = ev.target.properties;

        // update the info element with the properties of the feature
        infoElement.innerText = JSON.stringify(properties, undefined, 4);
    } else {
        // in case no feature hast been clicked, we clear the info element
        infoElement.innerText = 'No feature is clicked!';
    }
});
