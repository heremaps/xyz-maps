import {TerrainTileLayer, LocalProvider, TileLayer, BoxStyle} from '@here/xyz-maps-core';
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

const createRandomPoints = (size, center, radiusMeters = 5_000) => {
    const metersPerDegLat = 111320;
    const metersPerDegLon = 40075000 * Math.cos(center.latitude * Math.PI / 180) / 360;
    const points = [];
    for (let i = 0; i < size; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const r = Math.sqrt(Math.random()) * radiusMeters;
        const dLat = (r * Math.sin(angle)) / metersPerDegLat;
        const dLon = (r * Math.cos(angle)) / metersPerDegLon;
        points.push([center.longitude + dLon, center.latitude + dLat]);
    }
    return [{
        type: 'Feature',
        geometry: {
            type: 'MultiPoint',
            coordinates: points
        }
    }];
};

document.querySelector<HTMLButtonElement>('#createRandomPoints').onclick = function() {
    const points = createRandomPoints(1000, display.getCenter());
    const style = [{
        zIndex: 0,
        type: 'Box',
        width: 8,
        stroke: '#de0d8a',
        fill: '#de0d8a',
        altitude: 'terrain'
    } as BoxStyle];
    points.forEach((point, index) => myLayer.addFeature(point, style));
};
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
