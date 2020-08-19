precision lowp float;

attribute vec2 a_position;
attribute vec2 a_textureCoord;

uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform vec2 u_textureAtlasOffset;
uniform float u_textureAtlasScale;

varying vec2 v_textureCoord;

void main(void){

    gl_Position = u_matrix * vec4( u_topLeft + a_position, 0.0, 1.0 );

    v_textureCoord = a_textureCoord;
}
