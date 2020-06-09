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
