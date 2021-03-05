import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor, Line} from '@here/xyz-maps-editor';

/** setup the Map **/
let backgroundLayer = new MVTLayer({
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});
let navlinkLayer = new TileLayer({
    min: 14,
    max: 20,
    // Customized provider to provide navlinks
    provider: new SpaceProvider({
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        level: 14
    })
});

// setup the Map Display
var display = new Map(document.getElementById('map'), {
    zoomlevel: 18,
    center: {
        longitude: -122.287607, latitude: 37.819121
    },

    // add layers to display
    layers: [backgroundLayer, navlinkLayer]
});

// setup the editor
const editor = new Editor(display, {layers: [navlinkLayer]});
/** **/

editor.addEventListener('pointerup', (e) => {
    // get the clicked feature
    let feature = <Line>e.target;
    // check if we clicked a Line feature
    if (feature && feature.class == 'LINE') {
        // start the transformer utility
        feature.transform();
    }
});


// click the revert button to revert all changes that have been done
document.querySelector<HTMLButtonElement>('#revert').onclick = () => {
    editor.revert();
};
