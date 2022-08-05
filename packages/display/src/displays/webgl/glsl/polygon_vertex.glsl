precision lowp float;

attribute vec3 a_position;

uniform vec2 u_offsetZ;
uniform float u_scale;
uniform float u_zMeterToPixel;

uniform float u_tileScale;
uniform mat4 u_matrix;
uniform vec2 u_topLeft;

void main(void){

    float z = a_position.z + u_offsetZ.x / u_zMeterToPixel / u_scale;

    gl_Position = u_matrix * vec4( u_topLeft + a_position.xy * u_tileScale, -z, 1.0 );
}
