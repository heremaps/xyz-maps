import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
const display = new Map(document.getElementById('map'), {
    zoomlevel: 19,
    center: {
        longitude: -122.253324,
        latitude: 37.795146
    },
    // add a "background" layer
    layers: [new MVTLayer({
        name: 'background layer',
        min: 1,
        max: 20,
        remote: {
            url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
        }
    })]
});
/** **/

const placeLayer = new TileLayer({
    min: 14,
    max: 20,
    provider: new SpaceProvider({
        level: 14,
        space: '6CkeaGLg',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        // this simple preprocessor is adding a horizontal line in the center of each Point geometry.
        preProcessor: (input) => {
            var features = input.data;
            for (var i = 0; i < features.length; i++) {
                var geometry = features[i].geometry;
                if (geometry.type == 'Point') {
                    var coordinate = geometry.coordinates;
                    features.push({
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: [
                                [coordinate[0] - .00005, coordinate[1]],
                                [coordinate[0] + .00005, coordinate[1]]
                            ]
                        }
                    });
                }
            }
            return features;
        }
    }),
    style: {
        styleGroups: {
            Point: [{zIndex: 1, type: 'Circle', radius: 10, fill: '#ffde22', stroke: '#fc4f30', strokeWidth: 3}],
            LineString: [{zIndex: 0, type: 'Line', strokeWidth: 8, stroke: '#fc4f30'}]
        },
        assign: (feature, zoom) => feature.geometry.type
    }
});

// add the TileLayer to the map
display.addLayer(placeLayer);
