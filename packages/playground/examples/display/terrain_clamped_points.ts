import {TerrainTileLayer, LocalProvider, TileLayer} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
/** setup the Map **/
const display = new Map(document.getElementById('map'), {
    zoomlevel: 13,
    center: {
        longitude: 138.7277362, latitude: 35.3629274
    },
    singleWorldView: true,
    maxPitch: 90,
    pitch: 75,
    rotate: 90,
    behavior: {
        rotate: true,
        pitch: true
    },
    layers: [
        new TerrainTileLayer({
            name: 'terrainLayer',
            min: 2,
            max: 19,
            tileSize: 512,
            elevation: {
                url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
                attribution: {
                    label: 'AWS Terrain',
                    url: 'https://github.com/tilezen/joerd/blob/master/docs/attribution.md'
                },
                encoding: 'terrarium',
                min: 8
            },
            imagery: {
                url: `https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/jpeg?apikey=${YOUR_API_KEY}&style=satellite.day&size=512`,
                attribution: '2025 HERE, Maxar'
            }
        })
    ]
});

const myLayer = new TileLayer({
    min: 2,
    max: 20,
    provider: new LocalProvider()
});
display.addLayer(myLayer);
/** **/

// Add a feature representing Mount Fuji, clamped to terrain elevation.
// Note: The coordinates array contains only longitude and latitude.
// No altitude is specified; elevation is automatically derived from terrain data.
myLayer.addFeature({
    type: 'Feature',
    geometry: {
        type: 'Point',
        coordinates: [138.73, 35.363] // [longitude, latitude] - altitude is omitted
    },
    properties: {
        name: 'Mount Fuji'
    }
}, [{
    zIndex: 0,
    type: 'Sphere',
    radius: 6,
    fill: '#ff7220',
    altitude: 'terrain'
}, {
    zIndex: 2,
    type: 'Text',
    textRef: 'properties.name',
    font: 'bold 16px sans-serif',
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 3,
    altitude: 'terrain',
    offsetZ: 48
}, {
    zIndex: 1,
    type: 'VerticalLine',
    stroke: 'black',
    offsetZ: 48,
    altitude: 'terrain'
}]);
