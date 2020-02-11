precision highp float;

attribute vec3 a_point;
attribute vec2 a_position;
attribute vec2 a_texcoord;

uniform vec2 u_resolution;
uniform mat4 u_matrix;
uniform mat4 u_umatrix;
uniform vec2 u_topLeft;
uniform float u_scale;
uniform float u_rotate;
uniform bool u_pitch;
uniform highp float u_zIndex;
uniform vec2 u_atlasScale;

varying vec2 v_texcoord;
varying vec4 vColor;

#define M_PI 3.1415926535897932384626433832795
#define TO_RAD M_PI / 180.0

vec2 rotate(vec2 point, float deg){
    float rad = -deg * TO_RAD;
    float s = sin(rad);
    float c = cos(rad);
    return vec2(point.x * c + point.y * s, point.y * c - point.x * s);
}

void main(void){

    float rotation = a_point.z;

    if (rotation <= 360.0){

        v_texcoord = a_texcoord * u_atlasScale;

        if(u_pitch){
            vec2 offset = rotate(a_point.xy, rotation) / u_scale / DEVICE_PIXEL_RATIO;
            gl_Position = u_matrix * vec4(u_topLeft + a_position + offset, u_zIndex, 1.0);
        }else{
            vec4 cpos = u_matrix * vec4(u_topLeft + a_position, u_zIndex, 1.0);

            gl_Position = vec4( cpos.xy / cpos.w + vec2(a_point.x, -a_point.y) / DEVICE_PIXEL_RATIO / u_resolution * 2.0 , 0.0, 1.0);
//            gl_Position = vec4(cpos.xy + rotate(vec2(a_point.x, -a_point.y), rotation) / u_resolution * 2.0 * cpos.w, cpos.z, cpos.w);
//            gl_Position = vec4(cpos.xy + vec2(a_point.x, -a_point.y) / u_resolution * 2.0 * cpos.w, u_zIndex, cpos.w);
        }
    }
}
