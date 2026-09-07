#version 300 es
precision lowp float;

in vec3 a_position;

uniform vec2 u_offsetZ;
uniform float u_scale;
uniform float u_zMeterToPixel;
uniform mat4 u_matrix;
uniform vec4 u_tile;

#include "utils.glsl/heightMapUtils"

const float TERRAIN_BASE_SENTINEL = -16000.0;
const float TERRAIN_OFFSET_SENTINEL = -16001.0;

void main(void) {

//     float offsetZ = toPixel(u_offsetZ, u_scale) / u_zMeterToPixel / u_scale;
    float offsetZ = u_offsetZ.y > 0.0 ? u_offsetZ.x : u_offsetZ.x / u_zMeterToPixel / u_scale;

    #ifdef USE_HEIGHTMAP
    float terrainZ = getTerrainHeight(a_position.xy);
    float positionZ;
    if (a_position.z == TERRAIN_BASE_SENTINEL) {
        positionZ = terrainZ;
    } else if (a_position.z == TERRAIN_OFFSET_SENTINEL) {
        positionZ = terrainZ + offsetZ;
    } else {
        positionZ = a_position.z * u_exaggeration + offsetZ;
    }
    #else
    float positionZ = (a_position.z * u_exaggeration + offsetZ);
    #endif

    vec3 worldPos = vec3(u_tile.xy + a_position.xy, positionZ);

    gl_Position = u_matrix * vec4(worldPos, 1.0);
}
