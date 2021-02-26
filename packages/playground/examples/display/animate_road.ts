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
let myLayer = new TileLayer({
    min: 2,
    max: 20,
    provider: new SpaceProvider({
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        level: 2
    })
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 15,
    center: {
        longitude: -122.366168, latitude: 37.814324
    },

    // add layers to display
    layers: [backgroundLayer, myLayer]
});
/** **/

let startTs;

const startAnimation = (e) => {
    // get the line we want to animate
    let line = myLayer.search('zyrABIMLWLaSHIkz');

    myLayer.setStyleGroup(line, [{
        zIndex: 1,
        type: 'Line',
        stroke: 'blue',
        strokeWidth: 8,
        from: 0.0,
        to: (feature) => {
            let duration = 10_000;
            let now = Date.now();
            let elapsed = (now - startTs) % duration;
            return elapsed / duration;
        }
    }]);

    startTs = Date.now();
    animationLoop();

    myLayer.removeEventListener('viewportReady', startAnimation);
};

// when the layer is ready we start the animation
myLayer.addEventListener('viewportReady', startAnimation);

const animationLoop = () => {
    display.refresh(myLayer);
    requestAnimationFrame(animationLoop);
};
