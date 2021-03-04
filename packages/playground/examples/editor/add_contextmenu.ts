import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';

/** setup the Map **/

// Create a custom provider.
class MyProvider extends SpaceProvider {
    // In this examle, we expect all features are Navlinks.
    detectFeatureClass(feature) {
        return 'NAVLINK';
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
    name: 'Navlink Layer',
    min: 14,
    max: 20,
    // provider to provide navlink
    provider: new MyProvider({
        id: 'Navlinks',
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        level: 14
    })
});
/** **/

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        latitude: 37.796478,
        longitude: -122.25392
    },
    // add layers to display
    layers: [backgroundLayer, navlinkLayer]
});

// setup the editor
const editor = new Editor(display, {
    // enable editing of the navlink layer
    layers: [navlinkLayer]
});

// listen for pointerup events to update and display or hide the context menu on map click.
editor.addEventListener('pointerup', (event) => {
    const contextMenuContainer = <HTMLUListElement>document.querySelector('.contextmenu');

    // hide, in case context menu is already displayed
    contextMenuContainer.style.display = 'none';

    // check if left mouse button is pressed
    if (event.button == 2) {
        // the target of the event is the clicked feature.
        let feature = event.target;

        // if a feature is clicked we update and display the context menu
        if (feature) {
            // display the context menu
            contextMenuContainer.style.display = 'block';

            let contextMenuHtml = '';
            let labels = {
                remove: 'Delete Feature',
                splitLink: 'Split...',
                disconnect: 'Disconnect',
                addShape: 'Add shape point'
            };

            // create the contextmenu entries
            for (var i in labels) {
                if (feature && feature[i] && i != 'constructor') {
                    contextMenuHtml += '<li rel="' + i + '">' + labels[i] + '</li>';
                }
            }
            // add a "Show coordinates" entry to the contextmenu
            contextMenuHtml += '<li rel="showCoords">Show Coordinates</li>';

            // update the context menu
            contextMenuContainer.innerHTML = contextMenuHtml;

            // position the context menu to the clicked position
            contextMenuContainer.style.left = event.mapX + 'px';
            contextMenuContainer.style.top = event.mapY + 'px';

            // add eventlisteners to list entries to execute the respective action on click
            contextMenuContainer.childNodes.forEach((entry) => {
                entry.addEventListener('click', (e) => {
                    const methodName = e.target.attributes.rel.value;

                    switch (methodName) {
                    case 'showCoords':
                        // display the geographical position of the click
                        alert(JSON.stringify(editor.pixelToGeo({x: event.mapX, y: event.mapY})));
                        break;
                    case 'addShape':
                        // add the clicked position as a shape point to the line geometry
                        feature[methodName]({x: event.mapX, y: event.mapY});
                        break;
                    default:
                        // by default we call the method of the feature
                        feature[methodName]();
                    }
                    // hide the context menu
                    contextMenuContainer.style.display = 'none';
                });
            });
        }
    }
});
