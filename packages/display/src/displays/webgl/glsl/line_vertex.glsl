precision lowp float;

attribute vec2 a_position;
attribute vec4 a_normal;
attribute float a_lengthSoFar;

uniform mat4 u_matrix;
uniform highp float u_strokeWidth;
uniform highp float u_zIndex;
uniform highp float u_scale;
uniform vec2 u_topLeft;
uniform float u_texWidth;
varying vec2 v_normal;
varying float v_lengthSoFar;
varying vec2 v_width;

#define N_SCALE 8192.0
//#define N_SCALE 1.0

void main(void){

    float alias = u_strokeWidth<1. ? .65 : 1.;
    float width = (u_strokeWidth+alias) / u_scale;
    v_width = vec2(u_strokeWidth, alias * .5);

    vec2 normal = a_normal.xy / N_SCALE;

    v_normal = a_normal.zw / N_SCALE;

    v_lengthSoFar = a_lengthSoFar / u_texWidth;

    gl_Position = u_matrix * vec4(u_topLeft + a_position + normal * width, u_zIndex, 1.0);
}
