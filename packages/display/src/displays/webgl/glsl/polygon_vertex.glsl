precision lowp float;

attribute vec2 a_position;

uniform float u_tilescale;

uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform highp float u_zIndex;

void main(void){
    gl_Position = u_matrix * vec4( u_topLeft + a_position * u_tilescale, u_zIndex, 1.0 );
}
