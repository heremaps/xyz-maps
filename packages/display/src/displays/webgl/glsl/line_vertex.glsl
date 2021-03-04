precision lowp float;

attribute vec2 a_position;
attribute vec4 a_normal;
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

const float N_SCALE = 1.0 / 8192.0;


float toPixel(vec2 size){
    float value = size.x;
    if (size.y > 0.0){
        // value is defined in meters -> convert to pixels at current zoom
        value *= u_scale * size.y;
    }
    return value;
}

void main(void){

    float strokeWidth = toPixel(u_strokeWidth);
    float alias = strokeWidth<1. ? .65 : 1.;
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

    float lineOffset = toPixel(u_offset);

    vec2 position = a_position + normal * -lineOffset / u_scale;

    gl_Position = u_matrix * vec4(u_topLeft + position + dir * normal * width, 0.0, 1.0);
}

