import {LocalProvider, TerrainTileLayer, TileLayer} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor, Marker} from '@here/xyz-maps-editor';

// Define a layer to display and edit point features
const markerLayer = new TileLayer({
    min: 1,
    max: 20,
    provider: new LocalProvider({
        editable: true
    }),
    style: {
        styleGroups: {
            Point: [{
                zIndex: 1,
                type: 'Text',
                // Display altitude as label above the point
                text: ({geometry}) => ` ${geometry.coordinates[2].toFixed(2)} m`,
                fill: '#ffde22',
                stroke: '#fc4f30',
                strokeWidth: 5,
                altitude: true,
                offsetZ: 16
            }, {
                zIndex: 0,
                // Draw vertical line from terrain to point to visualize height
                type: 'VerticalLine',
                stroke: '#fc4f30',
                offsetZ: 16
            }, {
                zIndex: 1,
                // Draw a black sphere on the terrain as a shadow
                type: 'Sphere',
                radius: 5,
                fill: 'fc4f30',
                alignment: 'map',
                altitude: true
            }]
        },
        // Assign style group based on geometry type
        assign: (feature, zoom) => feature.geometry.type
    }
});

// Terrain layer with elevation and imagery
const terrainLayer = new TerrainTileLayer({
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
});

// Initialize the map display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 14,
    center: {longitude: 7.618, latitude: 46.619}, // Example location: Zermatt, Matterhorn
    pitch: 65,
    rotate: 30,
    maxPitch: 90,
    singleWorldView: true,
    behavior: {
        rotate: true,
        pitch: true
    },
    layers: [terrainLayer, markerLayer]
});

// Enable editing on the marker layer to make the marker(s) draggable
const editor = new Editor(display, {
    layers: [markerLayer]
});

/**
 * Once the terrain in the current viewport is ready (tiles loaded & decoded),
 * place a marker on the terrain at the center of the screen.
 * The marker will follow the terrain's elevation when dragged.
 */
terrainLayer.addEventListener('viewportReady', function addTerrainMarker() {
    const x = display.getWidth() / 2;
    const y = display.getHeight() / 2;

    // Query terrain elevation at the screen center
    const terrainPoint = display.getTerrainPointAt({x, y});

    if (terrainPoint === null) return;

    const {longitude, latitude, altitude} = terrainPoint;

    // Create a new marker feature at that location
    const marker: Marker = markerLayer.addFeature({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [longitude, latitude, altitude]
        }
    });

    // Enable dragging the marker along the terrain surface
    marker.behavior({dragSurface: 'terrain'});

    // Remove the event listener so this runs only once
    terrainLayer.removeEventListener('viewportReady', addTerrainMarker);
});
