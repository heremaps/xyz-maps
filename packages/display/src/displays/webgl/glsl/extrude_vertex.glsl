precision lowp float;

attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_matrix;
uniform vec4 u_fill;
uniform vec2 u_topLeft;
uniform highp float u_zIndex;
uniform float u_zoom;

varying vec4 v_fill;
varying vec3 v_normal;

void main(void){

    gl_Position = u_matrix * vec4(u_topLeft + a_position.xy, -a_position.z / u_zoom, 1.0);
    v_fill = u_fill;
    v_normal = a_normal;
}
