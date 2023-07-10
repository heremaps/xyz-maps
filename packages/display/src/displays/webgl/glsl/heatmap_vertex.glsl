precision lowp float;

attribute vec3 a_position;
attribute float a_weight;
uniform vec2 u_radius;
uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform float u_scale;
uniform bool u_offscreen;

varying vec2 v_texcoord;
varying vec2 v_direction;
varying float v_weight;

const float EXTENT_SCALE = 1.0 / 32.0;// 8912->512


void main(void) {

    if (u_offscreen) {
        // LSB (bit0) is visibility, bit1 is direction/normal vector [-1,+1]
        vec2 dir = mod(floor(a_position.xy / 2.0), 2.0) * 2.0 - 1.0;
        vec2 pos = floor(a_position.xy / 4.0) * EXTENT_SCALE;

        // Distribution Normal function (Gaussion)
        // effective value range is -3 -> +3, values <-3 or >+3 are very close to 0, so we simply scale and cut by 3.
        v_direction = 3.0 * dir;

        v_weight = a_weight;

        vec2 posCenter = vec2(u_topLeft + pos);
        vec2 offset = (dir * u_radius.x * vec2(1.0, -1.0));
        gl_Position = u_matrix * vec4(posCenter + offset / u_scale, 0.0, 1.0);
    } else {
        gl_Position = vec4(a_position.xy, 0, 1);
        v_texcoord = a_position.xy * 0.5 + 0.5;
    }
}
