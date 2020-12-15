precision lowp float;

attribute vec2 a_point;
attribute highp vec2 a_position;
attribute vec2 a_texcoord;

uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform float u_scale;
uniform float u_atlasScale;
uniform vec2 u_offset;
uniform float u_rotation;
uniform bool u_alignMap;
uniform vec2 u_resolution;
uniform bool u_fixedView;

varying float vOpacity;
varying vec2 v_texcoord;

const float EXTENT_SCALE = 1.0 / 32.0;// 8912->512

void main(void){
    // LSB is direction/normal vector [-1,+1]
    vec2 dir = mod(a_position, 2.0) * 2.0 - 1.0;
    vec2 pos = floor(a_position * .5) * EXTENT_SCALE;

    float rotation = u_rotation;

    if (!u_alignMap){
        rotation *= -1.0;
    }

    float rotSin = sin(rotation);
    float rotCos = cos(rotation);
    mat2 mRotate = mat2(rotCos, -rotSin, rotSin, rotCos);

    if (u_alignMap){
        vec2 shift = (u_offset + dir * vec2(a_point.x, -a_point.y) * mRotate) / u_scale;
        gl_Position = u_matrix * vec4(u_topLeft + pos + shift, 0.0, 1.0);
    } else {
        vec4 cpos = u_matrix * vec4(u_topLeft + pos, 0.0, 1.0);
        vec2 shift = dir * a_point / 2.0 * mRotate;
        vec2 offset = vec2(u_offset.x, -u_offset.y);
        gl_Position = vec4(cpos.xy / cpos.w + (offset + shift) / u_resolution * 2.0, 0.0, 1.0);
    }

    if (u_fixedView){
        gl_Position = snapToScreenPixel(gl_Position, u_resolution);
    }

    v_texcoord = a_texcoord * u_atlasScale;
}
