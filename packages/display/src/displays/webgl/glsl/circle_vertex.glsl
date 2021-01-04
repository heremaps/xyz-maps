precision lowp float;

attribute highp vec2 a_position;
uniform float u_radius;
uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform vec2 u_offset;
uniform float u_scale;
uniform vec2 u_resolution;
uniform bool u_alignMap;
uniform float u_strokeWidth;

varying vec2 v_position;
varying float v_radius;

const float EXTENT_SCALE = 1.0 / 32.0; // 8912->512

void main(void){
    // LSB is direction/normal vector
    vec2 dir = mod(a_position, 2.0) * 2.0 - 1.0;
    vec2 pos = floor(a_position * .5) * EXTENT_SCALE;

    float radius = u_radius + u_strokeWidth / 2.0;

    v_position = dir * radius;
    v_radius = radius;

    if (u_alignMap){
        vec2 shift = (u_offset + v_position) / u_scale;
        gl_Position = u_matrix * vec4(u_topLeft + pos + shift, 0.0, 1.0);
    } else {
        vec4 cpos = u_matrix * vec4(u_topLeft + pos, 0.0, 1.0);
        vec2 offset = u_offset * vec2(1.0, -1.0);
        gl_Position = vec4(cpos.xy / cpos.w + (offset + v_position) / u_resolution * 2.0, 0.0, 1.0);
    }
}
