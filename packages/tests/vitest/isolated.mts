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
    'specs/common/taskmanager/taskmanager_interrupt_spec.ts',
    'specs/common/taskmanager/taskmanager_pause.ts',
    'specs/common/taskmanager/taskmanager_sequence_spec.ts',
    'specs/core/get_cancel_tiles/gettile_multiple_times_cancel_with_same_callback_requestagain_after_finish_spec.ts',
    'specs/core/get_cancel_tiles/layer_gettile_multiple_times_cancel_with_same_callback_requestagain_after_finish_spec.ts',
    'specs/core/layer/add_remove_feature_spec.ts',
    'specs/core/layer/add_remove_multiple_feature_spec.ts',
    'specs/core/layer/clusterTileLayer.ts',
    'specs/core/layer/event_listeners_link_layer_spec.ts',
    'specs/core/layer/event_listeners_poi_layer_spec.ts',
    'specs/core/layer/search_locally_geojsonprovider_spec.ts',
    'specs/core/layer/search_locally_spec.ts',
    'specs/core/layer/set_style_spec.ts',
    'specs/core/provider/geojsonprovider/add_remove_feature_spec.ts',
    'specs/core/provider/geojsonprovider/event_listeners_spec.ts',
    'specs/core/provider/geojsonprovider/search_in_layer_spec.ts',
    'specs/core/provider/geojsonprovider/search_in_provider_and_layer_spec.ts',
    'specs/display/general/add_remove_layer_spec.ts',
    'specs/display/general/coordinates_convert_spec.ts',
    'specs/display/general/disable_zoomcontrol_spec.ts',
    'specs/display/general/get_containers_spec.ts',
    'specs/display/general/get_functions_spec.ts',
    'specs/display/general/get_objects_spec.ts',
    'specs/display/general/lock_viewport_spec.ts',
    'specs/display/general/map_destroy_spec.ts',
    'specs/display/general/pan_map_spec.ts',
    'specs/display/general/pixel_geo_coordinates_convert_spec.ts',
    'specs/display/general/set_functions_spec.ts',
    'specs/display/general/set_get_behavior_spec.ts',
    'specs/display/general/set_get_viewbounds_spec.ts',
    'specs/display/general/ui_compass_spec.ts',
    'specs/display/general/zoom_in_20_plus.ts',
    'specs/display/layer/setstylegroup_invalid_style_spec.ts',
    'specs/display/layer/setstylegroup_link_with_same_zindex.ts',
    'specs/display/layer/setstylegroup_point_circle.ts',
    'specs/display/layer/setstylegroup_point_rect.ts',
    'specs/display/layer/setstylegroup_point_spec.ts',
    'specs/display/layer/setstylegroup_polygon_spec.ts',
    'specs/display/listener/display_mapview_listener_spec.ts',
    'specs/display/listener/display_pointer_events_spec.ts',
    'specs/display/listener/parent_map_listener_spec.ts',
    'specs/display/listener/pointer_down_up_listener_spec.ts',
    'specs/display/listener/pointer_enter_leave_listener_spec.ts',
    'specs/display/listener/pointer_listener_with_different_style_link_spec.ts',
    'specs/display/listener/pointer_listener_with_different_style_point_spec.ts',
    'specs/display/listener/pointerevents_line_3d.ts',
    'specs/display/observer/display_observer_spec.ts',
    'specs/editor/address/address_editable_spec.ts',
    'specs/editor/address/address_get_functions_spec.ts',
    'specs/editor/address/address_setcoordinates_spec.ts',
    'specs/editor/area/area_edit_spec.ts',
    'specs/editor/area/area_transformer_multiple_objects_spec.ts',
    'specs/editor/area/area_transformer_spec.ts',
    'specs/editor/configs/autoconnectshapedistance_spec.ts',
    'specs/editor/configs/coordinateprecision_spec.ts',
    'specs/editor/configs/disconnectshapedistance_spec.ts',
    'specs/editor/configs/featureselectionbydefault_spec.ts',
    'specs/editor/configs/keepfeatureselection_spec.ts',
    'specs/editor/configs/legacy_provider_class_spec.ts',
    'specs/editor/configs/maxroutingpointdistance_spec.ts',
    'specs/editor/configs/minshapedistance_spec.ts',
    'specs/editor/general/editor_fixture_spec.ts',
    'specs/editor/general/editor_hooks_spec.ts',
    'specs/editor/general/editor_search_spec.ts',
    'specs/editor/general/map_changes_spec.ts',
    'specs/editor/general/map_functions_spec.ts',
    'specs/editor/general/map_getobjects_spec.ts',
    'specs/editor/general/map_show_hide_spec.ts',
    'specs/editor/general/map_viewport_getobjects_spec.ts',
    'specs/editor/general/map_viewport_spec.ts',
    'specs/editor/history/map_history_info_spec.ts',
    'specs/editor/history/map_history_multiple_steps_spec.ts',
    'specs/editor/history/map_history_spec.ts',
    'specs/editor/history/map_history_undo_split_restrictions_spec.ts',
    'specs/editor/line/line_basics_spec.ts',
    'specs/editor/line/multiline_basics_spec.ts',
    'specs/editor/link/link_addShape_spec.ts',
    'specs/editor/link/link_editable_spec.ts',
    'specs/editor/marker/marker_spec.ts',
    'specs/editor/observer/map_observer_ready_addlayer_spec.ts',
    'specs/editor/poi/poi_editable_spec.ts',
    'specs/editor/poi/poi_get_functions_spec.ts',
    'specs/editor/rangeselector/rangeselector_spec.ts',
    'specs/editor/transform/transform_area_spec.ts',
    'specs/editor/transform/transform_location_spec.ts',
    'specs/editor/transform/transform_move_undo_spec.ts',
    'specs/editor/transform/transform_spec.ts'
];
