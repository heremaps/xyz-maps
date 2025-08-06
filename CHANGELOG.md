## 0.43.0 (2025-8-6)
### editor
* added: Marker [behavior](https://heremaps.github.io/xyz-maps/docs/classes/editor.marker.html#behavior) now supports dragSurface: 'terrain' to enable geometry editing based on terrain elevation ([Playground](https://heremaps.github.io/xyz-maps/playground/dist/#Editor-Drag_Marker_on_Terrain))
### core
* fixed: prevent stalling in WebWorker-based tile loaders when requests fail
* fixed: Resolved border stitching of terrain tiles failing with empty neighbors.
### display
* perf: significantly speed up terrain hit-testing and intersection computation for interactive API events
* improved: Specular highlights now render correctly on Tiles in previews and LOD scaling.
* improved: Offload collision detection to task system to reduce frame stalls under high load
* improved: Enhanced lighting for adaptive tiles
* added: Pointer events now correctly trigger for previewed or adaptively scaled tiles (far distance), enabling full interaction on high-pitch map views.
* added: implement basic 3D polygon rendering (best for moderate elevation variation)
* added: implement [getTerrainPointAt)](https://heremaps.github.io/xyz-maps/docs/classes/display.map.html#getterrainpointat) method to retrieve 3D terrain position from screen coordinates
* fixed: VerticalLines using offsetZ could cause polygon misalignment in edge cases
* fixed: tile loading and LOD selection when adaptive and fixed-grid TileLayers are used together
* fixed: prevent error when adding a CustomLayer as the first map layer
* fixed: ensure styles with depthTest=false are rendered on top of transparent geometry

## 0.42.0 (2025-7-11)
### editor
* added: implemented altitude interpolation for 3D geometry applied during link splitting and road network editing in forced 2D mode
* added: Line and Navlink features now support automatic geometry simplification with distance-based tolerance, supporting both pixel and meter units. See [link.simplifyGeometry](http://https://heremaps.github.io/xyz-maps/docs/classes/editor.navlink.html#simplifygeometry).
* fixed: resolve an issue when editing intersections affects hidden roads
### core
* added: introduce [TerrainTileLayer](https://heremaps.github.io/xyz-maps/docs/interfaces/core.terraintilelayeroptions.html) for flexible 3D terrain rendering using raster heightmaps or precomputed meshes, with support for custom decoding, imagery overlays, lighting, and styling. [Playground Example](https://heremaps.github.io/xyz-maps/playground/#Display-3D_Terrain)
* added: TileLayer and TileProviders now support [attribution info](https://heremaps.github.io/xyz-maps/docs/interfaces/core.tilelayeroptions.html#attribution) with optional linked URLs, automatically displayed on the map when the respective data is visible.
### display
* improved: Treat lines as solid when "strokeDasharray" is a dynamic StyleExpression and dashSize resolves to 0
* added: improve adaptive tile loading and LOD selection using pitch-based scaling and adaptive thresholds for optimal tile count
* added: accelerate visual feedback by prioritizing center tile loading
* added: 3D Models now support configurable [Material.wrap](https://heremaps.github.io/xyz-maps/docs/interfaces/core.material.html#wrap) for diffuse/specular/normal maps, enabling per-material texture wrapping (clamp, repeat, mirror) for enhanced UV control
* fixed: optimize projected feature bbox center to match visual center in WebMercator
* fixed: skyColor ignored when set to a solid color, only gradients are effective
* fixed: correct broken rendering of [debug tile grid](https://heremaps.github.io/xyz-maps/docs/interfaces/display.mapoptions.html#debug)
* fixed: ensure [singleWorldView](https://heremaps.github.io/xyz-maps/docs/interfaces/display.mapoptions.html#singleworldview) is respected and prevent map repetition when resizing the map
### common
* fixed: Ensure debug dump logger works correctly with ES2017 target
### playground
* fixed: include transpiled JS in downloaded example code

## 0.41.0 (2025-2-21)
### general
* improved: Upgraded the minimum runtime JavaScript target for all packages to ES2017.
### editor
* added: overlay features now auto-toggle based on edit layers visibility.
### display
* improved: Enhanced balance between performance and view distance by optimizing grid size at very high pitch
* improved: Horizontal text positioning accuracy enhanced, especially with [textAnchor](https://heremaps.github.io/xyz-maps/docs/interfaces/core.textstyle.html#textanchor) enabled
* added: Icons/Images now support texture atlases up to 4096 pixels in size.
* added: collision detection now handles mixed tile sizes more effectively and supports tile sizes of 1024 and larger.
* added: Introduced [singleWorldView](https://heremaps.github.io/xyz-maps/docs/interfaces/display.mapoptions.html#singleworldview) option to control map view repetition on the horizontal and vertical axes, allowing control over one or both axes, or enabling infinite repetition.
* added: add adaptive tile loading to dynamically select larger tiles from higher zoom levels for distant areas, improving performance, rendering efficiency, and viewing distance for high pitch map views.
* fixed: prevent temporary incorrect scaling of 3D Models during tile preview
* fixed: address brief flashing issue in styles rendering requiring two alpha passes

## 0.40.2 (2024-12-10)
### display
* fixed: prevent potential brief preview tile flickering for clipped data sources
### editor
* fixed: clear providers after sending updates and fetch fresh data

## 0.40.1 (2024-12-3)
* fixed: resolve excessive tile processing issue introduced in v0.40.0, boosting performance

## 0.40.0 (2024-11-29)
### editor
* improved: Allow customization of default RangeSelector through enhanced overlay styles.
* added: introduce [getSelectedFeature](https://heremaps.github.io/xyz-maps/docs/classes/editor.editor-1.html#getselectedfeature) method to retrieve the currently selected feature.
* added: Introduced batch editing to group multiple feature modifications into a single history entry. See [batch](https://heremaps.github.io/xyz-maps/docs/classes/editor.editor-1.html#batch), [startBatch](https://heremaps.github.io/xyz-maps/docs/classes/editor.editor-1.html#startBatch), [endBatch](https://heremaps.github.io/xyz-maps/docs/classes/editor.editor-1.html#endBatch), [Playground Example](https://heremaps.github.io/xyz-maps/playground/#Editor-Batch_Changes)
* fixed: Highlighted crossings links are reset in all cases.
* fixed: Ensure RangeSelector fully supports custom Navlink/Line styles and correctly handles zLayer for proper layering.
### display
* improved: refined depth clipping to enhance visual quality at high pitch angles
* improved: Prevent transparency rendering issues when handling clipped data with offsets larger than remote source tile bounds.
* added: Line dashes now support dynamic StyleExpressions with intermediate zoom level support.
* added: The dynamic coloring of the horizon is now possible with [LayerStyle.skyColor](https://heremaps.github.io/xyz-maps/docs/interfaces/core.layerstyle.html#skycolor), including support for gradients for smooth transitions from sky to horizon
* fixed: prevent the Compass UI from causing the map view to be reset in some cases with excessive applied rotation and tilt
### core
* improved: Enhanced [Provider.clear](https://heremaps.github.io/xyz-maps/docs/classes/core.featureprovider.html#clear) to support more flexible inputs, including bounding boxes and tiles.
* added: locally cached tiles can now be queried using [TileProvider.getCachedTiles](https://heremaps.github.io/xyz-maps/docs/classes/core.tileprovider.html#getcachedtiles)
* fixed: resolve incorrect module initialization in non-browser environments like Node.js
* fixed: resolve potential rendering artifacts for huge polygons in MVT datasources

## 0.39.0 (2024-9-6)
### editor
* improved: Full support added for custom Navlink styles, which are now preserved and reapplied during re-rendering, such as in response to pointer events.
* fixed: Ensure [EditRestrictions](https://heremaps.github.io/xyz-maps/docs/editor.editoroptions.html#editrestrictions) are evaluated during AreaShape drag operations
### core
* fixed: ensure valid URL is used for all IMLProvider delete feature requests
* fixed: Ensure custom feature styles are fully respected when using StyleExpressions
* fixed: Ensure ClusterTileLayer properly clears and reclusters when the source data provider is cleared.
### display
* added: Introduced a new lighting engine that enables advanced configuration at both the layer and style levels. For detailed setup instructions, refer to [LayerStyle.lights](https://heremaps.github.io/xyz-maps/docs/interfaces/core.layerstyle.html#lights). See [Playground Example](https://heremaps.github.io/xyz-maps/playground/#Display-Custom_Lightning).
* added: Integrated [specular lighting](https://heremaps.github.io/xyz-maps/docs/interfaces/core.polygonstyle.html#specular), [shininess](https://heremaps.github.io/xyz-maps/docs/interfaces/core.polygonstyle.html#shininess), and [emissive](https://heremaps.github.io/xyz-maps/docs/interfaces/core.polygonstyle.html#emissive) properties for enhanced reflections and self-illumination. These features are applicable to various 3D styles, including extruded Polygons, Boxes, Spheres and Models.
* added: introduce [fillIntensity](https://heremaps.github.io/xyz-maps/docs/interfaces/core.polygonstyle.html#fillIntensity) to control color intensity of 3D styles under directional lighting
* added: Model Styles now support unclamped and extended texture coordinates.
* improved: Enhanced the visuals of Box edges for better clarity and detail.
* fixed: resolve [3D model](https://heremaps.github.io/xyz-maps/playground/#Layers%20/%20Providers-3d_Model_Styles) loading issues in release builds
* fixed: ensure Shininess parameter in Wavefront OBJ materials correctly affects specular reflections
* fixed: Ensure the strokeWidth of Boxes is correctly rendered in all cases
* fixed: Trigger PointerEvents for Point Styles on Polygon geometries
* fixed: resolve slight text flickering during long animations

## 0.38.0 (2024-7-26)
### editor
* improved: Modifying building footprints now works seamlessly even when shape points are covered by building extrusions.
* fixed: correctly edit 3D LineString geometry displayed as 2D due to styling.
* fixed: Resolved issue preventing translation of 3D buildings using the Transformer utility.
### display
* added: LayerStyles can now be defined in pure JSON using [StyleExpressions](https://heremaps.github.io/xyz-maps/docs/modules/core.html#styleexpression). See [Playground Example](https://heremaps.github.io/xyz-maps/playground/#Layers%20/%20Providers-Expression_based_Styling).
* added: Enabled pointer event triggering for flat 2D geometry that is positioned below but rendered on top of 3D geometry.
* improved: Enhanced "opacity" and "strokeDasharray" style properties to support StyleZoomRanges for dynamic zoom-level-based rendering.
* fixed: resolve setBackgroundColor issue with StyleZoomRange or StyleValueFunction.
* fixed: ensure correct rotation and positioning of icons along all segments of LineStrings
* fixed: Resolved alpha blending issues for colors defined as RGBA arrays.
### core
* added: Add [LayerStyle.zLayer](https://heremaps.github.io/xyz-maps/docs/interfaces/core.layerstyle.html#zlayer) for fallback drawing order control when zLayer is not explicitly defined on the style.
* added: Introduce Layer methods [setVisible(visible: boolean)](https://heremaps.github.io/xyz-maps/docs/classes/core.tilelayer.html#setvisible) and [isVisible()](https://heremaps.github.io/xyz-maps/docs/classes/core.tilelayer.html#isvisible) for controlling and querying layer visibility directly, complementing [LayerOptions.visible](https://heremaps.github.io/xyz-maps/docs/interfaces/core.tilelayeroptions.html#visible) without modifying layer presence on the display.
* fixed: resolve packaging issue causing excessive artifact size

## 0.37.0 (2024-5-10)
### display
* fixed: In cases where a particularly large dataset is frequently updated, it could lead to the display of outdated data.
* fixed: The alpha blending of heatmaps has been corrected and is now functioning as intended.
* fixed: Pointerevents at intermediate zoom levels now activate accurately when used alongside StyleZoomRanges/StyleValueFunctions.
### core
* improved: Ensured that all parameters are URL encoded for both "SpaceProvider" and "IMLProvider".
* added: The new [ClusterTileLayer](https://heremaps.github.io/xyz-maps/docs/classes/core.clustertilelayer.html) enables efficient client-side clustering of map-data from various sources, providing optimized clusters at each zoom level, supporting dynamic feature addition/removal and customizable property aggregation for tailored data summarization and display. [Playground Example](https://heremaps.github.io/xyz-maps/playground/#Layers%20/%20Providers-Cluster_and_display_map-data)
* added: Introducing the ["findPath"](https://heremaps.github.io/xyz-maps/docs/classes/core.featureprovider.html#findpath) method for optimal client-side path finding on a GeoJSON road network supporting advanced options such as custom turn restrictions and weights.
* fixed: Custom request parameters utilizing arrays are now properly URL encoded for improved reliability
### editor
* fixed: In exceptionally rare instances, timing issues could cause inconsistent triggering of the 'ready' event.

## 0.36.0 (2023-12-8)
### core
* added: The ["ignoreTileQueryLimit"](https://heremaps.github.io/xyz-maps/docs/core.imlprovideroptions.html#ignoretilequerylimit) option has been introduced to mitigate an excessive number of tile requests.
### display
* improved: The anti-aliasing for lines using floating point widths has been enhanced.
* improved: In the visualization of clipped polygon outlines, the tile edges are excluded, regardless of whether the clipped geometry extends beyond the tile's boundaries.
* improved: The display quality of dashed lines has been improved.
* improved: An updated feature could experience a very brief flicker after changing the zoom level.
* added: The alpha blending has been revamped to enable the map to display with a transparent background, allowing the remaining browser content to show through behind it. See [backgroundColor](https://heremaps.github.io/xyz-maps/docs/interfaces/display.mapoptions.html#backgroundcolor). (#90)
* added: In addition to pixels, dashed lines can now also be defined and displayed in meter units.
* added: It is now possible to combine Images/Icons with dashed line patterns by using [strokeDashimage](https://heremaps.github.io/xyz-maps/docs/interfaces/core.linestyle.html#strokedashimage).
* added: Image/Icon styles now support the use of Icon[Atlases](https://heremaps.github.io/xyz-maps/docs/interfaces/core.imagestyle.html#atlas).
* added: By using [textAnchor](https://heremaps.github.io/xyz-maps/docs/interfaces/core.textstyle.html#textanchor) it is now possible to align the text relative to the anchor point.
* added: Introduced [CollisionGroup](https://heremaps.github.io/xyz-maps/docs/interfaces/core.textstyle.html#collisiongroup) which allows to define various CollisionGroups (multiple Styles grouped together that will be handled as a single collision object) within the same StyleGroup.
* added: LayerStyles backgroundColor now supports dynamic colors taking zoom level into account.
* added: Colors now support hexadecimal color strings with alpha and hexadecimal numbers as input.
* fixed: The triggering of pointer events for 3D point geometry was inconsistent across various scenarios.
* fixed: The tile preview is only partially displayed when zoomed out.
* fixed: In very rare cases, Chrome could cause text to be displayed offset.
* fixed: Using StrokeDashArray with very long lines could result in artifacts.
* fixed: Glitches that may have appeared on the edges of previewed raster tiles have been resolved.
* fixed: Issues with occasional tile preview display glitches have been fixed.
### editor
* improved: The [createFeatureContainer](https://heremaps.github.io/xyz-maps/docs/classes/editor.editor-1.html#createfeaturecontainer) function now accommodates multiple arrays of features as arguments. [fix #91]

## 0.35.0 (2023-8-22)
### display
* improved: The display of preview tiles has been optimized.
* improved: Tiles that are not part of the actual viewport but whose data is still visible due to the high altitude are now processed and displayed.
* added: A new [HeatmapStyle](https://heremaps.github.io/xyz-maps/docs/interfaces/core.heatmapstyle.html) has been introduced, which makes it possible to visualize density maps where the data density is displayed in different colors. [Playground Example](https://heremaps.github.io/xyz-maps/playground/#Layers%20/%20Providers-Heatmap)
* added: Point styles can now also be applied separately to line ranges with the anchor set to "Line".
* fixed: Tile previews of transparent point styles may flicker for a very brief moment
* fixed: Fixes an issue where tiles are only partially visible when the map is tilted at a steep angle.
* fixed: The Compass UI now works properly even when the map is heavily pitched.
* fixed: In rare cases, points may be offset if they lie exactly on a tile boundary.
* fixed: Region-based point styles with an explicitly defined altitude are not displayed if there is no altitude in the source geometry.
### editor
* added: It is now possible to select multiple LineShapes/NavlinkShapes and drag them simultaneously to change position. See: [shape.select()](https://heremaps.github.io/xyz-maps/docs/classes/editor.lineshape.html#select), [Playground](https://heremaps.github.io/xyz-maps/playground/#Editor-Drag_multiple_Shapes)

## 0.34.0 (2023-6-21)
### editor
* improved: The RangeSelector utility now treats RangeMarkers that are exactly on top of each other as a valid zero-length range.
* improved: The RangeSelector utility now defines ranges with a precision of 9 decimal places.
* fixed: Dragging the VirtualShape of a Navlink feature with 3d coordinates can result in offset geometry
* fixed: Snapping Navlink shapes can fail when Navlink and Line features are mixed in the same layer source.
* fixed: Turn restrictions from 3D data may be misaligned when forcing a 2D display.
* fixed: For 3D Addresses/Places, the anchor line of routing points can be displayed incorrectly.
* fixed: The crossing tester utility used elevation even though 2D mode was enforced.
### display
* improved: Features can now be at even higher altitudes before being clipped.
* improved: Text placed on 3D line geometry is now properly aligned.
* added: 3D models in Wavefront .obj format can now be placed and viewed on the map using [ModelStyle.model](https://heremaps.github.io/xyz-maps/docs/interfaces/core.modelstyle.html#model)
* added: Alpha support for 3D Models.
* added: 3D Models do now support ambient light, emissive light, specular highlights and normal-maps.
* fixed: Pointer events may fire incorrectly for high altitude Spheres
* fixed: Text placed on lines is now always rendered correctly.
### common
* added: Tasks can now be paused during runtime and resumed at any point in time.

## 0.33.0 (2023-4-6)
### editor
* added: Editing of 3D LineString geometry is now automatically enforced in 2D only when using 2D styling.
* added: The CrossingDetector utility now supports 3D line geometry and automatically switches between 2D and 3D modes based on the style used.
* fixed: The crossing tester utility detects too many crossings when used with 3d line geometry.
* fixed: Trigger pointerleave events for hovered features currently in submit process can fail
### display
* improved: Improved rendering of intersecting 3D Icon-styles with transparency
* improved: The rendering of lines in 3D space has been improved
* added: New [ModelStyles](https://heremaps.github.io/xyz-maps/docs/interfaces/core.modelstyle.html) have been introduced that allow features to be displayed as 3D models including lighting support.
* added: Point and line styles can now be configured whether to scale their size based on the altitude. See: [scaleByAltitude](https://heremaps.github.io/xyz-maps/docs/interfaces/core.style.html#scaleByAltitude)
* added: Altitude is now taken into account when projecting a geographic coordinate in pixels.
* fixed: Pointer events for 3d lines are now triggered correctly in intermediate zoom levels.
* fixed: Using range based line styling can, in rare cases, lead to a crash.
* fixed: Line ranges can be ignored if the start/end of the range is exactly on a line coordinate.
* fixed: If longitude exceeds 180 degrees, an incorrect tile may be displayed.
* fixed: Heavy workload/layer-setup may cause collision detection to crash
* fixed: Searching for rendered features at a specific pixel will fail if the layers are not explicitly passed
### core
* fixed: Using custom margin was ignored when set via TileLayer constructor

## 0.32.0 (2022-10-14)
### editor
* improved: Attempting to create an invalid feature using the drawing board now returns undefined.
* added: Full 3d geometry editing support for Navlink, Address and Place Features has been added.
* fixed: Pointerup now triggers correctly after selecting or dragging an address/place.
### display
* improved: Improved near-plane clipping of features using altitude.
* improved: Pointer events for 2d point styles are now triggered "pixel perfect" in all cases.
* added: Support to integrate custom renderers into the map by using [CustomLayer](https://heremaps.github.io/xyz-maps/docs/classes/core.customlayer.html) has been added.
* added: The map can now be pitched up to 85 degrees. see [maxPitch](https://heremaps.github.io/xyz-maps/docs/interfaces/display.mapoptions.html#maxpitch).
* fixed: Text placed on line geometry without collision detection was not displayed correctly

## 0.31.0 (2022-8-23)
### core
* added: The ImageProvider can now be configured to display an [errorImage](https://heremaps.github.io/xyz-maps/docs/interfaces/core.imageprovideroptions.html#errorimage) for failing tile requests.
* added: Introduced remote [preprocessor](https://heremaps.github.io/xyz-maps/docs/interfaces/core.imageprovideroptions.html#preprocessor) to enable custom data processing for remote image sources.
* added: The credentials of IMLProvider and SpaceProvider can now be updated at any time via [provider.config({credentials: {...}})](https://heremaps.github.io/xyz-maps/docs/classes/core.imlprovider.html#config)
### editor
* improved: The [snapTolerance](https://heremaps.github.io/xyz-maps/docs/interfaces/editor.editoroptions.html#snaptolerance) option is now taken into account for crossing detection.
* fixed: Navlinks may still have been highlighted even though the intersection was no longer selected.
* fixed: Altitude precision is reduced when restoring Navlink Features through a local undo operation.
### display
* improved: Handling of missing image tile data has been improved.
* added: The camera (position) of the current view can now be retrieved using [map.getCamera()](https://heremaps.github.io/xyz-maps/docs/classes/display.map.html#getcamera)
* fixed: Visualizing point styles on 3D polylines fails when used in combination with collision detection.
* fixed: 2D roads disappear when the map is pitch or rotated
* fixed: Text placed on a polyline might be upside down

## 0.30.0 (2022-8-5)
### core
* added: The ImageProvider supports images contained in a 404 status response.
### display
* added: Box and Sphere styles now support [Style.offsetX](https://heremaps.github.io/xyz-maps/docs/interfaces/core.style.html#offsetX) / [Style.offsetY](https://heremaps.github.io/xyz-maps/docs/interfaces/core.style.html#offsetY).
* added: All Point styles can now be offset along the z-axis. See: [offset](https://heremaps.github.io/xyz-maps/docs/interfaces/core.style.html#offsetZ).
* added: It is now possible to specify the offset in pixels as well as meters for all point styles.
* added: Style of type "Image" can now be offset in meters
* fixed: Styled line segments of ring geometries were not rendered correctly.
* fixed: Pointerevents are now triggered correctly in all cases for 3d Point styles
### editor
* added: The height of buildings can now be changed by the user using mouse or touch gestures
* added: Support for custom set feature styles has been added and is respected when features require re-rendered due to editing operations.
* added: The RangeSelector is now more flexible and also be used with generic LineString geometry.
* fixed: In rare cases, stuttering could occur when dragging a RangeMarker.
* fixed: The Range Overlapping detection now also works with specific sides.
* fixed: Using the RangeSelector with circular topology has been improved.
* fixed: The local edit history was possibly not correct when dragging a ShapePoint from two connected Areas.
* fixed: dragging RangeMarkers when the map is rotated or pitched is now possible.
* fixed: Pointer-events for Point styles that use viewport alignment may not be triggered.

## 0.29.0 (2022-7-13)
### display
* added: Point Styles used with line geometry now supports line segments to allow for custom placement and styling. See: [Style.from](https://heremaps.github.io/xyz-maps/docs/interfaces/core.style.html#from) / [Style.to](https://heremaps.github.io/xyz-maps/docs/interfaces/core.style.html#to)
* fixed: The size of Spheres and Boxes is now displayed correctly in intermediate zoom levels.
* fixed: Pointer-events for styles of type "Sphere" and "Box" were not triggered correctly.
### editor
* added: The transformer utility has been updated and now provides proportional scaling, custom styling and improved rotation handling.
* added: [EditorOptions](https://heremaps.github.io/xyz-maps/docs/interfaces/editor.editoroptions.html) can now be read and changed at runtime. See: [editor.config](https://heremaps.github.io/xyz-maps/docs/classes/editor.editor-1.html#config)
* added: The precision of the positioning of routing points can now be configured via ["routingPointPrecision"](https://heremaps.github.io/xyz-maps/docs/interfaces/editor.editoroptions.html#routingPointPrecision) option.
* added: The degree of simplification for drawn geometry can now be controlled via the ["tolerance"](https://heremaps.github.io/xyz-maps/docs/classes/editor.drawingboard.html#start) option.
* fixed: The reference point on the ground is now displayed correctly.
* fixed: Improved handling of Marker features whose altitude is explicitly overridden by styles

## 0.28.0 (2022-7-1)
### editor
* added: Tapping on LineShape or Marker features will trigger pointerdown events.
* added: The drag behavior of Markers and LineShape features can now be configured to define the "dragAxis" or "dragPlane" on which to drag the feature.
* added: It is now possible to use custom IDs for newly created features by using [option.forceRandomFeatureId](https://heremaps.github.io/xyz-maps/docs/interfaces/core.editableremotetileprovideroptions.html#forceRandomFeatureId).
* added: The altitude of Marker Features can now be modified by user interaction.
* added: Basic editing of 3d line geometry is now possible.
* fixed: Dragging Features with the right mouse button may result in tiny map movements.
### core
* fixed: anchor "Centroid" is now correctly declared in typescript declarations
### display
* improved: Optimized point placement for tiny polygon geometries when using style.anchor="Centroid"
* added: Box Styles can be rotated around the z-axis.
* added: The minimum threshold for detecting a pan or pitch map gesture can now be configured.
* added: The altitude of point and line geometry can now be displayed in 3D space using styles of type Circle, Rectangle, Image, Text and Line. See: [Style.altitude](https://heremaps.github.io/xyz-maps/docs/interfaces/core.style.html#altitude).
* added: Pointerevent triggering now supports 3d geometry and styles.
* added: New 3d styles of type "Sphere" and "Box" have been added.
* fixed: The pointer-event target is now set correctly in all cases.
* fixed: When using zLayer, an incorrect drawing order could occur in rare cases.
* fixed: The placement of icon using different "alignments" is now correct in all cases.

## 0.27.0 (2021-12-15)
### editor
* added: Editing of Line Features with "MultiLineString" geometry is now supported.
### display
* improved: Line-joins of offset polylines now support more acute angles.
* added: offset Lines with ring geometries are now displayed as closed.
* added: Styles of type "Circle", "Rect", "Text" and "Image" can now be placed at the centroid/geometric center of polygon geometry. Usage: [Style.anchor="Centroid"](https://heremaps.github.io/xyz-maps/docs/interfaces/core.style.html#anchor)
* added: The triggering of PointerEvents now takes into account the [Style.offset](https://heremaps.github.io/xyz-maps/docs/interfaces/core.style.html#offset) and empty space between multiple offset lines
* fixed: In rare cases, lines close to tile-edges can become fragmented.
* fixed: PointerEvents for Lines with strokeWidth defined in meter were not triggered correctly if the map is zoomed in very close (z20+).
* fixed: Curves were displayed incorrectly in rare cases.
### general
* improved: several typescript declaration related fixes and improvements.
* fixed: possible dependency resolution issues when using webpack/rollup

## 0.26.0 (2021-10-7)
### editor
* added: Snap coordinates to Navlink geometry nearby can now be controlled by using [navlink.behavior(...)](https://heremaps.github.io/xyz-maps/docs/classes/editor.navlink.html#behavior)
* fixed: ShapePoints of selected Lines and Navlinks where invisible when the strokeWidth was defined in meters.
* fixed: AreaShapes can only be moved with difficulty if the associated Area feature is only displayed as a line
### display
* improved: display.snapshot() is now more robust for invalid input dimensions on iOS devices.
* added: pointer-events are triggered based on the "outline" of Polygon geometry when displayed with a line style only
* fixed: Mouse-events are not propagated through the DOM on touch devices when the user taps the map.
* fixed: A time-sensitive issue in connection with icon resource loading and collision detection has been solved.
* fixed: PointerEvents for Lines were not triggered correctly if the strokeWidth was defined in meters.
* fixed: Not all elements of a "CollisionGroup" were hidden when the map was pitched or rotated.
* fixed: The result of display.getFeaturesAt only included features that intersect with the center of the search rectangle
* fixed: Automatic downscaling of oversized (non SVG) image sources

## 0.25.0 (2021-9-7)
### editor
* added: Introduced a new hook "Coordinates.update" that's being executed whenever the coordinates of a feature are updated, modified or removed. see [CoordinatesUpdateHook](https://heremaps.github.io/xyz-maps/docs/modules/editor.html#coordinatesupdatehook)
* fixed: hiding the RangeSelector might fail while submit operation is in progress.
* fixed: Missing history entry when calling lineShape.remove()
### display
* improved: The collision detection is now quantizing bounding-boxes for better space utilisation of rotated/elongated objects.
* improved: Optimized performance of collision detection.
* improved: transparent extruded polygons(Buildings) with height of 0 are hidden when they are covered by other transparent Buildings within the same zIndex.
* added: Take a screenshot of the current viewport of the map (or part of it) by using [map.snapshot](https://heremaps.github.io/xyz-maps/docs/classes/display.map.html#snapshot)
* added: The outer edges of extruded polygons (Buildings) can now be highlighted and styled individually. See [Style.stroke](https://heremaps.github.io/xyz-maps/docs/interfaces/core.style.html#stroke), [Style.strokeWidth](https://heremaps.github.io/xyz-maps/docs/interfaces/core.style.html#strokewidth)
* added: The base of an extruded Polygon (Building) can now be offset from the ground. See [Style.extrudeBase](https://heremaps.github.io/xyz-maps/docs/interfaces/core.style.html#extrudebase)
* fixed: labels might be placed incorrectly when using multiple text styles for the same geometry.
* fixed: Points that are exactly on the tile boundary may have been placed incorrectly
* fixed: Inaccurate collision detection of objects with offset from different TileLayers with mixed tile-sizes.
* fixed: Incorrect collision detection of collision-groups that used offset and rotation when the map is pitched/rotated.
* fixed: Buildings might not be displayed when alpha is used and the height is explicitly set to 0.
### general
* improved: Added missing documentation and typescript declarations for Attribute Readers/Writers and editing Hooks.

## 0.24.0 (2021-7-23)
### core
* added: the remote URL of an MVTLayer can now also be defined as a function with which the URL can be configured on a tile basis
### editor
* added: The RangeSelector now supports to snap Ranges automatically. see [Range.snap](https://github.com/heremaps/xyz-maps/docs/interfaces/editor.range.html#snap), [Range.snapTolerance](https://github.com/heremaps/xyz-maps/docs/interfaces/editor.range.html#snaptolerance)
* added: The overlapping of Ranges can now be allowed or prevented. see [Range.allowOverlap](https://github.com/heremaps/xyz-maps/docs/interfaces/editor.range.html#allowOverlap)
* added: As soon as you drag a NavlinkShape or AreaShape, it is now automatically snapped to nearby geometries.
* fixed: Navlink features were erroneously marked as modified in very rare cases.
* fixed: Undoing changes of Address features triggered the execution of the "writeEditState hook", which could lead to an incorrect restore
### display
* improved: Support for image sources larger than 64 pixels through automatic downscaling
* improved: the view bounds of the map can now be set using a bow animation. usage: display.setViewbounds( bounds, animate?: boolean|options )
* added: the map center/zoomlevel can now be set using a bow animation combining pan and zoom operations. usage: map.flyTo(center, zoomlevel?, options?)
* fixed: very long text placed on line geometry may have been misaligned
* fixed: TileLayers with semi-transparent image tile data were covering underlying layers.
* fixed: Circles and Rectangles were not displayed when the alignment was set to "map"

## 0.23.0 (2021-6-22)
### editor
* added: Snap coordinates to polygon geometry nearby can now be controlled by using area.behavior('snapCoordinates', boolean)
* added: The DrawingBoard now provides getters and setters to retrieve and modify the geometry of the currently drawn feature.
* fixed: Holes of connected polygons are included in the geometry validation.
### display
* improved: Rotation precision of text based on line geometry.
* added: Control the space check for point styles on line geometries by using style.checkLineSpace=boolean.
* added: Improved visuals for extruded polygons / buildings that are using alpha.
* added: Images are rotated based on line geometry when the anchor is set to "Line" and alignment is set to "map".
* fixed: pointer-events were missing for lines with a strokeWidth below 1 pixel.
* fixed: Polygon holes were ignored for pointer-event triggering.
* fixed: the lighting of certain polygons with extrusion was not correct in some cases.
* fixed: Possible rendering artifacts on the outer edges of buildings.
* fixed: polylines were not displayed on some android mobile devices.
* fixed: Point-styles using offsetX/offsetY can collide when the map is zoomed.
* fixed: Possible collision of Point-styles that are offset and anchored on line geometry when the map is pitched.
* fixed: Offset Images anchored on the line geometry were placed incorrectly.
* fixed: The rotation was possibly missing for CollisionGroups with text style and anchor set to "Line".
### playground
* fixed: The code editor might jump to another line while editing an example.

## 0.22.0 (2021-5-10)
### display
* improved: optimised text placement on line geometries.
* improved: distancing of repeated StyleGroups.
* improved: space utilization of collision detection.
* added: style.repeat can now be used with all Point styles and collision-groups.
* added: support for collision detection based on the combined bounding-boxes of entire StyleGroups.
* added: In addition to Text, now also Circles, Rectangles, and Images can be displayed using (Multi)LineString geometry.
* added: Support for "CollisionGroups" based on (Multi)LineString geometries.
* added: The "anchor" of Text, Circles, Rectangles and Images can now be defined for LineString geometries. usage: style.anchor = 'Line' | 'Coordinate'.
* added: support for "Image" styles using (Multi)LineString geometry.
* added: support for collision detection of Circle, Rect and Image styles based on point geometry.
* added: support for Circle/Rect/Image styles using (Multi)Polygon geometry.
* added: set the map's center and zoomlevel to fully contain the visible area of several features. e.g. display.setViewBounds(Feature[]|FeatureCollection)
* added: support for line wrapping of text on line geometry. (disabled by default)
* fixed: text on line geometry flickered or was cut off in rare cases.
* fixed: trigger pointer-evens for offset points or Text.
* fixed: rotation was ignored for Text styles that are using "viewport" alignment.
* fixed: collision detection is ignored if collide property is defined as a StyleFunction.
* fixed: missing pointer-events for Rects and Images without an explicitly defined "height" property.
* fixed: "clipping geometry" of clipped data sources that use a tile margin/buffer may be visible.
### core
* added: pointerEvents can now be enabled or disabled in TileLayer constructor. (deactivated for MVTLayer by default)
* fixed: optional margin option was ignored for MVTLayers.

## 0.21.1 (2021-3-11)
###display
* fixed: text that uses offsetX/offsetY is incorrectly offset on retina devices
* fixed: text stroke rendering artifacts in Firefox
* fixed: styles that are using colors with StyleZoomRanges are invisible

## 0.21.0 (2021-3-9)
### editor
* added: typescript declarations for the public api interface
* fixed: extruded areas / Buildings can't be translated by user-interaction with the transformer utility in certain layer configurations
* fixed: x,y coordinates are flipped in deprecated "editor.PixelCoordinate" of legacy api interface
### display
* added: typescript declarations for the public api interface
* added: Lines, Circles and Rectangles can now be defined and displayed with dimensions in meters. e.g. style.radius = "1m"
* added: Support to offset Circles and Rects in meters e.g. style.offsetX = "1m"
* added: Lines can now be offset in meters to the left or right. e.g. lineStyle.offset = "1m"
* improved: pointer event triggering now supports a larger position offset for point styles
* fixed: broken event triggering of features that are styled using "zoomRange" values.
* fixed: invoke "styleValueFunctions" with the correct zoomlevel in any case
* fixed: text that uses stroke and alpha is displayed opaque
* fixed: missing pointer-events when the map is zoomed in very close (zoomlevel >22)
### core
* added: typescript declarations for the public api interface
### general
* added: typescript support in the api playground
* added: the playground now supports code completion/suggestions using the api type declarations.

## 0.20.0 (2021-2-12)
### editor
* added: Convert mixed geographical and pixel coordinates of various formats to GEOJSONCoordinates.
* added: "dragStart", "dragMove" and "dragStop" events can be listened when a Zone of the ZoneSelector utility is dragged.
* fixed: tiles can flicker when features are hovered, selected or modified
* fixed: adding a feature without properties
### core
* added: New editable remote TileProvider "IMLProvider" with support for "HERE Interactive Map Layer" remote data sources
### display
* improved: dashed lines are now antialiased and free of double contours
* fixed: several edge cases can lead to unintended label collisions
* fixed: correct positioning of screen aligned text with offset when the map is scaled
* fixed: possible cutoff Lines on tile boundaries for unclipped datasources
* fixed: strokeWidth is used to determine the correct size of Circles
* fixed: stroke is visible even though style.strokeWidth is set to 0 explicitly
* fixed: offset text can collide on retina devices
### general
* improved: new api playground and documentation

## 0.19.0 (2020-12-23)
### editor
* improved: zoneSelector is still active and visible after mapview change
* improved: updated zoneSelector styling and improved customization
* fixed: display correct Zone offset positions in all cases
* fixed: Zone Markers are not draggable in some cases
### core
* fixed: data will be send twice if a remote postProcessor is used.
### display
* added: line geometries can now be split into several segments and styled individually. usage: style.from/to=number[0-1] (0-100%)
* added: Support to display lines offset to the left or right side. use: style.offset=number. positive/negative values offsets in pixel to the left/right side (relative to line direction)
* improved: crisp icon rendering
* improved: Image tiles are rendered more sharply
* fixed: proper pointer-event triggering for offset point-styles
* fixed: map aligned icons are displayed with double size
* fixed: trigger pointer-events for lines and polygons correctly in all cases
* fixed: point data of MVT datasources that`s located outside of the actual tile boundaries might be placed incorrectly
* fixed: rotated text can be invisible
* fixed: offset text can be placed incorrectly if map is rotated
* fixed: label collision detection for offset text

## 0.18.0 (2020-12-7)
### display
* added: support for right to left text and arabic contextual forms
* added: Automatic line wrapping for Text on Point geometries. use
* added: support explicit line breaks '\n' for text on Point geometries
* improved: Correctly render font outlines in case of text characters are overlapping/nested
* improved: sharper text rendering
* improved: text rendering performance and memory usage.
* fixed: font opacity is ignored if the style is using alpha in fill or stroke colors
* fixed: text on line geometry can be upside down if map is rotated

## 0.17.0 (2020-11-9)
### core
* added: introduced provider postprocessors and preprocessors to enable custom data processing for remote data sources.
* improved: add/remove Feature is more robust for invalid input
* fixed: adding an empty FeatureCollection/Array via provider.addFeature(..) throws an exception. [fix #43]
### editor
* fixed: zoneSelector util does not display side of zone [fix #44]
### display
* fixed: tiny lines (centimeter range) might only be partially rendered [fix #42]
* fixed: mapdata can be invisible if map is initialized with zoomlevel greater than 20
* fixed: text-style properties for line geometries are ignored if defined as style-functions. [fix #41]

## 0.16.0 (2020-10-9)
### display
* added: Support for global style-based feature drawing order across all layers. usage: style.zLayer=number
* improved: Drawing order doesn't affect label priority handling in collision detection
* fixed: slight flickering at image tile boundaries/edges on iOS devices
* fixed: possible invisible labels that are colliding and placed very close to tile boundaries
### editor
* improved: use cross layer styling to ensure routing-point is always rendered below display-point
* fixed: navlink direction/turn-restriction icons are aligned incorrectly when map is pitched/rotated [fix #40]

## 0.15.2 (2020-9-11)
### editor
* improved: Area drawing with drawingBoard. invalid geometry (self-intersections) are temporarily allowed and highlighted.
### display
* fixed: Zoom steps using the mousewheel in Firefox are very small [fixes #36]
* fixed: layerStyles backgroundColor is ignored in case of default backgroundColor is set via display.setBackgroundColor(..) [fixes #35]
* fixed: invisible viewport in case of map is initialized with element that`s not inserted into DOM

## 0.15.1 (2020-8-21)
### display
* improved: Icon positioning precision when map is zoomed in very close (zoomlevel >22)
* fixed: ZoomControl UI becomes invisible on safari when map is pitched and Compass UI is active
* fixed: Circles/Rects are partially not visible on mobile (iOS/Android)

## 0.15.0 (2020-8-19)
### editor
* improved: Geometry editing when map is pitched or rotated
* improved: indexing of Places and Addresses that are including routing points
* fixed: update custom zlevels when a navlink shape gets removed
### display
* added: the map can now be zoomed in much closer to enable use cases like indoor editing. use: displayOptions.maxLevel=number to set max allowed zoomlevel
* added: Support for alignment "map" for Rects and Circles
* added: Support for alignment "viewport" for Icons/Images [default]
* added: Polygons/Lines and Points(Rect/Circle/Image/Text) can be drawn in front or behind of extruded polygons (buildings) depending on "zIndex" property
* improved: improved animation when zooming in/out
* fixed: Image styles using rotation with negative angle is ignored
* fixed: Circle and Rects are cut off on the plane when map is pitched
* fixed: draw strokeWidth of rects with correct size in pixel
* fixed: Possible rendering artifacts for polygon outlines when map is pitched
* fixed: various issues when browser zoom is active
* fixed: possible bright outlines for lines using stroke dasharray

## 0.14.1 (2020-7-27)
### editor
* fixed:  (virtual)shapes of simple LINE features are not draggable
* fixed:  remote feature search by id errors in case of result feature geometry is missing

## 0.14.0 (2020-7-14)
### editor
* added: attribute reader/writer interface to allow use of custom zLevel models
### display
* added: styling support of 3-digit hex color codes
* added: styling now supports "zoomRanges" to define zoom dependant values. values for intermediate zoom levels will be interpolated linearly. e.g. "radius": { "5": 10, "15": 20 }
* added: hide tile boundaries of polygon geometry from clipped datasources
* improved: disable pointerevent triggering while mapview is changing
* improved: more robust/tolerant parsing of invalid css rgb(a) color codes
* fixed: trigger pointerevents for MVT datasources
* fixed: artifacts when map is pitched and image tiles are placed below vector tiles
* fixed: allow style functions for font stroke/fill colors
* fixed: possible flicker of tile boundaries
* fixed: call stylefunctions always with correct zoomlevel
### core
* fixed: consider tilesize for contentbounds determination when tilemargin is used

## 0.13.0 (2020-6-10)
### editor
* added: Full editing support of LocalProvider data with Editor component. use providerOptions.editable=true to allow editing.
* fixed: add hole(s) to polygon geometries works in all cases
* removed: deprecated legacy API interface
### display
* added: show map Compass UI widget when rotate/pitch behaviour is activated. Mapview gets reset on click.
* improved: optimized triangulation of extrudes from unclipped source data
* fixed: visible tile boundaries for certain geometries using alpha when map is pitched/rotated
* fixed: trigger "mapviewchange" event if map pitch is changing only.
* fixed: correct drawing order for tile preview data in all cases
* fixed: triangulation of polygon geometry from geojson 2d datasources
* fixed: draw full polygon geometry when coordinates are modified/updated
* fixed: visible tile flickering on zoom changes

## 0.12.0 (2020-5-22)
### display
* added: control minimum distance of repeated text labels on line geometries via style.repeat=number
* improved: optimised memory usage and performance improvement of geometry buffer creation
* improved: optimised triangulation of polygons from unclipped source data
* improved: reuse projected coordinates if line geometry is rendered multiple times
* improved: major performance improvement of line triangulation of very large unclipped geometries
* fixed: behavior settings on mobile/touch have no effect
* fixed: set exact minimum/maximum configured zoomlevel by mouse/touch
* fixed: default to configured "minLevel" when viewport lock gets reset
* fixed: text labels are placed correctly on line geometries in all cases
* fixed: possible strokedasharray pattern mismatch of ending line segments
* fixed: artifacts for polygon geometry with very large coordinate count
### editor
* fixed: update "hovered" state of places/addresses when pointerenter/pointerleave listeners are executed
### core
* added: preprocess result of remote search by id(s) if custom preprocessor is defined

## 0.11.1 (2020-4-24)
### display
* improved: two finger pinch gesture detection on touch devices
* improved: cross layers collision detection with mixed tilesizes
* fixed: FeatureProviders are hidden if used in combination with ImageProvider
* improved: correct orientation of text on line geometry when map is rotated

## 0.11.0 (2020-4-21)
### display
* added: it's now possible to pitch and rotate the map
* added: label collision detection for Text based on Line geometries.
* added: realtime label collision when map gets transformed
* added: control visibility of Text in case of label collision via style.priority=number
* added: control alignment of Text if map is pitched/rotated via style.alignment="map"|"viewport"
* added: set initial map pitch/rotate via options.pitch/options.rotate=number
* added: initial behavior settings can now be configured via options.behavior
* added: pitch/rotate map via api by map.pitch(deg) or map.rotate(deg)
* fixed: init map with float zoomlevel
* fixed: show TAC UI even if no url is defined
* fixed: viewportReady event can get triggered too early (webgl only)
* fixed: stroke of rects/circles is rendered with wrong strokeWidth on retina devices
* fixed: text positioning on retina devices if style uses offsetX/offsetY
### editor
* fixed: make sure parentlink is in origin state if linksplit gets reverted in any case

## 0.10.1 (2020-3-9)
### general
* fixed:  bundling issues when webpack is used to consume packages
### editor
* fixed:  Line/Navlink Shapes not displayed correctly in case of feature style is using value functions

## 0.10.0 (2020-03-03)
### display
* added: new webgl based 3d map renderer.
* added: use style.extrude property to render polygon extrudes (buildings).
* added: label collision detection. active by default. use style.collide=false to deactivate.
* added: Default Copyright Owner can now be set via display options: options.UI.Copyright.defaultOwner=string
* added: Terms and Conditions UI can now be configured: options.UI.Copyright.termsAndConditions={label?:string, url:string}
* added: custom Map Logo can now be set via displayOptions.UI.Logo.url=string
* fixed: Copyright UI is initially showing details button even if enough space is available
* fixed: Copyright UI is updating copyright info on zoom change in any case
* fixed: pointerevent triggering is not disabled during pan/zoom animations for better smoothness
* fixed: pointerevent triggering ignores zIndex for stacked (multi)polygons
* fixed: try to recreate tile preview if none is available
* fixed: rect positioning and rotation
### core
* improved: clipped data processing improves map responsiveness
* fixed: calculate feature's bbox in case its already existing
