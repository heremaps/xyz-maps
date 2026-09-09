precision highp float;

attribute vec3 a_position;
attribute highp vec4 a_normal;
attribute float a_lengthSoFar;

uniform mat4 u_matrix;
uniform highp vec2 u_strokeWidth;
uniform highp float u_scale;
uniform vec4 u_tile;
varying vec2 v_normal;
#ifdef DASH_ARRAY
varying float v_lengthSoFar;
varying vec2 v_dashSize;
uniform vec2 u_dashSize;
uniform vec2 u_dashUnit;
#endif
varying vec2 v_width;
varying vec2 v_dir;

uniform vec2 u_offset;
uniform bool u_no_antialias;
uniform float u_exaggeration;

#include "utils.glsl/altitudeScaleFactor"

const float N_SCALE = 1.0 / 8191.0;

void main(void){

    float strokeWidth = toPixel(u_strokeWidth, u_scale) * 0.5;

    // fixed 1px gutter, the actual AA width is computed in the fragment shader
    float alias = u_no_antialias ? 0.0 : 1.0;

    float width = (strokeWidth+alias) / u_scale;
    v_width = vec2(strokeWidth, alias);
    // LSB is direction/normal vector [-1,+1]
    vec2 dir2 = mod(a_normal.zw, 2.0) * 2.0 - 1.0;
    vec2 aliasNormal = floor(a_normal.zw * .5) * N_SCALE;
    v_normal = dir2 * aliasNormal;
    v_dir = mod(a_normal.xy, 2.0);
    // LSB is direction/normal vector [-1,+1]
    vec2 dir = v_dir * 2.0 - 1.0;
    vec2 normal = floor(a_normal.xy * .5) * N_SCALE;

    #ifdef DASH_ARRAY
    v_lengthSoFar = a_lengthSoFar;

    v_dashSize = vec2(
        toPixel(vec2(u_dashSize.x, u_dashUnit.x), u_scale), // dashSizePixel
        toPixel(vec2(u_dashSize.y, u_dashUnit.y), u_scale) // gapSizePixel
    );
    #endif

    float lineOffset = toPixel(u_offset, u_scale);

    vec2 position = a_position.xy + normal * -lineOffset / u_scale;

    vec2 posCenterWorld = vec2(u_tile.xy + position);
//    vec2 offset = dir.y * normal * width;
    vec2 offset = dir * normal * width;

    offset *= altitudeScaleFactor(vec3(posCenterWorld + offset, a_position.z * u_exaggeration), u_matrix);

    gl_Position = u_matrix * vec4(posCenterWorld + offset, a_position.z * u_exaggeration, 1.0);
}
