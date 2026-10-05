import {MVTLayer, TileLayer, SpaceProvider, LocalProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
const display = new Map(document.getElementById('map'), {
    zoomlevel: 19,
    center: {
        longitude: -122.253324,
        latitude: 37.795146
    },
    behavior: {
        // allow map pitch by user interaction (mouse/touch)
        pitch: true,
        // allow map rotation by user interaction (mouse/touch)
        rotate: true
    },
    // set initial map pitch in degrees
    pitch: 50,
    // add a "background" layer
    layers: [new MVTLayer({
        name: 'background layer',
        min: 1,
        max: 20,
        remote: {
            url: 'https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=' + YOUR_API_KEY
        }
    })]
});


const createRandomPoints = (size, vp, maxHeight: number = 100) => {
    const getRandom = (min, max) => Math.random() * (max - min) + min;
    const points = [];
    while (size--) {
        points[size] = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [
                    getRandom(vp.minLon, vp.maxLon),
                    getRandom(vp.minLat, vp.maxLat),
                    Math.round(getRandom(0, maxHeight))
                ]
            }
        };
    }
    return points;
};
/** **/

const pointLayer = new TileLayer({
    min: 1,
    max: 20,
    provider: new LocalProvider(),
    style: {
        styleGroups: {
            Point: [{
                zIndex: 1,
                type: 'Box',
                width: 20,
                fill: '#ffde22',
                stroke: '#fc4f30',
                strokeWidth: 2,
                altitude: true
            }, {
                zIndex: 1,
                // Use a VerticalLine for better visualization of the actual height of the geometry
                type: 'VerticalLine',
                stroke: '#fc4f30'
            }, {
                zIndex: 0,
                // Use a translucent black circle without altitude to act as the "shadow" on the ground plane
                type: 'Circle',
                radius: 3,
                fill: 'black',
                opacity: 0.6,
                alignment: 'map',
                altitude: false
            }]
        },
        assign: (feature, zoom) => feature.geometry.type
    }
});

// create 500 Points with random height in the current viewport.
pointLayer.addFeature(createRandomPoints(500, display.getViewBounds()));

// add the TileLayer to the map
display.addLayer(pointLayer);


