precision highp float;

attribute vec3 a_point;
attribute vec2 a_position;
attribute vec2 a_texcoord;

uniform vec2 u_resolution;
uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform float u_scale;
uniform float u_rotate;
uniform bool u_alignMap;
uniform bool u_fixedView;
uniform float u_atlasScale;

varying vec2 v_texcoord;
varying vec4 vColor;

#define M_PI 3.1415926535897932384626433832795

const float EXTENT_SCALE = 1.0 / 64.0;// 8912 - >512
const float OFFSET_SCALE = 1.0 / 32.0;

const float PI_05 = M_PI * 0.5;
const float PI_15 = M_PI * 1.5;
const float PI_20 = M_PI * 2.0;
const float TO_RAD = M_PI / 180.0;

vec2 rotate(vec2 point, float rad){
    float s = sin(rad);
    float c = cos(rad);
    return vec2(point.x * c + point.y * s, point.y * c - point.x * s);
}

vec2 round(vec2 point){
    vec2 fractPoint = fract(point);
    point += step(0.5, fractPoint) - fractPoint;
    return point;
}

void main(void){

    float rotation = a_point.z;

    if (rotation <= 360.0){

        v_texcoord = a_texcoord * u_atlasScale;

        if (u_alignMap){
            rotation *= TO_RAD;

            float aRotation = mod(u_rotate + rotation, PI_20);

            if (aRotation > PI_05 && aRotation < PI_15){
                rotation += M_PI;
            }

            vec2 offset = rotate(a_point.xy * OFFSET_SCALE, -rotation) / u_scale / DEVICE_PIXEL_RATIO;
            gl_Position = u_matrix * vec4(u_topLeft + a_position * EXTENT_SCALE + offset, 0.0, 1.0);
        } else {
            vec4 cpos = u_matrix * vec4(u_topLeft + a_position * EXTENT_SCALE, 0.0, 1.0);
            gl_Position = vec4(cpos.xy / cpos.w + vec2(a_point.x, -a_point.y) * OFFSET_SCALE / DEVICE_PIXEL_RATIO / u_resolution * 2.0, 0.0, 1.0);
        }

        if (u_fixedView){
            // round/snap to pixelgrid if mapview is static -> crisp
            vec2 screenPixel = ((gl_Position.xy / gl_Position.w + 1.0) / 2.0) * u_resolution;
            gl_Position.xy = (round(screenPixel) / u_resolution * 2.0 - 1.0) * gl_Position.w;
        }
    }
}
