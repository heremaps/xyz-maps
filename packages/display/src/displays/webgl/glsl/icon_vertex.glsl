precision highp float;

attribute vec2 a_point;
attribute vec2 a_position;
attribute vec2 a_texcoord;

uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform float u_scale;
uniform float u_atlasScale;
uniform vec2 u_offset;
uniform float u_rotation;
uniform bool u_alignMap;
uniform vec2 u_resolution;

varying float vOpacity;
varying vec2 v_texcoord;

void main(void){
    float rotation = u_rotation;

    if (!u_alignMap){
        rotation *= -1.0;
    }

    float rotSin = sin(rotation);
    float rotCos = cos(rotation);
    mat2 mRotate = mat2(rotCos, -rotSin, rotSin, rotCos);

    if(u_alignMap){
        vec2 pos = a_position + (a_point + u_offset) * mRotate / u_scale;
        gl_Position = u_matrix * vec4(u_topLeft + pos, 0.0, 1.0);
     }else{
        vec4 cpos = u_matrix * vec4(u_topLeft + a_position + u_offset, 0.0, 1.0);
        gl_Position = vec4( cpos.xy / cpos.w + vec2(a_point.x, -a_point.y) * mRotate / u_resolution * 2.0 , 0.0, 1.0);
    }
    v_texcoord = a_texcoord * u_atlasScale;
}
