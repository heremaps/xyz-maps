## 0.25.0 (2021-9-7)
### editor
* added: Introduced a new hook "Coordinates.update" that's being executed whenever the coordinates of a feature are updated, modified or removed. see [CoordinatesUpdateHook](https://heremaps.github.io/xyz-maps/docs/modules/editor.html#CoordinatesUpdateHook)
* fixed: hiding the RangeSelector might fail while submit operation is in progress.
### fixed
* editor: Missing history entry when calling lineShape.remove()
### general
* improved: Added missing documentation and typescript declarations for Attribute Readers/Writers and editing Hooks.
### display
* improved: The collision detection is now quantizing bounding-boxes for better space utilisation of rotated/elongated objects.
* improved: Optimized performance of collision detection.
* improved: transparent extruded polygons(Buildings) with height of 0 are hidden when they are covered by other transparent Buildings within the same zIndex.
* added: Take a screenshot of the current viewport of the map (or part of it) by using [map.snapshot](https://heremaps.github.io/xyz-maps/docs/interfaces/editor.range.html#snap)
* added: The outer edges of extruded polygons (Buildings) can now be highlighted and styled individually. See [Style.stroke](https://https://heremaps.github.io/xyz-maps/docs/interfaces/core.style.html#stroke), [Style.strokeWidth](https://https://heremaps.github.io/xyz-maps/docs/interfaces/core.style.html#strokewidth)
* added: The base of an extruded Polygon (Building) can now be offset from the ground. See [Style.extrudeBase](https://heremaps.github.io/xyz-maps/docs/interfaces/core.style.html#extrudebase)
* fixed: labels might be placed incorrectly when using multiple text styles for the same geometry.
* fixed: Points that are exactly on the tile boundary may have been placed incorrectly
* fixed: Inaccurate collision detection of objects with offset from different TileLayers with mixed tile-sizes.
* fixed: Incorrect collision detection of collision-groups that used offset and rotation when the map is pitched/rotated.
* fixed: Buildings might not be displayed when alpha is used and the height is explicitly set to 0.

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

## 0.22.0 (2021-6-21)
### playground
* fixed: The code editor might jump to another line while editing an example.
### editor
* added: The DrawingBoard now provides getters and setters to retrieve and modify the geometry of the currently drawn feature.
* fixed: Holes of connected polygons are included in the geometry validation
* added: Snap coordinates to polygon geometry nearby can now be controlled by using area.behavior('snapCoordinates', boolean)
### display
* added: Control the space check for point styles on line geometries by using style.checkLineSpace=boolean.
* fixed: pointer-events were missing for lines with a strokeWidth below 1
* fixed: Polygon holes were ignored for pointer-event triggering
* fixed: the lighting of certain polygons with extrusion was not correct in some cases
* fixed: Possible rendering artifacts on the outer edges of buildings
* added: Improved visuals for extruded polygons / buildings that are using alpha.
* fixed: polylines were not displayed on some android mobile devices
* fixed: Point-styles using offsetX/offsetY can collide when the map is zoomed.
* fixed: Possible collision of Point-styles that are offset and anchored on line geometry when the map is pitched.
* fixed: Offset Images anchored on the line geometry were placed incorrectly
* added: Images are rotated based on line geometry when the anchor is set to "Line" and alignment is set to "map".
* improved: Rotation precision of text based on line geometry.
* fixed: The rotation was possibly missing for CollisionGroups with text style and anchor set to "Line".

## 0.22.0 (2021-6-21)
### playground
* fixed: The code editor might jump to another line while editing an example.
### editor
* added: The DrawingBoard now provides getters and setters to retrieve and modify the geometry of the currently drawn feature.
* fixed: Holes of connected polygons are included in the geometry validation
* added: Snap coordinates to polygon geometry nearby can now be controlled by using area.behavior('snapCoordinates', boolean)
### display
* added: Control the space check for point styles on line geometries by using style.checkLineSpace=boolean.
* fixed: pointer-events were missing for lines with a strokeWidth below 1
* fixed: Polygon holes were ignored for pointer-event triggering
* fixed: the lighting of certain polygons with extrusion was not correct in some cases
* fixed: Possible rendering artifacts on the outer edges of buildings
* added: Improved visuals for extruded polygons / buildings that are using alpha.
* fixed: polylines were not displayed on some android mobile devices
* fixed: Point-styles using offsetX/offsetY can collide when the map is zoomed.
* fixed: Possible collision of Point-styles that are offset and anchored on line geometry when the map is pitched.
* fixed: Offset Images anchored on the line geometry were placed incorrectly
* added: Images are rotated based on line geometry when the anchor is set to "Line" and alignment is set to "map".
* improved: Rotation precision of text based on line geometry.
* fixed: The rotation was possibly missing for CollisionGroups with text style and anchor set to "Line".

## 0.22.0 (2021-6-21)
### playground
* fixed: The code editor might jump to another line while editing an example.
### editor
* added: The DrawingBoard now provides getters and setters to retrieve and modify the geometry of the currently drawn feature.
* fixed: Holes of connected polygons are included in the geometry validation
* added: Snap coordinates to polygon geometry nearby can now be controlled by using area.behavior('snapCoordinates', boolean)
### display
* added: Control the space check for point styles on line geometries by using style.checkLineSpace=boolean.
* fixed: pointer-events were missing for lines with a strokeWidth below 1
* fixed: Polygon holes were ignored for pointer-event triggering
* fixed: the lighting of certain polygons with extrusion was not correct in some cases
* fixed: Possible rendering artifacts on the outer edges of buildings
* added: Improved visuals for extruded polygons / buildings that are using alpha.
* fixed: polylines were not displayed on some android mobile devices
* fixed: Point-styles using offsetX/offsetY can collide when the map is zoomed.
* fixed: Possible collision of Point-styles that are offset and anchored on line geometry when the map is pitched.
* fixed: Offset Images anchored on the line geometry were placed incorrectly
* added: Images are rotated based on line geometry when the anchor is set to "Line" and alignment is set to "map".
* improved: Rotation precision of text based on line geometry.
* fixed: The rotation was possibly missing for CollisionGroups with text style and anchor set to "Line".

## 0.22.0 (2021-6-21)
### playground
* fixed:  The code editor might jump to another line while editing an example.
### editor
* added:  The DrawingBoard now provides getters and setters to retrieve and modify the geometry of the currently drawn feature.
* fixed:  Holes of connected polygons are included in the geometry validation
* added:  Snap coordinates to polygon geometry nearby can now be controlled by using area.behavior('snapCoordinates', boolean)
### display
* added:  Control the space check for point styles on line geometries by using style.checkLineSpace=boolean.
* fixed:  pointer-events were missing for lines with a strokeWidth below 1
* fixed:  Polygon holes were ignored for pointer-event triggering
* fixed:  the lighting of certain polygons with extrusion was not correct in some cases
* fixed:  Possible rendering artifacts on the outer edges of buildings
* added:  Improved visuals for extruded polygons / buildings that are using alpha.
* fixed:  polylines were not displayed on some android mobile devices
* fixed:  Point-styles using offsetX/offsetY can collide when the map is zoomed.
* fixed:  Possible collision of Point-styles that are offset and anchored on line geometry when the map is pitched.
* fixed:  Offset Images anchored on the line geometry were placed incorrectly
* added:  Images are rotated based on line geometry when the anchor is set to "Line" and alignment is set to "map".
* improved:  Rotation precision of text based on line geometry.
* fixed:  The rotation was possibly missing for CollisionGroups with text style and anchor set to "Line".

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
