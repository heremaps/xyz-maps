import { Color as Color_2 } from '@here/xyz-maps-core';
import { CustomLayer } from '@here/xyz-maps-core';
import { Feature } from '@here/xyz-maps-core';
import { GeoJSONFeature } from '@here/xyz-maps-core';
import { GeoJSONFeatureCollection } from '@here/xyz-maps-core';
import { GeoPoint } from '@here/xyz-maps-core';
import { GeoRect } from '@here/xyz-maps-core';
import { Layer } from '@here/xyz-maps-core';
import { PixelPoint } from '@here/xyz-maps-core';
import { PixelRect } from '@here/xyz-maps-core';
import { Style } from '@here/xyz-maps-core';
import { StyleGroup } from '@here/xyz-maps-core';
import { StyleZoomRange } from '@here/xyz-maps-core';
import { TileLayer } from '@here/xyz-maps-core';

/**
 * XYZ Map is a highly customizable WebGL based vector map display that's optimized for map editing, larger raw datasets and frequently changing data.
 */
declare class Map_2 {





































    /**
     * @param mapEl - HTMLElement used to create the map display
     * @param options - options to configure for the map
     *
     * @example
     * ```typescript
     * import {Map} from '@here/xyz-maps-display';
     *
     * //create map display
     * const display = new Map( mapDiv, {
     *     zoomLevel : 19,
     *     center: {
     *         longitude: 8.53422,
     *         latitude: 50.16212
     *     },
     *     // add layers to display
     *     layers: layers
     * });
     * ```
     */
    constructor(mapEl: HTMLElement, options: MapOptions);







    /**
     * Set or get map pitch (tilt) in degrees
     *
     * @param pitch - pitch in degrees
     */
    pitch(pitch?: number): number;
    /**
     * Set or get map rotation along z-axis
     *
     * @param rotation - set absolute map rotation in degrees
     *
     * @returns current applied rotation in degrees
     */
    rotate(rotation?: number): number;
    /**
     * Set the background color of the map
     *
     * @param color - the background color to set
     */
    setBackgroundColor(color: Color_2): void;
    /**
     * Adds an event listener to the map.
     * supported events: 'mapviewchangestart', 'mapviewchange', 'mapviewchangeend', 'resize',
     * 'tap', 'dbltap', 'pointerup', 'pointerenter', 'pointerleave', 'pointerdown', 'pointermove', 'pressmove'
     *
     * @param type - A string representing the event type to listen for.
     * @param listener - the listener function that will be called when an event of the specific type occurs
     */
    addEventListener(type: string, listener: (e: MapEvent) => void): void;
    /**
     * Removes an event listener to the map.
     *
     * @param type - A string representing the event type to listen for.
     * @param listener - The EventListener function of the event handler to remove from the editor.
     */
    removeEventListener(type: string, listener: (e: MapEvent) => void): void;
    /**
     * Gets the current view bounds of the view port.
     */
    getViewBounds(): GeoRect;
    /**
     * Set view bounds for the map to display.
     *
     * @param bounds - GeoRect, GeoJson Feature or an GeoJson bbox [minLon, minLat, maxLon, maxLat] defining the view bounds.
     * @param animate - animate using a bow animation @see {@link Map.flyTo}. true to enable, false to disable.
     */
    setViewBounds(bounds: GeoRect | [number, number, number, number] | GeoJSONFeature | GeoJSONFeature[] | GeoJSONFeatureCollection, animate?: boolean): any;
    /**
     * Set view bounds for the map to display.
     *
     * @param bounds - GeoRect, GeoJson Feature or an GeoJson bbox [minLon, minLat, maxLon, maxLat] defining the view bounds.
     * @param animationOptions - options to configure the bow animation @see {@link Map.flyTo}.
     */
    setViewBounds(bounds: GeoRect | [number, number, number, number] | GeoJSONFeature | GeoJSONFeature[] | GeoJSONFeatureCollection, animationOptions?: {
        /**
         * the duration of the bow animation in milliseconds
         */
        duration?: number;
    }): any;
    /**
     * Get most top rendered feature within the given area of map
     *
     * @param position - Point or Rect in pixel to define search area.
     * If a Point is used, width and height must be passed in options parameter.
     *
     * @param options - Describing the options param
     *
     * @returns The result providing found feature and layer.
     * undefined is returned if nothing is found.
     */
    getFeatureAt(position: PixelPoint | PixelRect, options?: {
        /**
         * width in pixel of rectangle if point geometry is used.
         */
        width?: number;
        /**
         * height in pixel of rectangle if point geometry is used.
         */
        height?: number;
        /**
         * defines the layer(s) to search in.
         */
        layers?: TileLayer | TileLayer[];
    }): {
        feature: Feature;
        layer: TileLayer;

    } | undefined;
    /**
     * Get rendered features within the given area of map
     *
     * @param position - Point or Rect in pixel to define search area.
     * If a Point is used, width and height must be passed in options parameter.
     *
     * @param options - Describing the options param
     *
     * @returns zIndex ordered results array
     */
    getFeaturesAt(position: PixelPoint | PixelRect, options?: {
        /**
         * width in pixel of rectangle if point geometry is used.
         */
        width?: number;
        /**
         * height in pixel of rectangle if point geometry is used.
         */
        height?: number;
        /**
         * defines the layer(s) to search in.
         */
        layers?: TileLayer | TileLayer[];

    }): {
        features: Feature[];
        layer: TileLayer;

    }[];
    /**
     * Take a snapshot of the current map's viewport.
     *
     * @param callback - Callback function that will be called when the requested snapshot has been captured.
     * @param dx - x coordinate of the left edge of the capturing rectangle in pixel
     * @param dy - y coordinate of the top edge of the capturing rectangle in pixel
     * @param width - width of the capturing rectangle in pixel
     * @param height - height of the capturing rectangle in pixel
     *
     */
    snapshot(callback: (
    /**
     * A HTMLCanvasElement containing the requested screenshot.
     */
    screenshot: HTMLCanvasElement) => void, dx?: number, dy?: number, width?: number, height?: number): void;
    /**
     * Get current active map behavior options.
     */
    getBehavior(): {
        /**
         * indicates if map zooming is enabled or disabled.
         */
        zoom: boolean;
        /**
         * indicates if map dragging is enabled or disabled.
         */
        drag: boolean;
        /**
         * indicates if map pitching is enabled or disabled.
         */
        pitch: boolean;
        /**
         * indicates if map rotation is enabled or disabled.
         */
        rotate: boolean;
    };
    /**
     * Set the map behavior on user interaction.
     *
     * @example
     * ```typescript
     * // to deactivate map zoom on mouse scroll:
     * setBehavior({zoom: false, drag: true});
     * ```
     *
     * @param options - Behavior options
     */
    setBehavior(options: {
        /**
         * true to enable map zooming, false to disable.
         */
        zoom?: boolean;
        /**
         * true to enable map dragging, false to disable.
         */
        drag?: boolean;
        /**
         * true to enable map pitching, false to disable.
         */
        pitch?: boolean;
        /**
         * true to enable map rotation, false to disable.
         */
        rotate?: boolean;
    }): void;
    /**
     * Enable/Disable a specific map behavior on user interaction.
     * Possible behavior are: "zoom", "drag", "pitch" and "rotate
     *
     * @example
     * ```typescript
     * // to deactivate map zoom on mouse scroll:
     * setBehavior('zoom',true);
     * ```
     *
     * @param behavior - the behavior that should be disabled or enabled.
     * @param active - true to enable, false to disable
     */
    setBehavior(behavior: string, active: boolean): any;
    /**
     * Get the current zoom level
     *
     * @returns the current zoom level of the map
     */
    getZoomlevel(): number;
    /**
     * Set zoomlevel with an optional anchor point.
     *
     * @param zoomTo - new zoomlevel
     * @param fixedX - x coordinate of fixed anchor point on screen in pixels
     * @param fixedY - y coordinate of fixed anchor point on screen in pixels
     * @param animate - zoom transition animation time in milliseconds [default: 0]
     */
    setZoomlevel(zoomTo: number, fixedX?: number, fixedY?: number, animate?: number): void;
    /**
     * Set new geographical center for the map.
     *
     * @param center - the geographical coordinate to center the map
     *
     * @example
     * ```typescript
     * display.setCenter({longitude: 8.53422, latitude: 50.16212});
     * ```
     */
    setCenter(center: GeoPoint): any;
    /**
     * Set new geographical center for the map.
     *
     * @param logitude - longitude to center the map
     * @param latitude - latitude to center the map
     *
     * @example
     * ```typescript
     * display.setCenter(8.53422, 50.16212);
     * ```
     */
    setCenter(longitude: number | GeoPoint, latitude: number): any;
    /**
     * Get the current geographical center of the map.
     *
     * @returns the map's geographical center point.
     */
    getCenter(): GeoPoint;
    /**
     * Set the map center using a bow animation combining pan and zoom operations.
     *
     * @param center - the geographical coordinate to center the map.
     * @param options - options to configure the bow animation
     */
    flyTo(center: GeoPoint, options?: {
        /**
         * the duration of the bow animation in milliseconds
         */
        duration?: number;
    }): any;
    /**
     * Set the map center and zoomlevel using a bow animation combining pan and zoom operations.
     *
     * @param center -  the geographical coordinate to center the map.
     * @param zoomTo - the zoomlevel the map should be zoomed to.
     * @param options - options to configure the bow animation
     */
    flyTo(center: GeoPoint, zoomTo: number, options?: {
        /**
         * the duration of the bow animation in milliseconds
         */
        duration?: number;
    }): any;
    /**
     * get the current applied lock status of the map.
     *
     * @returns the current applied lock options.
     */
    lockViewport(): {
        pan: boolean;
        minLevel: number;
        maxLevel: number;
    };
    /**
     * set lock the viewport of the map.
     * by indicating if panning, minLevel and maxLevel should be locked.
     *
     * @param options - the lock options.
     *
     * @returns the current applied lock options.
     */
    lockViewport(options: {
        /**
         * true to enable panning, false to disable panning.
         */
        pan?: boolean;
        /**
         * the minimum allowed zoom level that can be zoomed to.
         */
        minLevel?: number;
        /**
         * the maximum allowed zoom level that can be zoomed to.
         */
        maxLevel?: number;
    }): {
        pan: boolean;
        minLevel: number;
        maxLevel: number;
    };
    /**
     * Shift the geographical center of the map in pixels.
     *
     * @param dx - distance in pixels to pan the map on x axis
     * @param dy - distance in pixels to pan the map on y axis
     */
    pan(dx: number, dy: number): void;
    /**
     * Get the current added layer(s) of the map.
     *
     * @returns the layer(s) that are added to the map
     */
    getLayers(): TileLayer[];
    /**
     * Get a specific Layer of the map.
     *
     * @param index - get a specific layer at index in the layer hierarchy
     *
     * @returns the layer that is added to the map
     */
    getLayers(index: number): TileLayer;
    /**
     * Adds a layer to the map.
     * If index is defined the layer will be placed at respective index in the layer hierarchy.
     * Otherwise it's added on top (last).
     *
     * @param layer - the layer to add
     * @param index - the index in layer hierarchy where the layer should be inserted.
     */
    addLayer(layer: TileLayer | CustomLayer, index?: number): void;
    /**
     * Remove a layer from the map.
     *
     * @param layer - the layer to remove
     */
    removeLayer(layer: TileLayer | CustomLayer): void;
    /**
     * Refresh the map view.
     * Manually trigger re-rendering of specific layer(s) of the map.
     *
     * @param layers - the layer(s) that should be refreshed/re-rendered.
     */
    refresh(layers?: TileLayer | Layer | (TileLayer | Layer)[]): void;
    /**
     * Converts from screen pixel to geo coordinate
     *
     * @param x - the x position on screen in pixel
     * @param y - the y position on screen in pixel
     *
     * @returns the geographical coordinate
     */
    pixelToGeo(x: number, y: number): GeoPoint;
    /**
     * Converts from screen pixel to geo coordinate
     *
     * @param position - the pixel coordinate on screen
     *
     * @returns the geographical coordinate
     */
    pixelToGeo(position: PixelPoint): GeoPoint;




    /**
     * Convert a geographical coordinate to a pixel coordinate relative to the current viewport of the map.
     *
     * @param longitude - the longitude in degrees
     * @param latitude - the latitude in degrees
     * @param altitude - the altitude in meters
     *
     * @returns the pixel coordinate relative to the current viewport.
     */
    geoToPixel(longitude: number, latitude: number, altitude?: number): PixelPoint;
    /**
     * Convert a geographical coordinate to a pixel coordinate relative to the current viewport of the map.
     *
     * @param coordinate - the geographical coordinate
     *
     * @returns the pixel coordinate relative to the current viewport.
     */
    geoToPixel(coordinate: GeoPoint): PixelPoint;


    /**
     * Get the camera of the current viewport.
     *
     * @experimental
     */
    getCamera(): {
        /**
         * The camera's center position in geographical coordinates (world-space).
         */
        position: {
            longitude: number;
            latitude: number;
            altitude: number;
        };
    };


    /**
     * Destroy the the map.
     */
    destroy(): void;
    /**
     * Resize the map view.
     * If no width/height is passed the map will resize automatically to the maximum possible size defined by the HTMLElement.
     *
     * @param width - new width in pixels
     * @param height - new height in pixels
     */
    resize(width?: number, height?: number): void;
    /**
     * Get the current width in pixels of map.
     *
     */
    getWidth(): number;
    /**
     * Get the current height in pixels of map.
     *
     */
    getHeight(): number;
    /**
     * Add an observer to the map.
     * Supported observers are: "zoomlevel", "center", "rotation" and "pitch".
     *
     * @param name - the name of the value to observe
     * @param observer - the observer that will be executed on value changes.
     *
     * @returns boolean that's indicating if observer was added.
     */
    addObserver(name: string, observer: (name: string, newValue: any, prevValue: any) => void): boolean;
    /**
     * Removes an observer from the map.
     *
     * @param name - the name of the value to observe
     * @param observer - the observer that should be removed.
     *
     * @returns boolean that's indicating if observer was removed.
     */
    removeObserver(name: string, observer: (name: string, newValue: any, prevValue: any) => void): boolean;
    /**
     * Get the HTMLElement used by the map.
     */
    getContainer(): HTMLElement;
}
export { Map_2 as Map }
export default Map_2;

/**
 * The MapEvent represents an event which takes place in the map.
 * An event can be triggered by user interaction e.g. tapping on the map, or being generated to represent the progress of an asynchronous task.
 */
export declare class MapEvent {
    /**
     * The underlying native Mouse-, Pointer- or Touch-event generated by the browser.
     * This property will be null if the Event was not directly generated from a native event.
     */
    readonly nativeEvent?: MouseEvent | TouchEvent | PointerEvent | null;
    /**
     * The type of the event.
     * Supported events: "mapviewchangestart", "mapviewchange", "mapviewchangeend", "resize",
     * "tap", "dbltap", "pointerup", "pointerenter", "pointerleave", "pointerdown", "pointermove", "pressmove"
     */
    readonly type: string;
    /**
     * This property specifies the time at which the event was created in milliseconds relative to 1970-01-01T00:00:00Z.
     */
    readonly timeStamp: number;
    /**
     * The feature on the map this event relates to.
     * e.g. User clicks/taps on a specific Feature on the map.
     * If the event does not refer to any feature, the property is null.
     */
    readonly target?: Feature | null;
    /**
     * This property indicates which button was pressed on the mouse to trigger the event.
     *
     * Possible values:
     * - 0: Main button pressed, usually the left button or the un-initialized state
     * - 2: Secondary button pressed, usually the right button
     *
     * @defaultValue 0
     */
    readonly button: number;
    /**
     * Gives the x coordinate relative to the map container HTMLElement in pixels.
     * This property is only set when created by user interaction with native mouse/touch/pointer events.
     */
    readonly mapX?: number;
    /**
     * Gives the y coordinate relative to the map container HTMLElement in pixels.
     * This property is only set when created by user interaction with native mouse/touch/pointer events.
     */
    readonly mapY?: number;
    /**
     * optional event detail data
     */
    readonly detail?: any;




}

/**
 *  Options to configure the map display.
 */
export declare interface MapOptions {
    /**
     * Configure visibility and position of ui components
     */
    ui?: {};
    /**
     * zoomlevel of the map.
     *
     * @defaultValue 18
     */
    zoomlevel?: number;
    /**
     * Center coordinate of the map.
     *
     * @defaultValue \{longitude: 8.534, latitude: 50.162\}
     */
    center?: GeoPoint;
    /**
     * add layers to display.
     *
     */
    layers?: TileLayer[];
    /**
     * the maximum zoom level the map can be zoomed in
     *
     * @defaultValue 20
     */
    maxLevel?: number;
    /**
     * the minimum zoom level the map can be zoomed out
     *
     * @defaultValue 2
     */
    minLevel?: number;
    /**
     * The default background color of the map is white.
     * To achieve a transparent map background, you can set it to "rgba(0, 0, 0, 0)" or simply use the keyword "transparent".
     *
     * @defaultValue "white"
     */
    backgroundColor?: Color_2;
    /**
     * enable or disable debug tile grid
     *
     * @defaultValue false
     */
    debug?: boolean;
    /**
     * The minimum threshold in pixels to enable the pan map gesture.
     *
     * @defaultValue 4
     */
    minPanMapThreshold?: number;
    /**
     * The minimum threshold in pixels to enable the rotate map gesture.
     *
     * @defaultValue 4
     */
    minRotateMapThreshold?: number;
    /**
     * The minimum threshold in pixels to enable the pitch map gesture.
     *
     * @defaultValue 4
     */
    minPitchMapThreshold?: number;
    /**
     *  Behavior options of the map.
     *  Allow user to "drag" / "rotate" / "pitch" or "zoom" the map by mouse/touch interaction.
     *
     *  "drag" / "rotate" and "pitch" are booleans indicating if user interaction is possible or not.
     *  Possible values for "zoom" property are
     */
    behavior?: {
        /**
         * configure map zoom behavior:
         *  - false: disable zoom
         *  - true: enable zoom ("float")
         *  - "fixed": fixed zoom animation to next integer zoomlevel. floating zoomlevels are not allowed (eg 14.4)
         *  - "float": allow floating zoomlevels [default]
         * @defaultValue 'float'
         */
        zoom?: true | false | 'fixed' | 'float';
        /**
         * enable or disable dragging the map
         * @defaultValue true
         */
        drag?: boolean;
        /**
         * enable or disable pitching the map
         * @defaultValue false
         */
        pitch?: boolean;
        /**
         * enable or disable rotating the map
         * @defaultValue falses
         */
        rotate?: boolean;
    };
    /**
     * initial rotation of the map in degree.
     *
     * @defaultValue 0
     */
    rotate?: number;
    /**
     * initial pitch (tilt) of the map in degree.
     *
     * @defaultValue 0
     */
    pitch?: number;
    /**
     * duration of a zoom level change animation in milliseconds.
     * @defaultValue 100
     */
    zoomAnimationMs?: number;
    /**
     * The maximum angle in degrees the map can be pitched
     * @defaultValue 50
     */
    maxPitch?: number;
}

declare namespace styleTools {
    export {
        getTextString,
        calcBBox,
        is3d,
        getExtrude,
        fillMap,
        parseColorMap,
        createZoomRangeFunction,
        getValue,
        parseSizeValue,
        getLineWidth,
        getPixelSize,
        getSizeInPixel,
        merge,
        isStyle,
        getMaxZoom,
        parseStyleGroup,
        StyleGroup,
        Style
    }
}
export { styleTools }

export { }
