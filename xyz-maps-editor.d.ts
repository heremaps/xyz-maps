import { EditableFeatureProvider } from '@here/xyz-maps-core';
import { EditableRemoteTileProvider } from '@here/xyz-maps-core';
import { Feature as Feature_2 } from '@here/xyz-maps-core';
import { FeatureProvider } from '@here/xyz-maps-core';
import { GeoJSONBBox } from '@here/xyz-maps-core';
import { GeoJSONCoordinate } from '@here/xyz-maps-core';
import { GeoJSONFeature } from '@here/xyz-maps-core';
import { GeoPoint } from '@here/xyz-maps-core';
import { GeoRect } from '@here/xyz-maps-core';
import { Map as Map_2 } from '@here/xyz-maps-display';
import MapDisplay from '@here/xyz-maps-display';
import { MapEvent } from '@here/xyz-maps-display';
import { PixelPoint } from '@here/xyz-maps-core';
import { Style } from '@here/xyz-maps-core';
import { StyleGroup } from '@here/xyz-maps-core';
import { TileLayer } from '@here/xyz-maps-core';

/**
 * The Address Feature is a generic editable Feature with "Point" geometry.
 * In addition to the Marker Feature, the Place feature must have a "routing point" located on a Navlink geometry.
 * A Address must be linked/associated with a Navlink Feature.
 *
 * The Feature can be edited with the {@link Editor}.
 */
export declare class Address extends Location_2 {
    /**
     *  The feature class of an Address Feature is "ADDRESS".
     */
    readonly class: 'ADDRESS';




}

/**
 * The Area Feature is a generic editable Feature with "Polygon" or "MultiPolygon" geometry.
 */
export declare class Area extends Feature {
    /**
     *  The feature class of an Area Feature is "AREA".
     */
    readonly class: 'AREA';

    /**
     * Add a new shape point / coordinate to the area.
     *
     * @param point - the coordinate of the new shape to add
     * @param polygonIndex - the index of the polygon where the new shape/coordinate should be inserted.
     * @param index - the index position in the coordinate array of the polygon where the new shape point should be inserted.
     *
     * @returns index of the shape or false if shape could not be added
     */
    addShape(point: GeoPoint | PixelPoint, polygonIndex?: number, index?: number): number | false;
    /**
     * Add a rectangular hole to the polygon geometry at the provided position.
     * The position must be located in the exterior of the polygon.
     * The size of the hole is calculated with respect to the polygon geometry.
     *
     * @param point - the center of the rectangular hole to be created
     *
     * @returns boolean that indicates if the hole has been added successfully.
     */
    addHole(point: GeoPoint | PixelPoint | GeoJSONCoordinate): boolean;
    /**
     * Set the behavior options.
     * @experimental
     */
    behavior(options: {
        /**
         * Snap coordinates to polygon geometry nearby.
         */
        snapCoordinates?: boolean;
    }): void;
    /**
     * Set the value of a specific behavior option.
     * @experimental
     */
    behavior(name: string, value: boolean): void;
    /**
     * Get the value of a specific behavior option.
     * @experimental
     */
    behavior(option: string): any;
    /**
     * Get the behavior options.
     * @experimental
     */
    behavior(): {
        /**
         * Snap coordinates to polygon geometry nearby.
         */
        snapCoordinates: boolean;
    };
    /**
     *  Get the geographical coordinate(s) of the Area feature.
     */
    coord(): [number, number, number?][][] | [number, number, number?][][][];
    /**
     *  Set the geographical coordinate(s) of the Area feature.
     *
     *  @param coordinates - the geographical coordinates that should be set.
     */
    coord(coordinates: [number, number, number?][][] | [number, number, number?][][][]): any;
}

/**
 * The AreaShape represents a shape-point / coordinate of a Area feature.
 * The AreaShape is only existing if the corresponding Area feature is "selected" and user based geometry editing with touch/mouse interaction is activated.
 * @see {@link Area.select}
 */
export declare class AreaShape extends Feature_2<'Point'> {
    /**
     * The feature class of an AreaShape Feature is "AREA_SHAPE".
     */
    readonly class: 'AREA_SHAPE';



    /**
     * Get the Area feature to which the ShapeShape belongs.
     *
     * @returns the Area feature
     */
    getArea(): Area;
    /**
     * Removes the shape point from the polygon geometry of the Area feature.
     */
    remove(): boolean;
    /**
     * Get the index of the shape point in the coordinates array of the polygon of respective Area feature.
     *
     * @returns The index of the shape point.
     */
    getIndex(): number;

}

/**
 * The CoordinatesUpdateHook will be called whenever the coordinates of a feature are added, updated or removed ('Coordinates.update' operation).
 */
export declare type CoordinatesUpdateHook = (data: {
    /**
     * the feature whose coordinates are updated
     */
    feature: Feature_2;
    /**
     * the previous coordinates before they are updated
     */
    previousCoordinates: GeoJSONCoordinate | GeoJSONCoordinate[] | GeoJSONCoordinate[][] | GeoJSONCoordinate[][][];
}) => void;

declare enum Corner {
    topLeft = 0,
    topRight = 1,
    bottomRight = 2,
    bottomLeft = 3
}

/**
 *
 * The Crossing represents the intersection point of 2 Navlink geometries.
 * A Crossing feature is an indication for a Road Intersection an can be used to detect and create missing intersections in a road network.
 * In case of 2 Navlink geometries are located very close to each other (but not intersecting), the Crossing represents a "CROSSING_CANDIDATE".
 * The threshold for the candidate detection can be configured with {@link EditorOptions.intersectionScale}
 */
export declare class Crossing implements GeoJSONFeature {


    /**
     *  the feature class of the crossing. Can be either CROSSING or CROSSING_CANDIDATE.
     */
    readonly class: xClass.CROSSING | xClass.CROSSING_CANDIDATE;
    /**
     * the x coordinate of the crossing on screen in pixel.
     * @deprecated use display.geoToPixel to project the geographical coordinates of the crossing to pixels on screen.
     */
    readonly x: number;
    /**
     * the y coordinate of the crossing on screen in pixel.
     * @deprecated use display.geoToPixel to project the geographical coordinates of the crossing to pixels on screen.
     */
    readonly y: number;
    /**
     * The distance between two points which will be connected on current and related links.
     */
    readonly distance: number;
    /**
     * The geometry of the Crossing feature.
     */
    geometry: {
        /**
         * The type of the geometry.
         * For "CROSSINGS" the type is "Point", for "CROSSING_CANDIDATE" its "LineString".
         */
        type: 'Point' | 'LineString';
        /**
         * The coordinates of the crossing feature.
         */
        coordinates: GeoJSONCoordinate | GeoJSONCoordinate[];
    };




    /**
     * Get the Navlink feature which is crossed or treated as a crossing candidate.
     */
    getRelatedLink(): Navlink;
    /**
     * Connects the related Navlink features and creates an intersection.
     *
     * @returns Resulting array of new Crossing due to road network changes or false if none crossing is detected.
     */
    connect(): Crossing[] | false;
    /**
     * Show the crossing on the map.
     */
    show(): void;
    /**
     * Hide the crossing on the map.
     */
    hide(): void;
    /**
     * Get the Navlink feature of which the crossing belongs to.
     */
    getLink(): Navlink;
    /**
     * Get all connected Navlink features which are connected (Intersection) to the related link that is treated as crossing candidate.
     * This method affects Crossings of type "CROSSING_CANDIDATE" only.
     */
    getConnectedLinks(): Navlink[];
}

/**
 *  The DrawingBoard is a tool to easily enable the user to draw the geometry for a feature by user interaction with mouse/touch "taps" on the screen.
 *  A feature based on the drawn geometry and custom properties can be created when the drawing operation is done.
 */
export declare class DrawingBoard {




    /**
     * Add a shape-point to the feature.
     *
     * @param position - the coordinate in pixels relative to the screen that should be added to the coordinates of the feature.
     * @param Navlink - pass this parameter in case of a Navlink feature is drawn that should start on the geometry of another Navlink, to split it's geometry automatically.
     */
    addShape(position: PixelPoint | GeoPoint, navlink?: Navlink): DrawingShape;
    /**
     * Remove a shape-point.
     * If no index is defined, the last added shape-point will be removed.
     *
     * @param index - the index of the shape-point to be removed.
     */
    removeShape(index?: number): void;
    /**
     * Get the total number of coordinates / shape-points of the currently drawn feature.
     *
     * @returns Number of coordinates
     */
    getLength(): number;
    /**
     * Cancel the current drawing operation.
     */
    cancel(): void;
    /**
     * Set properties of the feature.
     *
     * @param properties - properties the feature will be created with.
     */
    setProperties(properties: any): void;
    /**
     * @deprecated - use setProperties instead.
     */
    setAttributes(p: any): void;
    /**
     * Finish current drawing operation and create the drawn feature.
     *
     * @param properties - properties the feature will be created with.
     *
     * @returns the created Feature or undefined if creation fails due to invalid geometry.
     */
    create(properties?: any): Line | Navlink | Area | undefined;
    /**
     * Start a new drawing operation to shape/draw the geometry a feature by user interaction with mouse/touch "taps" on the screen.
     *
     * @param options - options to configure the drawing operation
     */
    start(options?: {
        /**
         * the type of feature that should be drawn.
         */
        mode?: 'Area' | 'Line' | 'Navlink';
        /**
         * for custom draw styling.
         */
        styleGroup?: Style[];
        /**
         * defines the first coordinate /the starting position.
         */
        position?: PixelPoint | GeoPoint;
        /**
         * the Navlink feature to which the drawn Navlink should connect.
         */
        connectTo?: Navlink;
        /**
         * the layer where the feature should be created in.
         */
        layer?: TileLayer;
        /**
         * event listener that's called for each shape-point that's being added by user interaction. The target of the event is the drawn shape-point {@link DrawingShape}
         */
        onShapeAdd?: (event: EditorEvent) => void;
        /**
         * function that's called for each shape-point that's being removed by user interaction. The target of the event is the drawn shape-point {@link DrawingShape}
         */
        onShapeRemove?: (event: EditorEvent) => void;
        /**
         * The tolerance in meters, used to determine the level of simplification.
         * The simplification is applied to the LineString geometry only after drawing the geometry is complete by calling {@link DrawingBoard.create}.
         * Tolerance has no effect if mode is set to "Area".
         * Set tolerance to 0 to disable simplification.
         *
         * @defaultValue 1
         */
        tolerance?: number;
    }): boolean;
    /**
     * Get the active state of the drawing board.
     *
     * @returns true when active, otherwise false
     */
    isActive(): boolean;
    /**
     * Get the geometry of the currently drawn feature.
     */
    getGeometry(): ({
        type: 'LineString' | 'MultiPolygon' | string;
        coordinates: GeoJSONCoordinate[] | GeoJSONCoordinate[][][];
    });
    /**
     * Set the geometry of the currently drawn feature.
     *
     * If the geometry of an area (MultiPolygon) is specified, only the first exterior is processed.
     */
    setGeometry(geomtry: {
        type: 'LineString' | 'MultiPolygon' | string;
        coordinates: GeoJSONCoordinate[] | GeoJSONCoordinate[][][];
    }): void;
}

/**
 * The DrawingShape represents a coordinate (shape-point) of the geometry that's drawn in the current drawing operation of the DrawingBoard utility.
 * {@link editor.DrawingBoard}
 */
export declare class DrawingShape extends Feature_2 {

    /**
     * the feature class of the drawing shape point, either LINE_SHAPE, NAVLINK_SHAPE or AREA_SHAPE
     */
    readonly class: 'LINE_SHAPE' | 'NAVLINK_SHAPE' | 'AREA_SHAPE';



    /**
     * Removes the shape point from the geometry of the current drawing operation.
     */
    remove(): void;
    /**
     * Get the total number of coordinates / shape-points of the currently drawn feature.
     *
     * @returns Number of coordinates
     */
    getLength(): number;
    /**
     * Returns the index of the shape point in the coordinate array of the currently drawn feature.
     *
     * @returns the index position in the coordinate array.
     */
    getIndex(): any;
}

/**
 * The Editor is an API for editing map data that can be used to easily access, add, remove and edit various types of map data.
 * Changes can be automatically synchronized with various remote backends services.
 * It offers various tools for manipulating map-data through user interaction.
 */
export declare class Editor {

    /**
     * The HTMLElement used by the Map Editor.
     */
    container: HTMLElement;
    /**
     * @param display - the map display to be used with the map editor.
     * @param options - options to customize the map editor.
     *
     * @example
     * ```
     *  import {Map} from '@here/xyz-maps-display';
     *  import {Editor} from '@here/xyz-maps-editor';
     *
     *  //create map display
     *  const display = new Map( mapDiv, {
     *      zoomLevel : 19,
     *      center: {
     *          longitude: 8.53422,
     *          latitude: 50.16212
     *      },
     *      // add layers to display
     *      layers: layers
     *  });
     *
     * // create the map editor
     * editor = new Editor( display, {
     *      // add the layers that should be edited
     *     layers: layers
     * });
     * ```
     */
    constructor(display: Map_2, options?: EditorOptions);
    /**
     * enable or disable the editor.
     *
     * @param active - true to enable or false to disable the editor
     *
     * @returns the current active state
     */
    active(active?: boolean): boolean;
    /**
     * Add an EventListener to the editor.
     * Valid Events are: "tap", "dbltap", "pointerup", "pointerenter", "pointerleave", "featureUnselected", "error", "dragStart", "dragStop".
     *
     * Additional details about the different events:
     * - "tap", "pointerup", "dbltap": These events are thrown when the user taps (or double taps) on any feature or the map itself.
     * - "pointerenter", "pointerleave": Occurs when a pointer enters or leaves the hit test area of a map feature.
     * - "featureUnselected": This event is fired when a feature gets unselected automatically by the Editor ( eg: automatic linksplit ).
     * - "error": The event is fired when error occurs.
     * - "dragStart": The event is fired when the user starts dragging an Address, Place, Marker or a shape-point of a Navlink/Area.
     * - "dragStop": The event is fired when the user finishes dragging of a Address, Place, Marker or a shape-point of a Navlink/Area.
     *
     * @param type - A string representing the event type to listen for.
     * @param listener - the listener function that will be called when an event of the specific type occurs
     */
    addEventListener(type: EditorEventTypes, listener: (event: EditorEvent) => void): any;
    /**
     * Add an Error EventListener to the editor.
     * @param type - the EventListener type is "error"
     * @param listener - the listener function that will be called when an Error occurs
     */
    addEventListener(type: 'error', listener: (event: Error) => void): any;
    /**
     * Remove an EventListener from the layer.
     * Valid Events are: "tap", "dbltap", "pointerup", "pointerenter", "pointerleave", "featureUnselected", "error", "dragStart", "dragStop".
     *
     * @param type - A string which specifies the type of event for which to remove an event listener.
     * @param listener - The listener function of the event handler to remove from the editor.
     */
    removeEventListener(type: EditorEventTypes, listener: (event: EditorEvent) => void): any;
    /**
     * Remove an Error EventListener from the layer.
     *
     * @param type - the EventListener type is "error".
     * @param listener - The error event listener to be remove from the editor.
     */
    removeEventListener(type: 'error', listener: (event: Error) => void): any;
    /**
     *  Add a feature to the editor.
     *
     *  @param feature - the feature to be added to the map.
     *  @param layer - the layer the feature should be added to.
     *  @param origin - offsets the geometry of the feature.
     *
     *  @returns the feature that was successfully added to the map
     */
    addFeature(feature: GeoJSONFeature | Feature, layer?: TileLayer, origin?: GeoPoint | PixelPoint): Address | Area | Marker | Place | Line | Navlink;
    /**
     *  Add features to the editor.
     *
     *  @param features - the features to be added to the map.
     *  @param layer - the layer the features should be added to.
     *  @param origin - offsets the geometry of the features.
     *
     *  @returns the features that were successfully added to the map
     */
    addFeature(features: GeoJSONFeature | Feature | (GeoJSONFeature | Feature)[], layer?: TileLayer, origin?: GeoPoint | PixelPoint): Address | Area | Marker | Place | Line | Navlink | FeatureContainer;
    /**
     *  Add features to map editor.
     *
     *  @param layerMap - a map where the layerId is the key and the value are the feature(s) that should be added to the respective layer.
     *  @param origin - allows to translate features by origin offset.
     *
     *  @returns the feature(s) that were successfully added to map
     */
    addFeature(layerMap: {
        [layerId: string]: GeoJSONFeature | Feature | (GeoJSONFeature | Feature)[];
    }, layer?: TileLayer, origin?: GeoPoint | PixelPoint): Address | Area | Marker | Place | Line | Navlink | FeatureContainer;
    /**
     * Add a hook function that will be called during the execution of the editing operation.
     *
     * Possible operation types are: 'Navlink.disconnect', 'Navlink.split', 'Feature.remove', 'Coordinates.remove'
     *
     * @param type - the type of the operation
     * @param hook - the hook function that should be called
     * @param provider - If a provider is defined, the hook is only called if features of the provider are affected by the operation
     */
    addHook(type: string, hook: NavlinkSplitHook | NavlinkDisconnectHook | FeatureRemoveHook | CoordinatesUpdateHook, provider?: EditableFeatureProvider): boolean;
    /**
     * Batches multiple feature edits into a single history entry.
     * This allows combining multiple actions, such as modifying properties or coordinates,
     * so that only a single history step is created for undo/redo purposes.
     *
     * Use this method when you want to group multiple feature modifications (such as setting properties or coordinates)
     * into a single history step for easier undo/redo management.
     *
     * @param action A function that contains one or more feature modification actions. All edits within this function
     *               will be grouped together as a single history step.
     *
     * @example
     * editor.batch(() => {
     *   feature.prop("name", "newName");  // Modify feature property
     *   feature.coord(newCoordinate);     // Modify feature coordinates
     * });
     *
     * @remarks
     * This method is useful when you want to execute multiple edits in sequence but treat them as a single operation
     * for undo/redo. The changes will be bundled into one history entry, simplifying the undo/redo process.
     *
     * @see {@link editor.undo} for undoing the last action.
     * @see {@link editor.redo} for redoing the last undone action.
     * @see {@link editor.beginBatch} for starting a batch of edits manually.
     * @see {@link editor.endBatch} for finalizing a batch of edits manually.
     */
    batch(action: () => void): void;
    /**
     * Begins a new batch operation for multiple feature edits.
     *
     * Call this function before making a series of edits to a feature. All changes made between `beginBatch` and
     * `endBatch` will be grouped together as a single history entry. This allows more control over when to
     * create a history step for a series of edits.
     *
     * @example
     * editor.startBatch();  // Start a batch operation
     * feature.prop("name", "newName");  // Modify feature property
     * feature.coord(newCoordinate);     // Modify feature coordinates
     * editor.endBatch();  // Finish the batch and commit changes as a single history entry
     *
     * @remarks
     * This method is helpful when you want to make multiple edits and control when the changes are committed to history.
     * The edits made within the `startBatch`/`endBatch` block are treated as a single operation.
     *
     * @see {@link editor.endBatch} for finalizing a batch operation.
     * @see {@link editor.undo} for undoing the last action.
     * @see {@link editor.redo} for redoing the last undone action.
     * @see {@link editor.batch} for an alternative method to group edits without manually starting and ending a batch.
     */
    beginBatch(): void;

    /**
     * Ends the current batch operation and creates a single history entry for all changes made since `startBatch`.
     *
     * This function should be called after making all desired edits within a `startBatch` block. Once called,
     * all changes will be committed as a single entry in the local history, enabling easy undo/redo of the entire batch.
     *
     * @example
     * editor.startBatch();  // Start a batch operation
     * feature.prop("name", "newName");  // Modify feature property
     * feature.coord(newCoordinate);     // Modify feature coordinates
     * editor.endBatch();  // Finalize the batch and create a single history entry
     *
     * @remarks
     * The `endBatch` method ensures that all modifications made within the batch are recorded as a single step in the local history.
     * After calling this, you can undo or redo the entire set of changes together.
     *
     * @see {@link editor.startBatch} for beginning a batch operation.
     * @see {@link editor.undo} for undoing the last action.
     * @see {@link editor.redo} for redoing the last undone action.
     * @see {@link editor.batch} for an alternative method to group feature edits into a single history step without manually starting and ending a batch.
     */
    endBatch(): void;
    /**
     * Remove a specific hook for the desired editing operation.
     *
     * Possible operation types are: 'Navlink.disconnect', 'Navlink.split', 'Feature.remove', 'Coordinates.remove'
     *
     * @param type - the type of the operation
     * @param hook - the hook function to remove
     * @param provider - If a provider is defined, the hook is only called if features of the provider are affected by the operation
     */
    removeHook(type: string, hook: NavlinkSplitHook | NavlinkDisconnectHook | FeatureRemoveHook | CoordinatesUpdateHook, provider?: EditableFeatureProvider): boolean;
    /**
     * Get all registered hooks for the desired operation.
     *
     * @param type - the type of the operation
     */
    getHooks(type: string): (NavlinkSplitHook | NavlinkDisconnectHook | FeatureRemoveHook | CoordinatesUpdateHook)[];
    /**
     * Get a feature by id and layer.
     *
     * @param featureId - the id of the feature
     * @param layerId - the id of the layer or the layer itself to which the feature belongs.
     *
     * @returns the found feature in the map, otherwise null.
     */
    getFeature(featureId: string | number, layerId: string | TileLayer): any;
    /**
     * Get the current value of a specific editor option.
     *
     * @returns the value of the specific editor option.
     */
    config(name: string): any;
    /**
     * Get a deep copy of the currently active editor options.
     *
     * @return the editor options as a key/value map.
     */
    config(): EditorOptions;
    /**
     * Set the value of a specific editor option.
     *
     * @param name - the name of the option to set
     * @param value - the value that should be set for the specific option
     */
    config(name: string, value: any): any;
    /**
     * Set one or more editor options.
     * @param options - the option key/value map that should be merged with the existing editor options.
     */
    config(options: EditorOptions): any;
    /**
     * Create a FeatureContainer.
     *
     * @returns feature container
     */
    createFeatureContainer(...features: (Feature | Feature[])[]): FeatureContainer;
    /**
     * Retrieves the currently selected feature.
     *
     * @returns {Feature | null} - The currently selected feature. If no Feature is selected,
     * it returns `null`.
     */
    getSelectedFeature(): Feature;
    /**
     * Clears the current selected feature.
     *
     * @deprecated please use `editor.getSelectedFeature()?.unselect()` instead.
     *
     * @hidden
     *
     * @returns the cleared Feature or null of none is selected.
     */
    clearFeatureSelection(): Feature | null;
    /**
     * Search for feature(s) in the provider.
     *
     * @param options - configure the search
     *
     * @example
     * ```typescript
     * // searching by id:
     * provider.search({id: 1058507462})
     * // or:
     * provider.search({ids: [1058507462, 1058507464]})
     *
     * // searching by point and radius:
     * provider.search({
     *  point: {longitude: 72.84205, latitude: 18.97172},
     *  radius: 100
     * })
     *
     * // searching by Rect:
     * provider.search({
     *  rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876}
     * })
     *
     * // remote search:
     * provider.search({
     *  rect:  {
     *    minLon: 72.83584,
     *    maxLat: 18.97299,
     *    maxLon: 72.84443,
     *    minLat: 18.96876
     *  },
     *  remote: true, // force provider to do remote search if feature/search area is not cached locally
     *  onload: function(result){
     *   // search result is only return in this callback function if features are not found in cache.
     *  }
     * })
     * ```
     * @returns array containing the found features
     */
    search(options: {
        /**
         * search feature by id.
         */
        id?: number | string;
        /**
         * Array of feature ids to search.
         */
        ids?: number[] | string[];
        /**
         * Geographical center point of the circle to search in. options.radius must be defined.
         */
        point?: GeoPoint;
        /**
         * Radius of the circle in meters, it is used in "point" search.
         */
        radius?: number;
        /**
         * Geographical Rectangle to search in. [minLon, minLat, maxLon, maxLat] | GeoRect.
         */
        rect?: GeoRect | GeoJSONBBox;
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean;
        /**
         * Callback function for "remote" search.
         */
        onload?: (result: Feature[] | null) => void;
        /**
         * function for optional result filtering.
         */
        filter?: (feature: Feature[]) => boolean;
        /**
         * Layers to search in.
         */
        layers?: TileLayer[];
    }): Feature[];
    /**
     * add a TileLayer to the editor and enable editing of its map data.
     * @param layer - the layer to be added to editor.
     *
     * @returns true indicates layer has been added successfully, otherwise false.
     */
    addLayer(layer: TileLayer): boolean;
    /**
     * Get all layers that are added to the editor.
     *
     * @returns Array if layers that are added to the editor.
     */
    getLayers(): TileLayer[];
    /**
     * Get a specific Layer at the index in the layer list of the editor.
     *
     * @returns the respective layer at index
     */
    getLayers(index: number): TileLayer;
    /**
     * Remove a layer from the editor.
     *
     * layer - the layer to be removed from the map editor.
     * Editing get disabled for the layer.
     *
     * @returns true indicates layer is removed successfully, otherwise false.
     */
    removeLayer(layer: TileLayer): boolean;
    /**
     * This method registers an observer for the property named by the caller.
     * Supported observables: 'active', 'ready', 'history.current', 'history.length', 'changes.length'
     *
     * @param name - The name of the property to observe.
     *
     * @param observer - the observer function that is called when the value of the observable changes.
     */
    addObserver(name: 'active' | 'ready' | 'history.current' | 'history.length' | 'changes.length', observer: (
    /**
     * the name of the property that was modified, created or deleted
     */
    name: 'active' | 'ready' | 'history.current' | 'history.length' | 'changes.length', 
    /**
     * the new value of the observable property
     */
    value: any, 
    /**
     * the old/previous value of the observable property
     */
    prevValue: any) => void): void;
    /**
     * This method retrieves the current value of an observable property.
     *
     * @param key - The name of the property whose value is to be retrieved
     * @returns value - The retrieved value of the property or undefined if no such property exists
     */
    get(key: 'active' | 'ready' | 'history.current' | 'history.length' | 'changes.length'): any;
    /**
     * This method removes the observer for the property.
     * Supported observables: 'active', 'ready', 'history.current', 'history.length', 'changes.length'
     *
     * @param name - The name of the property that should no longer be observed
     * @param observer - The observer function to be removed
     */
    removeObserver(name: 'active' | 'ready' | 'history.current' | 'history.length' | 'changes.length', observer: (
    /**
     * the name of the property that was modified, created or deleted
     */
    name: 'active' | 'ready' | 'history.current' | 'history.length' | 'changes.length', 
    /**
     * the new value of the observable property
     */
    value: any, 
    /**
     * the old/previous value of the observable property
     */
    prevValue: any) => void): void;
    /**
     * Destroy the map editor
     */
    destroy(): void;
    /**
     * Sets the desired zoomLevel.
     *
     * @deprecated - use the map display directly {@link display.Map.setZooomlevel}
     * @param zoomLevel - The zoomlevel that the map should zoom to.
     */
    setZoomLevel(zoomlevel: number): void;
    /**
     * Get the current zoomLevel.
     *
     * @deprecated - use the map display directly {@link display.Map.getZoomlevel}
     * @returns The current zoomLevel of the map.
     */
    getZoomLevel(): number;
    /**
     * Convert a pixel position relative to the current mapview on screen to a geographical coordinate.
     *
     * @param coordinate - The coordinate on screen in pixels.
     * @returns the geographical coordinate
     */
    pixelToGeo(coordinate: PixelPoint | [number, number, number?]): GeoPoint;
    /**
     * Convert geographical coordinate to a pixel coordinate relative to the current mapview on screen.
     *
     * @param coordinate - the geographical coordinate
     * @returns The pixel coordinate.
     */
    geoToPixel(coordinate: GeoPoint | [number, number, number?]): PixelPoint;
    /**
     * Revert changes, fetch data from repository.
     */
    revert(): void;
    /**
     * get the DrawingBoard to enable mouse/touch based drawing of the geometry for Line, Navlink or Area features.
     */
    getDrawingBoard(): DrawingBoard;
    /**
     * @hidden
     * @deprecated Use editor.getRangeSelector();
     */
    getZoneSelector(): RangeSelector;
    /**
     * get the tool for selecting ranges on Navlink features.
     */
    getRangeSelector(): RangeSelector;
    /**
     * Returns the overlay TileLayer used for user interaction with the editable map features.
     *
     * @returns the TileLayer containing all "UI" features used for user interaction with the map features.
     */
    getOverlay(): TileLayer;
    /**
     * Undo the latest change operation(s).
     * One change operation can contain multiple feature modifications.
     * The changes are stored and managed locally.
     *
     * Submitting {@link Editor.submit} modified Feature(s) to the remote will clear the local change history.
     *
     * @param steps - the number of change operations to undo.
     */
    undo(steps?: number): void;
    /**
     * Redo the latest change operation(s).
     * One change operation can contain multiple feature modifications.
     *
     * The changes are stored and managed locally.
     * Submitting {@link Editor.submit} modified Feature(s) to the remote will clear the local change history.
     *
     * @param steps - the number of change operations to redo.
     */
    redo(steps?: number): void;
    /**
     * Submit changes, return object Ids of submitted objects. Reload and render objects.
     *
     * @param options - submit options
     *
     * @returns true, if there are changes to be submitted, false otherwise.
     */
    submit(options: {
        /**
         * callback function which returns additional information about the commit process.
         * If id(s) of the submitted feature(s) had to be changed by the remote datasource a "permanentIDMap" is provided.
         */
        onSuccess?: (data: {
            permanentIDMap: {
                [layerId: string]: {
                    [featureId: string]: number | string;
                };
            };
        }) => void;
        /**
         * callback function that gets called in case of an error.
         */
        onError?: (Error: any) => void;
        /**
         * transactionId that will be attached to all features of the submit operation.
         */
        transactionId?: string;
    }): boolean;
    /**
     * Get information of all modified Features of the editor.
     *
     * @returns Array of modified objects.
     */
    info(): Feature[];
    /**
     * Export data of all modified features.
     *
     * @returns A JSON encoded string containing all modified features and its respective layer information.
     */
    export(): string;
    /**
     * Import Features to the editor that have previously been exported with {@link Editor.export}.
     *
     * @param json - A JSON encoded string containing all modified features and its respective layer information.
     */
    import(json: string): void;
    /**
     * Convert a PixelPoint on the screen or a GeoPoint to a geographical Coordinate in GeoJSON format [number,number,number?].
     *
     * @example
     * ```typescript
     * // create a Feature at a specific position of the current mapview on the screen.
     * editor.addFeature({
     *     type: 'Feature',
     *     geometry: {
     *         type: 'Point',
     *         coordinates: editor.toGeoJSONCoordinates({x: 300, y:300})
     *     }
     * })
     * ```
     *
     * @param coordinates - the pixel and/or geographical coordinate(s) to convert.
     */
    toGeoJSONCoordinates(coordinates: PixelPoint | GeoPoint | GeoJSONCoordinate): GeoJSONCoordinate;
    /**
     * Convert PixelPoints or a GeoPoints to a geographical Coordinates in GeoJSON format [number,number,number?].
     *
     * @example
     * ```typescript
     * // create a Feature at a specific position of the current mapview on the screen.
     * editor.addFeature({
     *     type: 'Feature',
     *     geometry: {
     *         type: 'LineString',
     *         coordinates: editor.toGeoJSONCoordinates([{x: 300, y:300},{longitude:50.1, latitude:8.5}])
     *     }
     * })
     * ```
     *
     * @param coordinates - the pixel and/or geographical coordinate(s) to convert.
     */
    toGeoJSONCoordinates(coordinates: (PixelPoint | GeoPoint | GeoJSONCoordinate)[]): GeoJSONCoordinate[];
    /**
     * Convert PixelPoints or a GeoPoints to a geographical Coordinates in GeoJSON format [number,number,number?].
     *
     * @example
     * ```
     * // create a Feature at a specific position of the current mapview on the screen.
     * editor.addFeature({
     *   type: 'Feature',
     *     geometry: {
     *       type: 'Polygon',
     *         coordinates: editor.toGeoJSONCoordinates([
     *           [{x:10, y:10}, {longitude:50.1, latitude:8.5}, {x:90, y:90}, {x:10,y:90}, {x:10, y:10}]
     *         ])
     *     }
     * })
     * ```
     * @param coordinates - the pixel and/or geographical coordinate(s) to convert.
     */
    toGeoJSONCoordinates(coordinates: (PixelPoint | GeoPoint | GeoJSONCoordinate)[][]): GeoJSONCoordinate[][];
    /**
     * Convert PixelPoints or a GeoPoints to a geographical Coordinates in GeoJSON format [number,number,number?].
     *
     * @example
     * ```typescript
     * // create a Feature at a specific position of the current mapview on the screen.
     * editor.addFeature({
     *     type: 'Feature',
     *     geometry: {
     *         type: 'MultiPolygon',
     *         coordinates: editor.toGeoJSONCoordinates([
     *           [
     *             [{x:10, y:10}, {longitude:50.1, latitude:8.5}, {x:90, y:90}, {x:10,y:90}, {x:10, y:10}]
     *           ]
     *         ])
     *     }
     * })
     * ```
     * @param coordinates - the pixel and/or geographical coordinate(s) to convert.
     */
    toGeoJSONCoordinates(coordinates: (PixelPoint | GeoPoint | GeoJSONCoordinate)[][][]): GeoJSONCoordinate[][][];
}

/**
 * The EditorEvent represents an event which takes place in the editor.
 * An event can be triggered by user interaction e.g. tapping on the map, or generated to represent the progress of an asynchronous task.
 */
export declare class EditorEvent {
    /**
     * The type of the event.
     * Supported events: "tap", "dbltap", "pointerup", "pointerenter", "pointerleave", "featureUnselected", "error", "dragStart", "dragStop".
     */
    readonly type: string;
    /**
     * This property specifies the time at which the event was created in milliseconds relative to 1970-01-01T00:00:00Z.
     */
    readonly timeStamp: number;
    /**
     * Gives the x coordinate relative to the map HTMLElement in pixels.
     * This property is only set when created by user interaction with native mouse/touch/pointer events.
     */
    readonly mapX?: number;
    /**
     * Gives the y coordinate relative to the map HTMLElement in pixels.
     * This property is only set when created by user interaction with native mouse/touch/pointer events.
     */
    readonly mapY?: number;
    /**
     * The underlying native Mouse-, Pointer- or Touch-event generated by the browser.
     * This property will be null if the Event was not directly generated from a native event.
     */
    readonly nativeEvent?: MouseEvent | TouchEvent | PointerEvent | null;
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
     * The feature on the map this event relates to.
     * e.g. User clicks/taps on a specific Feature on the map.
     * If the event does not refer to any feature, the property is null.
     */
    readonly target?: Place | Address | Marker | Area | AreaShape | Line | LineShape | Navlink | NavlinkShape | Crossing | Feature | null;
    /**
     * optional event detail data depending on the type of the event.
     */
    readonly detail: {
        /**
         * the layer the event relates to.
         */
        layer?: TileLayer;
        /**
         * This property is set by the {@link editor.DrawingBoard|DrawingBoard utility} and dispatched when an "onShapeAdd" or "onShapeRemove" event occurs.
         * Index in the coordinate array of the shape being added or removed.
         */
        index?: number;
        /**
         * This property is set by the {@link editor.RangeSelector|RangeSelector utility} and dispatched when an "dragStart", "dragMove" or "dragStop" event occurs.
         * The respective {@link editor.Range|Range} on in which the event occurred.
         */
        range?: Range_2;
    };

}

/**
 * The Possible types of an {@link EditorEvent}
 */
export declare type EditorEventTypes = 'tap' | 'dbltap' | 'pointerup' | 'pointerdown' | 'pointerenter' | 'pointerleave' | 'featureUnselected' | 'error' | 'dragStart' | 'dragStop';

/**
 * The Editor Properties give a more detailed insight into the current state of the feature.
 */
export declare interface EditorFeatureProperties {
    /**
     * Creation timestamp of the feature, in milliseconds.
     */
    created: number | boolean;
    /**
     * Timestamp when the feature has been modified/updated, otherwise false.
     */
    modified: number | boolean;
    /**
     * Timestamp when the feature has been removed, otherwise false.
     */
    removed: number | boolean;
    /**
     * Timestamp when the feature has been split, otherwise false.
     * The property is on relevant for "Navlink" features.
     */
    split: number | boolean;
    /**
     * True if this feature is currently selected, otherwise false.
     */
    selected: boolean;
    /**
     * True if this feature is currently hovered, otherwise false.
     */
    hovered: boolean;
}

/**
 * Options to configure the map editor ({@link editor.Editor}).
 */
export declare interface EditorOptions {
    /**
     * define the TileLayers that should be edited with the {@link editor.Editor}
     */
    layers?: TileLayer[];
    /**
     * Callback that is called before certain edit operations are executed.
     * This callback can be used to allow or restrict specific edit operations based on the return value.
     *
     * @param feature - The map feature to be edited.
     * @param restrictionMask - A bitmask representing the desired edit operations:
     *     1 - GEOMETRY CHANGE
     *     2 - REMOVE
     *
     * @returns {boolean} - Return `false` to allow the operation(s) and execute the edits.
     *                      Return `true` to forbid the operation(s); no edits will be executed.
     *
     * @defaultValue false
     */
    editRestrictions?: (feature: Feature, restrictionMask: number) => boolean;
    /**
     * Define the pixel radius of the area within a shape point of a Navlink Feature can be moved by mouse/touch interaction.
     *
     * @deprecated geoFence not supported.
     * @defaultValue false - deactivated by default.
     */
    geoFence?: number | false;
    /**
     *
     * The distance in meters between each of two coordinates/shape-points where snapping occurs.
     * Two coordinates/shape-points closer than this parameter will be joined to a single point.
     *
     * @defaultValue 2
     */
    snapTolerance?: number;
    /**
     * The "routingPointPrecision" defines the number of decimal places of the position of a routing point when it is changed.
     *
     * @defaultValue 5
     */
    routingPointPrecision?: number;
    /**
     * Defines the coordinate precision for the automatic intersection detection.
     * Number of decimal points of the WGS coordinates that must match.
     *
     * @defaultValue 5
     */
    intersectionScale?: number;
    /**
     * The distance in meters between the two shape-points when two Navlink Features get disconnected.
     *
     * @defaultValue 3
     */
    disconnectShapeDistance?: number;
    /**
     * Keep features selected after mapview-change or click on the "ground" of the map.
     * if set to false -\> will be cleared after viewport change and click on ground.
     * if set to "viewportChange" -\> will only be cleared on ground click.
     * if set to true -\> no clear at all.
     *
     * @defaultValue "viewportChange"
     */
    keepFeatureSelection?: string | boolean;
    /**
     * Select a feature by default on tap/pointerup event.
     *
     * @defaultValue true
     */
    featureSelectionByDefault?: boolean;
    /**
     * The maximum allowed distance of the "Routing Point" to the Address/Place itself in meters.
     *
     * @defaultValue 1000 - 1000 meters
     */
    maxRoutingPointDistance?: number;

    /**
     * Optional service settings.
     */
    services?: {
        /**
         * define reverseGeocoder service/functionality to request the address for a geographical position.
         */
        reverseGeocoder?: {
            /**
             * Get the iso country code for a geographical position.
             * If "getISOCC" is defined, the iso country code will be attached to all newly created features before sending to remote datasource.
             *
             * @example
             * ```typescript
             * {
             *     reverseGeocoder:
             *     {
             *         getISOCC(lon: number, lat: number, callback:(isocc:string)=>void){
             *             // do a reverse geocode request to get the isocc value
             *             const isocc = "theIsoCountryCode";
             *
             *             callback(isocc);
             *         }
             *     }
             * }
             * ```
             */
            getISOCC?(longitude: number, latitude: number, callback: (isoCC: string) => void): string | undefined;
        };
    };

}

/**
 * A generic editable map feature with one of the following geometry types: 'Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'.
 * The Feature can be edited with the {@link Editor}.
 */
export declare class Feature extends Feature_2 {


    /**
     * The Properties of the feature
     */
    properties: FeatureProperties;

    /**
     * The Feature class of the feature.
     * The value must be one of "NAVLINK", "ADDRESS", "PLACE", "AREA" or "MARKER".
     */
    class: string;










    /**
     * Get a specific {@link EditorFeatureProperties|EditState} of the feature.
     *
     * @param state - the "EditState" to retrieve its value.
     *
     * @return the value of the respective "EditState".
     *
     */
    editState(state: 'created' | 'modified' | 'removed' | 'split' | 'hovered' | 'selected', value?: number | boolean): number | boolean | undefined;
    /**
     * Get default or current style of the feature.
     *
     * @deprecated - use layer.setStyleGroup instead
     * @defaultValue "default"
     * @param type - indicates which style to return. "default" -\> layer default style for the feature or the "current" applied style.
     *
     * @returns the style of the feature
     */
    style(type?: 'default' | 'current'): Style[];
    /**
     * Apply style to the feature.
     *
     * @deprecated - use layer.setStyleGroup instead
     * @param style - the style to set for the feature
     */
    style(style: Style[]): any;
    /**
     * Get a deep copy of the properties of the feature
     */
    prop(): {
        [name: string]: any;
    };
    /**
     * Get the value of a specific property
     *
     * @param property - name of the property
     *
     * @returns the value of the specific property
     */
    prop(property: string): any;
    /**
     * Set the value for a specific property
     *
     * @param property - name of the property
     * @param value - the value that should be set for the property
     */
    prop(property: string, value: any): void;
    /**
     * Set one or more properties of the object.
     * @param properties - the properties object literal that should be merged with the existing properties.
     */
    prop(properties: {
        [name: string]: any;
    }): void;

    /**
     * Get the coordinate(s) of the feature.
     */
    coord(): GeoJSONCoordinate | GeoJSONCoordinate[] | GeoJSONCoordinate[][] | GeoJSONCoordinate[][][] | GeoJSONCoordinate[][][][];
    /**
     * Set the coordinate(s) of the feature.
     *
     * @param coordinates - the coordinates that should be set. The coordinates must match features geometry type.
     */
    coord(coordinates: GeoJSONCoordinate | GeoJSONCoordinate[] | GeoJSONCoordinate[][] | GeoJSONCoordinate[][][] | GeoJSONCoordinate[][][][]): any;
    /**
     * Define if the feature should be editable by the Editor module or not.
     *
     * @param editable - True, the feature can be edited, otherwise false.
     *
     * @deprecated
     * @example
     * ```
     * // prevent the feature from being modified by the editor module
     * object.editable(false);
     * ```
     */
    editable(editable: boolean): this;
    /**
     * Select and highlight the feature.
     * Selected features geometry is displayed and can easily be modified by mouse/touch interaction.
     */
    select(): void;
    /**
     * Unselect the feature.
     */
    unselect(): void;
    /**
     * Enable Transform Utility to allow easy geometry transformation of the feature (move/scale/rotate) by mouse/touch interaction.
     */
    transform(): void;
    /**
     * Remove the feature.
     */
    remove(): void;
}

/**
 * A FeatureContainer is a array-like collection of Features.
 * It enables editing operations to be carried out for all features of the FeatureContainer at the same time.
 */
declare interface FeatureContainer {
    /**
     *  The type of the container is 'CONTAINER'
     */
    type: 'CONTAINER';
    /**
     *  The number of features in the container
     */
    length: number;
    /**
     *  Add the given feature(s) to the container.
     *
     *  @param feature - The feature(s) to add to the end of the container.
     *  @param layer - layer the feature(s) should be added.
     *
     *  @returns length of the containing features
     *
     */
    push(feature: Feature | Feature[], layer?: TileLayer): number;
    /**
     * Executes a provided function once per container feature
     *
     * @param fnc - function to be called for the objects in container
     */
    forEach(fnc: (feature: Feature, index: number) => void): any;
    /**
     * Receive all Features of the Container as a native Array
     */
    toArray(): Feature[];
    /**
     * Highlights all features in the container
     */
    highlight(): any;
    /**
     * Removes all features of the container from the map.
     */
    remove(): any;
    /**
     * Enable the Transform Utility to allow easy geometry transformations (move/scale/rotate) of all the feature of the container by mouse/touch interaction.
     */
    transform(): any;
    /**
     * UnHighlight all features of the container
     */
    unHighlight(): any;
    /**
     * Pops out the last feature that has been added to the container
     *
     * @returns the last added Feature
     */
    pop(): Feature;
}

/**
 *  The properties of a editable Features.
 */
declare interface FeatureProperties {
    /**
     * generic key - value map / object literal.
     */
    [name: string]: any;
    /**
     *  Properties to indicate current state of this feature.
     */
    readonly '@ns:com:here:editor': EditorFeatureProperties;
}

/**
 * The FeatureRemoveHook will be called when a feature is being removed ('Feature.remove' operation).
 */
export declare type FeatureRemoveHook = (data: {
    /**
     * the feature that is going to be removed
     */
    feature: Feature_2;
}) => void;

declare function getPrivate(feature: Line, name?: string): any;

/**
 * The Line Feature is a generic editable Feature with "LineString" or "MultiLineString" geometry.
 * The Feature can be edited with the {@link Editor}.
 */
export declare class Line extends Feature {
    /**
     *  The feature class of a Line Feature is "LINE".
     */
    readonly class: 'LINE';
    /**
     * Add a new shape point / coordinate to the line.
     *
     * @param point - the coordinate to add
     *
     * @returns index of the shape or false if shape could not be added
     */
    addShape(point: PixelPoint | GeoPoint): boolean | number;
    /**
     * Adds a new coordinate to the line feature with "LineString" or "MultiLineString" geometry.
     * For Line features with "LineString" geometry the a value of 0 must be passed for lineStringIndex.
     *
     * @param point - the coordinate to add
     * @param lineStringIndex - the index of the coordinate array in the MultiLineStrings array of LineString coordinate arrays.
     * @param coordinateIndex - the index position in the LineString coordinate array where the new shape point should be inserted.
     *
     * @returns index of the shape or false if shape could not be added
     */
    addShape(point: PixelPoint | GeoPoint, lineStringIndex: number, coordinateIndex?: number): boolean | number;
    /**
     * Get the geographical coordinate(s) of the Line feature.
     */
    coord(): [number, number, number?][] | [number, number, number?][][];
    /**
     * Set the geographical coordinate(s) of the Line feature.
     *
     * @param coordinates - the geographical coordinates that should be set.
     */
    coord(coordinates: [number, number, number?][] | [number, number, number?][][]): any;
    /**
     * Returns an array of Boolean values indicating whether the corresponding shape is selected at index or not.
     */
    getSelectedShapes(): boolean[] | boolean[][];
    /**
     * Sets the selected state of the shapes at their respective indices.
     *
     * @param selectedShapeIndicies Array of Boolean values indicating whether the corresponding shape is selected at index or not
     */
    setSelectedShapes(selectedShapeIndicies: boolean[] | boolean[][]): void;
    /**
     * Simplifies the line geometry by removing unnecessary points while preserving the overall shape.
     *
     * This method reduces the number of vertices in the line based on a distance-based tolerance.
     * The tolerance can be provided either as a **number** (assumed to be in meters) or as a **string** with units like "px" (pixels) or "m" (meters).
     *
     * @param tolerance - The maximum allowed deviation between the original line and the simplified version.
     *                    This can be specified as:
     *                    - **A number (default in meters)**: The tolerance in meters (e.g., `5` means 5 meters).
     *                    - **A string with units**: e.g., `"10px"` for pixels or `"10m"` for meters.
     *                    - If a string is provided without units, **meters** is assumed by default.
     *
     *                    A larger value results in fewer points and more aggressive simplification.
     *                    A smaller value retains more detail but reduces the simplification effect.
     *
     * @example
     * line.simplifyGeometry(5); // Simplifies the line allowing up to 5 meters of deviation.
     * line.simplifyGeometry("10m"); // Simplifies the line allowing up to 10 meters of deviation.
     * line.simplifyGeometry("10px"); // Simplifies the line with a tolerance of 10 pixels (useful for screen-based coordinates).
     */
    simplifyGeometry(tolerance: number | string): void;
}

/**
 * The LineShape represents a shape-point / coordinate of a Line feature.
 * The LineShape is only existing if the corresponding Line feature is "selected" and user based geometry editing with touch/mouse interaction is activated.
 * @see {@link Line.select}
 */
export declare class LineShape extends Feature_2 {


    /**
     * The feature class of a LineShape Feature is "LINE_SHAPE".
     */
    class: string;



    /**
     * Set the behavior options.
     * @experimental
     */
    behavior(options: {
        /**
         * The drag axis across which the LineShape is dragged upon user interaction.
         * Once "dragAxis" is set, "dragPlane" has no effect.
         * In case "dragAxis" and "dragPlane" are set, "dragPlane" is preferred.
         * In case "dragPlane" and "dragAxis" are both set, "dragPlane" is preferred.
         */
        dragAxis?: 'X' | 'Y' | 'Z' | [number, number, number];
        /**
         * The normal of the plane over which the LineShape is dragged upon user interaction.
         * Once "dragPlane" is set, "dragAxis" has no effect.
         */
        dragPlane?: 'XY' | 'XZ' | 'YZ' | [number, number, number];
    }): void;
    /**
     * Set the value of a specific behavior option.
     * @experimental
     */
    behavior(name: string, value: boolean | string | [number, number, number]): void;
    /**
     * Get the value of a specific behavior option.
     * @experimental
     */
    behavior(option: string): any;
    /**
     * Get the behavior options.
     * @experimental
     */
    behavior(): {
        /**
         * The drag axis across which the marker is dragged upon user interaction.
         */
        dragAxis?: [number, number, number] | 'X' | 'Y' | 'Z' | null;
        /**
         * The normal of the plane over which the marker is dragged upon user interaction.
         */
        dragPlane?: [number, number, number] | 'XY' | 'XZ' | 'YZ' | null;
    };
    /**
     * Get the Line feature to which the LineShape belongs.
     *
     * @returns the Line feature
     */
    getLine(): Line;
    /**
     *  Get the total number of coordinates of the LineString geometry.
     *
     *  @returns Number of coordinates
     */
    getLength(): number;
    /**
     * Get the index of the shape point in the coordinates array of the respective LineString geometry.
     *
     * @returns The index of the shape point.
     */
    getIndex(): number;
    /**
     *  Get the index of the coordinate array in the MultiLineString array of LineString coordinate arrays.
     *  For Line features with a geometry of type "LineString" the lineStringIndex is 0.
     *
     *  @returns the index of the coordinate array in the MultiLineString array of LineString coordinate arrays.
     */
    getLineStringIndex(): number;
    /**
     * Removes the shape point from the geometry of the Line feature.
     */
    remove(): void;
    /**
     * Select the LineShape add it to the current selection.
     * Multiple LineShapes can be selected at the same time.
     * When a selected shape is dragged, all other shapes in the current selection are dragged as well.
     */
    select(): void;
    /**
     * Unselect the LineShape and remove from current selection.
     */
    unselect(): void;
    /**
     * Will return true or false whether the Shape is currently selected.
     */
    isSelected(): boolean;




}

/**
 * @hidden
 */
declare class Location_2 extends Marker {


    /**
     *  Get the coordinate(s) of the feature.
     */
    coord(): GeoJSONCoordinate;
    /**
     *  Set the coordinate(s) of the feature.
     *
     *  @param coordinates - the coordinates that should be set.
     */
    coord(coordinate: GeoJSONCoordinate): any;

    /**
     *  Get the Navlink Feature that the feature is linked to/ associated with.
     *
     *  @returns The Navlink Feature or null if the feature is not linked to a Navlink (floating).
     */
    getLink(): Navlink | null;
}

/**
 * The Marker Feature is a generic editable Feature with "Point" geometry.
 * The Feature can be edited with the {@link Editor}.
 */
export declare class Marker extends Feature {
    /**
     *  The feature class of a Marker Feature is "MARKER".
     */
    readonly class: 'MARKER' | string;
    /**
     * Set or get interaction behavior for the marker.
     * @experimental
     */
    behavior(): {
        /**
         * The axis along which the marker can be dragged.
         * Has no effect if `dragPlane` or `dragSurface` is set.
         */
        dragAxis?: [number, number, number] | 'X' | 'Y' | 'Z' | null;
        /**
         * The normal of the plane over which the marker is dragged.
         * Overrides `dragAxis` if both are set.
         * Has no effect if `dragSurface` is set.
         */
        dragPlane?: [number, number, number] | 'XY' | 'XZ' | 'YZ' | null;
        /**
         * The surface over which the marker is dragged.
         * Takes precedence over `dragPlane` and `dragAxis` if set.
         */
        dragSurface?: 'terrain' | null;
    };


    /**
     * Configure drag behavior with multiple options at once.
     * @experimental
     */
    behavior(options: {
        /**
         * The axis along which the marker can be dragged.
         * Ignored if `dragPlane` or `dragSurface` is set.
         */
        dragAxis?: [number, number, number] | 'X' | 'Y' | 'Z';
        /**
         * The normal of the plane over which the marker is dragged.
         * Overrides `dragAxis` if both are set.
         * Ignored if `dragSurface` is set.
         */
        dragPlane?: [number, number, number] | 'XY' | 'XZ' | 'YZ';
        /**
         * The surface over which the marker is dragged.
         * Takes precedence over both `dragPlane` and `dragAxis`.
         */
        dragSurface?: 'terrain';
    }): void;
}

/**
 * The Navlink Feature is a generic editable Feature with "LineString" geometry.
 * In addition to the Line Feature, the Navlink feature can be linked/associated with other Navlink Features.
 * A Navlink Feature also can be referenced by Addresses and Places.
 * A Navlink is part of a "road nertwork".
 *
 * The Feature can be edited with the {@link Editor}.
 */
export declare class Navlink extends Feature {
    /**
     * The feature class of an Navlink Feature is "NAVLINK".
     */
    readonly class: 'NAVLINK';

    /**
     * Get the geographical coordinate(s) of the Navlink feature.
     */
    coord(): [number, number, number?][];
    /**
     * Set the geographical coordinate(s) of the Navlink feature.
     *
     * @param coordinates - the geographical coordinates that should be set.
     */
    coord(coordinates: [number, number, number?][]): any;
    /**
     * Checks for possible crossing geometry with other Navlink features.
     *
     * @param option - options to configure the crossing check.
     *
     * @returns array of found crossings
     *
     * @example
     * ```typescript
     * crossing.checkCrossings({
     *    type: "CROSSING",
     *        styles: {
     *            connector1: {fill: 'black'},
     *            connector2: {stroke: '#FBF'}
     *        }
     * })
     * ```
     */
    checkCrossings(option?: {
        /**
         * Class of the crossing to check for. If no class is defined 'CROSSING' and 'CROSSING_CANDIDATE' is checked for.
         */
        class?: 'CROSSING' | 'CROSSING_CANDIDATE';
        /**
         * Style of the crossings they should be displayed with. 6 configurable styling objects('connector1', 'connector2', 'connector3', 'search1', 'search2', 'found') comprise a crossing.
         */
        styles?: {
            connector1?: Style;
            connector2?: Style;
            connector3?: Style;
            search1?: Style;
            search2?: Style;
            found?: Style;
        };
    }): Crossing[];
    /**
     * Show or hide the direction hint on the Navlink feature.
     * If the function is called without arguments, the hint will be hidden.
     *
     * @param dir - direction of the Navlink, possible value: "BOTH"|"START_TO_END"|"END_TO_START"
     * @param hideShapes - indicates if the Start and End shapepoints of the Navlink should be displayed or not
     */
    showDirectionHint(dir?: 'BOTH' | 'START_TO_END' | 'END_TO_START', hideShapes?: boolean): void;
    /**
     * Sets the radius of the geofence.
     *
     * @deprecated - geofence not supported
     * @param radius - The geofence radius in pixel.
     *
     */
    setGeoFence: (radius: number) => void;
    /**
     * Add a new shape-point / coordinate to the Navlink.
     *
     * @param point - the coordinate of the new shape to add.
     * @param index - the index position in the coordinate array of the LineString where the new shape point should be inserted.
     *
     * @returns index of the shape or false if shape could not be added
     */
    addShape(point: GeoPoint | PixelPoint, index?: number): number | boolean;
    /**
     * Set the behavior options.
     * @experimental
     */
    behavior(options: {
        /**
         * Snap coordinates to {@link Navlink} geometry nearby.
         */
        snapCoordinates?: boolean;
    }): void;
    /**
     * Set the value of a specific behavior option.
     * @experimental
     */
    behavior(name: string, value: boolean): void;
    /**
     * Get the value of a specific behavior option.
     * @experimental
     */
    behavior(option: string): any;
    /**
     * Get the behavior options.
     * @experimental
     */
    behavior(): {
        /**
         * Snap coordinates to {@link Navlink} geometry nearby.
         */
        snapCoordinates: boolean;
    };
    /**
     * Get connected Navlink Features for the node.
     * A node is either the Start or End coordinate of the Navlink (LineString) geometry.
     *
     * @param index - coordinate index for shape/node. 0 -\> "start node", or index of last coordinate for the "end node".
     *
     * @returns Array that's containing the connected Navlink Features.
     */
    getConnectedLinks(index: number): Navlink[];
    /**
     * Get connected Navlink Features for the node.
     * A node is either the Start or End coordinate of the Navlink (LineString) geometry.
     *
     * @param index - coordinate index for shape/node. 0 -\> "start node", or index of last coordinate for the "end node".
     * @param details - flag to enable detailed information of the connected Navlinks.
     *
     * @returns Array of detailed connected Navlink information including the shape/node index of connected link.
     */
    getConnectedLinks(index: number, details: true): {
        link: Navlink;
        index: number;
    }[];
    /**
     * Get the z-levels for the coordinates of the Navlink feature.
     *
     * @returns The Array of z-levels for the coordinates of the Navlink.
     *
     */
    getZLevels(): number[];
    /**
     * Get the z-level for a specific coordinate of the Navlink feature.
     *
     * The z-level of the coordinate at the index of the feature's coordinate array.
     *
     */
    getZLevels(index: number): number;
    /**
     * Returns an array of Boolean values indicating whether the corresponding shape is selected at coordinate-index or not.
     */
    getSelectedShapes(): boolean[] | boolean[][];
    /**
     * Sets the selected state of the shapes at their respective coordinate-indices.
     *
     * @param selectedShapeIndicies Array of Boolean values indicating whether the corresponding shape is selected at index or not
     */
    setSelectedShapes(selectedShapeIndicies: boolean[] | boolean[][]): void;
    /**
     * Set the z-levels for the coordinates of the Navlink Feature.
     * For each coordinate of the Navlink, the respective z-level must be provided.
     *
     * @param zLevels - The z-levels to be set for the coordinates of the Navlink.
     *
     * @example
     * ```
     * // modify the zLevel of the second coordinate.
     * let zlevels = navlink.getZLevels();
     * zlevels[1] = -4;
     * navlink.setZLevels(zlevels);
     * ```
     */
    setZLevels(zLevels: number[]): void;
    /**
     * Simplifies the line geometry by removing unnecessary points while preserving the overall shape.
     *
     * This method reduces the number of vertices in the line based on a distance-based tolerance.
     * The tolerance can be provided either as a **number** (assumed to be in meters) or as a **string** with units like "px" (pixels) or "m" (meters).
     *
     * @param tolerance - The maximum allowed deviation between the original line and the simplified version.
     *                    This can be specified as:
     *                    - **A number (default in meters)**: The tolerance in meters (e.g., `5` means 5 meters).
     *                    - **A string with units**: e.g., `"10px"` for pixels or `"10m"` for meters.
     *                    - If a string is provided without units, **meters** is assumed by default.
     *
     *                    A larger value results in fewer points and more aggressive simplification.
     *                    A smaller value retains more detail but reduces the simplification effect.
     *
     * @example
     * line.simplifyGeometry(5); // Simplifies the line allowing up to 5 meters of deviation.
     * line.simplifyGeometry("10m"); // Simplifies the line allowing up to 10 meters of deviation.
     * line.simplifyGeometry("10px"); // Simplifies the line with a tolerance of 10 pixels (useful for screen-based coordinates).
     */
    simplifyGeometry(tolerance: number | string): void;
    /**
     * Displays and allows editing of the "turn restrictions" for the node/shape-point at the "index" of the Navlink feature.
     * The index must be the respective index in the coordinates array of the first (0) or last coordinate of the Navlink.
     *
     * @param index - the index of the node to display the turn restrictions for.
     *
     * @returns the TurnRestrictionEditor for the respective shape/node.
     */
    editTurnRestrictions(index: number): TurnRestrictionEditor;
    /**
     * Displays and allows editing of all "turn restrictions" for the start and end node of the Navlink feature.
     *
     * @returns Array containing the TurnRestrictionEditor for the start-node and end-node (shape-points).
     */
    editTurnRestrictions(): TurnRestrictionEditor[];




}

/**
 * The NavlinkDisconnectHook is called whenever a Navlink is disconnected from an intersection ('Navlink.disconnect' operation).
 */
export declare type NavlinkDisconnectHook = (data: {
    /**
     * The Navlink that will be "disconnected" from the intersection
     */
    link: Navlink;
    /**
     * The index of the coordinate that will be offset to "disconnect" the Navlink from the intersection
     */
    index: number;
}) => void;

/**
 * The NavlinkShape represents a shape-point / coordinate of a Navlink feature.
 * The NavlinkShape is only existing if the corresponding Navlink feature is "selected" and user based geometry editing with touch/mouse interaction is activated.
 * @see {@link Navlink.select}
 */
export declare class NavlinkShape extends Feature_2 {
    /**
     * The feature class of an NavlinkShape Feature is "NAVLINK_SHAPE".
     */
    class: 'NAVLINK_SHAPE';



    /**
     * Set the behavior options.
     * @experimental
     */
    behavior(options: {
        /**
         * The drag axis across which the LineShape is dragged upon user interaction.
         * Once "dragAxis" is set, "dragPlane" has no effect.
         * In case "dragAxis" and "dragPlane" are set, "dragPlane" is preferred.
         * In case "dragPlane" and "dragAxis" are both set, "dragPlane" is preferred.
         */
        dragAxis?: 'X' | 'Y' | 'Z' | [number, number, number];
        /**
         * The normal of the plane over which the LineShape is dragged upon user interaction.
         * Once "dragPlane" is set, "dragAxis" has no effect.
         */
        dragPlane?: 'XY' | 'XZ' | 'YZ' | [number, number, number];
    }): void;
    /**
     * Set the value of a specific behavior option.
     * @experimental
     */
    behavior(name: string, value: boolean | string | [number, number, number]): void;
    /**
     * Get the value of a specific behavior option.
     * @experimental
     */
    behavior(option: string): any;
    /**
     * Get the behavior options.
     * @experimental
     */
    behavior(): {
        /**
         * The drag axis across which the marker is dragged upon user interaction.
         */
        dragAxis?: [number, number, number] | 'X' | 'Y' | 'Z' | null;
        /**
         * The normal of the plane over which the marker is dragged upon user interaction.
         */
        dragPlane?: [number, number, number] | 'XY' | 'XZ' | 'YZ' | null;
    };
    /**
     * Get the Navlink feature to which the NavlinkShape belongs.
     *
     * @returns the Navlink
     */
    getLink(): Navlink;
    /**
     * Checks if shape is start or end shape (Node) of the Navlink feature.
     *
     * @returns true if its start or end shape (Node), otherwise false
     */
    isNode(): boolean;
    /**
     * Checks if shape is overlapping with an existing shape/coordinate of another Navlink feature.
     *
     * @returns true if it overlaps with another shape, false otherwise.
     */
    isOverlapping(): any;
    /**
     * Get the index of the shape point in the coordinates array of the respective Navlink feature.
     *
     * @returns The index of the shape point.
     */
    getIndex(): number;
    /**
     * Show the turn restrictions of the shape and enable editing of the turn-restrictions.
     * Turn restrictions are only available if the shape is a node (start or end point) and part of an intersection with other Navlink features involved.
     */
    editTurnRestrictions(): TurnRestrictionEditor;
    /**
     * Get an array of Navlink features that are connected to this shape point.
     * Navlinks are "connected" with each other if they share the same coordinate location of start or end shape-point.
     *
     * @returns An array of Navlink Features with coordinates located at the same position as the shape.
     */
    getConnectedLinks(): Navlink[];
    /**
     * Removes the shape point from the geometry of the Navlink feature.
     */
    remove(): void;
    /**
     * Disconnect the Navlink from other connected Navlink features at this shape point.
     * The Intersection is resolved by moving the position of the shape(node).
     *
     * @see {@link EditorOptions.disconnectShapeDistance} to configure the default offset used for offsetting the shape in meters.
     */
    disconnect(): void;
    /**
     * Select the NavlinkShape add it to the current selection.
     * Multiple NavlinkShape can be selected at the same time.
     * When a selected shape is dragged, all other shapes in the current selection are dragged as well.
     */
    select(): void;
    /**
     * Unselect the NavlinkShape and remove from current selection.
     */
    unselect(): void;
    /**
     * Splits the Navlink at the position of the NavlinkShape into two new "child" Navlinks.
     * The coordinate of the NavlinkShape will be the start and end positions of the resulting Navlinks.
     * The "parent" Navlink itself gets deleted after the split operation is done.
     *
     * ```
     * @example
     * let links = shapePoint.splitLink();
     * ```
     *
     * @returns An array containing the two newly created Navlink features.
     */
    splitLink(): [Navlink, Navlink];
    /**
     * Will return true or false whether the Shape is currently selected.
     */
    isSelected(): boolean;
}

/**
 * The NavlinkSplitHook is called whenever a Navlink is devided into two new Navlinks. ('Navlink.split' operation).
 */
export declare type NavlinkSplitHook = (data: {
    /**
     * The Navlink that will be split.
     */
    link: Navlink;
    /**
     * The index of the coordinate in which the split takes place and the new navlinks are connected to one another.
     */
    index: number;
    /**
     * The two newly created Navlinks that are replacing the original Navlink.
     */
    children: [Navlink, Navlink];
    /**
     * The relative position on the Navlink's geometry where the split happened.
     * The range of values is from 0.0 to 1.0, where 0 represents the position on the first and 1 on the last coordinate.
     */
    relativePosition: number;
}) => void;

declare function onHover(e: any): void;

/**
 * The Place Feature is a generic editable Feature with "Point" geometry.
 * In addition to the Marker Feature, the Place feature can have a "routing point" located on a Navlink geometry.
 * A Place can be linked/associated with a Navlink Feature.
 *
 * The Feature can be edited with the {@link Editor}.
 *
 */
export declare class Place extends Location_2 {
    /**
     *  The feature class of a Place Feature is "PLACE".
     */
    readonly class: 'PLACE';

    /**
     *  Find the nearest routing point and assign it to the Place Feature.
     */
    createRoutingPoint(): void;
    /**
     *  Remove the existing routing point from the Place Feature.
     */
    removeRoutingPoint(): void;




}

/**
 * A Range represents a part/subsegment on a line geometry or multiple line geometries.
 * It's used by the RangeSelector utility. {@link editor.RangeSelector}
 */
declare interface Range_2 {
    /**
     * Optional identifier of the Range
     */
    id?: string | number;
    /**
     * Side of the Range. Relative to the direction of travel of the line geometry.
     * "L" | "R" | "B" -\> Left, Right or Both sides.
     *
     * @defaultValue "B"
     */
    side?: 'L' | 'R' | 'B';
    /**
     * Relative start position on the line geometry.
     * 0 -\> 0% -\> start, 0.5 -\> 50% -\> middle, 1 -\> 100% -\> end
     * @defaultValue 0.0
     */
    from?: number;
    /**
     * Relative end position on the line geometry.
     * 0.5 -\> 50% -\> middle, 1 -\> 100% -\> end
     * @defaultValue 1.0
     */
    to?: number;
    /**
     * lock the range and prevent dragging/editing of the Range.
     */
    locked?: boolean;
    /**
     * Apply custom styling of Range.
     * Objects of key value pairs.
     */
    style?: any;
    /**
     * Set an event listener that will be called when a range drag starts.
     *
     * @param event - The respective event.
     * The {@link Range} is provided in the detail property of the event. (event.detail.range)
     */
    dragStart?: (event: EditorEvent) => void;
    /**
     * Set an event listener that will be called when a range is dragged.
     *
     * @param event - The respective event.
     * The {@link Range} is provided in the detail property of the event. (event.detail.range)
     */
    dragMove?: (event: EditorEvent) => void;
    /**
     * Set an event listener that will be called when a range drag has been finished.
     *
     * @param event - The respective event.
     * The {@link Range} is provided in the detail property of the event. (event.detail.range)
     */
    dragStop?: (event: EditorEvent) => void;
    /**
     * A range can consist of several segments.
     * A Segment provides detailed information on the affected GeoJSONFeatures/Navlinks:
     * @example
     * ```
     * {
     *  feature: GeoJSONFeature;
     *  from: number;
     *  to: number;
     *  reversed: boolean;
     * }
     * ```
     */
    readonly segments?: RangeSegment[];
    /**
     * Automatically snap to Markers of Ranges on the desired side(s) within a given threshold.
     *
     * - 'L' : snap to RangeMarkers on the left side
     * - 'R' : snap to RangeMarkers on the right side
     * - 'B' : snap to RangeMarkers on both sides.
     * - true : snap to RangeMarkers regardless of its side, equals: ['L','R','B']
     * - false : disabled, do not snap automatically.
     *
     *  @defaultValue false
     */
    snap?: 'L' | 'R' | 'B' | ('L' | 'R' | 'B')[] | true | false;
    /**
     * The threshold in meters for automatic range snapping.
     *
     * @default 1 (meter)
     */
    snapTolerance?: number;
    /**
     * Allow overlapping of ranges on the desired side(s).
     *
     * - 'L' : allow overlapping with all Ranges on the left side.
     * - 'R' : allow overlapping with all Ranges on the right side.
     * - 'B' : allow overlapping with all Ranges on the both side.
     * - true : allow overlapping with all Ranges regardless of its side, equals: ['L','R','B']
     * - false : disabled, do not allow overlapping at all.
     *
     * @defaultValue true
     */
    allowOverlap?: 'L' | 'R' | 'B' | ('L' | 'R' | 'B')[] | true | false;
    markerStyle?: any;
    lineStyle?: any;
}

/**
 * A RangeSegment is the part of a "Range" that's located at a specific LineString geometry or Navlink feature.
 */
declare type RangeSegment = {
    /**
     * The Navlink the RangeSegment is located at.
     * @hidden
     * @deprecated Please use RangeSegment.feature instead
     */
    navlink: Navlink;
    /**
     * The GeoJSONFeature or Navlink the RangeSegment is located at.
     */
    feature: GeoJSONFeature | Navlink;
    /**
     * Relative start position on the geometry of the Navlink.
     * 0 -\> 0% -\> start, 0.5 -\> 50% -\> middle, 1 -\> 100% -\> end
     */
    from: number;
    /**
     * Relative end position on the geometry of the Navlink.
     * 0.5 -\> 50% -\> middle, 1 -\> 100% -\> end
     */
    to: number;
    /**
     * The indicates if the direction of travel of the Navlink is in reverse order, compared to the direction of travel of the first Navlink that's has been added of the RangeSelector.
     */
    reversed: boolean;
};

/**
 * The RangeSelector is a tool to create and modify Ranges on a single geometry or multiple line geometries.
 * A Range represents a part/subsegment on a line geometry or multiple line geometries and allows separate attribution.
 */
export declare class RangeSelector {



    /**
     * Add Navlink(s) to RangeSelector tool.
     *
     * @param geometry - a single or multiple LineString Features or Navlink Features to add. Multiple LineStrings/Navlinks must be linked.
     *
     */
    add(geometry: Navlink | Navlink[] | GeoJSONFeature | GeoJSONFeature[]): void;
    /**
     * Add and show a Range. A Range can be located on a single or multiple Navlink(s).
     *
     * @param range - The Range that should be displayed.
     */
    show(...ranges: Range_2[]): any;
    /**
     * Add and a single or multiple Ranges. A Range can be located on a single or multiple Navlink(s).
     *
     * @param range - The Range(s) that should be displayed.
     */
    show(range: Range_2 | Range_2[]): any;
    /**
     * hides all Ranges and the RangeSelector tool itself.
     */
    hide(): void;
    /**
     * detailed information about all ranges and its segments.
     *
     * @returns An array of Ranges providing detailed information for each Range.
     */
    info(): Range_2[];

}

/**
 * The TurnRestrictionEditor allows to visualize and edit all TurnRestrictions of an intersection.
 */
declare interface TurnRestrictionEditor {
    /**
     *  Show all turn restrictions of the road intersection.
     */
    show(): any;
    /**
     *  Hide all turn restrictions of the road intersection.
     */
    hide(): any;
    /**
     *  Indicates if TurnRestrictionEditor are displayed and editing by user interaction is enabled.
     */
    isActive(): boolean;
}

declare enum xClass {
    CROSSING = "CROSSING",
    CROSSING_CANDIDATE = "CROSSING_CANDIDATE"
}

export { }
