precision highp float;

attribute vec2 a_point;
attribute vec2 a_position;
attribute vec2 a_texcoord;

uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform float u_scale;
uniform float u_atlasScale;
uniform vec2 u_offset;
uniform highp float u_zIndex;
uniform float u_rotation;


varying float vOpacity;
varying vec2 v_texcoord;

void main(void){

    float rotSin = sin(u_rotation);
    float rotCos = cos(u_rotation);
    mat2 rotation_matrix = mat2(rotCos, -rotSin, rotSin, rotCos);

    vec2 pos = a_position + ( a_point + u_offset ) * rotation_matrix / u_scale;

    gl_Position = u_matrix * vec4( u_topLeft + pos, u_zIndex, 1.0 ) ;

    v_texcoord = a_texcoord * u_atlasScale;
}
