import {MVTLayer, TileLayer, LocalProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
// Create TileLayer using a LocalProvider
var myLayer = new TileLayer({
    min: 2,
    max: 20,
    provider: new LocalProvider()
});
// setup the Map Display
var display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {longitude: -122.31957, latitude: 37.7881},
    // add layers to display
    layers: [
        new MVTLayer({
            name: 'background layer',
            min: 1,
            max: 20,
            remote: {
                url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
            }
        }),
        myLayer
    ]
});
/** **/

myLayer.addFeature({
    type: 'Feature',
    geometry: {
        type: 'LineString',
        coordinates: [[-122.325, 37.7903], [-122.32321, 37.78718], [-122.32048, 37.78454], [-122.318, 37.78587], [-122.32, 37.787], [-122.32257, 37.79021], [-122.32020, 37.79074], [-122.31768, 37.79042], [-122.31760, 37.78880], [-122.31812, 37.78718], [-122.31693, 37.7867], [-122.31529, 37.78853], [-122.31320, 37.78965], [-122.3119, 37.78997], [-122.31126, 37.78906], [-122.31148, 37.78706], [-122.31299, 37.78637], [-122.31276, 37.78544], [-122.31634, 37.7848]]
    }
}, [{
    zIndex: 0,
    type: 'Line',
    stroke: '#dd4848',
    strokeWidth: 8
}, {
    zIndex: 1,
    type: 'Line',
    stroke: '#1893d9',
    // offset line by 10px to the right side (relative to the direction of the line geometry)
    offset: 10,
    strokeWidth: 2
}, {
    zIndex: 1,
    type: 'Line',
    stroke: '#54c121',
    // offset line by 10px to the left side (relative to the direction of the line geometry)
    offset: -10,
    strokeWidth: 2
}]
);
