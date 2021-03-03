import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -122.254528,
        latitude: 37.796249
    },
    // add layers to display
    layers: [new MVTLayer({
        min: 1,
        max: 20,
        remote: {
            url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
        }
    })]
});
/** **/

const myLayer = new TileLayer({
    min: 2,
    max: 20,
    provider: new SpaceProvider({
        level: 2,
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        }
    }),
    style: {
        styleGroups: {
            'line': [{
                zIndex: 0,
                type: 'Line',
                // StyleZoomRange <zoomlevel,value>
                // for intermediate zoom levels will be interpolated linearly
                strokeWidth: {
                    // zoom 2px for zoomlevel 1 to 13
                    14: 2, // 2px at zoomlevel 14
                    17: 18, // 18px at zoomlevel 17
                    20: 44 // 44px at zoomlevel 20
                },
                // zoomRanges can also be applied to colors
                stroke: {
                    10: 'red',
                    20: 'blue'
                }
            }]
        },
        assign: function(feature, zoomlevel) {
            return 'line';
        }
    }
});

// add the TileLayer to the display
display.addLayer(myLayer);
