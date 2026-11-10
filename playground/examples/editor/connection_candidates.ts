import {TileLayer, LocalProvider, ImageProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor, NavlinkShape, ConnectionCandidate, Navlink} from '@here/xyz-maps-editor';

/** setup the Map **/

// Extend LocalProvider to support Navlink features
class MyProvider extends LocalProvider {
    detectFeatureClass(feature) {
        return feature.properties.featureClass;
    }

    readTurnRestriction(from, to) {
        let turn = from.link.prop('turnRestriction') || {};
        let restrictions = turn[from.index ? 'end' : 'start'] || [];
        return restrictions.indexOf(to.link.id) >= 0;
    }

    writeTurnRestriction(restricted, from, to) {
        let turn = from.link.prop('turnRestriction') || {};
        let node = from.index ? 'end' : 'start';
        let restrictions = turn[node] = turn[node] || [];
        let index = restrictions.indexOf(to.link.id);
        if (restricted) {
            if (index == -1) restrictions.push(to.link.id);
        } else if (index >= 0) {
            restrictions.splice(index, 1);
        }
        from.link.prop('turnRestriction', turn);
    }

    readPedestrianOnly(feature) {
        return Boolean(feature.prop('pedestrianOnly'));
    }

    readDirection(feature) {
        return feature.prop('direction') || 'BOTH';
    }

    readZLevels(navlink) {
        return navlink.prop('zLevels') || navlink.geometry.coordinates.map(() => 0);
    }

    writeZLevels(navlink, zLevel) {
        navlink.prop('zLevels', zLevel);
    }

    readFeatureHeight(feature) {
        return feature.properties.height;
    }

    writeFeatureHeight(feature, heightMeter) {
        feature.properties.height = heightMeter;
    }

    readRoutingPosition(feature) {
        return feature.prop('routingPoint');
    }

    readRoutingLink(feature) {
        return feature.prop('routingLink');
    }

    writeRoutingPosition(feature, position) {
        feature.prop('routingPoint', position);
    }

    writeRoutingLink(feature, navlink) {
        feature.prop('routingLink', navlink ? navlink.id : navlink);
    }

    readRoutingProvider(location) {
        return this.id;
    }
}

// Satellite imagery to visualize the real-world road overlap
let satelliteLayer = new TileLayer({
    name: 'satellite',
    min: 1,
    max: 20,
    tileSize: 512,
    provider: new ImageProvider({
        name: 'satelliteProvider',
        url: `https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/jpeg?apikey=${YOUR_API_KEY}&style=satellite.day&size=512`
    })
});

// Use a LocalProvider with editable navlinks
let navlinkLayer = new TileLayer({
    min: 14,
    max: 20,
    provider: new MyProvider({
        editable: true
    }),
    style: {
        styleGroups: {
            // Style for the "street" (blue)
            street: [
                {zIndex: 0, type: 'Line', strokeWidth: 20, stroke: '#1a6dad99'},
                {zIndex: 1, type: 'Line', strokeWidth: 16, stroke: '#4a9fdf99'},
                {zIndex: 10, type: 'Text', textRef: 'properties.name', fill: '#fff', font: '12px sans-serif'}
            ],
            // Style for the "bridge" (red, drawn on top)
            bridge: [
                {zIndex: 2, type: 'Line', strokeWidth: 12, stroke: '#aa33388'},
                {zIndex: 3, type: 'Line', strokeWidth: 8, stroke: '#ee666688'},
                {zIndex: 10, type: 'Text', textRef: 'properties.name', fill: '#fff', font: '12px sans-serif'}
            ],
            // Style for the "approach road" (green)
            approach: [
                {zIndex: 0, type: 'Line', strokeWidth: 14, stroke: '#2a7a3a'},
                {zIndex: 1, type: 'Line', strokeWidth: 10, stroke: '#4ab55a'},
                {zIndex: 10, type: 'Text', textRef: 'properties.name', fill: '#fff', font: '12px sans-serif'}
            ]
        },
        assign: (feature) => feature.properties.roadType || 'street'
    }
});

// setup the Map Display – centered on a Bangkok expressway interchange where roads overlap
const display = new Map(document.getElementById('map'), {
    zoomlevel: 19,
    center: {longitude: 100.525941619, latitude: 13.724953286},
    layers: [satelliteLayer, navlinkLayer]
});

// setup the editor
const editor = new Editor(display, {layers: [navlinkLayer]});
/** **/

// ---- Create the scenario: a highway and an overpass at the same location ----

// "Highway" – horizontal road (lower level)
const street = navlinkLayer.addFeature({
    type: 'Feature',
    geometry: {
        type: 'LineString',
        coordinates: [[100.525207409, 13.725338569], [100.527098836, 13.72594857]]
    },
    properties: {featureClass: 'NAVLINK', name: 'Highway (lower)', roadType: 'street'}
}) as Navlink;

// "Overpass" – also horizontal, same position (upper level road)
const bridge = navlinkLayer.addFeature({
    type: 'Feature',
    geometry: {
        type: 'LineString',
        coordinates: [[100.525207409, 13.725338569], [100.527098836, 13.72594857]]
    },
    properties: {featureClass: 'NAVLINK', name: 'Overpass (upper)', roadType: 'bridge'}
}) as Navlink;

// "On-Ramp" – the road the user will drag to connect to either the highway or overpass
const approach = navlinkLayer.addFeature({
    type: 'Feature',
    geometry: {
        type: 'LineString',
        coordinates: [[100.526004355, 13.724673908], [100.525849151, 13.725330878, 0]]
    },
    properties: {featureClass: 'NAVLINK', name: 'On-Ramp', roadType: 'approach'}
}) as Navlink;

// Disable autoConnect for the approach road so user can choose
approach.behavior({autoConnect: false});

// ---- UI ----

const info = document.getElementById('info');
const candidateList = document.getElementById('candidateList');
let pickerJustOpened = false;

// Listen for dragStop events on NavlinkShapes
editor.addEventListener('dragStop', (event) => {
    const shape = <NavlinkShape>event.target;

    // Only handle NavlinkShape drag events
    if (!shape || shape.class !== 'NAVLINK_SHAPE') return;

    // Get all connection candidates at the shape's position
    const candidates = shape.getConnectionCandidates();

    if (candidates.length > 1) {
        // Multiple candidates found – let the user choose
        info.textContent = candidates.length + ' candidates found! Choose which road to connect to:';
        showCandidatePicker(candidates, shape);
        pickerJustOpened = true;
        setTimeout(() => pickerJustOpened = false, 100);
    } else if (candidates.length === 1) {
        candidates[0].connect();
        info.textContent = 'Connected to "' + (candidates[0].link.prop('name') || candidates[0].link.id) + '"';
    } else {
        info.textContent = 'No connection candidates nearby.';
    }
});

function showCandidatePicker(candidates: ConnectionCandidate[], shape: NavlinkShape) {
    // Position the picker near the shape
    const geo = shape.getLink().coord()[shape.getIndex()];
    const pixel = display.geoToPixel({longitude: geo[0], latitude: geo[1]});

    candidateList.style.left = (pixel.x + 20) + 'px';
    candidateList.style.top = (pixel.y - 10) + 'px';
    candidateList.style.display = 'block';
    candidateList.innerHTML = '';

    // Add an entry for each candidate
    candidates.forEach((candidate, i) => {
        const name = candidate.link.prop('name') || 'Link ' + candidate.link.id;
        const roadType = candidate.link.prop('roadType') || 'unknown';

        const entry = document.createElement('div');
        entry.textContent = (i + 1) + '. ' + name + ' (' + roadType + ', ' + candidate.distance.toFixed(1) + 'm)';
        entry.onclick = () => {
            candidate.connect();
            candidateList.style.display = 'none';
            info.textContent = 'Connected to "' + name + '"';
        };
        candidateList.appendChild(entry);
    });

    // Add a "Cancel" option
    const cancel = document.createElement('div');
    cancel.style.color = '#999';
    cancel.style.fontStyle = 'italic';
    cancel.textContent = 'Cancel';
    cancel.onclick = () => {
        candidateList.style.display = 'none';
        info.textContent = 'Connection cancelled – shape remains unconnected.';
    };
    candidateList.appendChild(cancel);
}

// Hide picker on map click (but not right after opening)
display.addEventListener('pointerup', () => {
    if (!pickerJustOpened) {
        candidateList.style.display = 'none';
    }
});


