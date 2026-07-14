import {MVTLayer} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

// This example demonstrates the `singleWorldView` option,
// which controls whether the map repeats infinitely when zoomed out.
// It has the following options:

// - `true`: Restricts repetition on both latitude (Y-axis) and longitude (X-axis).
// - `false`: Allows infinite repetition on both axes.
// - `'latitude'`: Restricts repetition only on the latitude (Y-axis), allowing infinite panning on the X-axis.
// - `'both'`: Restricts repetition on both latitude and longitude axes.

// When set to `true` or `'latitude'`, zooming out is limited to prevent the map from repeating, allowing it to cover the entire visible area without repetition.

// In this example, `singleWorldView: true` ensures that the world is displayed only once at the maximum zoom-out level,
// and repetition is restricted on both axes (latitude and longitude).

const display = new Map(document.getElementById('map'), {
    zoomlevel: 2,
    center: {
        longitude: -122.48024,
        latitude: 37.77326
    },
    layers: [
        new MVTLayer({
            min: 1,
            max: 20,
            remote: {
                url: 'https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=' + YOUR_API_KEY
            }
        })
    ],
    // Restricts repetition on both latitude and longitude axes. Zoom-out is limited to prevent the map from repeating.
    singleWorldView: true
});
