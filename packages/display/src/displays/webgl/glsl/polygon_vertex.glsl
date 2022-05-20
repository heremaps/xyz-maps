precision lowp float;

attribute vec3 a_position;

uniform float u_tileScale;
uniform mat4 u_matrix;
uniform vec2 u_topLeft;

void main(void){
    gl_Position = u_matrix * vec4( u_topLeft + a_position.xy * u_tileScale, -a_position.z, 1.0 );
}
