import { Color as Color_2 } from '@here/xyz-maps-common';
import * as common from '@here/xyz-maps-common';
import { CoordinatesUpdateHook } from '@here/xyz-maps-editor';
import { ExpressionParser } from '@here/xyz-maps-common';
import { FeatureRemoveHook } from '@here/xyz-maps-editor';
import { Listener } from '@here/xyz-maps-common';
import { NavlinkDisconnectHook } from '@here/xyz-maps-editor';
import { NavlinkSplitHook } from '@here/xyz-maps-editor';
import RBush from 'rbush/rbush.min.js';
import { TerrainTileProvider as TerrainTileProvider_2 } from '@here/xyz-maps-core';

/**
 * The `AmbientLight` interface represents ambient lighting, which provides a constant level of illumination across all objects.
 *
 * @extends Light
 */
export declare interface AmbientLight extends Light {
    /**
     * The type of light. For `AmbientLight`, this is always 'ambient'.
     */
    type: 'ambient';
}

/**
 * Interface for configuring the visual appearance of Boxes.
 */
export declare interface BoxStyle {
    /**
     * Specifies the type of style to render.
     */
    type: 'Box';
    /**
     * Indicates the drawing order within a layer.
     * Styles with larger zIndex value are rendered above those with smaller values.
     * The zIndex is defined relative to the "zLayer" property.
     * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
     */
    zIndex: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Indicates drawing order across multiple layers.
     * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
     * If no zLayer is defined, it will fall back to the {@link LayerStyle.zLayer} or depend on the display layer order.
     * The first (lowest) layer has a zLayer value of 1.
     *
     * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
     */
    zLayer?: number | StyleValueFunction<number> | StyleExpression<number>;
    /**
     * Sets the color to fill the Box.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    fill?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the stroke color of the Box.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    stroke?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the width of the stroke.
     * The unit of strokeWidth is defined in pixels.
     *
     * @example
     * ```typescript
     * // define a red filled Box that with a blue stroke of 2px width.
     * {
     *     zIndex: 0,
     *     type: "Box",
     *     fill: "red",
     *     stroke: "blue",
     *     strokeWidth: "2
     * }
     * ```
     */
    strokeWidth?: number | string | StyleValueFunction<number | number> | StyleZoomRange<string | number> | StyleExpression<number | string>;
    /**
     * Defines the opacity of the style.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     *
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * The Width of the Box.
     * The unit of width is defined in pixels.
     *
     * @example
     * ```typescript
     * // define a Box that has a width, height and depth of 32 pixels.
     * {
     *     zIndex: 0,
     *     type: "Box",
     *     fill: "blue",
     *     width: 32
     * }
     * ```
     */
    width: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * The Height of the Box.
     * The unit of height is defined in pixels.
     * If the height is not explicitly defined, the value of the width is used as the height.
     *
     * @example
     * ```typescript
     * // define a Box that have a width of 32px and a height of 48px.
     * {
     *     zIndex: 0,
     *     type: "Box",
     *     fill: "blue",
     *     width: 32,
     *     height: 48
     * }
     * ```
     */
    height?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * The depth of the Box.
     * The depth defines the length of the edges of a "Box" parallel to the Z axis.
     * If the depth is not explicitly defined, the value of the "width" is used as the height.
     *
     * @example
     * ```typescript
     * // define a Box that has a width, height and depth of 16px
     * {
     *     zIndex: 0,
     *     type: "Box",
     *     stroke: "blue",
     *     fill: "red",
     *     width: 16,
     *     height: 16,
     *     depth: 16
     * }
     * ```
     */
    depth?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Offset the Box in pixels on x-axis.
     * A positive value offsets to the right, a negative value to the left.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Box by 8px to the right.
     * { type: "Box", zIndex: 0, with: 32, fill: 'red', offsetX: 8}
     * ```
     */
    offsetX?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * Offset the Box in pixels on y-axis.
     * A positive value offsetY offsets downwards, a negative value upwards.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Box by 8px to the bottom
     * { type: "Box", zIndex: 0, fill: 'red', width:32, offsetY: 8}
     *
     * // offset Box by 1m to the top
     * { type: "Box", zIndex: 0, fill: 'blue', width: 32, offsetY: "-1m"}
     * ```
     */
    offsetY?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Offset the Box in pixels on z-axis.
     * A positive value offsets up, a negative value down.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Image by 8px to the top.
     * { type: "Box", zIndex: 0, fill: 'red', width:32, offsetZ: 8}
     *
     * // offset Circle by 1m to the top
     * { type: "Box", zIndex: 0, fill: 'red', width:32, offsetZ: "1m"}
     * ```
     */
    offsetZ?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * Altitude of the Box center in meters.
     *
     * Describes the vertical distance from the global ground plane (0m) to the Box.
     *
     * Supported values:
     * - false (default): place at 0m.
     * - true: use the altitude (z) from the feature geometry if present, else 0. Not re-aligned to the rendered terrain.
     *         If the geometry altitude source differs from the TerrainTileLayer source/resolution, the Box can appear
     *         slightly above or below the visible terrain surface.
     * - number: fixed absolute altitude in meters. Also not adjusted when terrain tiles load; may not perfectly sit
     *           on the terrain unless both use exactly the same elevation source, datum and resolution.
     * - 'terrain': sample (clamp to) the current terrain surface height. While the terrain tile is not yet loaded
     *              (or no terrain layer exists) the altitude is 0 and updates once data becomes available.
     *
     * Notes:
     * - Use 'terrain' to keep the Box visually seated on the rendered terrain.
     * - Use a numeric value for a constant absolute elevation independent of terrain updates.
     * - To position something N meters above terrain: use 'terrain' plus offsetZ (e.g. offsetZ: '5m').
     * - Expect mismatches (floating / sinking) when using true or a fixed number with a different terrain data source.
     *
     * @defaultValue false
     * @experimental
     */
    altitude?: number | boolean | 'terrain' | StyleValueFunction<number | boolean | 'terrain'> | StyleZoomRange<number | boolean | 'terrain'> | StyleExpression<number | boolean | 'terrain'>;
    /**
     * Scales the size of a style based on the feature's altitude.
     * If it's enabled (true), features closer to the camera will be drawn larger than those farther away.
     * When off (false), the size of the style is always the same size, regardless of its actual altitude, as if it were placed on the ground (altitude 0).
     * This attribute applies to styles of type "Rect", "Image", "Text", "Circle", "Line", "Box", or "Sphere" whose size ({@link width}, {@link radius}, {@link strokeWidth}) that are using "map" {@link alignment} only.
     * If the size attribute is defined in meters, scaleByAltitude is enabled by default, for pixels it is disabled.
     *
     * @defaultValue false (pixels), true (meters)
     *
     * @experimental
     */
    scaleByAltitude?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;
    /**
     * Specifies the name of the light group to use for illuminating specific features on a layer.
     * This property must reference a key corresponding to a light group defined in {@link LayerStyle.lights}.
     * A light group consists of lighting sources such as ambient or directional lights that affect the appearance of features.
     *
     * If `light` is not defined, the default light group `"defaultLight"` will be used to illuminate the layer's features.
     *
     * @see {@link LayerStyle.lights} for defining and referencing available light groups.
     *
     * @defaultValue "defaultLight"
     */
    light?: string;
    /**
     * Sets the emissive color of the `"Box"`, giving it a glow effect.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    emissive?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the specular color of the `"Box"`, affecting how it reflects light.
     *
     * ### Relationship with Shininess
     * - **Effect:** The `specular` property determines the color of the light reflection, while the {@link shininess} value controls the intensity and size of the reflection.
     * - **Shininess Dependency:** If `specular` is set and `shininess` is not explicitly set, the default {@link shininess} value will be used to control the reflection's appearance.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    specular?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the shininess of the `"Box"`, determining how glossy its surface appears.
     * A higher value makes the `"Box"` surface more reflective.
     *
     * ### Relationship with Specular
     * - **Effect:** The `shininess` value controls the size and intensity of the specular highlight, which is colored by the {@link specular} property.
     * - **Specular Dependency:** The `shininess` property enhances the effect of the `specular` color. If `specular` is not set, `shininess` has no visible effect.
     *
     * ### Shininess Value Range and Effect
     * - **Range:** The `shininess` value typically ranges from 0 to 128.
     * - **Low Values (0-10):** Produce a wide, diffused highlight, resulting in a matte or dull appearance.
     * - **High Values (50-128):** Produce a small, intense highlight, resulting in a glossy or shiny appearance.
     *
     * @defaultValue 32
     */
    shininess?: number;
    /**
     * Controls the intensity of the fill color under directional lighting.
     *
     * `fillIntensity` determines how much the `"Box"`'s fill color is affected by the directional lighting in the scene.
     * A higher value increases the intensity of the fill color, making it more vibrant under strong lighting,
     * while a lower value reduces the effect, resulting in a more muted color.
     *
     * The value should range from 0 to 1, where 0 means no color intensity and 1 represents full intensity.
     *
     * @defaultValue 1
     */
    fillIntensity?: number;
}

/**
 *  Detailed Information about the build.
 */
export declare const build: {
    /**
     * the name of the api
     */
    readonly name: string;
    /**
     * the date when the build was created
     */
    readonly date: number;
    /**
     * the git version used for the build.
     */
    readonly revision: string;
    /**
     * the version of the build.
     * uses: Semantic Versioning
     */
    readonly version: string;
};

/**
 * Interface for configuring the visual appearance of Circles.
 */
export declare interface CircleStyle {
    /**
     * Specifies the type of style to render.
     */
    type: 'Circle';
    /**
     * Indicates the drawing order within a layer.
     * Styles with larger zIndex value are rendered above those with smaller values.
     * The zIndex is defined relative to the "zLayer" property.
     * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
     */
    zIndex: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Indicates drawing order across multiple layers.
     * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
     * If no zLayer is defined, it will fall back to the {@link LayerStyle.zLayer} or depend on the display layer order.
     * The first (lowest) layer has a zLayer value of 1.
     *
     * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
     */
    zLayer?: number | StyleValueFunction<number> | StyleExpression<number>;
    /**
     * Sets the color to fill the Circle.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    fill?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the stroke color of the Circle.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    stroke?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the width of the stroke.
     * The unit of strokeWidth is defined in pixels.
     *
     * @example
     * ```typescript
     * // define a Circle that has a strokeWidth of 2 pixels
     * {
     *     zIndex: 0,
     *     type: "Circle",
     *     stroke: "blue",
     *     strokeWidth: 2,
     *     radius: "1m"
     * }
     * ```
     */
    strokeWidth?: number | string | StyleValueFunction<number | number> | StyleZoomRange<string | number> | StyleExpression<string | number>;
    /**
     * Defines the opacity of the style.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     * It is valid for all style types.
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * The Radius of the Circle.
     * The default unit is pixels.
     * To define the radius of a Circle in meters a string can be used: "$\{width\}m".
     *
     * @example
     * ```typescript
     * // define a Circle with a radius of 1 meter
     * {
     *     zIndex: 0,
     *     type: "Circle",
     *     fill: "red",
     *     radius: "1m"
     * }
     * // define a Circle with a radius of 16 pixel
     * {
     *     zIndex: 0,
     *     type: "Circle",
     *     fill: "red",
     *     radius: 16
     * }
     * ```
     */
    radius: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * Offset the Circle in pixels on x-axis.
     * A positive value offsets to the right, a negative value to the left.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Circle by 1m to the left
     * { type: "Circle", zIndex: 0, fill:'blue', radius: 4, offsetX: "-1m"}
     * ```
     */
    offsetX?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<string | number>;
    /**
     * Offset the Circle in pixels on y-axis.
     * A positive value offsetY offsets downwards, a negative value upwards.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Circle by 1m to the top
     * { type: "Circle", zIndex: 0, fill:'blue', radius: 4, offsetY: "-1m"}
     * ```
     */
    offsetY?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Offset the Circle in pixels on z-axis.
     * A positive value offsets up, a negative value down.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Circle by 1m to the top
     * { type: "Circle", zIndex: 0, fill:'blue', radius: 4, offsetZ: "1m"}
     * ```
     */
    offsetZ?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<string | number>;
    /**
     * Alignment for styles of type "Circle".
     * Possible values are: "map" and "viewport".
     * "map" aligns to the plane of the map and "viewport" aligns to the plane of the viewport/screen.
     * Default alignment for Text based on point geometries is "viewport" while "map" is the default for line geometries.
     */
    alignment?: 'map' | 'viewport' | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Sets the anchor point for styles of type "Circle" when used with Line or Polygon geometry.
     *
     * Possible values for Line geometry are "Coordinate" and "Line".
     * - "Coordinate": the respective style is displayed at each coordinate of the polyline.
     * - "Line": the respective style is displayed on the shape of the polyline when there is enough space. See {@link checkLineSpace} to disable the space check.
     *
     * Possible values for Polygon geometry are "Center" and "Centroid".
     * - "Center": the center of the bounding box of the polygon.
     * - "Centroid": the geometric centroid of the polygon geometry.
     *
     * @defaultValue For Polygon geometry the default is "Center". For Line geometry the default is "Coordinate".
     */
    anchor?: 'Line' | 'Coordinate' | 'Centroid' | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Enable or disable the space check for point styles on line geometries.
     * Only applies to "Circle" styles with {@link anchor} set to "Line".
     * If check checkLineSpace is enabled the respective style is only displayed if there is enough space on the line,
     * otherwise it is not displayed.
     *
     * @defaultValue true
     */
    checkLineSpace?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;
    /**
     * Enable or disable collision detection.
     * If the collision detection is enabled for multiple Styles within the same StyleGroup, the respective Styles are
     * handled as a single Object ("CollisionGroup") where the combined bounding-box is determined automatically.
     *
     * - true: collision are allowed, Collision detection is disabled.
     * - false: avoid collisions, Collision detection is enabled.
     *
     * @defaultValue true.
     */
    collide?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;
    /**
     * Enables collision detection and combines all styles of a StyleGroup with the same "CollisionGroup" into a single logical object for collision detection.
     */
    collisionGroup?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Minimum distance in pixels between repeated style-groups on line geometries.
     * Applies per tile only.
     *
     * @defaultValue 256 (pixels)
     */
    repeat?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Altitude of the Circle center in meters.
     *
     * Describes the vertical distance from the global ground plane (0m) to the Circle.
     *
     * Supported values:
     * - false (default): place at 0m.
     * - true: use the altitude (z) from the feature geometry if present, else 0. Not re-aligned to the rendered terrain.
     *         If the geometry altitude source differs from the TerrainTileLayer source/resolution, the Circle can appear
     *         slightly above or below the visible terrain surface.
     * - number: fixed absolute altitude in meters. Also not adjusted when terrain tiles load; may not perfectly sit
     *           on the terrain unless both use exactly the same elevation source, datum and resolution.
     * - 'terrain': sample (clamp to) the current terrain surface height. While the terrain tile is not yet loaded
     *              (or no terrain layer exists) the altitude is 0 and updates once data becomes available.
     *
     * Notes:
     * - Use 'terrain' to keep the Circle visually seated on the rendered terrain.
     * - Use a numeric value for a constant absolute elevation independent of terrain updates.
     * - To position something N meters above terrain: use 'terrain' plus offsetZ (e.g. offsetZ: '5m').
     * - Expect mismatches (floating / sinking) when using true or a fixed number with a different terrain data source.
     *
     * @defaultValue false
     * @experimental
     */
    altitude?: number | boolean | 'terrain' | StyleValueFunction<number | boolean | 'terrain'> | StyleZoomRange<number | boolean | 'terrain'> | StyleExpression<number | boolean | 'terrain'>;
    /**
     * Scales the size of a style based on the feature's altitude.
     * If it's enabled (true), features closer to the camera will be drawn larger than those farther away.
     * When off (false), the size of the style is always the same size, regardless of its actual altitude, as if it were placed on the ground (altitude 0).
     * This attribute applies to styles of type "Rect", "Image", "Text", "Circle", "Line", "Box", or "Sphere" whose size ({@link width}, {@link radius}, {@link strokeWidth}) that are using "map" {@link alignment} only.
     * If the size attribute is defined in meters, scaleByAltitude is enabled by default, for pixels it is disabled.
     *
     * @defaultValue false (pixels), true (meters)
     *
     * @experimental
     */
    scaleByAltitude?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;
}

/**
 * This Feature represents a Cluster.
 */
export declare class ClusterFeature extends Feature<'Point'> {
    /**
     * The Properties of the Cluster feature.
     */
    properties: ClusterFeatureProperties;
    /**
     * The geometry of a cluster feature is of type 'Point',
     * where the `coordinates` represent the geographical coordinates [longitude, latitude] of the cluster center.
     */
    geometry: {
        type: 'Point';
        coordinates: GeoJSONCoordinate;
    };
    /**
     * Returns the features within the cluster.
     * @returns An array containing the features within the cluster.
     */
    getFeatures(): any;

    /**
     * Calculates and returns the bounding box of the cluster.
     * @returns The bounding box of the cluster.
     */
    getClusterBBox(): GeoJSONBBox;
}

/**
 * Properties of a ClusterFeature.
 *
 * The `isCluster`, `clusterSize`, and `zoom` properties are automatically populated for each cluster feature.
 *
 * Custom properties aggregation for clusters can be achieved by defining custom property creation and aggregation functions using the {@link ClusterTileLayerOptions.createProperties|createProperties} and {@link ClusterTileLayerOptions.aggregateProperties|aggregateProperties} options.
 */
export declare type ClusterFeatureProperties = {
    /**
     * Indicates if the feature is a cluster.
     */
    readonly isCluster: true;
    /**
     * The size of the cluster, i.e., the number of features it contains.
     */
    readonly clusterSize: number;
    /**
     * The zoom level at which the cluster was formed.
     */
    readonly zoom: number;
    /**
     * Additional custom properties of the cluster feature.
     */
    [name: string]: any;
};

/**
 * The `ClusterTileLayer` class is a specialized TileLayer designed to efficiently handle clustering of GeoJSON data from various DataSources/DataProviders.
 *
 * This layer aggregates data points within map tiles to reduce visual clutter and improve performance, particularly when dealing with large datasets.
 * When features are being added or removed from the DataSources, the ClusterTileLayer automatically updates to reflect the changes.
 * Data will be clustered for each zoom level optimally from {@link ClusterTileLayerOptions.min | min} up to {@link ClusterTileLayerOptions.clusterMaxZoom | clusterMaxZoom}.
 * For zoom levels below {@link ClusterTileLayerOptions.clusterMaxZoom | clusterMaxZoom} and upto {@link ClusterTileLayerOptions.min | min}, the untouched source data features will be displayed.
 *
 * Additionally, the `ClusterTileLayer` supports cluster property aggregation, allowing developers to customize how properties are aggregated when features are added or removed from the cluster.
 * The following methods are available for property aggregation:
 *
 * - `createProperties(featureProperties: { [propertyName: string]: any }): { [propertyName: string]: any }`: Creates initial properties for a cluster based on the properties of a feature.
 *
 * - `addProperties(clusterProperties: { [propertyName: string]: any }, featureProperties: { [propertyName: string]: any }): void`: Updates cluster properties when a feature is added to the cluster.
 *
 * - `removeProperties(clusterProperties: { [propertyName: string]: any }, featureProperties: { [propertyName: string]: any }): void`: Updates cluster properties when a feature is removed from the cluster.
 *
 * This layer also utilizes the {@link ClusterFeature} class to represent clusters.
 *
 * @see ClusterFeature
 *
 * @example
 * ```
 * // Create a new ClusterTileLayer with specified options
 * const myLayer = new ClusterTileLayer({
 *     min: 2,        // Minimum zoom level to cluster and display the layer
 *     max: 20,       // Maximum zoom level the layer will be displayed
 *     clusterMaxZoom:13, // the maximum zoom level data will be clustered
 *     clusterRadius: 15, // Cluster radius in pixels
 *     provider: myDataProvider // The data provider that data should be clustered
 * });
 * ```
 */
export declare class ClusterTileLayer extends TileLayer {









    /**
     * @param options - options to configure the ClusterTileLayer
     */
    constructor(options: ClusterTileLayerOptions);













    /**
     * Retrieves the data provider associated with this ClusterTileLayer.
     *
     * The data provider is responsible for supplying the features that are
     * to be clustered and displayed within the ClusterTileLayer.
     *
     * @returns The `FeatureProvider` instance used by this layer.
     */
    getDataProvider(): FeatureProvider;
    /**
     * Clears the {@link ClusterTileLayerOptions.provider | source data provider} and all associated clusters, optionally within a specified bounding box.
     *
     * If no bounding box is provided, all features in the source dataProvider and all clusters will be cleared.
     *
     * @param {GeoJSONBBox} [bbox] - Optional. The bounding box defining the area to clear.
     */
    clear(bbox?: GeoJSONBBox): any;







    /**
     * Retrieves the cluster to which the specified feature belongs at the given zoom level.
     * @param feature The feature for which to retrieve the cluster.
     * @param zoom The zoom level. If not specified, the current map zoom level will be used.
     * @returns The cluster feature to which the specified feature belongs, or `undefined` if no cluster exists.
     */
    getCluster(feature: Feature<'Point'>, zoom?: number): ClusterFeature;
    /**
     * Retrieves all clusters to which the specified feature belongs across all zoom levels.
     * The returned array is ordered by zoom level in descending order, starting from the {@link ClusterTileLayerOptions.clusterMaxZoom}.
     *
     * @param feature The feature for which to retrieve all clusters.
     * @returns An array of cluster features to which the specified feature belongs, ordered by zoom level.
     */
    getClusters(feature: Feature<'Point'>): any[];

}

/**
 * Options for configuring a ClusterTileLayer.
 */
export declare interface ClusterTileLayerOptions extends TileLayerOptions {
    /**
     * The data provider supplying the data to be clustered.
     */
    provider: FeatureProvider;
    /**
     * Determines whether pointer events are enabled for all features of the layer.
     * @defaultValue false
     */
    pointerEvents?: boolean;
    /**
     * The maximum zoom level at which data from the TileLayer will be displayed.
     */
    max?: number;
    /**
     * Defines the radius, in pixels, within which features should be clustered.
     * The default value is 32 pixels.
     *
     * @defaultValue 32
     */
    clusterRadius?: number;
    /**
     * Specifies the maximum zoom level at which data should be clustered.
     * If not defined, it defaults to zoom level 13.
     * When the map zoom level exceeds the `clusterMaxZoom`, raw data features will be displayed instead of clusters.
     *
     * @defaultValue 13
     */
    clusterMaxZoom?: number;
    /**
     * This function generates the initial properties of a cluster.
     * Please note that defined Properties in ClusterFeatureProperties are considered as readonly and are not allowed to be set.
     * If the function is not defined, the default implementation returns an empty object.
     */
    createProperties?: (feature: {
        [name: string]: any;
    }) => ClusterFeatureProperties;
    /**
     * Use this function to aggregate cluster properties whenever a feature is being added or removed to the cluster.
     *
     * @param clusterProperties The properties of the cluster.
     * @param featureProperties The properties of the feature being added or removed.
     * @param operation The operation being performed ('add' or 'remove').
     */
    aggregateProperties?: (clusterProperties: ClusterFeatureProperties, featureProperties: {
        [name: string]: any;
    }, operation: 'add' | 'remove') => void;
}

/**
 * The Color is an RGBA color value representing RED, GREEN, and BLUE light sources with an optional alpha channel.
 * Colors can be specified in the following ways:
 * - CSS color names: "red"
 * - RGB colors: "rgb(255,0,0)"
 * - RGBA colors: "rgba(255,0,0,1.0)"
 * - Hexadecimal colors: "#ff0000" | "#f00"
 * - Hexadecimal colors with transparency: "#ff0000ff"
 * - hexadecimal numbers: 0xff0000
 * - RGBA Color Array: [1.0, 0.0, 0.0, 1.0]
 */
export declare type Color = string | number | [number, number, number, number?];

/**
 * The CustomLayer can be used to integrate custom renderers to the map display.
 */
export declare class CustomLayer extends Layer {




    /**
     * Options to configure the renderer.
     */
    renderOptions: {
        /**
         * The used rendering mode.
         * Use '2d' for traditional flat map layers that are located on the ground-plane, otherwise '3d'.
         *
         * @DefaultValue: '2d'
         */
        mode?: '2d' | '3d' | string;
        /**
         * Indicates the drawing order within the layer.
         * Styles with larger zIndex value are rendered above those with smaller values.
         * The zIndex is defined relative to the "zLayer" property.
         * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
         */
        zIndex?: number;
        /**
         * Indicates drawing order across multiple layers.
         * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
         * If no zLayer is defined the zLayer depends on the display layer order.
         * The first (lowest) layer has a zLayer value of 1.
         *
         * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
         */
        zLayer?: number;

    };
    /**
     * @param options - options to configure the CustomLayer
     */
    constructor(options?: CustomLayerOptions);

    /**
     * Event Listener that will be called when the layer is added to the display.
     * @param ev - Event of type "layerAdd"
     */
    onLayerAdd(ev: CustomEvent): void;
    /**
     * Event Listener that will be called when the layer is removed from the display.
     * @param ev - Event of type "layerRemove"
     */
    onLayerRemove(ev: CustomEvent): void;
    /**
     * The render function will be called each frame.
     * It enables seamless drawing into the rendering context of the map.
     * The context states are correctly set already to allow "simple" drawing at the respective zIndex/zLayer.
     * The camera matrix projects from the world coordinate system (WebMercator projected, topLeft [0,0] -> bottomRight [1,1]) to the clipspace.
     *
     * @param context - the rendering context of the map.
     * @param matrix - the camera matrix of the map.
     */
    render(context: WebGLRenderingContext | CanvasRenderingContext2D, matrix: Float64Array): void;



}

/**
 * Options to configure the CustomLayer.
 */
declare interface CustomLayerOptions extends LayerOptions {
    /**
     * Event Listener that will be called when the layer is added to the display.
     * @param ev - Event of type "layerAdd"
     */
    onLayerAdd?(ev: CustomEvent): any;
    /**
     * Event Listener that will be called when the layer is removed from the display.
     * @param ev - Event of type "layerRemove"
     */
    onLayerRemove?(ev: CustomEvent): any;
    /**
     * Options to configure the renderer.
     */
    renderOptions?: {
        /**
         * The used rendering mode.
         * Use '2d' for traditional flat map layers that are located on the ground-plane, otherwise '3d'.
         *
         * @DefaultValue: '2d'
         */
        mode?: '2d' | '3d' | string;
        /**
         * Indicates the drawing order within the layer.
         * Styles with larger zIndex value are rendered above those with smaller values.
         * The zIndex is defined relative to the "zLayer" property.
         * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
         */
        zIndex?: number;
        /**
         * Indicates drawing order across multiple layers.
         * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
         * If no zLayer is defined the zLayer depends on the display layer order.
         * The first (lowest) layer has a zLayer value of 1.
         *
         * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
         */
        zLayer?: number;
    };
    /**
     * The render function will be called each frame.
     * It enables seamless drawing into the rendering context of the map.
     * The context states are correctly set already to allow "simple" drawing at the respective zIndex/zLayer.
     * The camera matrix projects from the world coordinate system (WebMercator projected, topLeft [0,0] -> bottomRight [1,1]) to the clipspace.
     *
     * @param context - the rendering context of the map.
     * @param matrix - the camera matrix of the map.
     */
    render?(context: WebGLRenderingContext | CanvasRenderingContext2D, matrix: Float64Array): any;
}

/**
 * Represents a structured attribution entry for a data source.
 *
 * Used to provide detailed attribution information for map layers, supporting clickable labels and optional tooltips.
 *
 * @property label - The text label displayed in the attribution control.
 * @property url - (Optional) A URL that opens when the label is clicked.
 * @property title - (Optional) Tooltip shown on hover over the label.
 */
declare type DataSourceAttribution = {
    /**
     * The text label displayed in the attribution control.
     */
    label: string;
    /**
     * (Optional) A URL that opens when the label is clicked.
     */
    url?: string;
    /**
     * (Optional) Tooltip shown on hover over the label.
     */
    title?: string;
};

/**
 * The `DirectionalLight` interface represents directional lighting, which simulates light coming from a specific direction.
 *
 * @extends Light
 */
export declare interface DirectionalLight extends Light {
    /**
     * The type of light. For `DirectionalLight`, this is always 'directional'.
     */
    type: 'directional';
    /**
     * The direction of the light, represented as a vector. This determines the direction from which the light is coming.
     */
    direction: number[];
}

/**
 * EditableFeatureProvider is an abstract FeatureTileProvider that can be edited using the {@link Editor} module.
 */
export declare abstract class EditableFeatureProvider extends FeatureProvider {



    /**
     * Hook functions that will be called during the execution of the corresponding "editing operation".
     * The "hooks" property is a map with the "editing operation" as its key and the corresponding Hook or Array of Hook function(s) as its value.
     *
     * Available editing operations are 'Navlink.disconnect', 'Navlink.split', 'Feature.remove', 'Coordinates.remove'.
     *
     * @see {@link editor.Editor.addHook | editor.addHook }
     */
    hooks?: {
        'Navlink.split'?: NavlinkSplitHook | NavlinkSplitHook[];
        'Navlink.disconnect'?: NavlinkDisconnectHook | NavlinkDisconnectHook[];
        'Feature.remove'?: FeatureRemoveHook | FeatureRemoveHook[];
        'Coordinates.update'?: CoordinatesUpdateHook | CoordinatesUpdateHook[];
    };


    /**
     * This method is used to determine the {@link editor.Feature.class | FeatureClass} required to edit the feature.
     * The {@link editor.Feature.class | FeatureClass} defines how a certain feature behaves when its getting edited.
     *
     * By default, the {@link editor.Editor Editor} handles all features of geometry type 'LineString' as {@link editor.Line | Line}, 'Point' as {@link editor.Marker | Marker} and '(Multi)Polygon' as {@link editor.Area | Area}.
     *
     * If you want to edit features with {@link editor.Feature.class | FeatureClass} 'NAVLINK', 'PLACE' or 'ADDRESS' this method must be overridden to enable editing of {@link editor.Navlink | Navlinks}, {@link editor.Place | Places} or {@link editor.Address | Addresses}.
     *
     * @param feature - The feature whose {@link editor.Feature.class | FeatureClass} is requested
     *
     * @returns the FeatureClass of the feature, or null if the feature should not be editable.
     */
    detectFeatureClass(feature: Feature): 'LINE' | 'NAVLINK' | 'MARKER' | 'PLACE' | 'ADDRESS' | 'AREA' | string | null;

    /**
     * Attribute reader for obtaining the zLevels of a Navlink feature.
     *
     * This method must be implemented to enable editing of {@link editor.Navlink | Navlinks}.
     *
     * @param navlink - the Navlink whose zLevels are requested
     *
     * @return An array containing the zLevel for each coordinate of the Navlink.
     */
    abstract readZLevels(navlink: Navlink): number[];
    /**
     * Attribute writer for writing the zLevels of a Navlink feature.
     *
     * This method must be implemented to enable editing of {@link editor.Navlink | Navlinks}.
     *
     * @param navlink - the Navlink whose zLevels should be set
     * @param zLevels - An array containing the zLevel for each coordinate of the Navlink
     *
     * @return An array containing the zLevel for each coordinate of the Navlink.
     */
    abstract writeZLevels(navlink: Navlink, zLevels: number[]): any;
    /**
     * Attribute reader for obtaining the direction of travel of a Navlink feature.
     *
     * This method must be implemented to enable editing of {@link editor.Navlink | Navlinks}.
     *
     * @param navlink - the Navlink whose direction is requested
     */
    abstract readDirection(navlink: Navlink): 'BOTH' | 'START_TO_END' | 'END_TO_START';
    /**
     * Attribute reader for obtaining if a Navlink feature can be accessed by pedestrians only.
     *
     * This method must be implemented to enable editing of {@link editor.Navlink | Navlinks}.
     *
     * @param navlink - the Navlink
     *
     * @returns true, if the Navlink can be accessed by pedestrians only, otherwise false.
     */
    abstract readPedestrianOnly(navlink: Navlink): boolean;
    /**
     * Attribute reader for obtaining the turn-restrictions of two Navlink Features.
     *
     * This method must be implemented to enable editing of {@link editor.Navlink | Navlinks}.
     *
     * @param turnFrom - The Navlink and it's coordinate index from which to turn from
     * @param turnTo - The Navlink and it's coordinate index to which you want to turn
     *
     * @returns true if turn is allowed, otherwise false.
     */
    abstract readTurnRestriction(turnFrom: {
        link: Navlink;
        index: number;
    }, turnTo: {
        link: Navlink;
        index: number;
    }): boolean;
    /**
     * Attribute writer for writing a turn restriction between two Navlink features.
     *
     * This method must be implemented to enable editing of {@link editor.Navlink | Navlinks}.
     * It defines whether a turn from one Navlink to another is permitted or restricted.
     *
     * @param restricted - Specifies whether the turn is forbidden (`true`) or allowed (`false`).
     * @param turnFrom - The originating Navlink and its coordinate index from which the turn starts.
     * @param turnTo - The destination Navlink and its coordinate index to which the turn is directed.
     */
    abstract writeTurnRestriction(restricted: boolean, turnFrom: {
        link: Navlink;
        index: number;
    }, turnTo: {
        link: Navlink;
        index: number;
    }): any;
    /**
     * Attribute reader for obtaining the id of the TileProvider containing the corresponding Navlink, of an Address or Place feature, on which the RoutingPoint is located.
     *
     * This method must be implemented to enable editing of {@link editor.Place | Places} or {@link editor.Address | Addresses}.
     *
     * @param feature - The Address or Place feature whose RoutingProvider is requested.
     *
     * @returns the Id of the TileProvider in which the object is stored. If undefined is returned, the RoutingPoint's Navlink is assumed to be in the same TileProvider as the Address/Place.
     */
    abstract readRoutingProvider(feature: Feature): string | undefined;
    /**
     * Attribute reader for obtaining the RoutingPoint's geographical position of an Address or Place.
     * The geographical position must be located on the geometry of the related Navlink feature.
     *
     * This method must be implemented to enable editing of {@link editor.Place | Places} or {@link editor.Address | Addresses}.
     *
     * @param feature - The Address or Place feature whose RoutingProvider is requested.
     *
     * @returns GeoJSON Coordinate representing the geographical position of the RoutingPoint or null if a Place does not have a RoutingPoint.
     */
    abstract readRoutingPosition(feature: Feature): GeoJSONCoordinate | null;
    /**
     * Attribute reader for obtaining the id of the Navlink Feature on which the RoutingPoint of an Address or Place feature is located.
     * For Addresses an Id must be returned. If null is returned for a Place, the Place is treated as "floating" without a RoutingPoint.
     *
     * This method must be implemented to enable editing of {@link editor.Place | Places} or {@link editor.Address | Addresses}.
     *
     * @param feature - The Address or Place of which the Navlink of the RoutingPoint is requested.
     *
     * @returns the Id of the Navlink on which the RoutingPoint is located.
     */
    abstract readRoutingLink(feature: Feature): NavlinkId | null;
    /**
     * Attribute writer to store the RoutingPoint's geographical position of an Address or Place.
     * The geographical position must be located on the geometry of the related Navlink feature.
     *
     * This method must be implemented to enable editing of {@link editor.Place | Places} or {@link editor.Address | Addresses}.
     *
     * @param feature - The Address or Place feature whose RoutingPoint position to write.
     * @param position - the geographical position of the RoutingPoint.
     */
    abstract writeRoutingPosition(feature: Feature, position: GeoJSONCoordinate | null): any;
    /**
     * Attribute writer for storing the Navlink reference on which the RoutingPoint of an Address or Place feature is located.
     *
     * This method must be implemented to enable editing of {@link editor.Place | Places} or {@link editor.Address | Addresses}.
     *
     * @param feature - The Address or Place of which the Navlink reference of the RoutingPoint to store.
     * @param navlink - The navlink whose reference is to be written, or null in case of a Place becomes "floating" and has no RoutingPoint.
     *
     */
    abstract writeRoutingLink(feature: Feature, position: any, navlink: Navlink | null): any;
    /**
     * Attribute writer for storing the EditStates of a Feature.
     * The EditStates provide information about whether a feature has been created, modified, removed or split.
     *
     * By default EditStates aren't tracked/stored.
     *
     * @param feature - The Feature whose EditState should be written.
     * @param editState - the EditState to store
     */
    abstract writeEditState(feature: Feature, editState: 'created' | 'modified' | 'removed' | 'split'): any;
    /**
     * Attribute reader for obtaining the Height of a Building (extruded {@link editor.Area | Area}).
     * The height must be specified in meters.
     *
     * This method must be implemented to enable editing of the height of an extruded {@link editor.Area | Area}.
     *
     * @param feature - The Area feature whose height is requested.
     *
     * @returns The height in meters of the Building/Area or null if the Area is considered flat.
     */
    abstract readFeatureHeight(feature: Feature): number | null;
    /**
     * Attribute writer for storing the Height of a Building (extruded {@link editor.Area | Area}).
     * The height must be specified in meters.
     *
     * This method must be implemented to enable editing of the height of an extruded {@link editor.Area | Area}.
     *
     * @param feature - The Area feature whose height should be updated/written.
     * @param height - The height specified in meters
     *
     */
    abstract writeFeatureHeight(feature: Feature, height: number | null): any;






}

/**
 *  Configuration options of a EditableFeatureProviderOptions.
 */
declare interface EditableFeatureProviderOptions extends TileProviderOptions {
    /**
     *  Allow or prevent editing by the {@link editor.Editor | Editor} module.
     *
     *  @defaultValue false
     */
    editable?: boolean;
    /**
     * Enforce random ids for newly created features.
     * If "enforceRandomFeatureId" is set to true, the ids of features created by {@link editor.Editor.addFeature | editor.addFeature} are ignored and randomly created.
     * If "enforceRandomFeatureId" is set to false, ids of features created by {@link editor.Editor.addFeature | editor.addFeature} can be set. Random ids are only generated if none have been set.
     *
     * @defaultValue true
     */
    enforceRandomFeatureId?: boolean;
    /**
     * Add hook functions that will be called during the execution of the corresponding "editing operation".
     * The "hooks" option is a map with the "editing operation" as its key and the corresponding Hook or Array of Hook function(s) as its value.
     *
     * Available editing operations are 'Navlink.disconnect', 'Navlink.split', 'Feature.remove', 'Coordinates.remove'.
     *
     * @see {@link editor.Editor.addHook | editor.addHook}
     */
    hooks?: {
        /**
         * The NavlinkSplitHook(s) will be called whenever a Navlink is devided into two new Navlinks. ('Navlink.split' operation).
         */
        'Navlink.split'?: NavlinkSplitHook | NavlinkSplitHook[];
        /**
         * The NavlinkDisconnectHook(s) will be called whenever a Navlink is disconnected from an intersection ('Navlink.disconnect' operation).
         */
        'Navlink.disconnect'?: NavlinkDisconnectHook | NavlinkDisconnectHook[];
        /**
         * The FeatureRemoveHook(s) will be called when a feature is being removed ('Feature.remove' operation).
         */
        'Feature.remove'?: FeatureRemoveHook | FeatureRemoveHook[];
        /**
         * The CoordinatesUpdateHook(s) will be called whenever the coordinates of a feature are added, updated or removed ('Coordinates.update' operation).
         */
        'Coordinates.update'?: CoordinatesUpdateHook | CoordinatesUpdateHook[];
    };
}

/**
 *  EditableRemoteTileProvider is a remote tile provider that can be edited using the {@link Editor} module.
 */
export declare abstract class EditableRemoteTileProvider extends EditableFeatureProvider {









    /**
     * @param options - options to configure the provider
     */
    protected constructor(options: EditableRemoteTileProviderOptions);
    /**
     * Gets features from provider by id.
     *
     * @param ids - array of feature ids to search for.
     * @param options - search options
     *
     * @returns if just a single feature is found its getting returned otherwise an array of features or undefined if none is found.
     */
    getFeatures(ids: number[] | string[], options?: {
        /**
         * Force the provider to do remote search if no result is found in local cache.
         */
        remote?: boolean;
        /**
         * Callback function for "remote" search.
         * @param result - array of Features containing the search result.
         */
        onload?: (result: Feature[] | null) => void;
    }): any;
    /**
     * Gets features from provider by id.
     *
     * @param options - search options
     *
     * @returns if just a single feature is found its getting returned otherwise an array of features or undefined if none is found.
     */
    getFeatures(options: {
        /**
         * search for a single feature by id
         */
        id?: number | string;
        /**
         * array of ids to search for multiple features
         */
        ids?: number[] | string[];
        /**
         * Force the provider to do remote search if no result is found in local cache
         */
        remote?: boolean;
        /**
         * Callback function for "remote" search
         * @param result - Result array of features
         */
        onload?: (result: Feature[] | null) => void;
    }): any;
    /**
     * Cancel ongoing request(s) of a tile.
     * The tile will be dropped.
     *
     * @param quadkey - the quadkey of the tile that should be canceled and removed.
     */
    cancel(quadkey: string): void;
    /**
     * Cancel ongoing request(s) of a tile.
     * The tile will be dropped.
     *
     * @param tile - the tile that should be canceled and removed.
     */
    cancel(tile: Tile): void;
    /**
     * Search for feature(s) in the provider.
     *
     * @param options - configure the search
     *
     * @example
     * ```
     * // searching by ids:
     * provider.search({ids: [1058507462, 1058507464]})
     *
     * // searching by point and radius:
     * provider.search({
     * point: {longitude: 72.84205, latitude: 18.97172},
     * radius: 100
     * })
     *
     * // searching by Rect:
     * provider.search({
     *  rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876}
     * })
     *
     * // remote search:
     * provider.search({
     *     rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876},
     *     remote: true, // force provider to do remote search if feature/search area is not cached locally
     *     onload: (result) => {...}
     * })
     * ```
     * @returns array containing the searched features
     */
    search(options: {
        /**
         * Search features by Ids.
         */
        ids?: number[] | string[];
        /**
         * Geographical center point of the circle to search in. options.radius must be defined.
         */
        point?: GeoPoint | GeoJSONCoordinate;
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
         * @param result - Array of Features containing the search results.
         */
        onload?: (result: Feature[] | null) => void;
        /**
         * Function to be called when a request of a "remote search" fails.
         */
        onerror?: (error: {
            /**
             * The name property represents a name for the type of error. The value is "NetworkError".
             */
            name: 'NetworkError';
            /**
             * The error message of the failing request.
             */
            message: string;
            /**
             * The responseText which contains the textual data received of the failing request.
             */
            responseText: string;
            /**
             * The numerical HTTP status code of the failing request.
             */
            status: number;
        }) => void;
    }): Feature[];
    /**
     * Search for feature(s) in the provider.
     *
     * @param options - configure the search
     *
     * @example
     * ```
     * // searching by id:
     * provider.search({id: 1058507462})
     *
     * // remote search:
     * provider.search({
     *     id: 1058507462,
     *     remote: true, // force provider to do remote search if feature/search area is not cached locally
     *     onload: (result) => {...}
     * })
     * ```
     * @returns array containing the searched features
     */
    search(options: {
        /**
         * search feature by id.
         */
        id: number | string;
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean;
        /**
         * Callback function for "remote" search.
         * @param result - Array of Features containing the search results.
         */
        onload?: (result: Feature | null) => void;
        /**
         * Function to be called when a request of a "remote search" fails.
         */
        onerror?: (error: {
            /**
             * The name property represents a name for the type of error. The value is "NetworkError".
             */
            name: 'NetworkError';
            /**
             * The error message of the failing request.
             */
            message: string;
            /**
             * The responseText which contains the textual data received of the failing request.
             */
            responseText: string;
            /**
             * The numerical HTTP status code of the failing request.
             */
            status: number;
        }) => void;
    }): Feature;
    /**
     * Point Search for feature(s) in provider.
     * @param point - Geographical center point of the point to search in. options.radius must be defined.
     * @param options - configure the search
     *
     * @example
     * ```
     * layer.search({longitude: 72.84205, latitude: 18.97172},{
     *  radius: 100
     * })
     * // or:
     * layer.search([72.84205, 18.97172], {
     *  radius: 100
     * })
     * ```
     */
    search(point: GeoPoint | GeoJSONCoordinate, options?: {
        /**
         * the radius of the circular area in meters to search in
         */
        radius: number;
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean;
        /**
         * Callback function for "remote" search.
         * @param result - Array of Features containing the search results.
         */
        onload?: (result: Feature[] | null) => void;
        /**
         * Function to be called when a request of a "remote search" fails.
         */
        onerror?: (error: {
            /**
             * The name property represents a name for the type of error. The value is "NetworkError".
             */
            name: 'NetworkError';
            /**
             * The error message of the failing request.
             */
            message: string;
            /**
             * The responseText which contains the textual data received of the failing request.
             */
            responseText: string;
            /**
             * The numerical HTTP status code of the failing request.
             */
            status: number;
        }) => void;
    }): Feature[];
    /**
     * Rectangle Search for feature(s) in the provider.
     * @param rect - Geographical Rectangle to search in. [minLon, minLat, maxLon, maxLat] | GeoRect.
     * @param options - configure the search
     *
     * @example
     * ```
     * provider.search({minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876})
     * // or:
     * provider.search([72.83584, 18.96876, 72.84443,18.97299])
     *
     * // remote search:
     * provider.search({minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876}, {
     *     remote: true, // force provider to do remote search if search area is not cached locally
     *     onload: (result) => {...}
     * })
     * ```
     */
    search(rect: GeoRect | GeoJSONBBox, options?: {
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean;
        /**
         * Callback function for "remote" search.
         * @param result - Array of Features containing the search results.
         */
        onload?: (result: Feature[] | null) => void;
        /**
         * Function to be called when a request of a "remote search" fails.
         */
        onerror?: (error: {
            /**
             * The name property represents a name for the type of error. The value is "NetworkError".
             */
            name: 'NetworkError';
            /**
             * The error message of the failing request.
             */
            message: string;
            /**
             * The responseText which contains the textual data received of the failing request.
             */
            responseText: string;
            /**
             * The numerical HTTP status code of the failing request.
             */
            status: number;
        }) => void;
    }): Feature[];
    /**
     * Search for feature by id in the provider.
     *
     * @param id - id of the feature to search for
     * @param options - configure the search
     *
     * @example
     * ```
     * provider.search(1058507462)
     *
     * // remote search:
     * provider.search(1058507462,{
     *     remote: true, // force provider to do remote search if search area is not cached locally
     *     onload: (result) => {...}
     * })
     * ```
     */
    search(id: string | number, options?: {
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean;
        /**
         * Callback function for "remote" search.
         * @param result - Array of Features containing the search results.
         */
        onload?: (result: Feature) => void;
        /**
         * Function to be called when a request of a "remote search" fails.
         */
        onerror?: (error: {
            /**
             * The name property represents a name for the type of error. The value is "NetworkError".
             */
            name: 'NetworkError';
            /**
             * The error message of the failing request.
             */
            message: string;
            /**
             * The responseText which contains the textual data received of the failing request.
             */
            responseText: string;
            /**
             * The numerical HTTP status code of the failing request.
             */
            status: number;
        }) => void;
    }): Feature;


    /**
     * Get a tile by quadkey.
     * If the tile is not cached already, it will be created and stored automatically.
     * Data will be fetched from remote data-sources and attached to tile automatically
     *
     * @param quadkey - quadkey of the tile
     * @param callback - will be called as soon as tile is ready for consumption
     * @returns the Tile
     */
    getTile(quadkey: string, cb: (tile: Tile) => void): any;


    /**
     *  Commit modified/removed features to the remote backend.
     *
     *  @param data - the data that should be commit to the remote.
     *  @param onSuccess - callback function that will be called when data has been commit successfully
     *  @param onError - callback function that will be called when an error occurs
     */
    abstract commit(data: {
        /**
         * features that should be created or updated
         */
        put?: GeoJSONFeature[];
        /**
         * features that should be removed
         */
        remove?: GeoJSONFeature[];
    }, onSuccess?: any, onError?: any, transactionId?: string): any;










    /**
     * Attribute writer for storing the EditStates of a Feature.
     * The EditStates provide information about whether a feature has been created, modified, removed or split.
     *
     * By default EditStates aren't tracked/stored.
     *
     * @param feature - The Feature whose EditState should be written.
     * @param editState - the EditState to store
     */
    writeEditState(feature: any, editState: 'created' | 'modified' | 'removed' | 'split'): void;





}

/**
 *  Options to configure an EditableRemoteTile.
 */
export declare interface EditableRemoteTileProviderOptions extends RemoteTileProviderOptions {
    /**
     *  Allow or prevent editing by the {@link editor.Editor} module.
     *
     *  @defaultValue false
     */
    editable?: boolean;
    /**
     * Enforce random ids for newly created features.
     * If "enforceRandomFeatureId" is set to true, the ids of features created by {@link editor.Editor.addFeature | editor.addFeature} are ignored and randomly created.
     * If "enforceRandomFeatureId" is set to false, ids of features created by {@link editor.Editor.addFeature | editor.addFeature} can be set. Random ids are only generated if none have been set.
     *
     * @defaultValue true
     */
    enforceRandomFeatureId?: boolean;
    /**
     * Add hook functions that will be called during the execution of the corresponding "editing operation".
     * The "hooks" option is a map with the "editing operation" as its key and the corresponding Hook or Array of Hook function(s) as its value.
     *
     * Available editing operations are 'Navlink.disconnect', 'Navlink.split', 'Feature.remove', 'Coordinates.remove'.
     *
     * @see {@link editor.Editor.addHook}
     */
    hooks?: {
        /**
         * The NavlinkSplitHook(s) will be called whenever a Navlink is devided into two new Navlinks. ('Navlink.split' operation).
         */
        'Navlink.split'?: NavlinkSplitHook | NavlinkSplitHook[];
        /**
         * The NavlinkDisconnectHook(s) will be called whenever a Navlink is disconnected from an intersection ('Navlink.disconnect' operation).
         */
        'Navlink.disconnect'?: NavlinkDisconnectHook | NavlinkDisconnectHook[];
        /**
         * The FeatureRemoveHook(s) will be called when a feature is being removed ('Feature.remove' operation).
         */
        'Feature.remove'?: FeatureRemoveHook | FeatureRemoveHook[];
        /**
         * The CoordinatesUpdateHook(s) will be called whenever the coordinates of a feature are added, updated or removed ('Coordinates.update' operation).
         */
        'Coordinates.update'?: CoordinatesUpdateHook | CoordinatesUpdateHook[];
    };
    staticData?: boolean;
}

/**
 * represents a Feature in GeoJSON Feature format.
 */
export declare class Feature<GeometryType = string> implements GeoJSONFeature<GeometryType> {
    /**
     * id of the feature.
     */
    id: string | number;
    /**
     * The properties associated with the feature.
     */
    properties: {
        [name: string]: any;
    } | null;
    /**
     * The type of the feature is a string with 'Feature' as its value.
     */
    type: 'Feature' | string;
    /**
     * A geometry is a object where the type member's value is one of: "Point", "MultiPoint", "LineString", "MultiLineString", "Polygon" or "MultiPolygon".
     * A geometry object must have a member with the name "coordinates".
     * The value of the coordinates member is always an array (referred to as the coordinates array below).
     * The structure for the elements in this array are determined by the type of geometry.
     *
     * For type "Point", each element in the coordinates array is a number representing the point coordinate in one dimension.
     *     There must be at least two elements, and may be more.
     *     The order of elements must follow x, y, z order (or longitude, latitude, altitude for coordinates in a geographic coordinate reference system).
     *
     * For type "MultiPoint", each element in the coordinates array is a coordinates array as described for type "Point".
     *
     * For type "LineString", each element in the coordinates array is a coordinates array as described for type "Point".
     *     The coordinates array for a LineString must have two or more elements.
     *     A LinearRing is a special case of type LineString where the first and last elements in the coordinates array are equivalent (they represent equivalent points).
     *     Though a LinearRing is not explicitly represented as a geometry type, it is referred to in the Polygon geometry type definition.
     *
     * For type "MultiLineString", each element in the coordinates array is a coordinates array as described for type "LineString".
     *
     * For type "Polygon", each element in the coordinates array is a coordinates array as described for type "LineString".
     *     Furthermore, each LineString in the coordinates array must be a LinearRing.
     *     For Polygons with multiple LinearRings, the first must be the exterior ring and any others must be interior rings or holes.
     *
     * For type "MultiPolygon", each element in the coordinates array is a coordinates array as described for type "Polygon".
     *
     *
     * ```
     * Point:
     * {
     *    "type": "Point",
     *    "coordinates": [100.0, 0.0]
     * }
     *
     * Polygon:
     * {
     *    "type": "Polygon",
     *    "coordinates": [
     *        [ [100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0] ]
     *    ]
     * }
     *```
     */
    geometry: {
        type: 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon' | GeometryType | string;
        coordinates: GeometryType extends 'Point' ? GeoJSONCoordinate : GeometryType extends 'MultiPoint' ? GeoJSONCoordinate[] : GeometryType extends 'LineString' ? GeoJSONCoordinate[] : GeometryType extends 'MultiLineString' ? GeoJSONCoordinate[][] : GeometryType extends 'Polygon' ? GeoJSONCoordinate[][] : GeometryType extends 'MultiPolygon' ? GeoJSONCoordinate[][][] : GeoJSONCoordinate | GeoJSONCoordinate[] | GeoJSONCoordinate[][] | GeoJSONCoordinate[][][];


    };
    /**
     * Bounding box of the feature.
     * The value of the bbox member is an array of length 4, with all axes of the most southwesterly point followed by all axes of the more northeasterly point.
     * The "bbox" values define shapes with edges that follow lines of constant longitude and latitude.
     */
    bbox?: [number, number, number, number];



    /**
     * Get the Feature as a JSON Object.
     */
    toJSON(): GeoJSONFeature;
    /**
     * Get The FeatureProvider where the Feature is stored in.
     */
    getProvider(): FeatureProvider;


}

/**
 *  Feature provider.
 *
 */
export declare class FeatureProvider extends TileProvider {






    /**
     *  @param options - options to configure the provider
     */
    constructor(options: TileProviderOptions);

    /**
     * Add a feature to the provider.
     *
     * @param feature - the feature to be added to the provider
     *
     * @example
     * ```
     * // add a feature to the provider.
     * provider.addFeature({
     *    type: "Feature"
     *    geometry: {
     *        coordinates: [[-122.49373, 37.78202], [-122.49263, 37.78602]],
     *        type: "LineString"
     *    }
     * });
     * ```
     */
    addFeature(feature: GeoJSONFeature | Feature): Feature;
    /**
     * Add multiple features to the provider.
     *
     * @param feature - the features to be added to the provider
     *
     * @example
     * ```
     * // add multiple features to the provider.
     * provider.addFeature([{
     *    type: "Feature"
     *    geometry: {
     *        coordinates: [[-122.49373, 37.78202], [-122.49263, 37.78602]],
     *        type: "LineString"
     *    }
     * },{
     *    type: "Feature"
     *    geometry: {
     *        coordinates: [[-122.49375, 37.78203], [-122.49265, 37.78604]],
     *        type: "LineString"
     *    }
     * }]);
     * ```
     */
    addFeature(feature: GeoJSONFeatureCollection | GeoJSONFeature[]): Feature[];

    /**
     * Add an EventListener to the provider.
     * Valid events: "featureAdd", "featureRemove", "featureCoordinatesChange", "clear" and "error"
     *
     * The detail property of the Event gives additional information about the event.
     * detail.provider is a reference to the provider onto which the event was dispatched and is set for all events.
     *
     * @param type - A string representing the event type to listen for
     * @param listener - the listener function that will be called when an event of the specific type occurs
     */
    addEventListener(type: string, listener: (e: CustomEvent) => void, _c?: any): boolean;
    /**
     * Remove an EventListener from the provider.
     * Valid events: "featureAdd", "featureRemove", "featureCoordinatesChange", "clear" and "error"
     *
     * @param type - A string which specifies the type of event for which to remove an event listener.
     * @param listener - The listener function of the event handler to remove from the provider.
     */
    removeEventListener(type: string, listener: (event: CustomEvent) => void, _c?: any): boolean;
    /**
     * Get all the features that are currently present in the provider.
     */
    all(): Feature[];
    /**
     *  Gets a feature from the provider by id.
     *
     *  @param id - the id of the feature
     *
     *  @returns the found feature or undefined if feature is not present.
     */
    getFeature(id: string | number): Feature | undefined;
    /**
     *  Gets features from provider by id.
     *
     *  @param ids - array of feature ids to search for.
     *  @returns if just a single feature is found its getting returned otherwise an array of features or undefined if none is found.
     */
    getFeatures(ids: string[] | number[]): Feature[] | Feature | undefined;

    /**
     * Get a tile by quadkey.
     * If the tile is not cached already, it will be created and stored automatically.
     *
     * @param quadkey - quadkey of the tile
     * @param callback - the callback function
     * @returns the Tile
     */
    getTile(quadkey: string, callback?: (tile: Tile) => void): Tile | undefined;




    /**
     * Search for feature(s) in the provider.
     *
     * @param options - configure the search
     *
     * @example
     * ```typescript
     * // searching by id:
     * layer.search({id: 1058507462})
     * // or:
     * layer.search({ids: [1058507462, 1058507464]})
     *
     * // searching by point and radius:
     * layer.search({
     *  point: { longitude: 72.84205, latitude: 18.97172 },
     *  radius: 100
     * })
     *
     * // searching by Rect:
     * layer.search({
     *  rect:  { minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876 }
     * })
     * ```
     * @returns array of features
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
         * Geographical center point of the point to search in. options.radius must be defined.
         */
        point?: GeoPoint;
        /**
         * Radius of the point in meters, it is used in "point" search.
         */
        radius?: number;
        /**
         * Geographical Rectangle to search in. [minLon, minLat, maxLon, maxLat] | GeoRect.
         */
        rect?: GeoRect | GeoJSONBBox;
    }): Feature | Feature[];
    /**
     * Point Search for feature(s) in provider.
     * @param point - Geographical center point of the point to search in. options.radius must be defined.
     * @param options - configure the search
     *
     * @example
     * ```typescript
     * layer.search({longitude: 72.84205, latitude: 18.97172},{
     *  radius: 100
     * })
     * // or:
     * layer.search([72.84205, 18.97172], {
     *  radius: 100
     * })
     * ```
     */
    search(point: GeoPoint, options?: {
        /**
         * The radius of the circular area in meters to search in.
         */
        radius: number;
    }): Feature[];
    /**
     * Rectangle Search for feature(s) in provider.
     * @param rect - Geographical Rectangle to search in. [minLon, minLat, maxLon, maxLat] | GeoRect.
     *
     * @example
     * ```
     * layer.search({minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876})
     * // or:
     * layer.search([72.83584, 18.96876, 72.84443,18.97299])
     * ```
     */
    search(rect: GeoRect | GeoJSONBBox): Feature[];
    /**
     * Search for feature by id in the provider.
     *
     * @param id - id of the feature to search for
     *
     * @example
     * ```
     * layer.search(1058507462)
     * ```
     */
    search(id: string | number): Feature;
    /**
     *  Validate if a feature is stored in the local provider cache.
     *
     *  @param feature - Object literal containing "id" property.
     *  @returns the {@link Feature} if it is found, otherwise undefined
     */
    exists(feature: {
        id: number | string;
    }): {
        feature?: Feature;
    };
    /**
     * Modify coordinates of a feature in the provider.
     *
     * @param feature - the Feature whose coordinates should be modified/updated
     * @param coordinates - the modified coordinates to set. The coordinates must match features geometry type.
     */
    setFeatureCoordinates(feature: Feature, coordinates: GeoJSONCoordinate | GeoJSONCoordinate[] | GeoJSONCoordinate[][] | GeoJSONCoordinate[][][]): void;
    /**
     * Remove feature(s) from the provider.
     *
     * @param feature - features that should be removed from the provider
     */
    removeFeature(feature: GeoJSONFeature | Feature | GeoJSONFeatureCollection | GeoJSONFeature[]): any;

    /**
     * Finds the optimal path between two coordinates on a GeoJSON road network, considering various options.
     * By default, the weight function returns the distance of the road segment, a lower distance implies a shorter route and is considered more favorable.
     * If you have specific criteria such as road quality, traffic conditions, or other factors influencing the desirability of a road segment, you can customize the weight function accordingly.
     * Pathfinding will consider only the locally cached data available on the client.
     *
     * @experimental
     *
     * @param options - The options object containing parameters for finding the path.
     * @returns {Promise<{
             *   features: Feature[];
             *   readonly path: GeoJSONFeature<MultiLineString>;
             *   readonly distance: number;
             *   from: GeoJSONCoordinate;
             *   to: GeoJSONCoordinate;
             * }>} A Promise that resolves to an object containing the path, additional information, and the distance of the path.
     *
     * @example
     * ```typescript
     * const pathOptions = {
     *   from: [startLongitude, startLatitude],
     *   to: [endLongitude, endLatitude],
     *   // optional
     *   allowTurn: (turn) => {
     *      // Custom logic to determine whether a turn is allowed
     *     return true;
     *   },
     *   // optional
     *   weight: (data) => {
     *     // Custom weight function to determine the cost of traversing a road segment
     *     return data.distance; // Default implementation uses distance as the weight
     *   },
     * };
     * const result = await provider.findPath(pathOptions);
     * console.log(result);
     * ```
     */
    findPath(options: {
        /**
         * The starting coordinates defining the path.
         */
        from: GeoJSONCoordinate | GeoPoint;
        /**
         * The ending coordinates of the path.
         */
        to: GeoJSONCoordinate | GeoPoint;
        /**
         * Optional callback function to determine if a turn is allowed between road segments.
         * If not provided, all turns are considered allowed.
         *
         * @param {object} turn - Object containing information about the turn, including source and destination road segments.
         * @returns {boolean} `true` if the turn is allowed, `false` otherwise.
         */
        allowTurn?: (turn: {
            /**
             * Object representing the source road segment of the turn.
             */
            readonly from: {
                /**
                 * GeoJSON Feature representing the source road segment.
                 */
                readonly link: Feature<'LineString'>;
                /**
                 * Index of the Coordinates array of the source road segment.
                 */
                readonly index: number;
            };
            /**
             * Object representing the destination road segment of the turn.
             */
            readonly to: {
                /**
                 * GeoJSON Feature representing the destination road segment.
                 */
                readonly link: Feature<'LineString'>;
                /**
                 * Index of the Coordinates array of the destination road segment.
                 */
                readonly index: number;
            };
        }) => boolean;
        /**
         * Optional callback function to determine the weight (cost) of traversing a road segment.
         *
         * @param {object} data - Object containing information about the road segment.
         * @returns {number} A numerical value representing the weight or cost of traversing the road segment. Default is the distance in meter.
         */
        weight?: (data: {
            /**
             * Starting coordinates of the road segment.
             */
            from: GeoJSONCoordinate;
            /**
             * Ending coordinates of the road segment.
             */
            to: GeoJSONCoordinate;
            /**
             * Feature representing the road segment.
             */
            feature: Feature<'LineString'>;
            /**
             * Direction of traversal on the road segment.
             */
            direction: 'START_TO_END' | 'END_TO_START';
            /**
             * The Distance of the road in meters.
             */
            distance: number;
        }) => number;
    }): Promise<{
        /**
         * A GeoJSON Feature of geometry type MultiLineString representing the geometry of the found path.
         */
        readonly path: GeoJSONFeature<'MultiLineString'>;
        /**
         * An array of GeoJSON features representing the road segments in the path.
         */
        features: Feature<'LineString'>[];
        /**
         * the distance in meter of the path.
         */
        readonly distance: number;
        /**
         * The starting coordinates of the path.
         */
        from: GeoJSONCoordinate;
        /**
         * The end coordinates of the path.
         */
        to: GeoJSONCoordinate;
    }>;














}

/**
 * Provides basic geocode and reverse geocode functionality that allows you to:
 * - Obtain geocoordinates for addresses
 * - Obtain addresses or administrative areas for locations
 * - Obtain geocoordinates for known landmarks
 *
 * Uses the HERE Geocoder API.
 * @see https://developer.here.com/documentation/geocoder/dev_guide/topics/what-is.html
 */
export declare class GeoCoder {
    /**
     *  the url to the geocode service.
     */
    private readonly url;
    /**
     *  the url to the reverse geocode service.
     */
    private readonly reverseUrl;
    /**
     *  Current set config of the Geocoder.
     */
    private cfg;
    /**
     *  @param options - Options to configure the GeoCoder.
     */
    constructor(options: GeoCoderOptions);
    /**
     *  create the request url.
     *
     *  @param baseUrl - the url to geocoder service (normal or reverse)
     *  @param params - additional params for request url
     *  @returns the request url
     */
    private createUrl;
    /**
     *  Reuquest the Geocoder Resource.
     *  {@link https://developer.here.com/documentation/geocoder/dev_guide/topics/resource-geocode.html}
     *
     *  @param params - additional parameters for geocode request
     *  @param onSuccess - success callback
     *  @param onError - error callback
     */
    geocode(params: {
        [name: string]: string | string[] | number | number[];
    }, onSuccess: (data: any) => void, onError?: (error: any) => void): void;
    /**
     *  HTTPRequest the reverse Geocode Resource.
     *  {@link https://developer.here.com/documentation/geocoder/dev_guide/topics/resource-reverse-geocode.html}
     *
     *  @param params - additional parameters for reverse geocode request
     *  @param onSuccess - success callback
     *  @param onError - error callback
     */
    reverseGeocode(params: {
        [name: string]: string | string[] | number | number[];
    }, onSuccess: (data: any) => void, onError: (error: any) => void): void;
    /**
     *  HTTPRequest reverse geocode request to receive ISO country code for a geographical position.
     *
     *  @param position - it is either an array [longitude, latitude] or an object literal \{longitude: number, latitude: number\}
     *  @param onSuccess - success callback which contains the iso country code.
     *  @param onError - error callback
     */
    getIsoCountryCode(position: number[] | GeoPoint, onSuccess: (isocc: string, data: any) => void, onError: (error: any) => void): void;
}

/**
 *  Options to configure the GeoCoder.
 */
export declare interface GeoCoderOptions {
    /**
     * the app id required for authentication.
     *
     */
    app_id: string;
    /**
     * the app code required for authentication.
     */
    app_code: string;
    /**
     * The url to the Geocoder host.
     *
     * @defaultValue 'geocoder.api.here.com'
     */
    host?: string;
    /**
     * the used Geocoder version.
     *
     * @defaultValue '6.2'
     */
    version?: string;
}

/**
 * Defines a geographical rectangle.
 * The values of a GeoJSONBBox array are "[west: number, south: number, east: number, north: number]"
 */
export declare type GeoJSONBBox = [number, number, number, number];

/**
 * A GeoJSON Geometry coordinate is a array of coordinates.
 * The array must contain two or three elements [longitude, latitude, altitude?] / [x, y, z?].
 */
export declare type GeoJSONCoordinate = number[];

/**
 * A GeoJSON Feature object.
 */
export declare interface GeoJSONFeature<GeometryType = string> {
    /**
     *  id of the feature.
     */
    id?: string | number;
    /**
     *  Type of GeoJSONFeature is 'Feature'
     */
    type: 'Feature' | string;
    /**
     * The bounding box includes information on the coordinate range of the Feature.
     * The values of a bbox array are "[west: number, south: number, east: number, north: number]"
     */
    bbox?: GeoJSONBBox;
    /**
     *  The properties associated with the feature.
     */
    properties?: {
        [name: string]: any;
    } | null;
    /**
     *  A geometry is a object where the type member's value is one of: "Point", "MultiPoint", "LineString", "MultiLineString", "Polygon" or "MultiPolygon".
     *  A geometry object must have a member with the name "coordinates".
     *  The value of the coordinates member is always an array (referred to as the coordinates array below).
     *  The structure for the elements in this array are determined by the type of geometry.
     *
     *  For type "Point", each element in the coordinates array is a number representing the point coordinate in one dimension.
     *      There must be at least two elements, and may be more.
     *      The order of elements must follow x, y, z order (or longitude, latitude, altitude for coordinates in a geographic coordinate reference system).
     *
     *  For type "MultiPoint", each element in the coordinates array is a coordinates array as described for type "Point".
     *
     *  For type "LineString", each element in the coordinates array is a coordinates array as described for type "Point".
     *      The coordinates array for a LineString must have two or more elements.
     *      A LinearRing is a special case of type LineString where the first and last elements in the coordinates array are equivalent (they represent equivalent points).
     *      Though a LinearRing is not explicitly represented as a geometry type, it is referred to in the Polygon geometry type definition.
     *
     *  For type "MultiLineString", each element in the coordinates array is a coordinates array as described for type "LineString".
     *
     *  For type "Polygon", each element in the coordinates array is a coordinates array as described for type "LineString".
     *      Furthermore, each LineString in the coordinates array must be a LinearRing.
     *      For Polygons with multiple LinearRings, the first must be the exterior ring and any others must be interior rings or holes.
     *
     *  For type "MultiPolygon", each element in the coordinates array is a coordinates array as described for type "Polygon".
     *
     *
     * ```
     * Point:
     * {
     *     "type": "Point",
     *     "coordinates": [100.0, 0.0]
     * }
     *
     * Polygon:
     * {
     *     "type": "Polygon",
     *     "coordinates": [
     *         [ [100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0] ]
     *     ]
     * }
     *```
     */
    geometry: {
        type: 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon' | GeometryType | string;
        coordinates: GeometryType extends 'Point' ? GeoJSONCoordinate : GeometryType extends 'MultiPoint' ? GeoJSONCoordinate[] : GeometryType extends 'LineString' ? GeoJSONCoordinate[] : GeometryType extends 'MultiLineString' ? GeoJSONCoordinate[][] : GeometryType extends 'Polygon' ? GeoJSONCoordinate[][] : GeometryType extends 'MultiPolygon' ? GeoJSONCoordinate[][][] : GeoJSONCoordinate | GeoJSONCoordinate[] | GeoJSONCoordinate[][] | GeoJSONCoordinate[][][];
    };
}

/**
 * A GeoJSONFeatureCollection is a collection of {@link GeoJSONFeature | GeoJSONFeatures}.
 */
export declare interface GeoJSONFeatureCollection {
    /**
     * The type of a GeoJSONFeatureCollection must be a string "FeatureCollection".
     */
    type: 'FeatureCollection' | string;
    /**
     * An array of {@link GeoJSONFeature | GeoJSONFeatures}.
     */
    features: GeoJSONFeature[];
}

/**
 *  GeoJSONProvider is a remote HTTPProvider designed to work with GeoJSON data.
 */
export declare class GeoJSONProvider extends HTTPProvider {
    /**
     * @param options - options to configure the provider
     */
    constructor(options: HTTPProviderOptions);



}

/**
 *  A GeoPoint represents a geographical point.
 */
export declare class GeoPoint {
    /**
     *  the longitude in degrees
     */
    longitude: number;
    /**
     *  the latitude in degrees
     */
    latitude: number;
    /**
     *  the altitude in meters
     */
    altitude?: number;
    /**
     *  @param longitude - the longitude in degrees
     *  @param latitude - the latitude in degrees
     *  @param altitude - the altitude in degrees
     */
    constructor(longitude: number, latitude: number, altitude?: number);
}

/**
 *  A GeoRect represents a rectangular geographical area.
 *  The area is defined by two longitudes (west, east) and two latitudes (north, south).
 */
export declare class GeoRect {
    /**
     *  minimum longitude, the west-most longitude in degrees of the rectangular area
     */
    minLon: number;
    /**
     *  minimum latitude, the south-most latitude in degrees of the rectangular area
     */
    minLat: number;
    /**
     *  maximum longitude, the east-most longitude in degrees of the rectangular area
     */
    maxLon: number;
    /**
     *  maximum latitude, the north-most latitude in degrees of the rectangular area
     */
    maxLat: number;
    /**
     *  @param minLon - minimum longitude (west)
     *  @param minLat - minimum latitude (south)
     *  @param maxLon - maximum longitude (east)
     *  @param maxLat - maximum latitude (north)
     */
    constructor(minLon: number, minLat: number, maxLon: number, maxLat: number);
}

export declare function getProviderZoomOffset(tileSize: number): number;

/**
 * Interface for configuring the visual appearance of Heatmaps.
 * Heatmaps are particularly good at showing the density of data within a specific area.
 */
export declare interface HeatmapStyle {
    /**
     * Specifies the type of style to render.
     */
    type: 'Heatmap';
    /**
     * Indicates the drawing order within a layer.
     * Styles with larger zIndex value are rendered above those with smaller values.
     * The zIndex is defined relative to the "zLayer" property.
     * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
     */
    zIndex: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Indicates drawing order across multiple layers.
     * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
     * If no zLayer is defined, it will fall back to the {@link LayerStyle.zLayer} or depend on the display layer order.
     * The first (lowest) layer has a zLayer value of 1.
     *
     * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
     */
    zLayer?: number | StyleValueFunction<number> | StyleExpression<number>;
    /**
     * The radius in pixels with which to render a single point of the heatmap.
     *
     * @defaultValue 24
     */
    radius?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * The fill color is a linear gradient used to colorize the heatmap.
     */
    fill?: LinearGradient;
    /**
     * The heatmap weight defines how heavily a single data point is to be weighted and displayed within the heatmap.
     * The value used is equivalent to the number of actual points at that position.
     * The Weight is particularly useful for clustered data when combined with StyleValueFunction.
     *
     * @example
     * ```typescript
     * // the count property of a clustered point dataset defines how many points are located at the cluster position.
     * { type: "Heatmap", weight: (feature)=>feature.properties.count, fill: ... }
     * ```
     *
     * @defaultValue 1
     */
    weight?: number | StyleValueFunction<number> | StyleExpression<number>;
    /**
     * The intensity of the Heatmap is a global multiplier on top of the weight.
     * The intensity is particularly useful for adapting the heatmap to the zoom-level of the map.
     *
     * @defaultValue 1
     */
    intensity?: number | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Defines the global opacity of the heatmap.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     *
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
}

/**
 *  The HTTPProvider fetches data from remote HTTP data-sources.
 */
export declare abstract class HTTPProvider extends EditableRemoteTileProvider {



    /**
     * @param options - options to configure the provider
     */
    constructor(options: HTTPProviderOptions);

    /**
     *  Get a specific request-header being added to all requests handled by the provider.
     *
     *  @param name - The name of header to retrieve
     *
     *  @returns value of the request header or null if the header does not exist
     */
    getHeader(name: string): string | null;
    /**
     *  Get the request-headers being added to all requests handled by the provider.
     *
     *  @returns Map of key value pairs. the key represents the header name
     */
    getHeaders(): {
        [name: string]: string;
    };
    /**
     *  Set request-header that should be added to all request handled by the provider.
     *
     *  @param name - The name of the header whose value is to be set.
     *  @param value - The value to set as the body of the header.
     */
    setHeader(name: string, value: string): void;
    /**
     *  Set request-headers that should be added to all request handled by the provider.
     *
     *  @param map - Map of key value pairs. the key represents the header name.
     */
    setHeaders(headers: {
        [name: string]: string;
    }): void;
    /**
     *  Get the request-parameters that are being added by the provider to all requests.
     *
     *  @returns Map of key value pairs. the key represents the parameter name.
     */
    getParams(): {
        [name: string]: string;
    };
    /**
     *  Get a specific request-parameter that's being added by the provider to all requests.
     *
     *  @param name - The name of parameter to retrieve
     *
     *  @returns value of the request parameter or null if the parameter does not exist
     */
    getParam(name: string): string | null;
    /**
     *  Set request-parameters that should be added to all request handled by provider.
     *
     *  @param map - A map of key value pairs. the key represents the parameter name. Possible value types are string, string[] or undefined. If undefined is used parameter get's cleared/removed.
     */
    setParams(parameters: {
        [name: string]: string | string[] | undefined;
    }): void;
    /**
     * Set a specific request-parameter that should be added to all request handled by provider.
     * If undefined is set the parameter get's cleared/removed.
     *
     * @param name - The name of the parameter whose value is to be set.
     * @param value - The value(s) of the parameter.
     */
    setParam(name: string, value: string | string[] | undefined): void;
    /**
     * Get or set configuration options for the provider.
     *
     * If a string is provided as the first argument, returns the value of the corresponding property.
     * If an object is provided, sets the provider's properties according to the object.
     *
     * @param options - The configuration key as a string to get a value, or an object to set multiple options.
     * @param value - Optional value to set if a string key is provided.
     */
    config(options: HTTPProviderOptions | string, value?: any): TileProviderOptions;

    /**
     *  Get URL feature specific requests.
     *
     *  @param layer - the id of the layer
     *  @param featureId - id of the feature the provider want's to request
     *
     *  @returns url string to receive the feature resource of the remote http backend
     */
    abstract getFeatureUrl(layer: string, featureId: string | number): string;
    /**
     *  Get URL for layer specific requests.
     *
     *  @param layer - the id of the layer
     *  @returns url string to receive a layer resource of the remote http backend
     */
    abstract getLayerUrl(layer: string): string;
    /**
     *  Get URL for tile specific requests.
     *
     *  @param layer - the id of the layer
     *  @returns url string to receive a tile resource of the remote http backend
     */
    abstract getTileUrl(layer: string): string;



}

/**
 *  Options to configuration of HTTPProvider.
 */
export declare interface HTTPProviderOptions extends EditableRemoteTileProviderOptions {
    /**
     * URL for requesting tiles.
     *
     * It is either a string which may contain following flags that will be replaced by provider:
     * - \{SUBDOMAIN_CHAR\}: subdomain id(a, b, c and d) for balancing the load
     * - \{SUBDOMAIN_INT\}: subdomain id(0,1,2 and 3) for balancing the load
     * - \{SUBDOMAIN_INT_1_4\}: subdomain id(1,2,3 and 4) for balancing the load
     * - \{QUADKEY\}: quadkey of the tile to be requested
     * - \{Z\}:  z of the tile to be requested
     * - \{X\}:  x of the tile to be requested
     * - \{Y\}:  y of the tile to be requested
     *
     * or a callback function that's called with the following parameters z,y,x,quadkey and needs to return the url for the respective tile.
     * The callback function needs to handle custom parameters by its own.
     *
     * @example
     * ```
     * // string
     * url: 'https://xyz.api.here.com/hub/spaces/mySpace/tile/quadkey/{QUADKEY}?access_token=myAccessToken'
     * // callback function
     * url: (z, y, x, quadkey) => {
     *     return 'https://xyz.api.here.com/hub/spaces/mySpace/tile/quadkey/' + quadkey + '?access_token=myAccessToken';
     * }
     * ```
     */
    url?: string | ((z: number, y: number, x: number, quadkey: string) => string);
    /**
     * Indicates if requests are made with credentials.
     *
     * @defaultValue false
     */
    withCredentials?: boolean;
    /**
     * Indicates if the requests should be made with https.
     *
     * @defaultValue true
     */
    https?: boolean;
    /**
     * Set custom url service headers.
     * Custom headers will be applied to all request done by provider.
     */
    headers?: {
        [header: string]: string;
    };
    /**
     * Set custom url parameters.
     * Custom parameters will be applied to all request done by provider.
     */
    params?: {
        [paramter: string]: string;
    };
}

/**
 *  Tile Provider for Image/Raster data.
 *  eg: Satellite Tiles.
 */
export declare class ImageProvider extends TileProvider {

    /**
     *  The opacity with which the image data should be displayed.
     */
    private opacity;



    /**
     *  @param options - options to configure the provider
     */
    constructor(options: ImageProviderOptions);
    /**
     * Get a tile by quadkey.
     *
     * @param quadkey - quadkey of the tile
     * @param callback - the callback function
     * @returns the Tile is returned if its already cached locally
     */
    getTile(quadkey: string, cb: (tile: Tile) => void): any;

    /**
     * Cancel ongoing request(s) and drop the tile.
     *
     * @param quadkey - the quadkey of the tile that should be canceled and removed.
     */
    cancel(quadkey: string): void;
    /**
     * Cancel ongoing request(s) and drop the tile.
     *
     * @param tile - the tile that should be canceled and removed.
     */
    cancel(tile: Tile): void;
}

/**
 * Options to configure the ImageProvider.
 */
declare interface ImageProviderOptions extends TileProviderOptions {
    /**
     * URL for requesting tiles.
     *
     * It is either a string which may contain following flags that will be replaced by provider:
     * - \{SUBDOMAIN_CHAR\}: subdomain id(a, b, c and d) for balancing the load
     * - \{SUBDOMAIN_INT\}: subdomain id(0,1,2 and 3) for balancing the load
     * - \{SUBDOMAIN_INT_1_4\}: subdomain id(1,2,3 and 4) for balancing the load
     * - \{QUADKEY\}: quadkey of the tile to be requested
     * - \{Z\}:  z of the tile to be requested
     * - \{X\}:  x of the tile to be requested
     * - \{Y\}:  y of the tile to be requested
     *
     * or a callback function that's called with the following parameters z,y,x,quadkey and needs to return the url for the respective tile.
     * The callback function needs to handle custom parameters by its own.
     */
    url: string | ((z: number, y: number, x: number, quadkey: string) => string);
    /**
     * An Image url or Image that will be displayed for errored tile requests.
     */
    errorImage?: string | HTMLImageElement;
    /**
     * PreProcessor for remote data sources.
     * The PreProcessor will be executed just after data is being received from remote backend.
     * If the processor function is returning the processed data then its treated as a synchronous processor.
     * If the processor function does not return any value (undefined) or a Promise then its treated as asynchronous processor.
     * An asynchronous processor that's not using a Promise MUST call the input.ready(..) callback when data processing is finished.
     *
     * Due to the execution of the processor in a separate worker thread the processor function must be scope independent.
     * The processor must be a "standalone function/class" that only depends on its own scope and only accesses its own local variables.
     * No references to the outer scope of the processor function are allowed.
     *
     * @example
     * ```
     * // PreProcessor:
     *  ({data: any[], ready: (HTMLImageElement) => void, tile?:{x:number,y:number,z:number}) => HTMLImageElement | Promise<HTMLImageElement>
     * ```
     */
    preProcessor?(input: {
        data: any;
        ready: (data: HTMLImageElement) => void;
        tile?: {
            x: number;
            y: number;
            z: number;
        };
    }): HTMLImageElement | Promise<HTMLImageElement>;
}

/**
 * Interface for configuring the visual appearance of Images/Icons.
 */
export declare interface ImageStyle {
    /**
     * Specifies the type of style to render.
     */
    type: 'Image';
    /**
     * Indicates the drawing order within a layer.
     * Styles with larger zIndex value are rendered above those with smaller values.
     * The zIndex is defined relative to the "zLayer" property.
     * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
     */
    zIndex: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Indicates drawing order across multiple layers.
     * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
     * If no zLayer is defined, it will fall back to the {@link LayerStyle.zLayer} or depend on the display layer order.
     * The first (lowest) layer has a zLayer value of 1.
     *
     * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
     */
    zLayer?: number | StyleValueFunction<number> | StyleExpression<number>;
    /**
     * Specifies the URL of the image to render.
     * It can be either absolute or relative path.
     */
    src: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * If specified, the Image provided by {@link src} is considered as an IconAtlas/TextureAtlas.
     * The clipping region for the image must be defined by x, y, width and height.
     * The maximum supported atlas size is 4096x4096.
     */
    atlas?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    /**
     * Defines the opacity of the style.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     * It is valid for all style types.
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Width of the Image in pixels.
     * The maximum supported width for "Image" is 64 pixels.
     * The unit of width is defined in pixels.
     * @example
     * ```typescript
     * // define an Image that has a width (and height) of 64 pxiels
     * {
     *     zIndex: 0,
     *     type: "Image",
     *     src: "urlToImage.png",
     *     width: 64
     * }
     * ```
     */
    width: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Height of the Image in pixels.
     * The maximum supported height for "Image" is 64 pixels.
     * The unit of width is defined in pixels.
     * If the height is not explicitly defined, the value of the width is used as the height.
     *
     * @example
     * ```typescript
     * // define an Image that has a width of 32 and height of 64 pxiels
     * {
     *     zIndex: 0,
     *     type: "Image",
     *     src: "urlToImage.png",
     *     width: 32,
     *     height: 64
     * }
     * ```
     */
    height?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Offset the shape in pixels on x-axis.
     * A positive value offsets to the right, a negative value to the left.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Image by 8px to the right.
     * { type: "Image", zIndex: 0, src: '...', offsetX: 8}
     *
     * ```
     */
    offsetX?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * Offset the shape in pixels on y-axis.
     * A positive value offsetY offsets downwards, a negative value upwards.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Image by 8px to the bottom
     * { type: "Image", zIndex: 0, src: '...', offsetY: 8}
     * ```
     */
    offsetY?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Offset the shape in pixels on z-axis.
     * A positive value offsets up, a negative value down.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Image by 8px to the top.
     * { type: "Image", zIndex: 0, src: '...', offsetZ: 8}
     * ```
     */
    offsetZ?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * Alignment for styles of type "Circle".
     * Possible values are: "map" and "viewport".
     * "map" aligns to the plane of the map and "viewport" aligns to the plane of the viewport/screen.
     * Default alignment for Text based on point geometries is "viewport" while "map" is the default for line geometries.
     */
    alignment?: 'map' | 'viewport' | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Rotate the shape of the style to the angle in degrees.
     */
    rotation?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * In case of label collision, Text with a higher priority (lower value) will be drawn before lower priorities (higher value).
     * If the collision detection is enabled for multiple Styles within the same StyleGroup, the highest priority (lowest value)
     * is used.
     */
    priority?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Minimum distance in pixels between repeated style-groups on line geometries.
     * Applies per tile only.
     *
     * @defaultValue 256 (pixels)
     */
    repeat?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Sets the anchor point for styles of type "Image" used with Line or Polygon geometry.
     *
     * Possible values for Line geometry are "Coordinate" and "Line".
     * - "Coordinate": the respective style is displayed at each coordinate of the polyline.
     * - "Line": the respective style is displayed on the shape of the polyline when there is enough space. See {@link checkLineSpace} to disable the space check.
     *
     * Possible values for Polygon geometry are "Center" and "Centroid".
     * - "Center": the center of the bounding box of the polygon.
     * - "Centroid": the geometric centroid of the polygon geometry.
     *
     * @defaultValue For Polygon geometry the default is "Center". For Line geometry the default is "Line".
     */
    anchor?: 'Line' | 'Coordinate' | 'Centroid' | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Enable or disable the space check for point styles on line geometries.
     * If check checkLineSpace is enabled the respective style is only displayed if there is enough space on the line,
     * otherwise it is not displayed.
     *
     * @defaultValue true
     */
    checkLineSpace?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;
    /**
     * Enable or disable collision detection.
     * If the collision detection is enabled for multiple Styles within the same StyleGroup, the respective Styles are
     * handled as a single Object ("CollisionGroup") where the combined bounding-box is determined automatically.
     *
     * - true: collision are allowed, Collision detection is disabled.
     * - false: avoid collisions, Collision detection is enabled.
     *
     * @defaultValue false for "Text", true for all other.
     */
    collide?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;
    /**
     * Enables collision detection and combines all styles of a StyleGroup with the same "CollisionGroup" into a single logical object for collision detection.
     */
    collisionGroup?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Altitude of the Image center in meters.
     *
     * Describes the vertical distance from the global ground plane (0m) to the Image.
     *
     * Supported values:
     * - false (default): place at 0m.
     * - true: use the altitude (z) from the feature geometry if present, else 0. Not re-aligned to the rendered terrain.
     *         If the geometry altitude source differs from the TerrainTileLayer source/resolution, the Image can appear
     *         slightly above or below the visible terrain surface.
     * - number: fixed absolute altitude in meters. Also not adjusted when terrain tiles load; may not perfectly sit
     *           on the terrain unless both use exactly the same elevation source, datum and resolution.
     * - 'terrain': sample (clamp to) the current terrain surface height. While the terrain tile is not yet loaded
     *              (or no terrain layer exists) the altitude is 0 and updates once data becomes available.
     *
     * Notes:
     * - Use 'terrain' to keep the Image visually seated on the rendered terrain.
     * - Use a numeric value for a constant absolute elevation independent of terrain updates.
     * - To position something N meters above terrain: use 'terrain' plus offsetZ (e.g. offsetZ: '5m').
     * - Expect mismatches (floating / sinking) when using true or a fixed number with a different terrain data source.
     *
     * @defaultValue false
     * @experimental
     */
    altitude?: number | boolean | 'terrain' | StyleValueFunction<number | boolean | 'terrain'> | StyleZoomRange<number | boolean | 'terrain'> | StyleExpression<number | boolean | 'terrain'>;
    /**
     * Scales the size of a style based on the feature's altitude.
     * If it's enabled (true), features closer to the camera will be drawn larger than those farther away.
     * When off (false), the size of the style is always the same size, regardless of its actual altitude, as if it were placed on the ground (altitude 0).
     * This attribute applies to styles of type "Rect", "Image", "Text", "Circle", "Line", "Box", or "Sphere" whose size ({@link width}, {@link radius}, {@link strokeWidth}) that are using "map" {@link alignment} only.
     * If the size attribute is defined in meters, scaleByAltitude is enabled by default, for pixels it is disabled.
     *
     * @defaultValue false (pixels), true (meters)
     *
     * @experimental
     */
    scaleByAltitude?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;
}

/**
 *  An IMLProvider is a remote HTTPProvider designed to work with HERE Interactive Map layer.
 *  @see https://developer.here.com/documentation/data-api/data_dev_guide/rest/getting-data-interactive.html
 *  @see https://interactive.data.api.platform.here.com/openapi/
 */
export declare class IMLProvider extends SpaceProvider {




    /**
     * @param options - options to configure the provider
     * @example
     * ```ts
     * const provider = new IMLProvider({
     *     level: 10,
     *     layer: 'boston-liquor',
     *     catalog: 'hrn:here:data::olp-here:dh-showcase',
     *     credentials: {
     *         apiKey: "YOUR_API_KEY",
     *     }
     * });
     * ```
     */
    constructor(options: IMLProviderOptions);




    /**
     * Get or set configuration options for the provider.
     *
     * If a string is provided as the first argument, returns the value of the corresponding property.
     * If an object is provided, sets the provider's properties according to the object.
     *
     * @param options - The configuration key as a string to get a value, or an object to set multiple options.
     * @param value - Optional value to set if a string key is provided.
     */
    config(options: IMLProviderOptions | string, value?: any): TileProviderOptions;
}

/**
 *  Options to configure the IMLProvider.
 */
export declare interface IMLProviderOptions extends HTTPProviderOptions {
    /**
     * Name of the Interactive Map Layer.
     */
    layer: string;
    /**
     * Name of the catalog of the Interactive Map Layer.
     */
    catalog: string;
    /**
     * User credential of the provider
     */
    credentials: {
        /**
         * apiKey for read access
         */
        apiKey: string;
        /**
         * token for write access
         */
        token?: string;
    };
    /**
     * Indicates the tag(s) that should be set in the requests.
     *
     * @defaultValue false
     */
    tags?: false | string | string[];
    /**
     * Indicates if result geometry of tile requests should be clipped.
     *
     * @defaultValue false
     */
    clip?: boolean;
    /**
     * URL of the Interactive Map Layer endpoint.
     *
     * @defaultValue "https://interactive.data.api.platform.here.com/interactive/v1"
     */
    url?: string;
    /**
     * define property search query to enable remote filtering by property search.
     *
     * @see https://interactive.data.api.platform.here.com/openapi/#/Read%20Features
     *
     * @defaultValue null
     */
    propertySearch?: {
        [name: string]: {
            operator: '=' | '!=' | '>' | '>=' | '<' | '<=';
            value: any | any[];
        };
    };
}

/**
 * TileLayer
 */
export declare class Layer {
    /**
     * The name of the Layer
     */
    name: string;



    /**
     * The identifier of the Layer.
     */
    readonly id: string;
    /**
     * minimum zoom level at which data from the Layer is displayed.
     */
    min: number;
    /**
     * maximum zoom level at which data from the Layer will be displayed.
     */
    max: number;


    /**
     * @param options - options to configure the Layer
     */
    constructor(options: LayerOptions);



    /**
     * Sets the visibility of the Layer.
     *
     * This function controls whether the tile layer is currently displayed or hidden.
     *
     * @param {boolean} [isVisible] - A boolean value indicating whether the tile layer should be visible (true) or hidden (false).
     *
     * @returns {boolean} - The current visibility state of the tile layer.
     *
     * @example
     * ```
     * // Create a new tile layer
     * let tileLayer = new XYZMapsTileLayer();
     *
     * // Hide the tile layer
     * tileLayer.visible(false);
     *
     * // Show the tile layer
     * tileLayer.visible(true);
     * ```
     */
    setVisible(isVisible?: boolean): void;
    /**
     * Checks whether the xyz-maps tile layer is currently visible.
     *
     * @returns {boolean} - Returns `true` if the layer is visible, otherwise `false`.
     *
     * @example
     * ```
     * if (layer.isVisible()) {
     *   console.log("Layer is visible");
     * } else {
     *   console.log("Layer is not visible");
     * }
     * ```
     */
    isVisible(): boolean;


}

/**
 *  Configuration options for a Layer.
 */
declare interface LayerOptions {
    /**
     * Name of the Layer.
     */
    name?: string;
    /**
     * minimum zoom level at which data from the Layer will be displayed.
     */
    min?: number;
    /**
     * maximum zoom level at which data from the Layer will be displayed.
     */
    max?: number;
    /**
     * Indicates whether the layer should be visible (`true`) or hidden (`false`).
     * @defaultValue true
     */
    visible?: boolean;
    levelOffset?: number;
    tiled?: boolean;
}

/**
 * This is an interface to describe how certain features should be rendered within a layer.
 * @example
 * ```typescript
 * {
 *  styleGroups: {
 *    "myLineStyle": [
 *      {zIndex: 0, type: "Line", opacity: 1, stroke: "#BE6B65", strokeWidth: 16},
 *      {zIndex: 1, type: "Line", opacity: 1, stroke: "#E6A08C", strokeWidth: 12},
 *      {zIndex: 2, type: "Text", fill: "#000000", "textRef": "properties.name"}
 *    ]
 *  },
 *  assign: function(feature: Feature, zoomlevel: number){
 *    return "myLineStyle";
 *  }
 * }
 * ```
 */
export declare interface LayerStyle {
    /**
     * Option LayerStyle definitions that can be references and reused by {@link Style|Styles} within the Layer.
     */
    definitions?: {
        [definitionName: string]: boolean | number | StyleExpression | any[] | null;
    };
    /**
     * @deprecated define strokeWidth style property using a "StyleZoomRange" value instead.
     * @hidden
     */
    strokeWidthZoomScale?: (level: number) => number;
    /**
     * Specifies the background color of the layer.
     *
     * This property can accept different types of values to determine the background color:
     * - A fixed `Color`.
     * - A `StyleZoomRange<Color>` object to define color based on zoom levels.
     * - A function `(zoomlevel: number) => Color` to compute the color dynamically based on the zoom level.
     * - A `StyleExpression<Color>` to compute the color using a style expression.
     */
    backgroundColor?: Color | StyleZoomRange<Color> | ((zoomlevel: number) => Color) | StyleExpression<Color>;
    /**
     * Defines the sky color of the map.
     * - The sky becomes visible when the map is pitched to higher angles.
     * - When multiple layers with different sky colors are used, the sky color from the bottommost layer is applied.
     * - Supports various formats, including:
     *    - `Color`: A single color applied across all zoom levels.
     *    - `StyleZoomRange<Color>`: Specifies a range of colors based on zoom levels.
     *    - `(zoomlevel: number) => Color`: A function that dynamically determines the color based on the current zoom level.
     *    - `StyleExpression<Color>`: An expression to compute color based on style parameters.
     *    - `LinearGradient`: Applies a gradient effect for smooth transitions in sky color.
     *      - When using `LinearGradient`, stops at `0` represent the color near the horizon (close to the ground), and stops at `1` represent the color in the sky at the top of the screen.
     *      - The full gradient (0 to 1) becomes fully visible only when the map pitch is set to maximum (85 degrees).
     */
    skyColor?: Color | StyleZoomRange<Color> | ((zoomlevel: number) => Color) | StyleExpression<Color> | LinearGradient;
    /**
     * The `lights` property specifies a collection of light sources that can be used to illuminate features within the layer.
     * It is a map where each key is a unique light group name, and the value is an array of light objects.
     * Lights can be of various types, including {@link AmbientLight} and {@link DirectionalLight}, and can be used to create different lighting effects.
     *
     * The `lights` property allows you to define and organize multiple light sources that influence the rendering of features in the layer.
     *
     * ### Structure
     * - **Key (string):** A unique identifier for the light group.
     * - **Value (array):** An array of light objects, which can be of type {@link AmbientLight} or {@link DirectionalLight}.
     *
     * ### Relation to Style.light
     * - **{@link Style.light}**: Specifies which single light group to use for illuminating a specific feature. This property must reference a key defined in `LayerStyle.lights`.
     * - **Default Light**: If a `FeatureStyle` does not specify a `light`, the light group associated with the `"defaultLight"` key in `LayerStyle.lights` will be used. If `"defaultLight"` is not defined, a default light will be automatically provided.
     * - **Only One Light Group**: Only one light group is used to illuminate a feature. This is either the group specified in `FeatureStyle.light`, or if not specified, the `"defaultLight"` group from `LayerStyle.lights`.
     * - **Override Default Light**: To override the default light, set it explicitly in `LayerStyle.lights` under the key `"defaultLight"`.
     *
     * ### Examples
     * ```typescript
     * {
     *   lights: {
     *      // Define a light group named "default" to override the default lighting for the layer
     *    "defaultLight": [{
     *        type: 'ambient',
     *        color: '#fff',
     *        intensity: 0.3
     *    }, {
     *        type: 'directional',
     *        color: '#fff',
     *        direction: [0, 0, 1],
     *        intensity: 1.0
     *    }, {
     *        type: 'directional',
     *        color: '#fff',
     *        direction: [-1, 0, 0],
     *        intensity: 0.2
     *    }],
     *    // Define a light group named "buildingLights" for specific features
     *     "buildingLights": [
     *       { type: "ambient", color: "#fff", intensity: 1.0 } // A simple ambient light source for buildings
     *     ]
     *   }
     * }
     * ```
     *
     * In the example above:
     * - `"defaultLight"` is a light group that overrides the standard lighting configuration. It includes both an ambient and a directional light source and is used for all illuminated FeatureStyle instances where the light property is not explicitly set.
     * - `"buildingLights"` is a light group containing only an ambient light source. This group will only be used for features where {@link Style.light} is set to `"buildingLights"`.
     * - Each light source can be customized with properties such as `color`, `intensity`, and, for `DirectionalLight`, a `direction` vector.
     *
     * The lights specified here will be applied to the rendering of features within the layer. However, only one light group will be used for each feature:
     * - If {@link Style.light} is defined, it will reference a specific light group in `LayerStyle.lights`.
     * - If {@link Style.light} is not defined, the `"defaultLight"` light group (if specified) will be used.
     * - If no `"defaultLight"` light group is set, an automatic default light will be provided.
     *
     * @type { { [name: string]: (AmbientLight | DirectionalLight)[] } }
     */
    lights?: {
        [name: string]: (AmbientLight | DirectionalLight)[];
    };
    /**
     *  This object contains key/styleGroup pairs.
     *  A styleGroup is an array of {@link Style}, that exactly defines how a feature should be rendered.
     */
    styleGroups: {
        [key: string]: Array<Style>;
    };
    /**
     *  The function returns a key that is defined in the styleGroups map.
     *  This function will be called for each feature being rendered by the display.
     *  The display expects this method to return the key for the styleGroup of how the feature should be rendered for the respective zoomlevel.
     *
     *  If `assign` is not defined, the {@link Style.filter} property must be used to determine whether the feature should be rendered.
     *
     *  @param feature - the feature to which style is applied
     *  @param zoomlevel - the zoomlevel of the tile the feature should be rendered in
     *
     *  @returns the key/identifier of the styleGroup in the styleGroupMap, or null/undefined if the feature should not be rendered.
     */
    assign?: (feature: Feature, zoomlevel: number) => string | null | undefined;
    /**
     * Indicates the global drawing order across multiple layers.
     * This value acts as a fallback for the {@link Style.zLayer} property if not explicitly defined there.
     * Styles with higher zLayer values are rendered on top of those with lower values.
     * If no `zLayer` is defined, the display layer order is used by default.
     */
    zLayer?: number;

}

/**
 * The `Light` interface defines a base structure for various types of lighting in the styling system. It includes properties for color and intensity, and is extended by specific light types such as `AmbientLight` and `DirectionalLight`.
 *
 * @interface Light
 */
declare interface Light {
    /**
     * Specifies the type of light.
     */
    type: string;
    /**
     * The color of the light.
     * Can be specified as a `Color` value, a `StyleZoomRange<Color>`, a function that returns a `Color` based on zoom level, or a `StyleExpression<Color>`.
     */
    color: Color | StyleZoomRange<Color> | ((zoomlevel: number) => Color) | StyleExpression<Color>;
    /**
     * The intensity of the light. This property is optional and defaults to 1 if not specified.
     */
    intensity?: number;

}

/**
 * Represents a linear gradient with color stops.
 *
 * @example
 * ```typescript
 * const gradient: LinearGradient = {
 *     type: 'LinearGradient',
 *     stops: {
 *         1.0: 'white',
 *         0.9: '#FCFBAE',
 *         0.8: '#FAD932',
 *         0.7: '#F26C19',
 *         0.5: '#C41D6F',
 *         0.3: '#70009C',
 *         0.0: '#1E0073'
 *     }
 * };
 * ```
 */
export declare interface LinearGradient {
    /**
     * Specifies the gradient type.
     * Must always be "LinearGradient".
     */
    type: 'LinearGradient';
    /**
     * Defines the color stops for the gradient.
     * Keys represent stop positions (ranging from 0.0 to 1.0),
     * where 0.0 is the start and 1.0 is the end of the gradient.
     */
    stops: {
        [stop: number]: string;
    };
}

/**
 * Interface for configuring the visual appearance of Lines.
 */
export declare interface LineStyle {
    /**
     * Specifies the type of style to render.
     */
    type: 'Line';
    zIndex: number;
    /**
     * Indicates drawing order across multiple layers.
     * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
     * If no zLayer is defined, it will fall back to the {@link LayerStyle.zLayer} or depend on the display layer order.
     * The first (lowest) layer has a zLayer value of 1.
     *
     * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
     */
    zLayer?: number | StyleValueFunction<number> | StyleExpression<number>;
    /**
     * Defines the opacity of the style.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     * It is valid for all style types.
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Sets the stroke color of the Line.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    stroke?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the width of the line.
     * The unit of strokeWidth is defined in pixels.
     * For Polygons that are using {@link extrude}, the maximum possible strokeWidth is 1.0 pixel.
     * For Styles of type Line the strokeWidth can also be defined in meters by using a string: "$\{width\}m".
     *
     * @example
     * ```typescript
     * // define a Line that has a with of 1 meter
     * {
     *     zIndex: 0,
     *     type: "Line",
     *     stroke: "blue",
     *     strokeWidth: "1m"
     * }
     * // define a Line that has a with of 16 pixel
     * {
     *     zIndex: 0,
     *     type: "Line",
     *     stroke: "green",
     *     strokeWidth: "16
     * }
     * ```
     */
    strokeWidth: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * This controls the shape of the ends of lines. there are three possible values for strokeLinecap:
     * - "butt" closes the line off with a straight edge that's normal (at 90 degrees) to the direction of the stroke and crosses its end.
     * - "square" has essentially the same appearance, but stretches the stroke slightly beyond the actual path. The distance that the stroke goes beyond the path is half the strokeWidth.
     * - "round" produces a rounded effect on the end of the stroke. The radius of this curve is also controlled by the strokeWidth.
     * This attribute is valid for Line styles only.
     *
     * If "strokeLinecap" is used in combination with "altitude", only "butt" is supported for "strokeLinecap".
     */
    strokeLinecap?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * The joint where the two segments in a line meet is controlled by the strokeLinejoin attribute, There are three possible values for this attribute:
     * - "miter" extends the line slightly beyond its normal width to create a square corner where only one angle is used.
     * - "round" creates a rounded line segment.
     * - "bevel" creates a new angle to aid in the transition between the two segments.
     * This attribute is valid for Line styles only.
     *
     * If "strokeLinejoin" is used in combination with "altitude", the use of "round" is not supported.
     */
    strokeLinejoin?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * The strokeDasharray attribute controls the pattern of dashes and gaps used to stroke paths.
     * It's an array of <length> that specify the lengths of alternating dashes and gaps. If an odd number of values is provided,
     * then the list of values is repeated to yield an even number of values. Thus, 5,3,2 is equivalent to 5,3,2,5,3,2.
     * The size of dashes and gaps can be defined in pixel or meter.
     * The default unit for dash and gap size is pixel.
     * In a pattern utilizing both meter and pixel units, only the initial "dash" and "gap" combination is utilized, with the subsequent ones being skipped.
     * To define the size in meters, a string containing the "dash"/"gap" size and ending with "m" must be used.
     *
     * @example
     * // dash and gap size is defined in pixel.
     * strokeDasharray: [20,10]
     * // dash and gap size is defined in meter.
     * strokeDasharray: ["20m","10m"]
     * // dash -> 10 meter, gap -> 10 pixel.
     * strokeDasharray: ["20m",10] || ["20m","10px"]
     */
    strokeDasharray?: (number | string)[] | StyleValueFunction<(number | string)[]> | StyleZoomRange<(number | string)[]> | StyleExpression<(number | string)[]> | 'none';
    /**
     * Specifies the URL of the image to be rendered at the positions of the dashes.
     * If strokeDashimage is defined, only the first dash and gap definition of the {@link strokeDasharry} pattern is used.
     * The dashimage will be colored with the color defined in {@link stroke}.
     */
    strokeDashimage?: string;
    /**
     * Define the starting position of a segment of the entire line in %.
     * A Segment allows to display and style parts of the entire line individually.
     * The value must be between 0 and 1.
     * The Default is 0.
     *
     * @example
     * from: 0.0 // -\> 0%, the segment has the same starting point as the entire line
     * from:  0.5 // -\> 50%, the segment starts in the middle of the entire line
     */
    from?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Define the end position of a segment of the entire line in %.
     * A Segment allows to display and style parts of the entire line individually.
     * The value must be between 0 and 1.
     * The Default is 1.
     *
     * @example
     * to: 0.5 // -\> 50%, the segment ends in the middle of the entire line
     * to: 1.0 // -\> 100%, the segment has the same end point as the entire line
     */
    to?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Offset a line to the left or right side in pixel or meter.
     * A positive values offsets to the right side, a negative value offsets to the left.
     * The side is defined relative to the direction of the line geometry.
     * The default unit is pixels.
     * To define the offset in meters a string that contains the offset value and ends with "m" must be used.
     * Applies to Line style only.
     * @example
     * ```typescript
     * // offset line by 8px
     * { type: "Line", zIndex: 0, stroke:'blue', strokeWidth: 4, offset: 8}
     *
     * // offset line by 2m
     * { type: "Line", zIndex: 0, stroke:'blue', strokeWidth: 4, offset: "2m"}
     * ```
     */
    offset?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * The altitude of the line in meters.
     * The altitude defines the distance in the vertical direction between the ground plane at 0 meters and the geometry/style.
     * If altitude is set to true, the altitude from the feature's geometry coordinates will be used automatically.
     * If a number is set for altitude, the altitude of the feature's geometry is ignored and the value of "altitude" is used instead.
     * The height must be defined in meters.
     *
     * @defaultValue false
     *
     * @experimental
     */
    altitude?: number | boolean | StyleValueFunction<number | boolean> | StyleZoomRange<number | boolean> | StyleExpression<number | boolean>;
    /**
     * Scales the size of a style based on the feature's altitude.
     * If it's enabled (true), features closer to the camera will be drawn larger than those farther away.
     * When off (false), the size of the style is always the same size, regardless of its actual altitude, as if it were placed on the ground (altitude 0).
     * This attribute applies to styles of type "Rect", "Image", "Text", "Circle", "Line", "Box", or "Sphere" whose size ({@link width}, {@link radius}, {@link strokeWidth}) that are using "map" {@link alignment} only.
     * If the size attribute is defined in meters, scaleByAltitude is enabled by default, for pixels it is disabled.
     *
     * @defaultValue false (pixels), true (meters)
     *
     * @experimental
     */
    scaleByAltitude?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;
}

/**
 *  Local feature tile provider.
 */
export declare class LocalProvider extends EditableFeatureProvider {
    /**
     * @param options - options to configure the provider
     */
    constructor(options?: LocalProviderOptions);





















}

/**
 *  Options to configure the Provider.
 */
export declare interface LocalProviderOptions extends EditableFeatureProviderOptions {
    /**
     * Name of the provider.
     */
    name?: string;
    /**
     * Tile margin of the provider.
     */
    margin?: number;
    /**
     *  Allow or prevent editing by the {@link editor.Editor} module.
     *
     *  @defaultValue false
     */
    editable?: boolean;

    size?: number;
}

/**
 * The Material to render the model/geometry using the Phong reflection model.
 *
 * @experimental
 */
export declare interface Material {
    /**
     * The Ambient color reflection intensity constant of the material.
     *
     * @defaultValue [1,1,1] (white)
     */
    ambient?: number[];
    /**
     * The emissive color of the material.
     * Emissive Color is solid and unaffected by other lightning.
     *
     * @defaultValue [1,1,1] (white)
     */
    emissive?: number[];
    /**
     * Diffuse color of the material.
     *
     * @defaultValue [1, 1, 1] (white)
     */
    diffuse?: number[];
    /**
     * The name of the diffuse map used by the material.
     * The actual texture must be defined in {@link ModelData.textures}.
     */
    diffuseMap?: string;
    /**
     * Texture wrapping mode for the U (horizontal) and V (vertical) directions.
     * Supported values are 'clamp', 'repeat', and 'mirror'.
     *
     * @defaultValue 'repeat'
     */
    wrap?: 'clamp' | 'repeat' | 'mirror' | [wrapS: 'clamp' | 'repeat' | 'mirror', wrapT: 'clamp' | 'repeat' | 'mirror'];
    /**
     * The shininess of the material determines how shiny the {@link Material.specular | specular} highlights are rendered.
     * A higher value results in a sharper, more focused highlight, while lower values cause the highlight to become more blown out.
     * The value range is from 0 to 1000.
     *
     * @defaultValue 32
     */
    shininess?: number;
    /**
     * Specular defines the specular highlight color of the material.
     *
     * @defaultValue [1, 1, 1] (white)
     */
    specular?: number[];
    /**
     * The name of the specular map used by the material.
     * The actual texture must be defined in {@link ModelData.textures}.
     */
    specularMap?: string;
    /**
     * The name of the normal map used by the material.
     * The actual texture must be defined in {@link ModelData.textures}.
     */
    normalMap?: string;
    /**
     * The used primitive type to render the model geometry.
     *
     * @defaultValue "Triangles"
     */
    mode?: 'Triangles' | 'Points';
    /**
     * The used pointSize in pixels to render when mode is set to "Points".
     */
    pointSize?: number;
    /**
     * The Illumination Mode of the material.
     *
     * - mode 0: Constant color mode. Colors, no lightning, no shading
     * - mode 1: Diffuse lightning mode.
     *
     * @defaultValue 1
     */
    illumination?: number;
    /**
     * The opacity of the material determines how much this material dissolves into the background.
     * The value must be between 0.0 (completely transparent) and 1.0 (fully opaque).
     *
     * @defaultValue 1
     */
    opacity?: number;
    useUVMapping?: boolean;
    uvScale?: number;
    /**
     * A flag to specify if the texture should be flipped vertically.
     *
     * @defaultValue false
     */
    flipY?: boolean;
}

/**
 * The data format that describes the model to display.
 */
export declare interface ModelData {
    /**
     * The Geometries of the Model.
     */
    geometries: ModelGeometry[];
    /**
     * Textures used by Materials.
     */
    textures?: {
        [name: string]: HTMLCanvasElement | HTMLImageElement | {
            width: number;
            height: number;
            pixels?: Uint8Array;
        };
    };
    /**
     * Materials referenced by {@link ModelData.faces}.
     */
    materials?: {
        [name: string]: Material;
    };
    /**
     * The Faces of the Model.
     * The winding orientation is counter-clockwise.
     */
    faces: {
        /**
         * Index of the geometry used to render the face.
         */
        geometryIndex: number;
        /**
         * The name of the Material the geometry should be rendered with.
         * If the used material is not defined in {@link ModelData.materials| Materials}, or none is defined, the default material will be used.
         */
        material: string;
        /**
         * A number specifying the starting index of the vertices to render the face.
         * If "start" is defined, "index" is ignored.
         *
         * @defaultValue 0
         */
        start?: number;
        /**
         * A number specifying the number of indices of the face to be rendered.
         * If "count"  is defined, "index" is ignored.
         *
         * @defaultValue position.size/3
         */
        count?: number;
    }[];
}

/**
 * ModelGeometry
 */
export declare interface ModelGeometry {
    /**
     * Vertex positions
     */
    position: TypedArray | number[];
    /**
     * Vertex indices
     */
    index?: Uint16Array | Uint32Array | number[];
    /**
     * Vertex normals
     */
    normal?: TypedArray | number[];
    /**
     * Texture coordinates
     */
    uv?: number[];
    /**
     * Per Vertex color
     */
    color?: string | number[];

}

/**
 * Interface for configuring the visual appearance of Models.
 * The default orientation is with the Y axis pointing up.
 *
 * @experimental
 */
export declare interface ModelStyle {
    /**
     * Specifies the type of style to render.
     */
    type: 'Model';
    /**
     * Indicates the drawing order within a layer.
     * Styles with larger zIndex value are rendered above those with smaller values.
     * The zIndex is defined relative to the "zLayer" property.
     * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
     */
    zIndex: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Indicates drawing order across multiple layers.
     * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
     * If no zLayer is defined, it will fall back to the {@link LayerStyle.zLayer} or depend on the display layer order.
     * The first (lowest) layer has a zLayer value of 1.
     *
     * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
     */
    zLayer?: number | StyleValueFunction<number> | StyleExpression<number>;
    /**
     * The Model data that should be rendered.
     * In addition to passing the model directly, a string can also be provided that references a Wavefront OBJ file.
     *
     * @example \{zIndex: 0, type: "Model", model: "./MyModel.obj"\}
     */
    model: string | ModelData | StyleValueFunction<ModelData>;
    /**
     * Configure Face culling.
     * To enable culling set cullFace to "Front" or "Back", to disable set to false.
     * The used winding order is counter-clock-wise.
     * Face culling is disabled by default.
     *
     * @defaultValue: false
     */
    cullFace?: 'Front' | 'Back' | false;
    /**
     * Scale the model by the given vector [sx,sy,sz].
     */
    scale?: number[];
    /**
     * Translate the model by the given vector [tx,ty,tz].
     */
    translate?: number[];
    /**
     * rotate the model by the given vector [radX,radY,radZ].
     * The order of rotation is x first, then y, followed by z.
     */
    rotate?: number[];
    /**
     * 4x4 transformation matrix to transform the model.
     * if transform is defined, {@link ModelStyle.scale | scale}, {@link ModelStyle.translate | translate} and {@link ModelStyle.rotate | rotate} are ignored.
     */
    transform?: number[];
    modelId?: number;
    /**
     * Specifies the name of the light group to use for illuminating specific features on a layer.
     * This property must reference a key corresponding to a light group defined in {@link LayerStyle.lights}.
     * A light group consists of lighting sources such as ambient or directional lights that affect the appearance of features.
     *
     * If `light` is not defined, the default light group `"defaultLight"` will be used to illuminate the layer's features.
     *
     * @see {@link LayerStyle.lights} for defining and referencing available light groups.
     *
     * @defaultValue "defaultLight"
     */
    light?: string;
    /**
     * Sets the emissive color of the `"Model"`, giving it a glow effect.
     *
     * **Combination with Material Emissive:**
     * - The provided `emissive` color value will be combined with {@link Material.emissive} through color addition.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    emissive?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the specular color of the `"Model"`, affecting how it reflects light.
     *
     * **Combination with Material Specular:**
     * - The provided `specular` value will be combined with {@link Material.specular} through color addition.
     *
     * ### Relationship with Shininess
     * - **Effect:** The `specular` property determines the color of the light reflection, while the {@link shininess} value controls the intensity and size of the reflection.
     * - **Shininess Dependency:** If `specular` is set and `shininess` is not explicitly set, the default {@link shininess} value will be used to control the reflection's appearance.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    specular?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the shininess of the `"Model"`, determining how glossy its surface appears.
     * A higher value makes the ``"Model"` surface more reflective.
     *
     * **Combination with Material Shininess:**
     * - The provided `shininess` value will be combined with {@link Material.shininess} through addition.
     *
     * ### Relationship with Specular
     * - **Effect:** The `shininess` value controls the size and intensity of the specular highlight, which is colored by the {@link specular} property.
     * - **Specular Dependency:** The `shininess` property enhances the effect of the `specular` color. If `specular` is not set, `shininess` has no visible effect.
     *
     * ### Shininess Value Range and Effect
     * - **Range:** The `shininess` value typically ranges from 0 to 128.
     * - **Low Values (0-10):** Produce a wide, diffused highlight, resulting in a matte or dull appearance.
     * - **High Values (50-128):** Produce a small, intense highlight, resulting in a glossy or shiny appearance.
     *
     * @defaultValue 32
     */
    shininess?: number;
}

/**
 * The MVTLayer is a TileLayer designed to work with remote datasources that are delivering {@link https://github.com/mapbox/vector-tile-spec | MVT encoded} vector tiles.
 * @example
 * ```
 * const myLayer = new MVTLayer({
 *     remote: {
 *         url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
 *         tileSize : 512
 *     },
 *     min: 1,
 *     max: 20
 * })
 * ```
 */
export declare class MVTLayer extends TileLayer {


    /**
     * @param options - options to configure the TileLayer
     */
    constructor(options: MVTLayerOptions);


}

/**
 *  Options to configure a MVTLayer.
 */
export declare interface MVTLayerOptions extends TileLayerOptions {
    /**
     * options to configure the remote MVT datasource
     */
    remote: {
        /**
         * URL to the remote MVT endpoint.
         *
         * It is either a string which may contain the following flags that will be replaced:
         * - \{SUBDOMAIN_CHAR\}: subdomain id(a, b, c and d) for balancing the load
         * - \{SUBDOMAIN_INT\}: subdomain id(0, 1, 2 and 3) for balancing the load
         * - \{SUBDOMAIN_INT_1_4\}: subdomain id(1, 2, 3 and 4) for balancing the load
         * - \{QUADKEY\}: quadkey of the tile to be requested
         * - \{Z\}: z of the tile to be requested
         * - \{X\}: x of the tile to be requested
         * - \{Y\}: y of the tile to be requested
         *
         * or a callback function that's called with the following parameters z,y,x,quadkey and needs to return the url for the respective tile.
         * The callback function needs to handle custom parameters by its own.
         *
         * @example
         * ```
         * // string
         * url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=YOUR_ACCESS_TOKEN'
         *
         * // callback function
         * url: (z, y, x, quadkey) => {
         *     return `https://xyz.api.here.com/tiles/osmbase/512/all/${z}/${x}/${y}.mvt?access_token=YOUR_ACCESS_TOKEN`
         * }
         * ```
         */
        url: string | ((z: number, y: number, x: number, quadkey: string) => string);
        /**
         * The maximum zoom level for loading map tiles
         * @defaultValue 16
         */
        max?: number;
        /**
         * The minimum zoom level for loading map tiles
         * @defaultValue 1
         */
        min?: number;
        /**
         * defines the size of the mvt tile data in pixel.
         * @defaultValue 512
         */
        tileSize?: number;
    };
    /**
     * Determines whether pointer events are enabled for all features of the layer.
     * @defaultValue false
     */
    pointerEvents?: boolean;
}

/**
 *  A PixelPoint represents a point in pixel.
 */
export declare class PixelPoint {
    /**
     *  x coordinate of the point in pixel.
     */
    x: number;
    /**
     *  y coordinate of the point in pixel.
     */
    y: number;
    /**
     *
     *  @param x - the x coordinate of the point
     *  @param y - the y coordinate of the point
     */
    constructor(x: number, y: number);
}

/**
 *  A PixelRect represents a rectangular area in pixels.
 */
export declare class PixelRect {
    /**
     *  minimum x, the left-most x coordinate of the rectangular area.
     */
    minX: number;
    /**
     *  maximum y, the top-most y coordinate of the rectangular area.
     */
    minY: number;
    /**
     *  max x, the right-most x coordinate of the rectangular area.
     */
    maxX: number;
    /**
     *  max y, the bottom-most y coordinate of the rectangular area.
     */
    maxY: number;
    /**
     *  @param minX - minimum x coordinate
     *  @param minY - minimum y coordinate
     *  @param maxX - maximum x coordinate
     *  @param maxY - maximum y coordinate
     */
    constructor(minX: number, minY: number, maxX: number, maxY: number);
}

/**
 * Interface for configuring the visual appearance of Polygons.
 */
export declare interface PolygonStyle {
    /**
     * Specifies the type of style to render.
     */
    type: 'Polygon';
    /**
     * Indicates the drawing order within a layer.
     * Styles with larger zIndex value are rendered above those with smaller values.
     * The zIndex is defined relative to the "zLayer" property.
     * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
     */
    zIndex: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Indicates drawing order across multiple layers.
     * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
     * If no zLayer is defined, it will fall back to the {@link LayerStyle.zLayer} or depend on the display layer order.
     * The first (lowest) layer has a zLayer value of 1.
     *
     * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
     */
    zLayer?: number | StyleValueFunction<number> | StyleExpression<number>;
    /**
     * Sets the color to fill the polygon.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    fill?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the stroke color of the polygon.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    stroke?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the width of the stroke of the polygon (outline).
     * The unit of strokeWidth is defined in pixels.
     * For Polygons that are using {@link extrude}, the maximum possible strokeWidth is 1.0 pixel.
     * For Styles of type Line the strokeWidth can also be defined in meters by using a string: "$\{width\}m".
     *
     * @example
     * ```typescript
     * // define a red colored polygon with a 2 pixel blue stroke (outline).
     * {
     *     zIndex: 0,
     *     type: "Line",
     *     fill: "red",
     *     stroke: "blue",
     *     strokeWidth: 2
     * }
     * ```
     */
    strokeWidth?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * This controls the shape of the ends of lines. there are three possible values for strokeLinecap:
     * - "butt" closes the line off with a straight edge that's normal (at 90 degrees) to the direction of the stroke and crosses its end.
     * - "square" has essentially the same appearance, but stretches the stroke slightly beyond the actual path. The distance that the stroke goes beyond the path is half the strokeWidth.
     * - "round" produces a rounded effect on the end of the stroke. The radius of this curve is also controlled by the strokeWidth.
     * This attribute is valid for Line styles only.
     *
     * If "strokeLinecap" is used in combination with "altitude", only "butt" is supported for "strokeLinecap".
     */
    strokeLinecap?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * The joint where the two segments in a line meet is controlled by the strokeLinejoin attribute, There are three possible values for this attribute:
     * - "miter" extends the line slightly beyond its normal width to create a square corner where only one angle is used.
     * - "round" creates a rounded line segment.
     * - "bevel" creates a new angle to aid in the transition between the two segments.
     * This attribute is valid for Line styles only.
     *
     * If "strokeLinejoin" is used in combination with "altitude", the use of "round" is not supported.
     */
    strokeLinejoin?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * The strokeDasharray attribute controls the pattern of dashes and gaps used to stroke paths.
     * It's an array of <length> that specify the lengths of alternating dashes and gaps. If an odd number of values is provided,
     * then the list of values is repeated to yield an even number of values. Thus, 5,3,2 is equivalent to 5,3,2,5,3,2.
     * The size of dashes and gaps can be defined in pixel or meter.
     * The default unit for dash and gap size is pixel.
     * In a pattern utilizing both meter and pixel units, only the initial "dash" and "gap" combination is utilized, with the subsequent ones being skipped.
     * To define the size in meters, a string containing the "dash"/"gap" size and ending with "m" must be used.
     *
     * @example
     * // dash and gap size is defined in pixel.
     * strokeDasharray: [20,10]
     * // dash and gap size is defined in meter.
     * strokeDasharray: ["20m","10m"]
     * // dash -> 10 meter, gap -> 10 pixel.
     * strokeDasharray: ["20m",10] || ["20m","10px"]
     */
    strokeDasharray?: (number | string)[] | StyleValueFunction<(number | string)[]> | StyleZoomRange<(number | string)[]> | StyleExpression<(number | string)[]> | 'none';
    /**
     * Defines the opacity of the style.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     * It is valid for all style types.
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Define the starting position of a segment of the entire line in %.
     * A Segment allows to display and style parts of the entire line individually.
     * The value must be between 0 and 1.
     * The Default is 0.
     *
     * @example
     * from: 0.0 // -\> 0%, the segment has the same starting point as the entire line
     * from:  0.5 // -\> 50%, the segment starts in the middle of the entire line
     */
    from?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Define the end position of a segment of the entire line in %.
     * A Segment allows to display and style parts of the entire line individually.
     * The value must be between 0 and 1.
     * The Default is 1.
     *
     * @example
     * to: 0.5 // -\> 50%, the segment ends in the middle of the entire line
     * to: 1.0 // -\> 100%, the segment has the same end point as the entire line
     */
    to?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Offset a line to the left or right side in pixel or meter.
     * A positive values offsets to the right side, a negative value offsets to the left.
     * The side is defined relative to the direction of the line geometry.
     * The default unit is pixels.
     * To define the offset in meters a string that contains the offset value and ends with "m" must be used.
     * Applies to Line style only.
     * @example
     * ```typescript
     * // offset line by 8px
     * { type: "Line", zIndex: 0, stroke:'blue', strokeWidth: 4, offset: 8}
     *
     * // offset line by 2m
     * { type: "Line", zIndex: 0, stroke:'blue', strokeWidth: 4, offset: "2m"}
     * ```
     */
    offset?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * The altitude of the style in meters.
     * The altitude defines the distance in the vertical direction between the ground plane at 0 meters and the geometry/style.
     * If altitude is set to true, the altitude from the feature's geometry coordinates will be used automatically.
     * If a number is set for altitude, the altitude of the feature's geometry is ignored and the value of "altitude" is used instead.
     * The height must be defined in meters.
     * This attribute is valid for styles of type "Rect", "Image", "Text", "Circle", "Line", "Box" or "Sphere".
     *
     * @defaultValue false
     *
     * @experimental
     */
    altitude?: number | boolean | StyleValueFunction<number | boolean> | StyleZoomRange<number | boolean> | StyleExpression<number | boolean>;
    /**
     * Extrude a Polygon or MultiPolygon geometry in meters.
     */
    extrude?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * The base of the Extrude in meters.
     * The extrudeBase is defined from the ground to the bottom of the extruded Polygon in meters.
     * The extrudeBase must be less or equal then {@link extrude}.
     *
     * @defaultValue 0
     */
    extrudeBase?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Specifies the name of the light group to use for illuminating specific features on a layer.
     * This property must reference a key corresponding to a light group defined in {@link LayerStyle.lights}.
     * A light group consists of lighting sources such as ambient or directional lights that affect the appearance of features.
     *
     * If `light` is not defined, the default light group `"defaultLight"` will be used to illuminate the layer's features.
     *
     * @see {@link LayerStyle.lights} for defining and referencing available light groups.
     *
     * @defaultValue "defaultLight"
     */
    light?: string;
    /**
     * Sets the emissive color of the extruded polygon, giving it a glow effect.
     * This property is only applicable when the polygon is {@link extrude|extruded}.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    emissive?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the specular color of the extruded polygon, affecting how it reflects light.
     *
     * This property is only applicable when the polygon is {@link extrude|extruded}.
     *
     * ### Relationship with Shininess
     * - **Effect:** The `specular` property determines the color of the light reflection, while the {@link shininess} value controls the intensity and size of the reflection.
     * - **Shininess Dependency:** If `specular` is set and `shininess` is not explicitly set, the default {@link shininess} value will be used to control the reflection's appearance.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    specular?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the shininess of the extruded polygon, determining how glossy its surface appears.
     * A higher value makes the polygon surface more reflective.
     *
     * This property is only applicable when the polygon is {@link extrude|extruded}.
     *
     * ### Relationship with Specular
     * - **Effect:** The `shininess` value controls the size and intensity of the specular highlight, which is colored by the {@link specular} property.
     * - **Specular Dependency:** The `shininess` property enhances the effect of the `specular` color. If `specular` is not set, `shininess` has no visible effect.
     *
     * ### Shininess Value Range and Effect
     * - **Range:** The `shininess` value typically ranges from 0 to 128.
     * - **Low Values (0-10):** Produce a wide, diffused highlight, resulting in a matte or dull appearance.
     * - **High Values (50-128):** Produce a small, intense highlight, resulting in a glossy or shiny appearance.
     *
     * @defaultValue 32
     */
    shininess?: number;
    /**
     * Controls the intensity of the fill color under directional lighting.
     *
     * `fillIntensity` determines how much the polygon's fill color is affected by the directional lighting in the scene.
     * A higher value increases the intensity of the fill color, making it more vibrant under strong lighting,
     * while a lower value reduces the effect, resulting in a more muted color.
     *
     * The value should range from 0 to 1, where 0 means no color intensity and 1 represents full intensity.
     *
     * @defaultValue 1
     */
    fillIntensity?: number;
}

/**
 *  A remote tile provider fetches data from remote data-sources.
 */
export declare class RemoteTileProvider extends FeatureProvider {







    /**
     * @param options - options to configure the provider
     */
    constructor(options: RemoteTileProviderOptions);
    /**
     * Cancel ongoing request(s) of a tile.
     * The tile will be dropped.
     *
     * @param quadkey - the quadkey of the tile that should be canceled and removed.
     */
    cancel(quadkey: string): void;
    /**
     * Cancel ongoing request(s) of a tile.
     * The tile will be dropped.
     *
     * @param tile - the tile that should be canceled and removed.
     */
    cancel(tile: Tile): void;




    /**
     * Get a tile by quadkey.
     * If the tile is not cached already, it will be created and stored automatically.
     * Data will be fetched from remote data-sources and attached to tile automatically
     *
     * @param quadkey - quadkey of the tile
     * @param callback - will be called as soon as tile is ready for consumption
     * @returns the Tile
     */
    getTile(quadkey: string, cb: (tile: Tile) => void): any;

}

/**
 *  Configuration options of a RemoteTileProvider.
 */
export declare interface RemoteTileProviderOptions extends TileProviderOptions {
    /**
     * The zoomlevel at which tiles should be loaded from remote and a local index gets created.
     */
    level: number;
    /**
     * PreProcessor for remote data sources.
     * The PreProcessor will be executed just after Features are received from remote backend.
     * If the processor function is returning the processed data then its treated as a synchronous processor.
     * If the processor function does not return any value (undefined) or a Promise then its treated as asynchronous processor.
     * An asynchronous processor that's not using a Promise MUST call the input.ready(..) callback when data processing is finished.
     *
     * Due to the execution of the processor in a separate worker thread the processor function must be scope independent.
     * The processor must be a "standalone function/class" that only depends on its own scope and only accesses its own local variables.
     * No references to the outer scope of the processor function are allowed.
     *
     * @example
     * ```
     * // PreProcessor:
     *  ({data: any[], ready: (GeoJsonFeature[]) => void, tile?:{x:number,y:number,z:number}) => GeoJsonFeature[] | Promise<GeoJsonFeature[]>
     * ```
     */
    preProcessor?(input: {
        data: any[];
        ready: (features: GeoJSONFeature[]) => void;
        tile?: {
            x: number;
            y: number;
            z: number;
        };
    }): GeoJSONFeature[] | Promise<GeoJSONFeature[]>;
    /**
     * PostProcessor for remote data sources.
     * The PostProcessor will be executed just before created/modified or removed Features will be sent to the remote backend.
     * If the processor function is returning the processed data then its treated as a synchronous processor.
     * If the processor function does not return any value (undefined) or a Promise then its treated as asynchronous processor.
     * An asynchronous processor that's not using a Promise MUST call the input.ready(..) callback when data processing is finished.
     *
     * Due to the execution of the processor in a separate worker thread the processor function must be scope independent.
     * The processor must be a "standalone function/class" that only depends on its own scope and only accesses its own local variables.
     * No references to the outer scope of the processor function are allowed.
     *
     *  @example
     * ```
     * // PostProcessorData:
     *  {put: GeoJsonFeature[],remove: GeoJsonFeature[]}
     * // PostProcessor:
     *  ({data: PostProcessorData, ready: (data) => void}) => PostProcessorData | Promise<GeoJsonFeature[]>
     * ```
     */
    postProcessor?(input: {
        data: {
            put: GeoJSONFeature[];
            remove: GeoJSONFeature[];
        };
        ready: (data: any) => void;
    }): {
        put: GeoJSONFeature[];
        remove: GeoJSONFeature[];
    } | Promise<{
        put: GeoJSONFeature[];
        remove: GeoJSONFeature[];
    }>;
    /**
     * To prevent an overwhelming volume of tile requests, any requests for zoom levels lower than the provider's setting are disregarded.
     * Enabling "ignoreTileQueryLimit" will bypass the tile query limit but may risk browser crashes.
     *
     * @defaultValue false
     */
    ignoreTileQueryLimit?: boolean;
    loader?: any;
}

/**
 * RTIN (Right-Triangulated Irregular Network) mesh builder for terrain tiles.
 *
 * This class generates a triangulated mesh from a heightmap using the RTIN algorithm
 * (https://www.cs.ubc.ca/~will/papers/rtin.pdf), which adaptively subdivides triangles based on
 * a maximum error threshold to efficiently represent terrain with fewer triangles where possible.
 *
 * Features:
 * - Supports variable grid sizes (must be 2^n + 1).
 * - Computes per-vertex error metrics for adaptive mesh simplification.
 * - Optionally generates skirts (extra geometry along tile borders) to hide cracks between tiles.
 * - Can force maximum detail along tile edges using the `maxEdgeDetails` option to avoid visible seams.
 * - Outputs mesh data as flat vertex and index arrays, with optional mapping for skirt vertices.
 *
 * Usage:
 *   const rtin = new RTIN(257, 3);
 *   const mesh = rtin.triangulate(heightmap, { maxError: 5, enableSkirts: true, maxEdgeDetails: true });
 */
export declare class RTINMeshBuilder {












    /**
     * Maps skirt vertex indices to their corresponding main mesh vertex indices.
     * Used to identify and process skirt vertices (extra geometry along tile borders to hide cracks).
     * Key: skirt vertex index (number)
     * Value: main mesh vertex index (number)
     */
    private skirtToMainVertexMap;



    /**
     * Computes the maximum error for each vertex in the heightmap
     * by comparing actual height to interpolated height along long edges.
     */
    private calculateErrors;






}

/**
 * A SpaceProvider is a remote HTTPProvider designed to work with XYZ-Hub remote backend.
 * @see {@link https://xyz.api.here.com/hub/static/redoc/}
 */
export declare class SpaceProvider extends GeoJSONProvider {




    /**
     * Base URL of the SpaceProvider.
     * It points to a XYZ-Hub space endpoint.
     *
     * @defaultValue "https://xyz.api.here.com/hub/spaces"
     */
    readonly url: string;
    /**
     * @param options - options to configure the provider
     */
    constructor(options: SpaceProviderOptions);

    /**
     * Get or set configuration options for the provider.
     *
     * If a string is provided as the first argument, returns the value of the corresponding property.
     * If an object is provided, sets the provider's properties according to the object.
     *
     * @param options - The configuration key as a string to get a value, or an object to set multiple options.
     * @param value - Optional value to set if a string key is provided.
     */
    config(options: SpaceProviderOptions | HTTPProviderOptions | string, value?: any): TileProviderOptions;
    /**
     * Commit modified/removed features to the remote backend.
     *
     * @param data - the data that should be commit to the remote.
     * @param onSuccess - callback function that will be called when data has been commit successfully
     * @param onError - callback function that will be called when an error occurs
     */
    commit(data: {
        /**
         * features that should be created or updated
         */
        put?: GeoJSONFeature[];
        /**
         * features that should be removed
         */
        remove?: GeoJSONFeature[];
    }, onSuccess?: any, onError?: any): void;
    /**
     * Get URL for layer specific requests.
     *
     * @param space - Name of the XYZ-Hub Space.
     * @returns url string to receive a layer resource of the remote http backend
     */
    getLayerUrl(space: string): string;
    /**
     * Get URL for tile specific requests.
     *
     * @param space - Name of the XYZ-Hub Space.
     * @returns url string to receive a tile resource of the remote http backend
     */
    getTileUrl(space: string): string;
    /**
     * Get the URL for feature specific requests.
     *
     * @param space - Name of the XYZ-Hub Space.
     * @param ids - id(s) of the feature(s) the provider want's to request
     *
     * @returns url string to receive the feature resource of the remote http backend
     */
    getFeatureUrl(space: string, ids: (string | number) | (string | number)[]): string;





    /**
     * Set tags to filtering results based on tags in Hub backend.
     * After setting tags, provider will clear all features and data will be
     * requested from hub including the new tag filter.
     *
     * @param tags - the tag(s) that will be send to xyz-hub endpoint
     */
    setTags(tags: string | string[]): void;
    /**
     * Sets result filtering based on properties search in Hub backend.
     * {@link https://www.here.xyz/api/devguide/propertiessearch/}
     *
     * After setting the property search, the provider will clear all features and data will be
     * requested from hub using the property search filter.
     * The response will contain only the features matching all conditions in the query.
     * If function is called without arguments all filters will be cleared.
     *
     *
     * @param key - the name of property
     * @param operator - the operator used
     * @param value - value the value to be matched
     *
     * @example
     * ``` javascript
     * // response will only contain features that have a property called 'name' with 'FirstName' as it's value
     * provider.setPropertySearch('name','=','FirstName')
     * ```
     *
     */
    setPropertySearch(key: string, operator: '=' | '!=' | '>' | '>=' | '<' | '<=', value: string | number | boolean | string[] | number[] | boolean[]): void;
    /**
     *
     * Sets result filtering based on properties search in Hub backend.
     * {@link https://www.here.xyz/api/devguide/propertiessearch/}
     * After setting the property search, the provider will clear all features and data will be
     * requested from hub using the property search filter.
     * The response will contain only the features matching all conditions in the query.
     * If propertySearchMap is set to null or none is passed all previous set filters will be cleared.
     *
     * @param propertySearchMap - A Map of which the keys are the property names and its values are Objects
     * defining the operator ( '=', '!=', '\>', '\>=', '\<', '\<=' ) and the value to be matched.
     *
     * @example
     * ``` javascript
     * // set multiple conditions
     * // provider will only contain features that have a property called name with the value Max OR Peter
     * // AND a property called age with value less than 32
     * provider.setPropertySearch({
     *     'name': {
     *         operator: '=',
     *         value: ['Max','Petra']
     *     },
     *    'age': {
     *         operator: '<',
     *         value: 32
     *    }
     * })
     * ```
     *
     * @example
     * ``` javascript
     * // clear previous set filters
     * provider.setPropertySearch(null)
     * ```
     */
    setPropertySearch(propertySearchMap: {
        [name: string]: {
            operator: '=' | '!=' | '>' | '>=' | '<' | '<=';
            value: any | any[];
        };
    }): void;






}

/**
 *  Options to configure the XYZ SpaceProvider.
 */
export declare interface SpaceProviderOptions extends HTTPProviderOptions {

    /**
     * Name of the XYZ-Hub Space.
     * {@link https://xyz.api.here.com/hub/static/swagger/#/Read%20Spaces/getSpace}
     */
    space: string;
    /**
     * User credential of the provider, a valid credential needs to contain the "access_token".
     */
    credentials: {
        /**
         * the token to access the space of XYZ Hub endpoint.
         * You can get a token by following the instructions in this {@link https://www.here.xyz/api/getting-token/ | guide}.
         */
        access_token: string;
    };
    /**
     * Indicates the tag(s) that should be set in the requests.
     *
     * @defaultValue false
     */
    tags?: false | string | string[];
    /**
     * Indicates if result geometry of tile requests should be clipped.
     *
     * @defaultValue false
     */
    clip?: boolean;
    /**
     * Base URL of the SpaceProvider.
     * It should point to a XYZ-Hub space endpoint.
     *
     * @defaultValue "https://xyz.api.here.com/hub/spaces"
     */
    url?: string;
    /**
     * define property search query to enable remote filtering by property search.
     *
     * @see {@link https://www.here.xyz/api/devguide/propertiessearch/}
     *
     * @defaultValue null
     */
    propertySearch?: {
        [name: string]: {
            operator: '=' | '!=' | '>' | '>=' | '<' | '<=';
            value: any | any[];
        };
    };
}

/**
 * Interface for configuring the visual appearance of Rectangles.
 */
export declare interface SphereStyle {
    /**
     * Specifies the type of style to render.
     */
    type: 'Sphere';
    /**
     * Indicates the drawing order within a layer.
     * Styles with larger zIndex value are rendered above those with smaller values.
     * The zIndex is defined relative to the "zLayer" property.
     * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
     */
    zIndex: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Indicates drawing order across multiple layers.
     * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
     * If no zLayer is defined, it will fall back to the {@link LayerStyle.zLayer} or depend on the display layer order.
     * The first (lowest) layer has a zLayer value of 1.
     *
     * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
     */
    zLayer?: number | StyleValueFunction<number> | StyleExpression<number>;
    /**
     * Sets the color to fill the Sphere.
     * This attribute is valid for Circle, Rect, Text and Polygon.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    fill?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Defines the opacity of the style.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     * It is valid for all style types.
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * The Radius of the Sphere.
     * The default unit is pixels.
     * The radius of "Sphere" must be defined in pixels.
     *
     * @example
     * ```typescript
     * // define a Sphere with a radius of 32 pixel.
     * {
     *     zIndex: 0,
     *     type: "Sphere",
     *     fill: "red",
     *     radius: 32
     * }
     * ```
     */
    radius?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Offset the shape in pixels on x-axis.
     * A positive value offsets to the right, a negative value to the left.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Sphere by 1m to the left
     * { type: "Sphere", zIndex: 0, fill:'blue', radius: 24, offsetX: "-1m"}
     * ```
     */
    offsetX?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * Offset the shape in pixels on y-axis.
     * A positive value offsetY offsets downwards, a negative value upwards.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Sphere by 1m to the top
     * { type: "Sphere", zIndex: 0, fill:'blue', radius: 24, offsetY: "-1m"}
     * ```
     */
    offsetY?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Offset the shape in pixels on z-axis.
     * A positive value offsets up, a negative value down.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Sphere by 1m to the top
     * { type: "Sphere", zIndex: 0, fill:'blue', radius: 24, offsetZ: "1m"}
     * ```
     */
    offsetZ?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * Altitude of the Sphere center in meters.
     *
     * Describes the vertical distance from the global ground plane (0m) to the Sphere.
     *
     * Supported values:
     * - false (default): place at 0m.
     * - true: use the altitude (z) from the feature geometry if present, else 0. Not re-aligned to the rendered terrain.
     *         If the geometry altitude source differs from the TerrainTileLayer source/resolution, the Sphere can appear
     *         slightly above or below the visible terrain surface.
     * - number: fixed absolute altitude in meters. Also not adjusted when terrain tiles load; may not perfectly sit
     *           on the terrain unless both use exactly the same elevation source, datum and resolution.
     * - 'terrain': sample (clamp to) the current terrain surface height. While the terrain tile is not yet loaded
     *              (or no terrain layer exists) the altitude is 0 and updates once data becomes available.
     *
     * Notes:
     * - Use 'terrain' to keep the Sphere visually seated on the rendered terrain.
     * - Use a numeric value for a constant absolute elevation independent of terrain updates.
     * - To position something N meters above terrain: use 'terrain' plus offsetZ (e.g. offsetZ: '5m').
     * - Expect mismatches (floating / sinking) when using true or a fixed number with a different terrain data source.
     *
     * @defaultValue false
     * @experimental
     */
    altitude?: number | boolean | 'terrain' | StyleValueFunction<number | boolean | 'terrain'> | StyleZoomRange<number | boolean | 'terrain'> | StyleExpression<number | boolean | 'terrain'>;
    /**
     * Scales the size of a style based on the feature's altitude.
     * If it's enabled (true), features closer to the camera will be drawn larger than those farther away.
     * When off (false), the size of the style is always the same size, regardless of its actual altitude, as if it were placed on the ground (altitude 0).
     * This attribute applies to styles of type "Rect", "Image", "Text", "Circle", "Line", "Box", or "Sphere" whose size ({@link width}, {@link radius}, {@link strokeWidth}) that are using "map" {@link alignment} only.
     * If the size attribute is defined in meters, scaleByAltitude is enabled by default, for pixels it is disabled.
     *
     * @defaultValue false (pixels), true (meters)
     *
     * @experimental
     */
    scaleByAltitude?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;
    /**
     * Specifies the name of the light group to use for illuminating specific features on a layer.
     * This property must reference a key corresponding to a light group defined in {@link LayerStyle.lights}.
     * A light group consists of lighting sources such as ambient or directional lights that affect the appearance of features.
     *
     * If `light` is not defined, the default light group `"defaultLight"` will be used to illuminate the layer's features.
     *
     * @see {@link LayerStyle.lights} for defining and referencing available light groups.
     *
     * @defaultValue "defaultLight"
     */
    light?: string;
    /**
     * Sets the emissive color of the `"Sphere"`, giving it a glow effect.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    emissive?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the specular color of the `"Sphere"`, affecting how it reflects light.
     *
     * ### Relationship with Shininess
     * - **Effect:** The `specular` property determines the color of the light reflection, while the {@link shininess} value controls the intensity and size of the reflection.
     * - **Shininess Dependency:** If `specular` is set and `shininess` is not explicitly set, the default {@link shininess} value will be used to control the reflection's appearance.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    specular?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the shininess of the `"Sphere"`, determining how glossy its surface appears.
     * A higher value makes the `"Sphere"` surface more reflective.
     *
     * ### Relationship with Specular
     * - **Effect:** The `shininess` value controls the size and intensity of the specular highlight, which is colored by the {@link specular} property.
     * - **Specular Dependency:** The `shininess` property enhances the effect of the `specular` color. If `specular` is not set, `shininess` has no visible effect.
     *
     * ### Shininess Value Range and Effect
     * - **Range:** The `shininess` value typically ranges from 0 to 128.
     * - **Low Values (0-10):** Produce a wide, diffused highlight, resulting in a matte or dull appearance.
     * - **High Values (50-128):** Produce a small, intense highlight, resulting in a glossy or shiny appearance.
     *
     * @defaultValue 32
     */
    shininess?: number;
    /**
     * Controls the intensity of the fill color under directional lighting.
     *
     * `fillIntensity` determines how much the `"Sphere"`'s fill color is affected by the directional lighting in the scene.
     * A higher value increases the intensity of the fill color, making it more vibrant under strong lighting,
     * while a lower value reduces the effect, resulting in a more muted color.
     *
     * The value should range from 0 to 1, where 0 means no color intensity and 1 represents full intensity.
     *
     * @defaultValue 1
     */
    fillIntensity?: number;
}

/**
 * The Style object defines how certain features should be rendered.
 * A style object must always contain the attributes "zIndex" and "type" as well as the mandatory attributes of the corresponding "type":
 * - Circle: "radius" must be included and either "fill" or "stroke" should be included.
 * - Rect: "width" must be included and "height" will be set with the same value as "width" if only "width" is present. Either "fill" or "stroke" should be included
 * - Text: "text" or "textRef" should be included and "fill" or "stroke" should also be included for text color
 * - Image: "src" and "width" must be included. "height" will be set with the same value as "width" if only "width" is present.
 * - Line: "stroke" must be included.
 * - Polygon: "fill" or "stroke" must be included.
 * - Box: "width" must be included, while "height" and "depth" will be set with the same value as "width" if only "width" is present. Either "fill" or "stroke" should be included
 * - Sphere: A style of type Sphere must include "radius" and "fill".
 * - VerticalLine: "stroke" must be included.
 *
 * @example
 * ```typescript
 * // example of Circle:
 * {zIndex: 0, type: "Circle", radius: 16, fill: "#FFFF00"}
 *
 * // example of Rect:
 * {zIndex: 0, type: "Rect", fill: "#4C9EEF", stroke: "#0156BB", width: 20, height: 20}
 *
 * // example of Text:
 * {zIndex:1, type: "Text", fill: "#FFFFFF", text: "HERE", font: "normal 12px Arial"}
 *
 * // example of Image:
 * {zIndex: 0, type: "Image", src: "./xyz.png", width: 20, height: 20}
 *
 * // example of Line:
 * {zIndex: 0, type: "Line", opacity: 0.5, stroke: "#BE6B65", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 16}
 *
 * // example of Polygon:
 * {zIndex: 0, type: "Polygon", opacity: 0.5, stroke: "#BE6B65", fill: "#FFFFFF"}
 *
 * // example of Box:
 * {zIndex: 0, type: "Box", width: 16, height: 16, depth: 16, stroke: "#BE6B65", fill: "#FFFFFF"}
 *
 * // example of Sphere:
 * {zIndex: 0, type: "Sphere", radius: 16, fill: "#FFFFFF"}
 * ```
 */
export declare interface Style {
    /**
     * Indicates type of the shape to render.
     * Its value must be one of the following: "Circle", "Rect", "Text", "Image", "Line", "Polygon", "VerticalLine", "Box" or "Sphere",
     */
    type: 'Circle' | 'Rect' | 'Image' | 'Text' | 'Line' | 'Polygon' | 'VerticalLine' | 'Box' | 'Sphere' | string;
    /**
     * Indicates the drawing order within a layer.
     * Styles with larger zIndex value are rendered above those with smaller values.
     * The zIndex is defined relative to the "zLayer" property.
     * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
     */
    zIndex: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Indicates drawing order across multiple layers.
     * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
     * If no zLayer is defined, it will fall back to the {@link LayerStyle.zLayer} or depend on the display layer order.
     * If no zLayer is defined, it will fall back to the {@link LayerStyle.zLayer} or depend on the display layer order.
     * The first (lowest) layer has a zLayer value of 1.
     *
     * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
     */
    zLayer?: number | StyleValueFunction<number> | StyleExpression<number>;
    /**
     * Specifies the URL of an image.
     * It can be either absolute or relative path.
     * It is only required by "Image".
     */
    src?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Sets the color to fill the shape.
     * This attribute is valid for Circle, Rect, Text and Polygon.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    fill?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | LinearGradient | StyleExpression<Color>;
    /**
     * Sets the stroke color of the shape.
     * This attribute is valid for Circle, Rect, Line, Text and Polygon.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    stroke?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the width of the stroke.
     * This attribute is valid for Circle, Rect, Line, Text and Polygon.
     * The unit of strokeWidth is defined in pixels.
     * For Polygons that are using {@link extrude}, the maximum possible strokeWidth is 1.0 pixel.
     * For Styles of type Line the strokeWidth can also be defined in meters by using a string: "$\{width\}m".
     *
     * @example
     * ```typescript
     * // define a Line that has a with of 1 meter
     * {
     *     zIndex: 0,
     *     type: "Line",
     *     stroke: "blue",
     *     strokeWidth: "1m"
     * }
     * // define a Line that has a with of 16 pixel
     * {
     *     zIndex: 0,
     *     type: "Line",
     *     stroke: "green",
     *     strokeWidth: "16
     * }
     * ```
     * @example
     * ```typescript
     * // define a Text style with a strokeWidth of 8px
     * {
     *     zIndex: 0,
     *     type: "Text",
     *     text: "doc",
     *     fill: "white",
     *     stroke: "black,
     *     strokeWidth: 8
     * }
     * ```
     */
    strokeWidth?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * This controls the shape of the ends of lines. there are three possible values for strokeLinecap:
     * - "butt" closes the line off with a straight edge that's normal (at 90 degrees) to the direction of the stroke and crosses its end.
     * - "square" has essentially the same appearance, but stretches the stroke slightly beyond the actual path. The distance that the stroke goes beyond the path is half the strokeWidth.
     * - "round" produces a rounded effect on the end of the stroke. The radius of this curve is also controlled by the strokeWidth.
     * This attribute is valid for Line styles only.
     *
     * If "strokeLinecap" is used in combination with "altitude", only "butt" is supported for "strokeLinecap".
     */
    strokeLinecap?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * The joint where the two segments in a line meet is controlled by the strokeLinejoin attribute, There are three possible values for this attribute:
     * - "miter" extends the line slightly beyond its normal width to create a square corner where only one angle is used.
     * - "round" creates a rounded line segment.
     * - "bevel" creates a new angle to aid in the transition between the two segments.
     * This attribute is valid for Line styles only.
     *
     * If "strokeLinejoin" is used in combination with "altitude", the use of "round" is not supported.
     */
    strokeLinejoin?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * The strokeDasharray attribute controls the pattern of dashes and gaps used to stroke paths.
     * It's an array of <length> that specify the lengths of alternating dashes and gaps. If an odd number of values is provided,
     * then the list of values is repeated to yield an even number of values. Thus, 5,3,2 is equivalent to 5,3,2,5,3,2.
     * The size of dashes and gaps can be defined in pixel or meter.
     * The default unit for dash and gap size is pixel.
     * In a pattern utilizing both meter and pixel units, only the initial "dash" and "gap" combination is utilized, with the subsequent ones being skipped.
     * To define the size in meters, a string containing the "dash"/"gap" size and ending with "m" must be used.
     * This attribute is valid for Line and Polygon styles only.
     *
     * @example
     * // dash and gap size is defined in pixel.
     * strokeDasharray: [20,10]
     * // dash and gap size is defined in meter.
     * strokeDasharray: ["20m","10m"]
     * // dash -> 10 meter, gap -> 10 pixel.
     * strokeDasharray: ["20m",10] || ["20m","10px"]
     */
    strokeDasharray?: (number | string)[] | StyleValueFunction<(number | string)[]> | StyleZoomRange<(number | string)[]> | StyleExpression<(number | string)[]> | 'none';
    /**
     * Defines the opacity of the style.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     * It is valid for all style types.
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * The Radius of the Circle and Sphere.
     * It is required by styles of type "Circle" and "Sphere".
     * The default unit is pixels.
     * To define the radius of a Circle in meters a string can be used: "$\{width\}m".
     * The radius of "Sphere" must be defined in pixels.
     *
     * @example
     * ```typescript
     * // define a Sphere with a radius of 32 pixel.
     * {
     *     zIndex: 0,
     *     type: "Sphere",
     *     fill: "red",
     *     radius: 32
     * }
     * ```
     * @example
     * ```typescript
     * // define a Circle with a radius of 1 meter
     * {
     *     zIndex: 0,
     *     type: "Circle",
     *     fill: "red",
     *     radius: "1m"
     * }
     * // define a Circle with a radius of 16 pixel
     * {
     *     zIndex: 0,
     *     type: "Circle",
     *     fill: "red",
     *     radius: 16
     * }
     * ```
     */
    radius?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * Width of the style in pixels.
     * It is only required by Rect, Image and Box.
     * The maximum supported width for "Image" is 64 pixels.
     * The unit of width is defined in pixels.
     * For styles of type "Rect" the width can also be defined in meters by using a string: "$\{width\}m".
     * @example
     * ```typescript
     * // define a Rect that has a width (and height) of 2.2 meter
     * {
     *     zIndex: 0,
     *     type: "Line",
     *     stroke: "blue",
     *     width: "2.2m"
     * }
     * ```
     * @example
     * ```typescript
     * // define a Rect that has a width (and height) of 16 pixel
     * {
     *     zIndex: 0,
     *     type: "Line",
     *     stroke: "green",
     *     width: 16
     * }
     * ```
     */
    width?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Height of the style in pixels.
     * It is only required by Rect and Image.
     * The maximum supported height for "Image" is 64 pixels.
     * The unit of height is defined in pixels.
     * For styles of type "Rect" the height can also be defined in meters by using a string: "$\{width\}m".
     * @example
     * ```typescript
     * // define a Rect that has a width of 2 meter and a height of 1 meter.
     * {
     *     zIndex: 0,
     *     type: "Line",
     *     stroke: "blue",
     *     width: "2m",
     *     height: "1m"
     * }
     * ```
     * @example
     * ```typescript
     * // define a Rect that has a width of 20 pixel and a height of 28 pixel.
     * {
     *     zIndex: 0,
     *     type: "Line",
     *     stroke: "green",
     *     width: 20,
     *     height: 28
     * }
     * ```
     * @example
     * ```typescript
     * // define a Image/Icon style with/height of 32pixel
     * {
     *     zIndex: 0,
     *     type: "Image",
     *     src: "urlToMyImageResource",
     *     width: 32
     * }
     * ```
     */
    height?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * The depth of the style in pixels.
     * The depth defines the length of the edges of a "Box" parallel to the Z axis.
     * The unit of depth is defined in pixels and only required by styles of type "Box".
     * @example
     * ```typescript
     * // define a Box that has a width, height and depth of 16px
     * {
     *     zIndex: 0,
     *     type: "Box",
     *     stroke: "blue",
     *     fill: "red",
     *     width: 16,
     *     height: 16,
     *     depth: 16
     * }
     * ```
     */
    depth?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * CSS font string for texts.
     * It is only valid for Text.
     *
     * @defaultValue “normal 12px Arial”
     */
    font?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Text is either a string or a function that generates the string that should be displayed.
     * It is valid for Text style only.
     *
     * @example
     * ```typescript
     * // display the name property of a feature in uppercase
     * ...
     * text: function(feature){
     *   return feature.properties.name.toUpperCase();
     * }
     * ```
     */
    text?: string | number | boolean | StyleValueFunction<string | number | boolean> | StyleZoomRange<string | number | boolean> | StyleExpression<string | number | boolean>;
    /**
     * "textRef" Reference to an attribute of an feature that's value should be displayed as text.
     * If both "text" and "textRef" are set, "text" prevails.
     * It is only required by Text.
     * @example
     * ```typescript
     * // display the property "name" of the feature's properties
     * ...
     * textRef: "properties.name"
     * ```
     * @example
     * ```typescript
     * // display the id of the featurre
     * ...
     * textRef: "id"
     * ```
     */
    textRef?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Define the starting position of a segment of the entire line in %.
     * A Segment allows to display and style parts of the entire line individually.
     * The value must be between 0 and 1.
     * The Default is 0.
     *
     * @example
     * from: 0.0 // -\> 0%, the segment has the same starting point as the entire line
     * from:  0.5 // -\> 50%, the segment starts in the middle of the entire line
     */
    from?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Define the end position of a segment of the entire line in %.
     * A Segment allows to display and style parts of the entire line individually.
     * The value must be between 0 and 1.
     * The Default is 1.
     *
     * @example
     * to: 0.5 // -\> 50%, the segment ends in the middle of the entire line
     * to: 1.0 // -\> 100%, the segment has the same end point as the entire line
     */
    to?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Offset the shape in pixels on x-axis.
     * It is valid for Circle, Rect, Text, Image, Box and Sphere.
     * A positive value offsets to the right, a negative value to the left.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Image by 8px to the right.
     * { type: "Image", zIndex: 0, src: '...', offsetX: 8}
     *
     * // offset Circle by 1m to the left
     * { type: "Circle", zIndex: 0, fill:'blue', radius: 4, offsetX: "-1m"}
     * ```
     */
    offsetX?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * Offset the shape in pixels on y-axis.
     * It is valid for Circle, Rect, Text, Image, Box and Sphere.
     * A positive value offsetY offsets downwards, a negative value upwards.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Image by 8px to the bottom
     * { type: "Image", zIndex: 0, src: '...', offsetY: 8}
     *
     * // offset Circle by 1m to the top
     * { type: "Circle", zIndex: 0, fill:'blue', radius: 4, offsetY: "-1m"}
     * ```
     */
    offsetY?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<string>;
    /**
     * Offset the shape in pixels on z-axis.
     * It is valid for Circle, Rect, Text, Image, Box and Sphere.
     * A positive value offsets up, a negative value down.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Image by 8px to the top.
     * { type: "Image", zIndex: 0, src: '...', offsetZ: 8}
     *
     * // offset Circle by 1m to the top
     * { type: "Circle", zIndex: 0, fill:'blue', radius: 4, offsetZ: "1m"}
     * ```
     */
    offsetZ?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * Offset a line to the left or right side in pixel or meter.
     * A positive values offsets to the right side, a negative value offsets to the left.
     * The side is defined relative to the direction of the line geometry.
     * The default unit is pixels.
     * To define the offset in meters a string that contains the offset value and ends with "m" must be used.
     * Applies to Line style only.
     * @example
     * ```typescript
     * // offset line by 8px
     * { type: "Line", zIndex: 0, stroke:'blue', strokeWidth: 4, offset: 8}
     *
     * // offset line by 2m
     * { type: "Line", zIndex: 0, stroke:'blue', strokeWidth: 4, offset: "2m"}
     * ```
     */
    offset?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * Alignment for styles of type "Circle", "Rect", "Image" and "Text".
     * Possible values are: "map" and "viewport".
     * "map" aligns to the plane of the map and "viewport" aligns to the plane of the viewport/screen.
     * Default alignment for Text based on point geometries is "viewport" while "map" is the default for line geometries.
     */
    alignment?: 'map' | 'viewport' | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Rotate the shape of the style to the angle in degrees.
     * This attribute is validate for Rect and Image.
     */
    rotation?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * In case of label collision, Text with a higher priority (lower value) will be drawn before lower priorities (higher value).
     * If the collision detection is enabled for multiple Styles within the same StyleGroup, the highest priority (lowest value)
     * is used.
     */
    priority?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Minimum distance in pixels between repeated style-groups on line geometries.
     * Applies per tile only.
     *
     * @defaultValue 256 (pixels)
     */
    repeat?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Enable oder Disable line wrapping for styles of type "Text".
     * The line wrapping for text on (Multi)Linestring geometry with anchor set to "Line" is disabled by default,
     * otherwise it's 14 characters.
     *
     * - number: Maximum number of characters per line [Default 14 characters]
     * - false: disable line wrapping
     * - true: enable line wrapping [Default 14 characters]
     *
     * @defaultValue 14
     */
    lineWrap?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Sets the anchor point for styles of type "Circle", "Rect", "Image" and "Text" used with Line or Polygon geometry.
     *
     * Possible values for Line geometry are "Coordinate" and "Line".
     * - "Coordinate": the respective style is displayed at each coordinate of the polyline.
     * - "Line": the respective style is displayed on the shape of the polyline when there is enough space. See {@link checkLineSpace} to disable the space check.
     *
     * Possible values for Polygon geometry are "Center" and "Centroid".
     * - "Center": the center of the bounding box of the polygon.
     * - "Centroid": the geometric centroid of the polygon geometry.
     *
     * @defaultValue For Polygon geometry the default is "Center". For Line geometry the default for styles of type "Text" is "Line", while "Coordinate" is the default for styles of type "Circle", "Rect" or "Image".
     */
    anchor?: 'Line' | 'Coordinate' | 'Centroid' | 'Center' | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Enable or disable the space check for point styles on line geometries.
     * Only applies to "Circle", "Rect", "Image" and "Text" styles with {@link anchor} set to "Line".
     * If check checkLineSpace is enabled the respective style is only displayed if there is enough space on the line,
     * otherwise it is not displayed.
     *
     * @defaultValue true
     */
    checkLineSpace?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;
    /**
     * Enable or disable collision detection.
     * Works for styles of type "Circle", "Rect", "Image" and "Text".
     * If the collision detection is enabled for multiple Styles within the same StyleGroup, the respective Styles are
     * handled as a single Object ("CollisionGroup") where the combined bounding-box is determined automatically.
     *
     * - true: collision are allowed, Collision detection is disabled.
     * - false: avoid collisions, Collision detection is enabled.
     *
     * @defaultValue false for "Text", true for all other.
     */
    collide?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;
    /**
     * Enables collision detection and combines all styles of a StyleGroup with the same "CollisionGroup" into a single logical object for collision detection.
     */
    collisionGroup?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Extrude a Polygon or MultiPolygon geometry in meters.
     * This attribute is validate for styles of type "Polygon" only.
     */
    extrude?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * The base of the Extrude in meters.
     * The extrudeBase is defined from the ground to the bottom of the extruded Polygon in meters.
     * The extrudeBase must be less or equal then {@link extrude}.
     * This attribute applies only to styles of type "Polygon".
     *
     * @defaultValue 0
     */
    extrudeBase?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Altitude of the Feature center in meters.
     *
     * Describes the vertical distance from the global ground plane (0m) to the Feature.
     *
     * Supported values:
     * - false (default): place at 0m.
     * - true: use the altitude (z) from the feature geometry if present, else 0. Not re-aligned to the rendered terrain.
     *         If the geometry altitude source differs from the TerrainTileLayer source/resolution, the Feature can appear
     *         slightly above or below the visible terrain surface.
     * - number: fixed absolute altitude in meters. Also not adjusted when terrain tiles load; may not perfectly sit
     *           on the terrain unless both use exactly the same elevation source, datum and resolution.
     * - 'terrain': sample (clamp to) the current terrain surface height. While the terrain tile is not yet loaded
     *              (or no terrain layer exists) the altitude is 0 and updates once data becomes available.
     *
     * Notes:
     * - 'terrain' is supported for point styles only: "Circle", "Rect", "Image", "Text", "Box", "Sphere".
     * - Use 'terrain' to keep the Feature visually seated on the rendered terrain.
     * - Use a numeric value for a constant absolute elevation independent of terrain updates.
     * - To position something N meters above terrain: use 'terrain' plus offsetZ (e.g. offsetZ: '5m').
     * - Expect mismatches (floating / sinking) when using true or a fixed number with a different terrain data source.
     *
     *
     * @defaultValue false
     * @experimental
     */
    altitude?: number | boolean | 'terrain' | StyleValueFunction<number | boolean | 'terrain'> | StyleZoomRange<number | boolean | 'terrain'> | StyleExpression<number | boolean | 'terrain'>;
    /**
     * Scales the size of a style based on the feature's altitude.
     * If it's enabled (true), features closer to the camera will be drawn larger than those farther away.
     * When off (false), the size of the style is always the same size, regardless of its actual altitude, as if it were placed on the ground (altitude 0).
     * This attribute applies to styles of type "Rect", "Image", "Text", "Circle", "Line", "Box", or "Sphere" whose size ({@link width}, {@link radius}, {@link strokeWidth}) that are using "map" {@link alignment} only.
     * If the size attribute is defined in meters, scaleByAltitude is enabled by default, for pixels it is disabled.
     *
     * @defaultValue false (pixels), true (meters)
     *
     * @experimental
     */
    scaleByAltitude?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;
    /**
     * Sets the condition(s) to determine whether a feature should be rendered with the respective style.
     * The `filter` expression is evaluated to determine if the respective style should be applied to a feature.
     * It must resolve to a boolean value where `true` means the style applies and `false` means it does not.
     *
     * This property is only used when {@link LayerStyle.assign} is not defined; otherwise, `filter` is ignored.
     *
     * @example
     * // Render features where the "type" property is equal to "park"
     * filter: ['==', ['get', 'type'], 'park']
     *
     * @example
     * // Render features where the "population" property is greater than 1000
     * filter: ['>', ['get', 'population'], 1000]
     *
     * @example
     * // Render features where the "type" property is "park" and "population" is less than 500
     * filter: ['all', ['==', ['get', 'type'], 'park'], ['<', ['get', 'population'], 500]]
     *
     * @example
     * // Render features where the "type" property is not "residential"
     * filter: ['!=', ['get', 'type'], 'residential']
     *
     * @example
     * // Render features where the "type" property is either "park" or "garden"
     * filter: ['any', ['==', ['get', 'type'], 'park'], ['==', ['get', 'type'], 'garden']]
     */
    filter?: StyleValueFunction<boolean> | StyleExpression<boolean>;
    /**
     * Specifies the name of the light group to use for illuminating specific features on a layer.
     * This property must reference a key corresponding to a light group defined in {@link LayerStyle.lights}.
     * A light group consists of lighting sources such as ambient or directional lights that affect the appearance of features.
     *
     * If `light` is not defined, the default light group `"defaultLight"` will be used to illuminate the layer's features.
     *
     * @see {@link LayerStyle.lights} for defining and referencing available light groups.
     *
     * @defaultValue "defaultLight"
     */
    light?: string;
    /**
     * Sets the emissive color of the feature, giving it a glow effect.
     *
     * This property is only applicable for Styles of type `"Polygon"`, `"Box"`, `"Sphere"` or `"Model"`;
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    emissive?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the specular color of the feature, affecting how it reflects light.
     *
     * This property is only applicable for Styles of type `"Polygon"`, `"Box"`, `"Sphere"` or `"Model"`;
     *
     * ### Relationship with Shininess
     * - **Effect:** The `specular` property determines the color of the light reflection, while the {@link shininess} value controls the intensity and size of the reflection.
     * - **Shininess Dependency:** If `specular` is set and `shininess` is not explicitly set, the default {@link shininess} value will be used to control the reflection's appearance.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    specular?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the shininess of the feature, determining how glossy its surface appears.
     * A higher value makes the polygon surface more reflective.
     *
     * This property is only applicable for Styles of type `"Polygon"`, `"Box"`, `"Sphere"` or `"Model"`;
     *
     * ### Relationship with Specular
     * - **Effect:** The `shininess` value controls the size and intensity of the specular highlight, which is colored by the {@link specular} property.
     * - **Specular Dependency:** The `shininess` property enhances the effect of the `specular` color. If `specular` is not set, `shininess` has no visible effect.
     *
     * ### Shininess Value Range and Effect
     * - **Range:** The `shininess` value typically ranges from 0 to 128.
     * - **Low Values (0-10):** Produce a wide, diffused highlight, resulting in a matte or dull appearance.
     * - **High Values (50-128):** Produce a small, intense highlight, resulting in a glossy or shiny appearance.
     *
     * @defaultValue 32
     */
    shininess?: number;
    /**
     * Controls the intensity of the fill color under directional lighting.
     *
     * `fillIntensity` determines how much the feature's fill color is affected by the directional lighting in the scene.
     * A higher value increases the intensity of the fill color, making it more vibrant under strong lighting,
     * while a lower value reduces the effect, resulting in a more muted color.
     *
     * This property is only applicable for Styles of type `"Polygon"`, `"Box"` or `"Sphere"`;
     *
     * The value should range from 0 to 1, where 0 means no color intensity and 1 represents full intensity.
     *
     * @defaultValue 1
     */
    fillIntensity?: number;
}

/**
 * A StyleExpression is a JSON array representing an expression that returns the desired value
 * for a specific style property. It is particularly useful for data-driven styling in map or UI components.
 *
 * The structure of a StyleExpression is as follows:
 * - The first element (index 0) is a string that specifies the operator of the expression.
 * - The subsequent elements are the operands required by the operator.
 *
 * @template ResultType - The type of the value that the expression returns.
 *
 * ## StyleExpression Operators
 *
 * A StyleExpression is a JSON array representing an expression that returns the desired value for a specific style property. Below are the possible operators and their descriptions, along with examples.
 *
 * ### Reference
 * - **`ref`**: References another expression by name.
 *   - Example: `["ref", "otherExpression"]`
 *
 * ### Data Retrieval
 * - **`get`**: Retrieves a property from the input data. The third optional operand specifies the input data from which to retrieve the property. If not provided, it defaults to `feature.properties`.
 *
 *   The property name can also be a global map context variable:
 *   - `$zoom`: The current zoom level.
 *   - `$layer`: The name of the datasource layer.
 *   - `$geometryType`: The type of the current feature geometry ("line", "point", "polygon").
 *   - `$id`: The ID of the current feature.
 *
 *   - Example: `["get", "propertyName"]` // Retrieves `propertyName` from `feature.properties`.
 *   - Example with input data: `["get", "propertyName", { custom: "data" }]` // Retrieves `propertyName` from the specified input data.
 *   - Example with global map context variable: `["get", "$zoom"]` // Retrieves the current zoom level.
 *
 * ### Arithmetic
 * - **`+`**: Adds two numbers.
 *   - Example: `["+", 2, 3]` // Outputs: 5
 * - **`-`**: Subtracts the second number from the first.
 *   - Example: `["-", 5, 3]` // Outputs: 2
 * - **`*`**: Multiplies two numbers.
 *   - Example: `["*", 2, 3]` // Outputs: 6
 * - **`/`**: Divides the first number by the second.
 *   - Example: `["/", 6, 3]` // Outputs: 2
 * - **`%`**: Computes the remainder of dividing the first number by the second.
 *   - Example: `["%", 5, 2]` // Outputs: 1
 * - **`floor`**: Rounds down a number to the nearest integer.
 *   - Example: `["floor", 4.7]` // Outputs: 4
 * - **`min`**: Returns the smallest number.
 *   - Example: `["min", 1, 2, 3]` // Outputs: 1
 * - **`max`**: Returns the largest number.
 *   - Example: `["max", 1, 2, 3]` // Outputs: 3
 *
 * ### Logical
 * - **`all`**: Returns true if all conditions are true.
 *   - Example: `["all", true, true]` // Outputs: true
 * - **`any`**: Returns true if any condition is true.
 *   - Example: `["any", true, false]` // Outputs: true
 * - **`!`**: Negates a boolean value.
 *   - Example: `["!", true]` // Outputs: false
 * - **`!has`**: Checks if a property does not exist.
 *   - Example: `["!has", "propertyName"]`
 * - **`has`**: Checks if a property exists.
 *   - Example: `["has", "propertyName"]`
 * - **`none`**: Returns true if no conditions are true.
 *   - Example: `["none", false, false]` // Outputs: true
 *
 * ### Comparison
 * - **`==`**: Checks if two values are equal.
 *   - Example: `["==", 2, 2]` // Outputs: true
 * - **`!=`**: Checks if two values are not equal.
 *   - Example: `["!=", 2, 3]` // Outputs: true
 * - **`>`**: Checks if the first value is greater than the second.
 *   - Example: `[" >", 3, 2]` // Outputs: true
 * - **`>=`**: Checks if the first value is greater than or equal to the second.
 *   - Example: `[" >=", 3, 3]` // Outputs: true
 * - **`<=`**: Checks if the first value is less than or equal to the second.
 *   - Example: `["<=", 2, 2]` // Outputs: true
 * - **`<`**: Checks if the first value is less than the second.
 *   - Example: `["<", 2, 3]` // Outputs: true
 * - **`^=`**: Checks if a string starts with a given substring.
 *   - Example: `["^=", "hello", "he"]` // Outputs: true
 * - **`$=`**: Checks if a string ends with a given substring.
 *   - Example: `["$=", "hello", "lo"]` // Outputs: true
 *
 * ### String Manipulation
 * - **`split`**: Splits a string by a delimiter.
 *   - Example: `["split", "a,b,c", ","]` // Outputs: ["a", "b", "c"]
 * - **`to-string`**: Converts a value to a string.
 *   - Example: `["to-string", 123]` // Outputs: "123"
 * - **`concat`**: Concatenates multiple strings.
 *   - Example: `["concat", "hello", " ", "world"]` // Outputs: "hello world"
 * - **`regex-replace`**: Replaces parts of a string matching a regex.
 *   - Example: `["regex-replace", "hello world", "world", "there"]` // Outputs: "hello there"
 * - **`slice`**: Extracts a section of a string.
 *   - Example: `["slice", "hello", 0, 2]` // Outputs: "he"
 * - **`at`**: Gets the character at a specified index in a string.
 *   - Example: `["at", "hello", 1]` // Outputs: "e"
 * - **`length`**: Gets the length of a string.
 *   - Example: `["length", "hello"]` // Outputs: 5
 *
 * ### Conditional
 * - **`case`**: Evaluates conditions in order and returns the corresponding result for the first true condition.
 *   - Example: `["case", ["==", 1, 1], "one", ["==", 2, 2], "two", "default"]` // Outputs: "one"
 * - **`step`**: Returns a value from a step function based on input.
 *   - Example: `["step", 3, "small", 5, "medium", 10, "large"]` // Outputs: "small"
 * - **`match`**: Returns a value based on matching input values.
 *   - Example: `["match", "a", "a", 1, "b", 2, 0]` // Outputs: 1
 *
 * ### Utility
 * - **`literal`**: Returns a literal value.
 *   - Example: `["literal", [1, 2, 3]]` // Outputs: [1, 2, 3]
 * - **`lookup`**: Finds an entry in a table that matches the given key values. The entry with the most matching keys is returned.
 *   If multiple entries match equally, one of them is returned.
 *   If no match is found, the default entry (if any) is returned. If no default entry is defined, null is returned.
 *     - The `lookupTable` should be an array of objects, each with a `keys` member and an `attributes` member:
 *       - `keys`: An object containing key-value pairs used for matching.
 *       - `attributes`: An object containing the attributes to be returned when a match is found.
 *   - Example:
 *     ```javascript
 *     {
 *     "definitions": {
 *       "lookupTable": [ "literal", [
 *         { "keys": { "country": "US" }, "attributes": { "population": 331000000 } },
 *         { "keys": { "country": "US", "state": "CA" }, "attributes": { "population": 39500000 } },
 *         { "keys": {}, "attributes": { "population": 7800000000 } } // Default entry
 *       ]]
 *     }
 *     }
 *     // This example looks up the population for the state of California in the United States from the `lookupTable`.
 *     ["lookup", { "country": "US", "state": "CA" }, ["ref", "lookupTable"]] // Outputts: `{ "population": 39500000 }`.
 *     ```
 *
 * ### Type Conversion
 * - **`number`**: Converts a value to a number.
 *   - Example: `["number", "123"]` // Outputs: 123
 * - **`boolean`**: Converts a value to a boolean.
 *   - Example: `["boolean", "true"]` // Outputs: true
 * - **`to-number`**: Converts a value to a number.
 *   - Example: `["to-number", "123"]` // Outputs: 123
 * - **`to-boolean`**: Converts a value to a boolean.
 *   - Example: `["to-boolean", "true"]` // Outputs: true
 *
 * ### Zoom and Interpolation
 * - **`zoom`**: Returns the current zoom level.
 *   - Example: `["zoom"]` // Outputs: current zoom level
 * - **`interpolate`**: Interpolates between values based on zoom level.
 *   - Example: `["interpolate", ["linear"], ["zoom"], 10, 1, 15, 10]`
 *
 * Example:
 * ```typescript
 * const expression: StyleExpression = ["==", ["get", "property"], "value"];
 * ```
 * In this example, `"=="` is the operator, and `["get", "property"]` and `"value"` are the operands.
 *
 * Operators can include logical, arithmetic, string manipulation, and other types of operations, which are evaluated
 * to determine the final value of the style property.
 */
export declare type StyleExpression<ResultType = any> = [string, ...any[]];

/**
 * A StyleValueFunction is a function that returns the desired value for the respective style property.
 * It's especially useful for data driven styling.
 *
 * @param feature - the feature for which the style is to be obtained
 * @param zoom - the zoomlevel of the style
 *
 * @example
 * ```typescript
 * text: (feature, zoom) => feature.properties.name
 * ```
 */
export declare type StyleValueFunction<Type> = (feature: Feature, zoom: number) => Type | undefined;

/**
 * A StyleZoomRange is a Map\<number,any\> with zoomlevel as its keys and the value for the respective {@link Style | Style Property} at the respective zoomlevel.
 * Values for intermediate zoom levels are interpolated linearly.
 *
 * @example
 * ```typescript
 * strokeWidth: {
 *     // 2px for zoomlevel 1 to 12
 *     13: 2,  // 2px at zoomlevel 13
 *     // 10px for zoomlevel 14 (linear interpolation)
 *     15: 18, // 18px at zoomlevel 15
 *     // 27px for zoomlevel 16 (linear interpolation)
 *     17: 36  // 36px at zoomlevel 20
 *     // 36px for zoomlevels 18 to 20
 * }
 * ```
 */
export declare type StyleZoomRange<Type> = {
    [zoom: number | string]: Type;
};

/**
 * Represents a decoded terrain mesh used for rendering elevation data.
 *
 * This structure contains the raw vertex and index buffers necessary
 * to construct a 3D surface mesh, as well as optional per-vertex normals.
 */
declare interface TerrainMesh {
    /**
     * Flat array of vertex positions in 3D space.
     * The array is structured as [x0, y0, z0, x1, y1, z1, ..., xn, yn, zn].
     *
     * Coordinate units:
     * - x/y are in tile-local pixel space (typically 0 to tileSize, e.g., 0–256)
     * - z is in meters above sea level (or relative to a defined datum)
     */
    vertices: Float32Array;
    /**
     * Triangle indices defining the mesh connectivity.
     * Each group of three indices forms a triangle, referencing the `vertices` array.
     *
     * Use Uint16Array if the number of vertices is ≤ 65535, otherwise Uint32Array.
     */
    indices: Uint16Array | Uint32Array;
    /**
     * Optional flat array of per-vertex normals for lighting and shading.
     * The array is structured as [nx0, ny0, nz0, nx1, ny1, nz1, ..., nxn, nyn, nzn].
     *
     * If not provided, normals can be computed from geometry or defaulted.
     */
    normals?: Float32Array;
}

/**
 * This Feature represents a Terrain Tile.
 */
export declare class TerrainTileFeature extends Feature<'Polygon'> {

    /**
     * The Properties of the Terrain Tile feature.
     */
    properties: TerrainTileFeatureProperties;
    /**
     * The geometry of a cluster feature is of type 'Polygon',
     * where the `coordinates` represent the geographical bounding box of the tile.
     */
    geometry: {
        type: 'Polygon';
        coordinates: GeoJSONCoordinate[][];
    };


}

/**
 * The Properties of a Terrain Tile feature.
 */
declare type TerrainTileFeatureProperties = TerrainTileMesh & {
    /**
     * Indicates if the feature is a terrain tile.
     */
    readonly isTerrain: true;
    /**
     * Additional custom properties of the terrain feature.
     */
    [name: string]: any;
};

/**
 * TerrainTileLayer is a specialized TileLayer that renders elevation or terrain data.
 * It handles terrain-specific logic such as elevation decoding, mesh generation, and
 * rendering optimizations suited for digital elevation models (DEMs).
 */
export declare class TerrainTileLayer extends TileLayer {
    /**
     * Constructs a new TerrainTileLayer instance.
     *
     * @param options - Configuration options for the terrain layer, including data source,
     *                  mesh resolution, elevation decoder, and rendering parameters.
     */
    constructor(options: TerrainTileLayerOptions);


}

/**
 * Configuration options for a TerrainTileLayer.
 *
 * A TerrainTileLayer is capable of rendering elevation-based 3D terrain using
 * different kinds of input data:
 *
 * 1. **Raster heightmaps**: Typically encoded grayscale images or DEM tiles.
 *    These are decoded and triangulated client-side into 3D meshes.
 *
 * 2. **Pre-triangulated terrain meshes**: Binary or JSON tile formats (e.g., quantized meshes)
 *    where the geometry is already prepared and only needs to be rendered.
 *
 * The layer can optionally render an imagery overlay (such as satellite imagery)
 * on top of the terrain surface.
 */
export declare interface TerrainTileLayerOptions extends TileLayerOptions {
    /**
     * Options to configure the remote elevation (DEM) data source.
     *
     * This layer supports two types of elevation input:
     * 1. Raster-based heightmaps (e.g. Terrain-RGB or Terrarium tiles)
     * 2. Precomputed terrain meshes (e.g. via RTIN or quantized meshes)
     *
     * Raster heightmaps are decoded into elevation values and triangulated into meshes at runtime.
     * Mesh-based sources can directly deliver ready-to-render geometry per tile.
     */
    elevation: {
        /**
         * Tile URL template or resolver function for fetching elevation tiles.
         *
         * The URL can be a string template (e.g. "https://example.com/tiles/{z}/{x}/{y}.png")
         * or a function that dynamically generates the URL per tile.
         *
         * For raster-based elevation data input, the URL points to an image (PNG/WEBP) tiles.
         * For mesh input, the URL should return binary or structured mesh data (e.g. JSON, protobuf).
         */
        url: string | ((z: number, y: number, x: number, quadkey: string) => string); /**
        /**
        * Encoding format of the elevation tiles.
        *
        * For raster-based input, this specifies how elevation values are encoded in image tiles,
        * and determines how they are decoded into height values.
        *
        * For mesh-based input, this indicates the format or protocol used
        * to decode the mesh data (e.g. binary layout, vertex structure, compression).
        *
        * Supported raster encodings:
        * - `'terrarium'`: 8-bit PNG using RGB values (Mapzen/Leaflet-style)
        * - `'mtk'`: Maptoolkit format (raster heightmap)
        * - `'mapboxrgb'`: RGB-based encoding (Mapbox Terrain-RGB)
        * - 'custom-raster': Use a custom decodeHeight function to extract elevation from raster tiles
        *
        * Supported mesh encodings:
        * - `'xyztrn'`: binary terrain mesh format (XYZ Terrain)
        * - 'custom-mesh': Use a custom decodeMesh function to process mesh-based elevation tiles
        *
        * This field is optional for mesh input if decoding is handled externally.
        */
        encoding?: 'terrarium' | 'mtk' | 'xyztrn' | 'mapboxrgb' | 'custom-raster' | 'custom-mesh';
        /**
         * Attribution for the elevation data source.
         *
         * Can be a string, a single DataSourceAttribution object, or an array of DataSourceAttribution objects.
         * This is used to provide proper credit or licensing information for the elevation tiles.
         *
         * @see {@link TileLayerOptions.attribution}
         */
        attribution?: string | DataSourceAttribution | DataSourceAttribution[];
        /**
         * Minimum zoom level for which elevation tiles are available. Default is 1.
         */
        min?: number;
        /**
         * Maximum zoom level for elevation tile requests. Default is 20.
         */
        max?: number;
        /**
         * Constant offset to apply to decoded elevation values (in meters).
         * Used with `scale` when no custom `decodeHeight` or `decodeMesh` is provided.
         */
        offset?: number;
        /**
         * Scale factor applied to decoded elevation values (in meters).
         * Used with `offset` when no custom `decodeHeight` or `decodeMesh` is provided.
         */
        scale?: number;
        /**
         * Optional function to decode a single elevation value from pixel RGB(A).
         * Only applies to raster heightmap sources.
         * Required for custom raster encodings (if `encoding` is not set).
         *
         * Parameters:
         * - `r`, `g`, `b`, `a`: individual color channels from a tile pixel
         * Returns:
         * - Elevation value in meters
         */
        decodeHeight?: (r: number, g: number, b: number, a?: number) => number;
        /**
         * Optional decode function for custom mesh-based elevation tiles.
         * Required for custom mesh encodings (if `encoding` is not set).
         * This function is expected to parse the raw binary or structured response data (e.g., ArrayBuffer, JSON) into a terrain mesh.
         *
         * The `responseType` must be explicitly set when using `decodeMesh` to indicate the format of the incoming tile data.
         *
         * The returned object must be of type `TerrainMesh`:
         * {
         *   vertices: Float32Array; // flat array of XYZ positions (x0, y0, z0, x1, y1, z1, ...)
         *   indices: Uint16Array | Uint32Array; // triangle indices
         *   normals?: Float32Array; // optional flat array of vertex normals
         * }
         *
         * @param data - The raw response body (typically ArrayBuffer or parsed JSON).
         * @param responseType - The HTTP response type used when fetching the tile (e.g., "arraybuffer", "json").
         * @returns A TerrainMesh object representing the decoded geometry.
         */
        decodeMesh?: (data: ArrayBuffer | any, responseType?: string) => TerrainMesh;
        /**
         * Optional response type hint for custom encodings.
         * Used to determine how the raw tile response is handled before decoding.
         * Required when using `decodeMesh` to specify the format of the tile response (e.g. 'arraybuffer', 'json').
         *
         * This setting allows the decoding pipeline to prepare the expected format from the fetch response.
         *
         * Supported values:
         * - 'arraybuffer' – fetches raw binary data (recommended for mesh formats or custom binary heightmaps)
         * - 'json' – parses response as JSON
         * - 'blob' – returns a Blob object (useful for passing to createImageBitmap)
         * - 'text' – returns plain text (e.g., CSV or XML)
         * - 'image' – returns an HTMLImageElement or ImageBitmap (for direct raster decoding)
         */
        responseType?: 'arraybuffer' | 'json' | 'blob' | 'text' | 'image';
    };
    /**
     * Optional imagery source to be used as a texture overlay on the terrain.
     * This can enhance visual detail by projecting raster tiles (e.g., satellite imagery)
     * over the elevation surface for a more realistic and visually rich 3D map.
     */
    imagery?: {
        /**
         * Tile URL template or a function returning the tile URL.
         * If a string is provided, it can contain placeholders: {z}, {x}, {y}, or {quadkey}.
         * If a function is provided, it receives the tile coordinates and should return the URL string.
         *
         * Examples:
         * - Template string: "https://tiles.example.com/{z}/{x}/{y}.png"
         * - Function: (z, y, x, quadkey) => `https://.../${quadkey}.jpg`
         *
         * This is typically used to fetch satellite imagery, orthophotos, or custom raster tiles.
         */
        url: string | ((z: number, y: number, x: number, quadkey: string) => string);
        /**
         * Attribution for the imagery data source.
         *
         * Can be a string, a single DataSourceAttribution object, or an array of such objects.
         * This is used to provide proper credit or licensing information for the imagery tiles,
         * similar to how TileLayerOptions.attribution works.
         *
         * @see {@link TileLayerOptions.attribution}
         */
        attribution?: string | DataSourceAttribution | DataSourceAttribution[];
    };
    /**
     * Controls the mesh simplification accuracy when converting raster heightmaps to terrain meshes.
     *
     * Specifies the maximum allowed geometric error (in meters) between the original heightmap and the generated mesh.
     *
     * Can be:
     * - a single number (applied globally to all zoom levels), or
     * - a zoom-indexed map: { [zoom: number]: number }
     *
     * This only applies when using raster elevation input.
     *
     * @defaultValue {
     *     0: 5000,
     *     1: 2500,
     *     2: 1300,
     *     3: 700,
     *     4: 400,
     *     5: 200,
     *     6: 100,
     *     7: 50,
     *     8: 25,
     *     9: 12,
     *     10: 6,
     *     11: 3,
     *     12: 1.5,
     *     13: 0.8,
     *     14: 0.4,
     *     15: 0.2,
     *     16: 0.1,
     *     17: 0.05,
     *     18: 0.025,
     *     19: 0.0125,
     *     20: 0.00625
     * }
     */
    maxGeometricError?: number | StyleZoomRange<number>;
    /**
     * Whether to enable pointer interactions (e.g. hover/pick)
     * @defaultValue false
     */
    pointerEvents?: boolean;
    /**
     * Optional style configuration for the terrain layer.
     */
    style?: TerrainTileLayerStyle | LayerStyle;
}

/**
 * Configuration style for a 3D terrain tile layer.
 *
 * This class controls the visual appearance of terrain tiles, including vertical exaggeration,
 * lighting, material properties, and sky background color.
 *
 * It implements the {@link LayerStyle} interface and can be passed to the `style` field
 * of {@link TerrainTileLayerOptions}.
 */
export declare class TerrainTileLayerStyle implements LayerStyle {


    /**
     * Creates a new instance of `TerrainTileLayerStyle`.
     *
     * @param style - Optional configuration object for terrain style parameters.
     */
    constructor(style?: ({
        /**
         * Elevation scale multiplier applied during rendering.
         * This visually scales the terrain heights (e.g. 1 = real scale, 2 = double vertical exaggeration).
         *
         * Also known as "vertical exaggeration".
         * Has no effect on the actual height data.
         *
         * @defaultValue 1
         */
        exaggeration?: number;
        /**
         * Lights to illuminate the terrain surface.
         *
         * Can include ambient and directional lights to control shading effects.
         * If omitted, a default terrain light setup is used, which is just a simple ambient light (no directional lights).
         */
        light?: (AmbientLight | DirectionalLight)[];
        /**
         * Material properties applied to the terrain mesh.
         *
         * This defines visual attributes such as color, shading, or roughness,
         * depending on the renderer's material model.
         */
        material?: Material;
        /**
         * Defines the sky color of the map
         * {@link LayerStyle.skyColor}
         */
        skyColor?: LayerStyle['skyColor'];
        /**
         * Defines the background color of the terrain layer, shown when terrain data is not fully loaded.
         */
        backgroundColor?: LayerStyle['backgroundColor'];
    }));
}

/**
 * Interface for configuring the visual appearance of Text.
 */
export declare interface TextStyle {
    /**
     * Specifies the type of style to render.
     */
    type: 'Text';
    /**
     * Indicates the drawing order within a layer.
     * Styles with larger zIndex value are rendered above those with smaller values.
     * The zIndex is defined relative to the "zLayer" property.
     * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
     */
    zIndex: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Indicates drawing order across multiple layers.
     * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
     * If no zLayer is defined, it will fall back to the {@link LayerStyle.zLayer} or depend on the display layer order.
     * The first (lowest) layer has a zLayer value of 1.
     *
     * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
     */
    zLayer?: number | StyleValueFunction<number> | StyleExpression<number>;
    /**
     * Sets the color to fill the text.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    fill?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the stroke color of the text (outline).
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    stroke?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Sets the width of the stroke (outline) to display the text with.
     * The unit of strokeWidth is defined in pixels.
     *
     * @example
     * ```typescript
     * // define a Text style with a strokeWidth of 8px
     * {
     *     zIndex: 0,
     *     type: "Text",
     *     text: "doc",
     *     fill: "white",
     *     stroke: "black,
     *     strokeWidth: 8
     * }
     * ```
     */
    strokeWidth?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * Defines the opacity of the style.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     * It is valid for all style types.
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * CSS font string for texts.
     * It is only valid for Text.
     *
     * @defaultValue “normal 12px Arial”
     */
    font?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Text is either a string or a function that generates the string that should be displayed.
     * It is valid for Text style only.
     *
     * @example
     * ```typescript
     * // display the name property of a feature in uppercase
     * ...
     * text: function(feature){
     *   return feature.properties.name.toUpperCase();
     * }
     * ```
     */
    text?: string | number | boolean | StyleValueFunction<string | number | boolean> | StyleZoomRange<string | number | boolean>;
    /**
     * The "textAnchor" attribute is used to align the text relative to the {@link anchor} point.
     *
     * Possible values:
     * - "Left": The text is aligned left to the anchor.
     * - "Right": The text is aligned right to the anchor.
     * - "Center": The center of the Text is placed at the {@link anchor} point.
     * - "Top": The top of the Text is placed closest the {@link anchor} point.
     * - "TopLeft": The top left side of the Text is placed closest the {@link anchor} point.
     * - "TopRight": The top right side of the Text is placed closest the {@link anchor} point.
     * - "Bottom": The bottom of the Text is placed closest to the {@link anchor} point.
     * - "BottomLeft": The bottom left side of the Text is placed closest the {@link anchor} point.
     * - "BottomRight": The bottom right side of the Text is placed closest the {@link anchor} point.
     *
     * @defaultValue "Center"
     */
    textAnchor?: 'Left' | 'Center' | 'Right' | 'Top' | 'TopLeft' | 'TopRight' | 'Bottom' | 'BottomLeft' | 'BottomRight' | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * "textRef" Reference to an attribute of an feature that's value should be displayed as text.
     * If both "text" and "textRef" are set, "text" prevails.
     * It is only required by Text.
     * @example
     * ```typescript
     * // display the property "name" of the feature's properties
     * ...
     * textRef: "properties.name"
     * ```
     * @example
     * ```typescript
     * // display the id of the feature
     * ...
     * textRef: "id"
     * ```
     */
    textRef?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Offset the text in pixels on x-axis.
     * A positive value offsets to the right, a negative value to the left.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Text by 1m to the left
     * { type: "Text", zIndex: 0, fill:'blue', offsetX: "-1m", text: 'XYZ'}
     * ```
     */
    offsetX?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * Offset the text in pixels on y-axis.
     * A positive value offsetY offsets downwards, a negative value upwards.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Text by 1m to the left
     * { type: "Text", zIndex: 0, fill:'blue', offsetY: "-1m", text: 'XYZ'}
     * ```
     */
    offsetY?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Offset the text in pixels on z-axis.
     * A positive value offsets up, a negative value down.
     * The default unit is pixels.
     *
     * @example
     * ```typescript
     * // offset Text by 1m to the top
     * { type: "Text", zIndex: 0, fill:'blue', text: 'XYZ', offsetZ: "1m"}
     * ```
     */
    offsetZ?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * Alignment for styles of type "Text".
     * Possible values are: "map" and "viewport".
     * "map" aligns to the plane of the map and "viewport" aligns to the plane of the viewport/screen.
     * Default alignment for Text based on point geometries is "viewport" while "map" is the default for line geometries.
     */
    alignment?: 'map' | 'viewport' | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Rotate text around it's center in degrees.
     */
    rotation?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * In case of label collision, Text with a higher priority (lower value) will be drawn before lower priorities (higher value).
     * If the collision detection is enabled for multiple Styles within the same StyleGroup, the highest priority (lowest value)
     * is used.
     */
    priority?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Minimum distance in pixels between repeated style-groups on line geometries.
     * Applies per tile only.
     *
     * @defaultValue 256 (pixels)
     */
    repeat?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Enable oder Disable line wrapping for styles of type "Text".
     * The line wrapping for text on (Multi)Linestring geometry with anchor set to "Line" is disabled by default,
     * otherwise it's 14 characters.
     *
     * - number: Maximum number of characters per line [Default 14 characters]
     * - false: disable line wrapping
     * - true: enable line wrapping [Default 14 characters]
     *
     * @defaultValue 14
     */
    lineWrap?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Sets the anchor point for styles of type "Text" used with Line or Polygon geometry.
     *
     * Possible values for Line geometry are "Coordinate" and "Line".
     * - "Coordinate": the respective style is displayed at each coordinate of the polyline.
     * - "Line": the respective style is displayed on the shape of the polyline when there is enough space. See {@link checkLineSpace} to disable the space check.
     *
     * Possible values for Polygon geometry are "Center" and "Centroid".
     * - "Center": the center of the bounding box of the polygon.
     * - "Centroid": the geometric centroid of the polygon geometry.
     *
     * @defaultValue For Polygon geometry the default is "Center". For Line geometry the default for styles of type "Text" is "Line".
     */
    anchor?: 'Line' | 'Coordinate' | 'Centroid' | 'Center' | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Enable or disable the space check for point styles on line geometries.
     * Only applies to "Text" styles with {@link anchor} set to "Line".
     * If check checkLineSpace is enabled the respective style is only displayed if there is enough space on the line,
     * otherwise it is not displayed.
     *
     * @defaultValue true
     */
    checkLineSpace?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;
    /**
     * Enable or disable collision detection.
     * If the collision detection is enabled for multiple Styles within the same StyleGroup, the respective Styles are
     * handled as a single Object ("CollisionGroup") where the combined bounding-box is determined automatically.
     *
     * - true: collision are allowed, Collision detection is disabled.
     * - false: avoid collisions, Collision detection is enabled.
     *
     * @defaultValue false
     */
    collide?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;
    /**
     * Enables collision detection and combines all styles of a StyleGroup with the same "CollisionGroup" into a single logical object for collision detection.
     */
    collisionGroup?: string | StyleValueFunction<string> | StyleZoomRange<string> | StyleExpression<string>;
    /**
     * Altitude of the Text center in meters.
     *
     * Describes the vertical distance from the global ground plane (0m) to the Text.
     *
     * Supported values:
     * - false (default): place at 0m.
     * - true: use the altitude (z) from the feature geometry if present, else 0. Not re-aligned to the rendered terrain.
     *         If the geometry altitude source differs from the TerrainTileLayer source/resolution, the Text can appear
     *         slightly above or below the visible terrain surface.
     * - number: fixed absolute altitude in meters. Also not adjusted when terrain tiles load; may not perfectly sit
     *           on the terrain unless both use exactly the same elevation source, datum and resolution.
     * - 'terrain': sample (clamp to) the current terrain surface height. While the terrain tile is not yet loaded
     *              (or no terrain layer exists) the altitude is 0 and updates once data becomes available.
     *
     * Notes:
     * - Use 'terrain' to keep the Text visually seated on the rendered terrain.
     * - Use a numeric value for a constant absolute elevation independent of terrain updates.
     * - To position something N meters above terrain: use 'terrain' plus offsetZ (e.g. offsetZ: '5m').
     * - Expect mismatches (floating / sinking) when using true or a fixed number with a different terrain data source.
     *
     * @defaultValue false
     * @experimental
     */
    altitude?: number | boolean | 'terrain' | StyleValueFunction<number | boolean | 'terrain'> | StyleZoomRange<number | boolean | 'terrain'> | StyleExpression<number | boolean | 'terrain'>;
    /**
     * Scales the size of a style based on the feature's altitude.
     * If it's enabled (true), features closer to the camera will be drawn larger than those farther away.
     * When off (false), the size of the style is always the same size, regardless of its actual altitude, as if it were placed on the ground (altitude 0).
     * This attribute applies to styles of type "Rect", "Image", "Text", "Circle", "Line", "Box", or "Sphere" whose size ({@link width}, {@link radius}, {@link strokeWidth}) that are using "map" {@link alignment} only.
     * If the size attribute is defined in meters, scaleByAltitude is enabled by default, for pixels it is disabled.
     *
     * @defaultValue false (pixels), true (meters)
     *
     * @experimental
     */
    scaleByAltitude?: boolean | StyleValueFunction<boolean> | StyleZoomRange<boolean> | StyleExpression<boolean>;
}

/**
 *  This Class represents a WebMercator Tile.
 */
export declare class Tile {

    /**
     *  quadkey of the tile.
     */
    quadkey: string;
    /**
     *  z (zoonlevel) of the tile.
     */
    z: number;
    /**
     *  y of the tile.
     */
    y: number;
    /**
     *  x of the tile.
     */
    x: number;
    /**
     *  type of the tile.
     */
    type: string;
    /**
     *  Geographical Bounding box has the coordinates in order: [minLon, minLat, maxLon, maxLat].
     */
    bounds: GeoJSONBBox;
    /**
     * Represents an error that occurred during tile processing.
     *
     * This property is set when an error is encountered while performing operations on the tile,
     * such as network failures during the loading of remote tile data.
     *
     */
    error?: NetworkError;









    /**
     *  Checks if tile expires at given point of time.
     *
     *  @returns true when tile has expired, otherwise false.
     */
    expired(ts: number): boolean;
    /**
     *  add a feature to the tile.
     *
     *  @param feature - the Feature to add
     */
    add(feature: Feature): void;
    /**
     *  remove feature to the tile.
     *
     *  @param feature - the Feature to remove
     */
    remove(feature: Feature): void;

    /**
     *  check if the tile  has been fully loaded
     */
    isLoaded(): boolean;
    /**
     *  get tile bound including margin.
     *  @returns the bounding box with geographical coordinates [minLon, minLat, maxLon, maxLat]
     */
    getContentBounds(): [number, number, number, number];





}

/**
 * TileLayer
 */
export declare class TileLayer extends Layer {





    /**
     * default tile margin in pixel
     */
    protected margin: number;






    /**
     * @param options - options to configure the TileLayer
     */
    constructor(options: TileLayerOptions);
    /**
     * Get provider(s) of this layer.
     */
    getProvider(level?: number): TileProvider;
    /**
     * Add an EventListener to the layer.
     * Valid events: "featureAdd", "featureRemove", "featureCoordinatesChange", "clear", "styleGroupChange", "styleChange", and "viewportReady"
     *
     * The detail property of the Event gives additional information about the event.
     * detail.layer is a reference to the layer onto which the event was dispatched and is set for all events.
     *
     * @param type - A string representing the event type to listen for
     * @param listener - the listener function that will be called when an event of the specific type occurs
     */
    addEventListener(type: string, listener: (event: CustomEvent) => void): any;
    /**
     * Remove an EventListener from the layer.
     * Valid events: "featureAdd", "featureRemove", "featureCoordinatesChange", "clear", "styleGroupChange", "styleChange", and "viewportReady"
     *
     * @param type - A string which specifies the type of event for which to remove an event listener.
     * @param listener - The listener function of the event handler to remove from the TileLayer.
     */
    removeEventListener(type: string, listener: (event: CustomEvent) => void): any;

    /**
     * Modify coordinates of a feature in the layer.
     *
     * @param feature - the Feature whose coordinates should be modified
     * @param coordinates - the modified coordinates to set. The coordinates must match features geometry type.
     */
    setFeatureCoordinates(feature: Feature, coordinates: GeoJSONCoordinate | GeoJSONCoordinate[] | GeoJSONCoordinate[][] | GeoJSONCoordinate[][][]): void;
    /**
     * Add a feature to the layer.
     *
     * @param feature - the feature to be added to the layer
     * @param style - optional style the feature should be displayed with.
     *
     * @example
     * ```
     * // add a feature that will be displayed with the default style of the layer.
     * layer.addFeature({
     *    type: "Feature"
     *    geometry: {
     *        coordinates: [[-122.49373, 37.78202, 0], [-122.49263, 37.78602, 0]],
     *        type: "LineString"
     *    }
     * });
     * ```
     * @example
     * ```
     * // add a feature that will be displayed with a specific style.
     * layer.addFeature({
     *    type: "Feature"
     *    geometry: {
     *        coordinates: [[-122.49373, 37.78202, 0], [-122.49263, 37.78602, 0]],
     *        type: "LineString"
     *    }
     * }, [{
     *    zIndex: 0, type: "Line", stroke: "#DDCB97", "strokeWidth": 18
     * }]);
     * ```
     */
    addFeature(feature: GeoJSONFeature | Feature, style?: Style[]): Feature;
    /**
     * Add features to the layer.
     *
     * @param feature - the features to be added to the layer
     * @param style - optional style the features should be displayed with.
     *
     * @example
     * ```
     * // add multiple features to the layer.
     * layer.addFeature([{
     *    type: "Feature"
     *    geometry: {
     *        coordinates: [[-122.49373, 37.78202], [-122.49263, 37.78602]],
     *        type: "LineString"
     *    }
     * },{
     *    type: "Feature"
     *    geometry: {
     *        coordinates: [[-122.49375, 37.78203], [-122.49265, 37.78604]],
     *        type: "LineString"
     *    }
     * }]);
     * ```
     */
    addFeature(feature: GeoJSONFeatureCollection | GeoJSONFeature[], style?: Style[]): Feature[];
    /**
     * Remove feature(s) from the layer.
     *
     * @param feature - features that should be removed from the layer
     */
    removeFeature(feature: GeoJSONFeature | Feature | GeoJSONFeatureCollection | GeoJSONFeature[]): any;
    /**
     * Set StyleGroup the feature should be rendered with.
     * Pass styleGroup = false|null to hide the feature.
     * If no styleGroup is passed, custom feature style will be cleared and layer default style will be set.
     *
     * @param feature - the feature that's styleGroup should be set
     * @param styleGroup - the styleGroup that feature should be displayed with
     */
    setStyleGroup(feature: Feature, styleGroup?: Style[] | false | null): void;
    /**
     * Get styleGroup for the feature.
     *
     * This method retrieves a StyleGroup for a given feature, optionally
     * based on the specified zoom level and whether to use the layer default styles.
     *
     * @param feature - The feature for which to get the styles.
     * @param zoomlevel - The zoom level to use for determining the styles.
     * This parameter should be set as it determines how styles are applied based on zoom.
     * It is only optional if the style definition supports being applied without a specific zoom level.
     * @param layerDefault - (Optional) A boolean indicating whether to use the layer's default styles.
     * If true, any custom styles set via {@link TileLayer.setStyleGroup} are ignored and the default layer styles are returned.
     * If false, the method will return the custom styles set for the feature if available;
     * otherwise, it returns the default layer styles. Default is false.
     *
     * @returns A readonly StyleGroup representing the styles for the given feature at the specified zoom level.
     * If no styles are found, a falsy value is returned, indicating that the feature is not displayed/visible.
     */
    getStyleGroup(feature: Feature, zoomlevel?: number, layerDefault?: boolean): readonly Style[];

    /**
     * Search for feature(s) in the layer.
     *
     * @param options - configure the search
     * @example
     * ```
     * // searching by id:
     * layer.search({id: 1058507462})
     *
     * // remote search:
     * layer.search({
     *     id: 1058507462,
     *     remote: true, // force layer to do remote search if feature/search area is not cached locally
     *     onload: (result) => {...}
     * })
     * ```
     * @returns array of features
     */
    search(options: {
        /**
         * search a feature by id.
         */
        id: number | string;
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean;
        /**
         * Callback function for "remote" search.
         */
        onload?: (result: Feature | null) => void;
        /**
         * Function to be called when a request of a "remote search" fails.
         */
        onerror?: (error: {
            /**
             * The name property represents a name for the type of error. The value is "NetworkError".
             */
            name: 'NetworkError';
            /**
             * The error message of the failing request.
             */
            message: string;
            /**
             * The responseText which contains the textual data received of the failing request.
             */
            responseText: string;
            /**
             * The numerical HTTP status code of the failing request.
             */
            status: number;
        }) => void;
    }): Feature;
    /**
     * Search for feature(s) in the layer.
     *
     * @param options - configure the search
     * @example
     * ```
     * // searching features by id:
     * layer.search({ids: [1058507462, 1058507464]})
     *
     * // searching by point and radius:
     * layer.search({
     *     point: {longitude: 72.84205, latitude: 18.97172},
     *     radius: 100
     * })
     *
     * // searching by Rect:
     * layer.search({
     *     rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876}
     * })
     *
     * // remote search:
     * layer.search({
     *     rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876},
     *     remote: true, // force layer to do remote search if feature/search area is not cached locally
     *     onload: (result) => {...}
     * })
     * ```
     * @returns array of features
     */
    search(options: {
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
         * Function to be called when a request of a "remote search" fails.
         */
        onerror?: (error: {
            /**
             * The name property represents a name for the type of error. The value is "NetworkError".
             */
            name: 'NetworkError';
            /**
             * The error message of the failing request.
             */
            message: string;
            /**
             * The responseText which contains the textual data received of the failing request.
             */
            responseText: string;
            /**
             * The numerical HTTP status code of the failing request.
             */
            status: number;
        }) => void;
    }): Feature[];
    /**
     * Rectangle Search for feature(s) in the layer.
     * @param rect - Geographical Rectangle to search in. [minLon, minLat, maxLon, maxLat] | GeoRect.
     * @param options - configure the search
     *
     * @example
     * ```
     * layer.search({minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876})
     * // or:
     * layer.search([72.83584, 18.96876, 72.84443,18.97299])
     *
     * // remote search:
     * layer.search({ minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876 }, {
     *     remote: true, // force layer to do remote search if search area is not cached locally
     *     onload: (result) => {...}
     * })
     * ```
     */
    search(rect: GeoRect | GeoJSONBBox, options?: {
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean;
        /**
         * Callback function for "remote" search.
         */
        onload?: (result: Feature[] | null) => void;
        /**
         * Function to be called when a request of a "remote search" fails.
         */
        onerror?: (error: {
            /**
             * The name property represents a name for the type of error. The value is "NetworkError".
             */
            name: 'NetworkError';
            /**
             * The error message of the failing request.
             */
            message: string;
            /**
             * The responseText which contains the textual data received of the failing request.
             */
            responseText: string;
            /**
             * The numerical HTTP status code of the failing request.
             */
            status: number;
        }) => void;
    }): Feature[];
    /**
     * Circle Search for feature(s) in the layer.
     * @param point - Geographical center point of the circle to search in. options.radius must be defined.
     * @param options - configure the search
     *
     * @example
     * ```
     * layer.search({longitude: 72.84205, latitude: 18.97172},{
     *  radius: 100
     * })
     * // or:
     * layer.search([72.84205, 18.97172], {
     *  radius: 100
     * })
     *
     * // remote search:
     * layer.search([72.84205, 18.97172], {
     *  radius: 100,
     *  remote: true, // force layer to do remote search if search area is not cached locally
     *  onload: function(result){
     *   // search result is only return in this callback function if features are not found in cache.
     *  }
     * })
     * ```
     */
    search(point: GeoPoint, options: {
        /**
         * the radius is mandatory for circle search.
         */
        radius?: number;
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean;
        /**
         * Callback function for "remote" search.
         */
        onload?: (result: Feature) => void;
        /**
         * Function to be called when a request of a "remote search" fails.
         */
        onerror?: (error: {
            /**
             * The name property represents a name for the type of error. The value is "NetworkError".
             */
            name: 'NetworkError';
            /**
             * The error message of the failing request.
             */
            message: string;
            /**
             * The responseText which contains the textual data received of the failing request.
             */
            responseText: string;
            /**
             * The numerical HTTP status code of the failing request.
             */
            status: number;
        }) => void;
    }): Feature[];
    /**
     * Search for feature by id in the layer.
     *
     * @param id - id of the feature to search for
     * @param options - configure the search
     *
     * @example
     * ```typescript
     * layer.search(1058507462)
     *
     * // remote search:
     * layer.search(1058507462,{
     * remote: true, // force layer to do remote search if search area is not cached locally
     * onload: function(feature){
     *  // search result is only return in this callback function if features are not found in cache.
     * }
     * })
     * ```
     */
    search(id: string | number, options?: {
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean;
        /**
         * Callback function for "remote" search.
         */
        onload?: (result: Feature) => void;
    }): Feature;
    /**
     * Get a tile by quadkey.
     *
     * @param quadkey - quadkey of the tile
     * @param callback - callback function
     * @returns the Tile is returned if its already cached locally
     */
    getTile(quadkey: string, callback: (tile: Tile) => void): Tile | undefined;

    /**
     * Get a locally cached tile by quadkey.
     *
     * @param quadkey - the quadkey of the tile
     */
    getCachedTile(quadkey: string): Tile;
    /**
     * Set layer with given style.
     *
     * @param layerStyle - the layerStyle
     * @param keepCustom - keep and reuse custom set feature styles that have been set via {@link TileLayer.setStyleGroup}
     */
    setStyle(layerStyle: LayerStyle | XYZLayerStyle, keepCustom?: boolean): void;

    /**
     * Get the current layerStyle.
     */
    getStyle(): LayerStyle;

    /**
     * Set the tile margin in pixel.
     *
     * @param tileMargin - the tileMargin
     */
    setMargin(tileMargin?: number): number;
    /**
     * Enable or disable pointer-event triggering for all features of the layer.
     *
     * @param active - boolean to enable or disable posinter-events.
     *
     * @returns boolean indicating if pointer-event triggering is active or disabled.
     */
    pointerEvents(active?: boolean): boolean;



}

/**
 *  Configuration options for a TileLayer.
 */
export declare interface TileLayerOptions extends LayerOptions {
    /**
     * Name of the TileLayer.
     */
    name?: string;
    /**
     * minimum zoom level at which data from the TileLayer will be displayed.
     */
    min?: number;
    /**
     * maximum zoom level at which data from the TileLayer will be displayed.
     */
    max?: number;
    /**
     * The data provider(s) for the TileLayer.
     *
     * The provider can either be a single TileProvider or an array of {min: number, max: number, provider: TileProvider}, where "min" and "max" define the minimum and maximum zoom level at which data from the "provider" should be used.
     * If a single provider is defined, it's data will be used for all zoom levels.
     * If several providers are defined for a single zoom level, only the data of the first defined is used.
     */
    provider?: TileProvider | {
        /**
         * The minimum zoom level at which data from the TileProvider will be used.
         */
        min: number;
        /**
         * The maximum zoom level at which data from the TileProvider will be used.
         */
        max: number;
        /**
         * The Tile Provider for the respective zoom level.
         */
        provider: TileProvider;
    }[];

    /**
     * Style for rendering features in this layer.
     */
    style?: LayerStyle;
    /**
     * tileMargin that should be applied to all providers of the layer.
     */
    margin?: number;
    /**
     * the size of the tile data in pixel.
     * @defaultValue 512
     */
    tileSize?: number;
    /**
     * Determines whether pointer events are enabled for all features of the layer.
     * @defaultValue true
     */
    pointerEvents?: boolean;

    /**
     * Attribution information for data sources used by this layer.
     *
     * Attributions are automatically displayed or hidden depending on whether the corresponding
     * data is currently active or visible on the map — e.g., based on zoom level, layer visibility,
     * or usage. This ensures that only active data providers are credited, as required by licensing.
     *
     * Can be a simple string (displayed as static text), or an array of structured attribution entries
     * that support clickable labels and optional tooltips.
     *
     * @example
     * // Simple attribution string
     * attribution: "© Data Provider"
     *
     * @example
     * // Multiple detailed attributions
     * attribution: [
     *     {
     *         label: "© Elevation Provider",
     *         url: "https://elevation.example.com",
     *         title: "Elevation data source"
     *     },
     *     {
     *         label: "Imagery © HERE Maps",
     *         url: "https://www.here.com",
     *         title: "Satellite imagery by HERE"
     *     }
     * ]
     */
    attribution?: string | DataSourceAttribution | DataSourceAttribution[];
}

/**
 * The TileProvider is an abstract Provider that serves map-data partitioned in {@link Tiles}.
 */
declare abstract class TileProvider {

    /**
     * The id of the Provider
     */
    id?: string;
    /**
     * The name of the Provider.
     */
    name?: string;
    /**
     * default tile margin.
     */
    margin?: number;










    /**
     * Get a tile by quadkey.
     *
     * @param quadkey - quadkey of the tile
     * @param callback - the callback function
     * @returns the Tile is returned if its already cached locally
     */
    abstract getTile(quadkey: string, callback: (tile: Tile, error?: any) => void): any;
    /**
     * @param options - options to configure the provider
     */
    constructor(options: TileProviderOptions);



    /**
     * Add an EventListener to the provider.
     * Valid events: "clear" and "error"
     *
     * The detail property of the Event gives additional information about the event.
     * detail.provider is a reference to the provider onto which the event was dispatched and is set for all events.
     *
     * @param type - A string representing the event type to listen for
     * @param listener - the listener function that will be called when an event of the specific type occurs
     */
    addEventListener(type: string, listener: (e: CustomEvent) => void, _c?: any): boolean;
    /**
     * Remove an EventListener from the provider.
     * Valid events:  "clear" and "error"
     *
     * @param type - A string which specifies the type of event for which to remove an event listener.
     * @param listener - The listener function of the event handler to remove from the provider.
     */
    removeEventListener(type: string, listener: (e: CustomEvent) => void, _c?: any): boolean;
    /**
     * Clears the given tile(s) from the provider's cache.
     *
     * @param tiles - A single `Tile` or an array of `Tile`s to be cleared.
     */
    clear(tiles: Tile | Tile[]): void;
    /**
     * Clears all tiles within a specified geographical bounding box.
     *
     * @param bbox - An array of geographical coordinates `[minLon, minLat, maxLon, maxLat]`
     * defining the rectangular area from which tiles will be cleared.
     */
    clear(bbox: GeoJSONBBox): void;
    /**
     * Clears all cached tiles of the provider.
     */
    clear(): void;

    /**
     * Get a locally cached tile by quadkey.
     *
     * @param quadkey - the quadkey of the tile
     */
    getCachedTile(quadkey: string): Tile;
    /**
     * Set the tile margin in pixel.
     *
     * @param tileMargin - the tileMargin
     */
    setMargin(tileMargin?: number): void;
    /**
     * Retrieves cached tiles within a specified bounding box or all cached tiles if no parameters are provided.
     *
     * If no arguments are passed, all cached tiles are returned.
     * If a bounding box (`bbox`) and/or zoom level (`zoomlevel`) are provided, it filters the cached tiles based on the specified area and zoom level.
     *
     * @param bbox - An optional array of coordinates defining the bounding box in the format: `[minLon, minLat, maxLon, maxLat]`.
     * If provided, only tiles within this geographic area will be returned.
     *
     * @param zoomlevel - An optional zoom level to filter tiles. If provided, only tiles at the specified zoom level will be returned.
     *
     * @returns {Tile[]} - An array of {@link Tile} objects that match the specified parameters, or all cached tiles if no parameters are given.
     */
    getCachedTiles(bbox?: number[], zoomlevel?: number): Tile[];
    /**
     * @deprecated please use {@link TileProvider.getCachedTiles} instead.
     * @hidden
     */
    getCachedTilesOfBBox(bbox: number[], zoomlevel?: number): Tile[];
    /**
     * Get or set configuration options for the provider.
     *
     * If a string is provided as the first argument, returns the value of the corresponding property.
     * If an object is provided, sets the provider's properties according to the object.
     *
     * @param options - The configuration key as a string to get a value, or an object to set multiple options.
     * @param value - Optional value to set if a string key is provided.
     */
    config(options: TileProviderOptions | string, value?: any): TileProviderOptions;
    /**
     * Create a new Tile.
     *
     * @param quadkey - the quadkey of the tile to create
     */
    createTile(quadkey: string): Tile;

}

/**
 *  Options to configure the Provider.
 */
declare interface TileProviderOptions {
    /**
     * optional id to identify the provider.
     */
    id?: string;
    /**
     * Name of the provider.
     */
    name?: string;
    /**
     * Tile margin of the provider.
     */
    margin?: number;

    /**
     * Attribution information for data sources used by this provider.
     *
     * Attributions are automatically displayed or hidden depending on whether the corresponding
     * data is currently active or visible on the map — e.g., based on zoom level, layer visibility,
     * or usage. This ensures that only active data providers are credited, as required by licensing.
     *
     * Can be a simple string (displayed as static text), or an array of structured attribution entries
     * that support clickable labels and optional tooltips.
     *
     * @example
     * // Simple attribution string
     * attribution: "© Data Provider"
     *
     * @example
     * // Multiple detailed attributions
     * attribution: [
     *     {
     *         label: "© Elevation Provider",
     *         url: "https://elevation.example.com",
     *         title: "Elevation data source"
     *     },
     *     {
     *         label: "Imagery © HERE Maps",
     *         url: "https://www.here.com",
     *         title: "Satellite imagery by HERE"
     *     }
     * ]
     */
    attribution?: string | DataSourceAttribution | DataSourceAttribution[];
}

/**
 * Interface for configuring the visual appearance of VerticalLines.
 */
export declare interface VerticalLineStyle {
    /**
     * Indicates type of the shape to render.
     */
    type: 'VerticalLine';
    /**
     * Indicates the drawing order within a layer.
     * Styles with larger zIndex value are rendered above those with smaller values.
     * The zIndex is defined relative to the "zLayer" property.
     * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
     */
    zIndex: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Indicates drawing order across multiple layers.
     * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
     * If no zLayer is defined, it will fall back to the {@link LayerStyle.zLayer} or depend on the display layer order.
     * The first (lowest) layer has a zLayer value of 1.
     *
     * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
     */
    zLayer?: number | StyleValueFunction<number> | StyleExpression<number>;
    /**
     * Sets the stroke color of the shape.
     *
     * @see {@link Color} for a detailed list of possible supported formats.
     */
    stroke?: Color | StyleValueFunction<Color> | StyleZoomRange<Color> | StyleExpression<Color>;
    /**
     * Defines the opacity of the style.
     * The value must be between 0.0 (fully transparent) and 1.0 (fully opaque).
     * It is valid for all style types.
     * @defaultValue 1
     */
    opacity?: number | StyleValueFunction<number> | StyleZoomRange<number> | StyleExpression<number>;
    /**
     * Vertical offset of the shape along the z-axis.
     *
     * Shifts or extends the line relative to its reference altitude.
     * - Positive values move the line upward.
     * - Negative values move the line downward.
     *
     * Units:
     * - Default is pixels.
     * - Can also be a string with units (e.g., `"1m"` for meters).
     *
     * Special notes for VerticalLine:
     * - `altitudeReference` defines which point the `altitude` value refers to (top or base).
     * - `offsetZ` **always extends the line upward** from the reference point, regardless of whether
     *   `altitudeReference` is `'base'` or `'top'`.
     * - With `altitude: 'terrain'`, `offsetZ` shifts the line relative to the terrain surface.
     *
     * @example
     * ```ts
     * // Move the VerticalLine 8 px upward from its reference
     * { type: "VerticalLine", zIndex: 0, stroke: "black", offsetZ: 8 }
     *
     * // Base = terrain, extend line 1 m upward
     * { type: "VerticalLine", zIndex: 0, stroke: "black", altitude: "terrain", altitudeReference: "base", offsetZ: "1m" }
     *
     * // Top = terrain, extend line 2 m upward
     * { type: "VerticalLine", zIndex: 0, stroke: "black", altitude: "terrain", altitudeReference: "top", offsetZ: "2m" }
     * ```
     */
    offsetZ?: number | string | StyleValueFunction<number | string> | StyleZoomRange<number | string> | StyleExpression<number | string>;
    /**
     * Defines how the altitude value is interpreted for the VerticalLine.
     *
     * By default, the meaning of altitude depends on the style type:
     * - For most flat styles (Circle, Rect, Icon, etc.), `altitude` defines the **center** position.
     * - For VerticalLine, {@link VerticalLineStyle.altitude} defines a **vertical reference** — either the top or the base.
     *
     * Supported values:
     * - `'top'`: the altitude specifies the **top** of the line; the base is fixed at 0 m (global ground).
     * - `'base'`: the altitude specifies the **base** (bottom) of the line; the top must be defined via {@link VerticalLineStyle.offsetZ}.
     *
     * Notes:
     * - This property only affects VerticalLine styles; other style types ignore it.
     * - When {@link VerticalLineStyle.altitude} is `'terrain'` and `altitudeReference` is not specified,
     *   `'base'` is automatically assumed (the line stands on the terrain surface).
     *
     * @defaultValue 'top'
     * @experimental
     */
    altitudeReference?: 'top' | 'base';
    /**
     * Altitude of the VerticalLine, in meters.
     *
     * Defines the reference height used together with {@link VerticalLineStyle.altitudeReference}
     * to determine the vertical placement of the line.
     *
     * Supported values:
     * - **number** – Fixed altitude in meters, relative to the global ground plane.
     * - **true** – Use the altitude (z) from the feature geometry if present; otherwise 0 m.
     * - **false** – Ignore any z-value from the feature geometry and use 0 m.
     * - **'terrain'** – Clamp to the sampled terrain height.
     *
     * Notes:
     * - When `altitudeReference = 'top'`, the altitude defines the **top** of the line;
     *   the base is fixed at 0 m.
     * - When `altitudeReference = 'base'`, the altitude defines the **base** of the line;
     *   the top must be specified using {@link VerticalLineStyle.offsetZ}.
     * - {@link VerticalLineStyle.offsetZ} extends the line upward from the reference altitude.
     *   With 'terrain', it defines how far above the terrain the line extends.
     *
     * Examples:
     * ```ts
     * // Top = 100 m, Base = 0 m
     * { type: "VerticalLine", altitudeReference: "top", altitude: 100 }
     *
     * // Base = terrain, Top = terrain + 2 m
     * { type: "VerticalLine", altitudeReference: "base", altitude: "terrain", offsetZ: "2m" }
     *
     * // Base = 0, Top = feature Z (if available)
     * { type: "VerticalLine", altitudeReference: "top", altitude: true }
     * ```
     *
     * @defaultValue true
     * @experimental
     */
    altitude?: number | boolean | 'terrain' | StyleValueFunction<number | boolean | 'terrain'> | StyleZoomRange<number | boolean | 'terrain'> | StyleExpression<number | boolean | 'terrain'>;
}

/**
 * WebMercator projection utilities.
 */
export declare const webMercator: {
    mapSizePixel: (tileSize: number, zoomLevel: number) => number;
    lon2x: (lon: number, mapSize: number) => number;
    lat2y: (lat: number, mapSize: number) => number;
    x2lon: (x: number, mapSize: number) => number;
    y2lat: (y: number, mapSize: number) => number;
    pixelToGeo: (x: number, y: number, mapSize: number) => GeoPoint;
    geoToPixel: (lon: number, lat: number, mapSize: number) => PixelPoint;
    meterToPixel: (val: number, zoom: number) => number;
    pixelToMeter: (val: number, zoom: number) => number;
    getGroundResolution: (zoom: number) => number;
    alt2z: (alt: number, lat?: number) => number;
    earthCircumference: (lat?: number) => number;
};

/**
 * XYZLayerStyle
 * @hidden
 */
export declare class XYZLayerStyle implements LayerStyle {


    /**
     * definitions
     * @hidden
     */
    definitions: LayerStyle['definitions'];




    /**
     * XYZLayerStyle
     * @protected
     * @hidden
     */
    protected expParser: ExpressionParser;



    /**
     * skyColor
     * @protected
     * @hidden
     */
    skyColor: Color_2.Color | LinearGradient;
    /**
     *
     * @param styleJSON
     * @hidden
     */
    constructor(styleJSON?: LayerStyle);
    /**
     * setLights
     * @param lights
     * @hidden
     */
    setLights(lights: LayerStyle['lights']): void;

    /**
     * setBgColor
     * @param backgroundColor
     * @hidden
     */
    setBgColor(backgroundColor: LayerStyle['backgroundColor']): void;



    /**
     * getExpressionContext
     * @hidden
     */
    getExpressionContext(): {
        [$name: string]: any;
        $geometryType: string;
        $layer: string;
        $zoom: number;
        $id: string | number;
    };


    /**
     * initMapContext
     * @param feature
     * @param zoom
     * @protected
     * @hidden
     */
    protected initMapContext(feature: Feature, zoom: number): XYZLayerStyle['expContext'];






    /**
     * initZoom
     * @param zoomlevel
     * @hidden
     */
    initZoom(zoomlevel: number): boolean;
}

export { }
