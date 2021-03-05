import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor, Crossing} from '@here/xyz-maps-editor';

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
    center: {longitude: -122.286912, latitude: 37.816305},

    // add layers to the display
    layers: [backgroundLayer, navlinkLayer]
});

// setup the editor
const editor = new Editor(display, {layers: [navlinkLayer]});
/** **/

let crossings = [];
let createdNavlink;

// click button to create a navlink with random geometry
document.querySelector<HTMLButtonElement>('#createRoad').onclick = () => {
    // clear existing crossings
    for (let i in crossings) crossings[i].hide();

    let width = display.getWidth();
    let height = display.getHeight();

    // add the navlink feature
    createdNavlink = navlinkLayer.addFeature(
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([
                    {x: width * Math.random(), y: height * Math.random()},
                    {x: width * Math.random(), y: height * Math.random()}
                ])
            },
            properties: {featureClass: 'NAVLINK'}
        },
        // define a custom style
        [{
            zIndex: 10,
            type: 'Line',
            stroke: 'blue',
            strokeWidth: 12
        }]
    );
};

// show all crossings of the just created road with all other roads
document.querySelector<HTMLButtonElement>('#showCrossings').onclick = () => {
    // hide the crossings and revert all changes
    for (var i in crossings) {
        crossings[i].hide();
    }

    // get all crossings with other geometries
    crossings = createdNavlink.checkCrossings();

    // display all crossings
    for (var i in crossings) {
        crossings[i].show();
    }
};

// add a pointerup event listener to show a UI hint and ask
// if all roads of a crossing should be connected (creates a road-intersection) when a crosssing is clicked
editor.addEventListener('pointerup', function(event) {
    let crossing = <Crossing>event.target;
    // make sure a crossing is clicked
    if (crossing && crossing.class.indexOf('CROSSING') > -1) {
        // create the UI hint
        let usersChoice = confirm('Do you want to connect navlink ' + crossing.getLink().id +
            ' and navlink ' + crossing.getRelatedLink().id + '?'
        );
        if (usersChoice) {
            // if user's choice is "yes", connect the crossing navlinks and create a road-intersection automatically
            crossing.connect();
        } else {
            // hide the crossing if user's choice is "no"
            crossing.hide();
        }
    }
});
