import {MVTLayer, TileLayer, LocalProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
const backgroundLayer = new MVTLayer({
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});
const myLayer2 = new TileLayer({
    min: 2,
    max: 20,
    provider: new LocalProvider({})
});
const myLayer3 = new TileLayer({
    min: 2,
    max: 20,
    provider: new LocalProvider({})
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -122.254528,
        latitude: 37.796249
    },
    // add layers to display
    layers: []
});
/** **/

// if the "zLayer" is not described explicitly in the layer styles
// the display layer order is defining the respective zLayer starting at 1.

// backgroundLayer is the first layer being added
display.addLayer(backgroundLayer);
// myLayer2 is the second layer being added
display.addLayer(myLayer2);
// myLayer3 is the third layer being added
display.addLayer(myLayer3);

// add 2 Points to the second layer "myLayer2" in the display layer order.
// first Point should rendered in red.
// the second point should be rendered in orange on top of point 1.
myLayer2.addFeature({
    type: 'Feature',
    geometry: {
        type: 'Point',
        coordinates: [-122.254528, 37.796249]
    }
}, [{
    // If no zLayer is defined the zLayer depends on the display layer order.
    // Because myLayer2 is the second layer the zLayer property is automatically assigned 2
    // zLayer: 2,
    zIndex: 0, // Indicates the drawing order within a layer (relative to zLayer)
    type: 'Circle',
    radius: 32,
    fill: 'red',
    stroke: 'orange',
    strokeWidth: 3
}]);
myLayer2.addFeature({
    type: 'Feature',
    geometry: {
        type: 'Point',
        coordinates: [-122.2542, 37.796249]
    }
}, [{
    zIndex: 5, // make sure orange circle is drawn on top of red circle (zIndex:0)
    type: 'Circle',
    radius: 32,
    fill: 'orange',
    stroke: 'black',
    strokeWidth: 3
}]);

// add another point to the third layer "myLayer3" in display layer order.
// The fill color should be blue and it should be displayed on top of red circle but below the orange circle.
myLayer3.addFeature({
    type: 'Feature',
    geometry: {
        type: 'Point',
        coordinates: [-122.2544, 37.7965]
    }
}, [{
    zLayer: 2, // we want to "mix" data of myLayer3 within data of myLayer2
    zIndex: 3, // define to be displayed between red circle (zIndex:0) and orange circle (zIndex:5)
    type: 'Circle',
    radius: 32,
    fill: '#2284fc',
    stroke: 'white',
    strokeWidth: 3
}]);
