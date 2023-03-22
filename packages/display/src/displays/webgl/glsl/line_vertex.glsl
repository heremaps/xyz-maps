precision lowp float;

attribute vec3 a_position;
attribute highp vec4 a_normal;
attribute float a_lengthSoFar;

uniform mat4 u_matrix;
uniform highp vec2 u_strokeWidth;
uniform highp float u_scale;
uniform vec2 u_topLeft;
uniform float u_texWidth;
varying vec2 v_normal;
varying float v_lengthSoFar;
varying vec2 v_width;

uniform vec2 u_offset;
uniform float u_tileScale;
uniform bool u_no_antialias;
uniform bool u_scaleByAltitude;

const float N_SCALE = 1.0 / 8191.0;

void main(void){

    float strokeWidth = toPixel(u_strokeWidth, u_scale);
    float alias = u_no_antialias
        ? .0
        : strokeWidth < 1. ? .65 : 1.;

    float width = (strokeWidth+alias) / u_scale;
    v_width = vec2(strokeWidth, alias * .5);
    // LSB is direction/normal vector [-1,+1]
    vec2 dir2 = mod(a_normal.zw, 2.0) * 2.0 - 1.0;
    vec2 aliasNormal = floor(a_normal.zw * .5) * N_SCALE;
    v_normal = dir2 * aliasNormal;
    // LSB is direction/normal vector [-1,+1]
    vec2 dir = mod(a_normal.xy, 2.0) * 2.0 - 1.0;
    vec2 normal = floor(a_normal.xy * .5) * N_SCALE;

    v_lengthSoFar = a_lengthSoFar / u_texWidth;

    float lineOffset = toPixel(u_offset, u_scale);

    vec2 position = a_position.xy + normal * -lineOffset / u_scale;

    vec2 posCenterWorld = vec2(u_topLeft +position * u_tileScale);
    vec2 offset = dir * normal * width;

    if (!u_scaleByAltitude){
        vec3 posWorld = vec3(posCenterWorld + offset, -a_position.z);
        float scaleDZ = 1.0 + posWorld.z * u_matrix[2][3] / (u_matrix[0][3] * posWorld.x + u_matrix[1][3] * posWorld.y + u_matrix[3][3]);
        offset *= scaleDZ;
    }

    gl_Position = u_matrix * vec4(posCenterWorld + offset, -a_position.z, 1.0);
}

