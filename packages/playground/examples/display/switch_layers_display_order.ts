import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
// configure layers
var layers = [
    new MVTLayer({
        name: 'BackgroundLayer',
        min: 1,
        max: 20,
        remote: {
            url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
        }
    }),
    new TileLayer({
        name: 'MyBuildingLayer',
        min: 15,
        max: 20,
        provider: new SpaceProvider({
            level: 15,
            space: 'XhxKLZGL',
            credentials: {
                access_token: YOUR_ACCESS_TOKEN
            }
        }),
        style: {
            styleGroups: {
                style: [
                    {zIndex: 1, type: 'Polygon', fill: '#008800', opacity: 0.8}
                ]
            },
            assign: function(feature) {
                return 'style';
            }
        }
    }),
    new TileLayer({
        name: 'MyPlaceLayer',
        min: 14,
        max: 20,
        provider: new SpaceProvider({
            level: 14,
            space: '6CkeaGLg',
            credentials: {
                access_token: YOUR_ACCESS_TOKEN
            }
        }),
        style: {
            styleGroups: {
                style: [
                    {
                        'zIndex': 0,
                        'type': 'Circle',
                        'radius': 12,
                        'strokeWidth': 2,
                        'stroke': '#FFFFFF',
                        'fill': '#1188DD'
                    }
                ]
            },
            assign: function(feature) {
                return 'style';
            }
        }
    })
];
// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 18,
    center: {
        longitude: -122.227145, latitude: 37.779873
    },
    // add layers to display
    layers: layers
});
/** **/

const updateLayerInfo = () => {
    document.querySelector<HTMLDivElement>('#info').innerText = 'layer order:\n\n' +
        display.getLayers().map((layer, i) => i + ': ' + layer.name).join('\n');
};
// show the current layer order
updateLayerInfo();

// add a onclick event handler to the switchlayerbutton
document.querySelector<HTMLButtonElement>('#switchlayerbutton').onclick = function() {
    // Get the layer at layer index 1 (middle layer in this layer configuration)
    let layer = display.getLayers(1);
    // remove this layer from current map
    display.removeLayer(layer);
    // add the layer to the map again to add and display it on top of all other layers
    display.addLayer(layer);

    // show updated layer order
    updateLayerInfo();
};


