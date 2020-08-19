precision lowp float;

attribute vec2 a_position;

uniform vec2 u_size;
uniform mat4 u_matrix;
uniform float u_strokeWidth;
uniform vec2 u_topLeft;
uniform float u_rotation;
uniform vec2 u_offset;
uniform float u_scale;
uniform bool u_alignMap;
uniform vec2 u_resolution;

varying vec2 vSize;
varying vec2 vDir;

const float EXTENT_SCALE = 1.0 / 16.0; // 8912 ->512

void main(void){
    // LSB is direction/normal vector [-1,+1]
    vec2 dir = mod(a_position, 2.0) * 2.0 - 1.0;
    vec2 pos = floor(a_position * .5) * EXTENT_SCALE;
    vec2 size = (u_size + u_strokeWidth) * .5;

    float rotation = u_rotation;

    if (!u_alignMap){
        rotation *= -1.0;
    }

    float rotSin = sin(rotation);
    float rotCos = cos(rotation);
    mat2 mRotate = mat2(rotCos, -rotSin, rotSin, rotCos);

    if (u_alignMap){
        vec2 shift = (u_offset + dir * size * mRotate) / u_scale;

        gl_Position = u_matrix * vec4(u_topLeft + pos + shift, 0.0, 1.0);
    } else {
        vec4 cpos = u_matrix * vec4(u_topLeft + pos, 0.0, 1.0);
        vec2 shift = dir * size * mRotate;
        vec2 offset = u_offset * vec2(1.0, -1.0);

        gl_Position = vec4(cpos.xy / cpos.w + (offset + shift) / u_resolution * 2.0, 0.0, 1.0);
    }

    vSize = size;
    vDir = dir;
}
