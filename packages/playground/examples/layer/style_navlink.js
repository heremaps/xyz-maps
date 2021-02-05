import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
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
    zoomLevel: 17,
    center: {
        longitude: -122.254528, latitude: 37.796249
    },

    // add layers to display
    layers: [backgroundLayer, myLayer]
});
/** **/

var selectedNavlink;
// new style for selected navlink
var selectedStyle = [
    {zIndex: 0, type: 'Line', stroke: '#AA84A4', strokeWidth: 18, opacity: 0.9},
    {zIndex: 1, type: 'Line', stroke: '#C799E8', strokeWidth: 14, opacity: 0.9},
    {zIndex: 2, type: 'Text', textRef: 'properties.name', fill: '#3D272B'}
];

document.querySelector('#style').onclick = function() {
    // restore default feature style
    if (selectedNavlink) {
        myLayer.setStyleGroup(selectedNavlink);
    }

    // get navlinks in viewport
    let navlinks = myLayer.search({rect: display.getViewBounds()});

    // select one navlink to style
    selectedNavlink = navlinks[Math.floor(navlinks.length * Math.random())];

    // set new style for selected navlink
    myLayer.setStyleGroup(selectedNavlink, selectedStyle);
};
