import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';

/** setup the Map **/
let backgroundLayer = new MVTLayer({
    min: 1,
    max: 20,
    remote: {
        url: 'https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=' + YOUR_API_KEY
    }
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 19,
    center: {
        longitude: 76.566647, latitude: 8.894019
    },
    behavior: {
        pitch: true,
        rotate: true
    },
    pitch: 30,
    // add layers to the@ display
    layers: [backgroundLayer]
});
// setup the editor
const editor = new Editor(display);

/** **/


class BuildingProvider extends SpaceProvider {
    // to obtain the height of a Building the respective attribute reader must be implemented.
    readFeatureHeight(feature) {
        const {height} = feature.properties;
        return typeof height == 'number' ? height : 50;
    }
    // the Attribute writer stores the modified height and must be implemented to enable height-editing of the building.
    writeFeatureHeight(feature, heightMeter) {
        feature.properties.height = heightMeter;
    }
}

const buildingLayer = new TileLayer({
    min: 15,
    max: 20,
    provider: new BuildingProvider({
        space: 'XhxKLZGL',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        level: 15
    }),
    style: {
        styleGroups: {
            Building: [{
                zIndex: 1,
                type: 'Polygon',
                extrude: (feature) => {
                    const {height} = feature.properties;
                    return typeof height == 'number' ? height : 50;
                },
                fill: '#f00'
            }]
        },
        assign() {
            return 'Building';
        }
    }
});


// display the building layer
display.addLayer(buildingLayer);
// enable editing of the build layer
editor.addLayer(buildingLayer);


