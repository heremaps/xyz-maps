import {TerrainTileLayer, TerrainTileLayerStyle} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

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
            // By default, only ambient lighting is applied to the terrain layer.
            // To enhance 3D appearance with shadows and highlights, add a directional light in the style configuration as shown below.
            // You can also use the `exaggeration` property to emphasize terrain elevation.
            // Additionally, you can set `skyColor` and `backgroundColor` in the style to customize the sky and background colors of the map.
            // style: new TerrainTileLayerStyle({
            //     exaggeration: 1,
            //     light: [{
            //         type: 'ambient',
            //         color: 'white',
            //         intensity: 0.3
            //     }, {
            //         type: 'directional',
            //         direction: [0, 1, 1],
            //         color: [1.0, 1.0, 1.0],
            //         intensity: 0.7
            //     }]
            // })
        })
    ]
});
