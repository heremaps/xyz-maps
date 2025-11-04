precision lowp float;

attribute vec3 a_position;

uniform vec2 u_offsetZ;
uniform float u_scale;
uniform float u_zMeterToPixel;
uniform mat4 u_matrix;
uniform vec2 u_topLeft;

#include "utils.glsl/heightMapUtils"

void main(void) {

//     float offsetZ = toPixel(u_offsetZ, u_scale) / u_zMeterToPixel / u_scale;
    float offsetZ = u_offsetZ.y > 0.0 ? u_offsetZ.x : u_offsetZ.x / u_zMeterToPixel / u_scale;

    #ifdef USE_HEIGHTMAP
    float positionZ = getTerrainHeight(a_position.xy) + a_position.z * offsetZ;
    #else
    float positionZ = a_position.z + offsetZ;
    #endif

    vec3 worldPos = vec3(u_topLeft + a_position.xy, positionZ);

    gl_Position = u_matrix * vec4(worldPos, 1.0);
}
