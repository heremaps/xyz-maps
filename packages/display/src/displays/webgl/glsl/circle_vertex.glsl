precision lowp float;

attribute vec2 a_position;
uniform float u_radius;
uniform mat4 u_matrix;

uniform float u_strokeWidth;
uniform highp float u_zIndex;
uniform vec2 u_topLeft;
uniform vec2 u_offset;
uniform float u_scale;

varying float vFillRadius;


void main(void){

    gl_Position = u_matrix * vec4(u_topLeft + a_position + u_offset / u_scale, u_zIndex, 1.0);

    gl_PointSize = DEVICE_PIXEL_RATIO * 2.0 * u_radius;

    vFillRadius = 0.5 - u_strokeWidth / gl_PointSize;
}
