precision lowp float;

attribute vec2 a_position;
attribute vec2 a_textureCoord;

uniform highp mat4 u_matrix;
uniform highp vec2 u_topLeft;
uniform highp vec2 u_resolution;
uniform float u_tileScale;
//uniform bool u_snapGrid;
varying vec2 v_textureCoord;

void main(void){
    v_textureCoord = a_textureCoord;
    vec4 position = u_matrix * vec4( u_topLeft + a_position * u_tileScale, 0.0, 1.0 );
    gl_Position = snapToScreenPixel(position, u_resolution);
//    gl_Position = u_snapGrid ? snapToScreenPixel(position, u_resolution) : position;
}
