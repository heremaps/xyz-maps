import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';

/** setup the Map **/
// Create a custom provider.
class MyProvider extends SpaceProvider {
    // In this exmaple, all data does already contain desired feature class in the property 'featureClass'.
    detectFeatureClass(feature) {
        return feature.properties.featureClass;
    }

    // ########################       Navlink      ########################
    // Following functions are only necessary if you want to edit Navlink.

    // In addition to Lines, Navlinks have navigation information and are connected to each other to form a road network.
    // Implementing following functions enables you to easily edit Navlinks.

    // This function returns a boolean value to indicate if turn from from-link's shape point to to-link's shape point
    // is restricted.
    // It takes two arguments ('from' and 'to' in this example), they have the same data structure:
    // {
    //     'link': Navlink,
    //     'index': Number
    // }
    // 'link': Navlink to turn from and into.
    // 'index': index of Navlink's shape point, it specifies the shape point where turn takes place.
    // In this example, turn restriction information is stored in from-link, we read this information and determin if the
    // turn is restricted.
    readTurnRestriction(from, to) {
        let turn = from.link.prop('turnRestriction') || {};
        // first shape point is 'start' and the last one is 'end'
        let restrictions = turn[from.index ? 'end' : 'start'] || [];

        return restrictions.indexOf(to.link.id) >= 0;
    };

    // This function stores turn restriction information for turn from from-link to to-link.
    // It takes arguments ('restricted', 'from' and 'to' in this example) similar to that of above function, but its first
    // argument is a boolean value for indicating the turn is (or is not) restricted.
    // In this example, we store turn restriction information as following object in from-link:
    // {
    //     'start': Array<String>  // Array of Navlink id
    //     'end': Array<String>    // Array of Navlink id
    // }
    // 'start' and 'end' refer to first and last shape point of from-link.
    // Their values are array of Navlink ids, you are not allowed to turn from from-link's start (or end) shape point into
    // any Navlink that is in this array.
    writeTurnRestriction(restricted, from, to) {
        let turn = from.link.prop('turnRestriction') || {};
        let node = from.index ? 'end' : 'start';
        let restrictions = turn[node] = turn[node] || [];
        let index = restrictions.indexOf(to.link.id);

        if (restricted) {
            if (index == -1) {
                restrictions.push(to.link.id);
            }
        } else if (index >= 0) {
            restrictions.splice(index, 1);
        }

        from.link.prop('turnRestriction', turn);
    }

    // Indicate if the Navlink is pedestrian only, it's not allowed to turn into a pedestrian only Navlink.
    readPedestrianOnly(feature) {
        return Boolean(feature.prop('pedestrianOnly'));
    }

    // Navlink's direction indicates if the Navlink is a one-way road.
    // Valid values are:
    // 'BOTH': the Navlink is a two-way road.
    // 'START_TO_END': the Navlink is a one-way road with travel direction from its first to last shape point.
    // 'END_TO_START': the Navlink is a one-way road with travel direction from its last to first shape point.
    // It's not allowed to turn into one Navlink with direction 'END_TO_START' at its start (first) shape point or turn into
    // one Navlink with direction 'START_TO_END' at its end (last) shape point.
    readDirection(feature) {
        return feature.prop('direction') || 'BOTH';
    }

    readZLevels(navlink) {
        return navlink.prop('zLevels') || navlink.geometry.coordinates.map((c) => 0);
    }

    writeZLevels(navlink, zLevel) {
        navlink.prop('zLevels', zLevel);
    }
}

let backgroundLayer = new MVTLayer({
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});
let navlinkLayer = new TileLayer({
    min: 14,
    max: 20,
    // Customized provider to provide navlink navlinks
    provider: new MyProvider({
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        level: 14
    })
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -122.283766, latitude: 37.818477
    },
    // add layers to display
    layers: [backgroundLayer, navlinkLayer]
});

// setup the editor
const editor = new Editor(display);

// add the navlink layer to the editor to enable editing for the layer
editor.addLayer(navlinkLayer);
/** **/

// click the button to add multiple navlinks to the zoneselector utility.
document.querySelector<HTMLButtonElement>('#showButton').onclick = function() {
    let navlink1 = editor.getFeature('9ndDAW9aucl1in0U', navlinkLayer);
    let navlink2 = editor.getFeature('ti6x4OFInG69Hg6Q', navlinkLayer);
    let navlink3 = editor.getFeature('7IYfa7jAHsDv5oK7', navlinkLayer);
    let navlink4 = editor.getFeature('iOU1RzXGb2UZitda', navlinkLayer);

    // Add Navlinks to the zone Selector
    let zoneSelector = editor.getZoneSelector();
    zoneSelector.add([navlink1, navlink2, navlink3, navlink4]);

    // define 3 Zones with 3 diffrent sides and display them
    zoneSelector.show({
        from: 0.1,
        to: 0.3,
        side: 'L', // left
        style: {stroke: '#ff4040'},
        dragStop: onDragEndHandler
    }, {
        from: 0.45,
        to: 0.65,
        side: 'B', // both
        style: {stroke: '#35b2ee'},
        dragStop: onDragEndHandler
    }, {
        from: 0.75,
        to: 0.9,
        side: 'R', // right
        style: {stroke: '#4cdd4c'},
        dragStop: onDragEndHandler
    });
};

const infoElement = <HTMLDivElement>document.querySelector('#info');
// update the info box with updated zone information when a zone marker gets dragged
const onDragEndHandler = (ev) => {
    // the modified zone
    let zone = ev.detail.zone;
    // simplify for displaying in the infobox
    zone.segments = zone.segments.map((seg) => {
        let simpleSegment = {...seg};
        simpleSegment.navlink = simpleSegment.navlink.id;
        return simpleSegment;
    });

    infoElement.innerText = JSON.stringify(zone, undefined, 4);
};

// hide the zone selector utility
document.querySelector<HTMLDivElement>('#hideButton').onclick = function() {
    let zoneSelector = editor.getZoneSelector();
    zoneSelector.hide();
    infoElement.innerText = 'Zone Info';
};
