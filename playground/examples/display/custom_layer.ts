import {MVTLayer, CustomLayer, webMercator} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';


/** setup the map and "basemap" layer **/
const baseMapLayer = new MVTLayer({
    name: 'mvt-world-layer',
    remote: {
        url: 'https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=' + YOUR_API_KEY
    },
    style: {
        backgroundColor: '#ECE0CA',

        styleGroups: {
            'landuse': [{zIndex: 0, type: 'Polygon', fill: '#ECE0CA'}],
            'pier': [{zIndex: 1, type: 'Polygon', fill: '#ECE0CA', stroke: '#c8b89d', strokeWidth: 2}],
            'park': [{zIndex: 1, type: 'Polygon', fill: '#c8dd97'}],
            'nature_reserve': [{zIndex: 1, type: 'Polygon', fill: '#dadeb0'}],
            'hospital': [{zIndex: 1, type: 'Polygon', fill: '#f3d3d3'}],
            'water': [{zIndex: 2, type: 'Polygon', fill: 'rgb(120,188,237)'}],
            'path': [{zIndex: 3, type: 'Line', stroke: '#c8b89d', strokeWidth: '1m'}],
            'tunnel': [{zIndex: 3, type: 'Line', stroke: '#ffffff', strokeWidth: {15: 4, 20: 16}, strokeDasharray: [4, 4]}],
            'ferry': [{zIndex: 4, type: 'Line', stroke: '#164ac8', strokeWidth: 1}],
            'highway': [{zIndex: 5, type: 'Line', stroke: 'white', repeat: 128, strokeWidth: {10: 1.5, 15: 4, 16: '12m'}}],
            'boundaries': [{zIndex: 6, type: 'Line', stroke: '#b3b1ad', strokeWidth: {10: 0.5, 20: 2}}],
            'buildings': [{
                zIndex: 7, type: 'Polygon', fill: 'rgba(170,170,170,0.7)', stroke: 'rgba(30,30,30,0.7)',
                // define extrude in meters to display polygons with extrusion
                extrude: (feature) => feature.properties.height || 0,
                // define the base of the extrusion in meters offset from the ground
                extrudeBase: (feature) => feature.properties.min_height || 0
            }],
            'roads': [{zIndex: 4, type: 'Line', stroke: '#ffffff', strokeWidth: {15: 1, 16: '5m'}}, {
                zIndex: 6, type: 'Text', fill: '#222222',
                font: '12px sans-serif',
                strokeWidth: 4,
                stroke: 'white', text: (f) => f.properties.name,
                // Minimum distance in pixel between repeated text labels on line geometries.
                // Applies per tile only. Default is 256 pixel.
                repeat: 128,
                // Alignment for Text. "map" aligns to the plane of the map.
                alignment: 'map',
                // Text with a higher priority (lower value) will be drawn before lower priorities (higher value)
                // make sure "road labels" are drawn after "place labels".
                priority: 2
            }],
            'places': [{
                zIndex: 8,
                type: 'Text',
                text: (f) => f.properties.name,
                stroke: 'black',
                fill: 'white',
                font: '18px sans-serif',
                strokeWidth: 4,
                // set collide property to false to enable label collision detection [default]
                collide: false,
                // Alignment for Text. "viewport" aligns to the plane of the viewport/screen.
                alignment: 'viewport',
                // Text with a higher priority (lower value) will be drawn before lower priorities (higher value)
                // In case of "place label" and "road label" are colliding "place label" will be draw
                // because priority 1 is smaller than priority 2
                priority: 1
            }]
        },

        assign: (feature, zoom) => {
            const props = feature.properties;
            const kind = props.kind;
            const layer = props.$layer; // the name of the layer in the mvt datasource.
            const geom = feature.geometry.type;

            if (layer == 'landuse') {
                switch (kind) {
                case 'pier':
                    return 'pier';
                case 'nature_reserve':
                    return 'nature_reserve';
                case 'park':
                case 'garden':
                case 'pedestrian':
                case 'forrest':
                    return 'park';
                case 'hospital':
                    return 'hospital';
                default:
                    return 'landuse';
                }
            }

            if (layer == 'water') {
                if (geom == 'LineString' || geom == 'MultiLineString') {
                    return;
                }
            } else if (layer == 'roads') {
                if (kind == 'rail' || kind == 'ferry') {
                    return;
                }
                if (props.is_tunnel && zoom > 13) {
                    return 'tunnel';
                }
                if (kind == 'highway' || kind == 'path') {
                    return kind;
                }
            }
            return layer;
        }
    }
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {longitude: -80.62089, latitude: 28.627275},
    behavior: {
        // allow map pitch by user interaction (mouse/touch)
        pitch: true,
        // allow map rotation by user interaction (mouse/touch)
        rotate: true
    },
    // set initial map pitch in degrees
    pitch: 50,
    // set initial map rotation in degrees
    rotate: 30,

    layers: [baseMapLayer]
});

declare const THREE: any;
/** **/

const mapCenter = display.getCenter();

// place the model in the center of the map
const modelPosition = [mapCenter.longitude, mapCenter.latitude, 0];

// project to webMercator coordinates with a world size of 1.
const modelPositionProjected = {
    x: webMercator.lon2x(modelPosition[0], 1),
    y: webMercator.lat2y(modelPosition[1], 1),
    z: webMercator.alt2z(modelPosition[2], modelPosition[1])
};
// get the scale to convert from meters to pixel in webMercator space
const scaleMeterToPixel = 1 / webMercator.earthCircumference(mapCenter.latitude);

// transform the model to fit map
const modelTransformation = {
    translateX: modelPositionProjected.x,
    translateY: modelPositionProjected.y,
    translateZ: modelPositionProjected.z,
    rotateX: Math.PI / 2,
    scale: scaleMeterToPixel
};


// Use Threejs as an example of a custom renderer that's being integrated into the map by using the "CustomLayer" functionality.
class MyCustomLayer extends CustomLayer {
    min = 10;
    max = 20;

    renderOptions = {
        mode: '3d',
        zLayer: 1,
        zIndex: 7
    };

    onLayerAdd(ev) {
        const {detail} = ev;
        const {canvas, context} = detail;

        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();

        // load the model
        const loader = new THREE.GLTFLoader();
        loader.load(
            'https://s3.eu-west-1.amazonaws.com/xyz-maps.cpdev.aws.in.here.com/public/playground/assets/models/ML_HP/ML_HP.gltf',
            (gltf) =>{
                this.scene.add(gltf.scene);
                display.refresh(this);
            }
        );

        // Use two Directional lights to illuminate the model
        const light1 = new THREE.DirectionalLight(0xffffff);
        light1.position.set(200, 150, 50);
        this.scene.add(light1);

        const light2 = new THREE.DirectionalLight(0xffffff);
        this.scene.add(light2);

        this.renderer = new THREE.WebGLRenderer({canvas, context});
        this.renderer.autoClear = false;
    };

    render(context: WebGLRenderingContext, matrix) {
        const rotX = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(1, 0, 0),
            modelTransformation.rotateX
        );

        const modelMatrix = new THREE.Matrix4()
            .makeTranslation(
                modelTransformation.translateX,
                modelTransformation.translateY,
                modelTransformation.translateZ
            )
            .scale(
                new THREE.Vector3(
                    modelTransformation.scale,
                    -modelTransformation.scale,
                    modelTransformation.scale
                )
            )
            .multiply(rotX);


        this.camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(modelMatrix);
        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);
    }

    camera: any;
    scene: any;
    renderer: any;
};


const myCustomLayer = new MyCustomLayer();

display.addLayer(myCustomLayer);
