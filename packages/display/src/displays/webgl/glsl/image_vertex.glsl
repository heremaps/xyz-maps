precision lowp float;

attribute vec2 a_position;
attribute vec2 a_textureCoord;

uniform highp mat4 u_matrix;
uniform highp vec2 u_topLeft;

varying vec2 v_textureCoord;

void main(void){

    gl_Position = u_matrix * vec4( u_topLeft + a_position, 0.0, 1.0 );

    v_textureCoord = a_textureCoord;
}
