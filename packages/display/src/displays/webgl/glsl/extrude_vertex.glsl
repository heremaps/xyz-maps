precision lowp float;

attribute vec3 a_position;
attribute vec3 a_normal;
uniform mat4 u_matrix;
uniform vec2 u_topLeft;

varying vec3 v_normal;

#define top vec2(0.0)

void main(void){
    gl_Position = u_matrix * vec4(u_topLeft + a_position.xy, -a_position.z, 1.0);
    v_normal = a_normal.xy == top ? vec3(0.0, 0.0, -1.0): a_normal;
}
