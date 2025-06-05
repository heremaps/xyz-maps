import {TerrainTileLayer, TerrainTileLayerStyle} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

const display = new Map(document.getElementById('map'), {
    zoomlevel: 13,
    center: {
        longitude: -122.48024,
        latitude: 37.77326
    },
    behavior: {
        rotate: true,
        pitch: true
    },
    layers: [
        new TerrainTileLayer({
            name: 'terrainLayer',
            min: 2,
            max: 19,
            tileSize: 256,
            elevation: {
                url: 'http://127.0.0.1:3003/terrain/512/{quadkey}.webp',
                encoding: 'terrarium'
            },
            // maxGeometricError: 1,
            imagery: {
                url: `https://maps.hereapi.com/v3/background/mc/{z}/{x}/{y}/png8?apikey=${YOUR_API_KEY}&style=satellite.day&size=256`
            },
            style: new TerrainTileLayerStyle({
                exaggeration: 1,
                light: [{
                    type: 'ambient',
                    color: 'white',
                    intensity: 0.3
                }, {
                    type: 'directional',
                    direction: [0, 1, 1],
                    color: [1.0, 1.0, 1.0],
                    intensity: 0.7
                }]
                // material: {
                //     specular: [0.72, 0.45, 0.2], // copper
                //     shininess: 10
                // }
            })
        })
    ]
});
