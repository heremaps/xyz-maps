precision lowp float;

attribute vec2 a_position;
attribute vec2 a_textureCoord;

uniform highp mat4 u_matrix;
uniform highp vec2 u_topLeft;
uniform highp vec2 u_resolution;
uniform float u_tileScale;
//uniform bool u_fixedView;
varying vec2 v_textureCoord;
uniform float u_scale;

void main(void){
    v_textureCoord = a_textureCoord;
    highp vec4 position = u_matrix * vec4( u_topLeft + a_position * u_tileScale, 0.0, 1.0 );
    gl_Position = position;
//    gl_Position = u_fixedView ? snapToScreenPixel(position, u_resolution) : position;
}
