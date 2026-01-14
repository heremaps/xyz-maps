#version 300 es
precision lowp float;

in vec3 a_position;

uniform mat4 u_matrix;
uniform vec2 u_horizon;

out vec2 v_texcoord;

void main(void){
    vec4 worldPos = vec4(a_position.x, a_position.y * u_horizon.x, 0.0, 1.0);

    gl_Position = u_matrix * worldPos;

    v_texcoord = vec2(gl_Position.x, a_position.y);
}
