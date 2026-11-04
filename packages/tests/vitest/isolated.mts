/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 * License-Filename: LICENSE
 */

// Add suites only after verifying every case alone and in shuffled order.
export const isolatedSpecs = [
    'specs/common/task-manager/task-interruption.spec.ts',
    'specs/common/task-manager/task-pause-resume.spec.ts',
    'specs/common/task-manager/task-sequences.spec.ts',
    'specs/core/tile-requests/provider/cached-rerequests-shared-callback.spec.ts',
    'specs/core/tile-requests/layer/cached-rerequests-shared-callback.spec.ts',
    'specs/core/layers/add-remove-feature.spec.ts',
    'specs/core/layers/add-remove-multiple-feature.spec.ts',
    'specs/core/layers/cluster-tile-layer.spec.ts',
    'specs/core/layers/event-listeners-link-layer.spec.ts',
    'specs/core/layers/event-listeners-poi-layer.spec.ts',
    'specs/core/layers/search-locally-geojson-provider.spec.ts',
    'specs/core/layers/search-locally.spec.ts',
    'specs/core/layers/feature-style-reset.spec.ts',
    'specs/core/providers/geojson/add-remove-feature.spec.ts',
    'specs/core/providers/geojson/event-listeners.spec.ts',
    'specs/core/providers/geojson/search-in-layer.spec.ts',
    'specs/core/providers/geojson/search-in-provider-and-layer.spec.ts',
    'specs/display/layers/layer-lifecycle.spec.ts',
    'specs/display/coordinates/coordinate-conversion.spec.ts',
    'specs/display/controls/zoom-control-visibility.spec.ts',
    'specs/display/lifecycle/map-container.spec.ts',
    'specs/display/viewport/map-getters.spec.ts',
    'specs/display/picking/feature-picking.spec.ts',
    'specs/display/viewport/viewport-lock.spec.ts',
    'specs/display/lifecycle/map-destruction.spec.ts',
    'specs/display/viewport/panning.spec.ts',
    'specs/display/coordinates/pixel-geo-conversion.spec.ts',
    'specs/display/viewport/map-setters.spec.ts',
    'specs/display/input/interaction-behavior.spec.ts',
    'specs/display/viewport/view-bounds.spec.ts',
    'specs/display/controls/compass.spec.ts',
    'specs/display/viewport/high-zoom.spec.ts',
    'specs/display/styles/invalid-style-handling.spec.ts',
    'specs/display/styles/navlink-equal-z-index.spec.ts',
    'specs/display/styles/point-circle-style.spec.ts',
    'specs/display/styles/point-rectangle-style.spec.ts',
    'specs/display/styles/point-style-reset.spec.ts',
    'specs/display/styles/polygon-style.spec.ts',
    'specs/display/events/display-map-view-listener.spec.ts',
    'specs/display/events/display-pointer-events.spec.ts',
    'specs/display/events/parent-map-listener.spec.ts',
    'specs/display/events/pointer-down-up-listener.spec.ts',
    'specs/display/events/pointer-enter-leave-listener.spec.ts',
    'specs/display/events/pointer-listener-with-different-style-link.spec.ts',
    'specs/display/events/pointer-listener-with-different-style-point.spec.ts',
    'specs/display/events/pointer-events-line-3d.spec.ts',
    'specs/display/observers/display-observer.spec.ts',
    'specs/editor/address/address-editable.spec.ts',
    'specs/editor/address/address-getters.spec.ts',
    'specs/editor/address/address-set-coordinates.spec.ts',
    'specs/editor/area/area-edit.spec.ts',
    'specs/editor/area/area-transformer-multiple-objects.spec.ts',
    'specs/editor/area/area-transformer.spec.ts',
    'specs/editor/configuration/snap-tolerance-auto-connect.spec.ts',
    'specs/editor/configuration/coordinate-precision.spec.ts',
    'specs/editor/configuration/disconnect-shape-distance.spec.ts',
    'specs/editor/configuration/default-feature-selection.spec.ts',
    'specs/editor/configuration/keep-feature-selection.spec.ts',
    'specs/editor/configuration/legacy-provider-class.spec.ts',
    'specs/editor/configuration/max-routing-point-distance.spec.ts',
    'specs/editor/configuration/snap-tolerance-shape-spacing.spec.ts',
    'specs/editor/fixtures/editor-fixture.spec.ts',
    'specs/editor/hooks/coordinate-update.spec.ts',
    'specs/editor/search/editor-search.spec.ts',
    'specs/editor/history/history-boundaries.spec.ts',
    'specs/editor/coordinates/coordinate-conversion.spec.ts',
    'specs/editor/search/feature-search.spec.ts',
    'specs/editor/activation/editor-activation.spec.ts',
    'specs/editor/search/viewport-feature-search.spec.ts',
    'specs/editor/viewport/viewport-lock.spec.ts',
    'specs/editor/history/history-change-reporting.spec.ts',
    'specs/editor/history/history-multiple-steps.spec.ts',
    'specs/editor/history/history.spec.ts',
    'specs/editor/history/history-undo-split-restrictions.spec.ts',
    'specs/editor/line/line-editing.spec.ts',
    'specs/editor/line/multiline-editing.spec.ts',
    'specs/editor/navlink/navlink-shape-insertion.spec.ts',
    'specs/editor/navlink/navlink-editable.spec.ts',
    'specs/editor/marker/marker-edit-states.spec.ts',
    'specs/editor/observers/editor-readiness-layer-addition.spec.ts',
    'specs/editor/place/place-editable.spec.ts',
    'specs/editor/place/place-getters.spec.ts',
    'specs/editor/range-selector/range-selector.spec.ts',
    'specs/editor/transform/transform-area.spec.ts',
    'specs/editor/transform/transform-location.spec.ts',
    'specs/editor/transform/transform-move-undo.spec.ts',
    'specs/editor/transform/transform.spec.ts'
];
