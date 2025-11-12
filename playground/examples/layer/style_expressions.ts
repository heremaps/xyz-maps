import {MVTLayer} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 2,
    center: {
        longitude: -96.76883, latitude: 39.6104
    },
    // add layers to display
    layers: [
        new MVTLayer({
            name: 'mvt-world-layer',
            remote: {
                url: 'https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=' + YOUR_API_KEY
                // optional settings:
                // max  : 16,     // max level for loading data
                // min  : 1       // min level for loading data
                // tileSize : 512 // 512|256 defines mvt tilesize in case it can't be automatically detected in url..
            },
            min: 1,
            max: 20,

            style: {

                backgroundColor: '#555555',

                definitions: {
                    'isPolygonGeometry': ['==', ['get', '$geometryType'], 'polygon'],
                    'isEarthLayer': ['all', ['==', ['get', '$layer'], 'earth'], ['ref', 'isPolygonGeometry']],
                    'isWaterLayer': ['all', ['==', ['get', '$layer'], 'water'], ['==', ['get', '$geometryType'], 'polygon']],
                    'isLanduseLayer': ['all', ['==', ['get', '$layer'], 'landuse'], ['==', ['get', '$geometryType'], 'polygon']],
                    'isRoadsLayer': ['all', ['==', ['get', '$layer'], 'roads'], ['!=', ['get', 'kind'], 'ferry'], ['!=', ['get', 'kind'], 'rail']],
                    'isBuildingsLayer': ['all', ['==', ['get', '$layer'], 'buildings'], ['ref', 'isPolygonGeometry']]
                },

                styleGroups: {
                    'earth': [{
                        filter: ['ref', 'isEarthLayer'],
                        zIndex: 1,
                        type: 'Polygon',
                        fill: '#555555'
                    }],
                    'water': [{
                        filter: ['ref', 'isWaterLayer'],
                        zIndex: 2,
                        type: 'Polygon',
                        fill: '#353535'
                    }],
                    'landuse': [{
                        filter: ['ref', 'isLanduseLayer'],
                        zIndex: 3,
                        type: 'Polygon',
                        fill: '#666666'
                    }],
                    'roads': [{
                        filter: ['all', ['ref', 'isRoadsLayer'], ['!=', ['get', 'kind'], 'highway']],
                        zIndex: 4,
                        type: 'Line',
                        stroke: '#888',
                        strokeWidth: {14: 1, 15: '4m'}
                    }, {
                        filter: ['all', ['ref', 'isRoadsLayer'], ['==', ['get', 'kind'], 'highway']],
                        zIndex: 5,
                        type: 'Line',
                        stroke: '#aaa',
                        strokeWidth: {14: 1.5, 15: '8m'}
                    }],
                    'buildings': [{
                        filter: ['ref', 'isBuildingsLayer'],
                        zIndex: 7,
                        type: 'Polygon',
                        fill: '#999999',
                        extrude: ['case', ['>', ['get', '$zoom'], 16], ['get', 'height'], null]
                    }]
                }
            }
        })
    ]
});
