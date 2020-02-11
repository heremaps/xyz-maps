precision highp float;

attribute vec3 a_point;
attribute vec2 a_position;
attribute vec2 a_texcoord;

uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform float u_scale;
uniform float u_rotation;
uniform highp float u_zIndex;
uniform vec2 u_atlasScale;

varying vec2 v_texcoord;

#define M_PI 3.1415926535897932384626433832795
#define TO_RAD M_PI / 180.0;

vec2 rotate(vec2 point, float deg){
    float rad = -deg * TO_RAD;
    float s = sin(rad);
    float c = cos(rad);
    return vec2(point.x * c + point.y * s, point.y * c - point.x * s);
}

void main(void){

    vec2 pos = rotate(a_point.xy, a_point.z) / u_scale / DEVICE_PIXEL_RATIO + a_position;

    v_texcoord = a_texcoord * u_atlasScale;

    gl_Position = u_matrix * vec4(u_topLeft + pos, u_zIndex, 1.0);
}
