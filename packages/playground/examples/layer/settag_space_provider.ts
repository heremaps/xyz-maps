import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
/** setup the Map **/
// configure layers
var layers = [
    new MVTLayer({
        min: 1,
        max: 20,
        remote: {
            url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
        }
    })
];
// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 2,
    center: {
        longitude: -96.76883, latitude: 39.6104
    },

    // add layers to display
    layers: layers
});
/** **/

// Create Space provider
let mySpaceProvider = new SpaceProvider({
    name: 'SpaceProvider',
    level: 1,
    space: 'KjZI17j2',
    credentials: {
        access_token: YOUR_ACCESS_TOKEN
    }
});
// Create data layer with Space provider
let myLayer = new TileLayer({
    name: 'SpaceLayer',
    provider: mySpaceProvider,
    min: 2,
    max: 20
});

// Add the layer to display
display.addLayer(myLayer);

document.querySelector<HTMLButtonElement>('#settagbtn').onclick = function() {
    // set tag for SpaceProvider
    // this example displays different kind of Stadium around the world, you could set tags: baseball, soccer, football to filter these stadiums
    mySpaceProvider.setTags(document.querySelector('input').value);
};
