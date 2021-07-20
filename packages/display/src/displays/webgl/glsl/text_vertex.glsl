precision highp float;

attribute vec2 a_point;
attribute vec2 a_position;
attribute vec2 a_texcoord;

uniform vec2 u_resolution;
uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform vec2 u_offset;
uniform float u_scale;
uniform float u_rotate;
uniform bool u_alignMap;
uniform bool u_fixedView;
uniform float u_atlasScale;

varying vec2 v_texcoord;
varying vec4 vColor;

const float EXTENT_SCALE = 1.0 / 64.0;// 32768->512
const float OFFSET_SCALE = 1.0 / 32.0;

const float PI_05 = M_PI * 0.5;
const float PI_15 = M_PI * 1.5;
const float PI_20 = M_PI * 2.0;

vec2 rotate(vec2 point, float rad){
    float s = sin(rad);
    float c = cos(rad);
    return vec2(point.x * c + point.y * s, point.y * c - point.x * s);
}

void main(void){
    if (mod(a_position.x, 2.0) == 1.0){

        vec2 position = floor(a_position / 2.0) * EXTENT_SCALE;

        vec2 rotLowHi = mod(a_texcoord, 32.0);
        float rotation = rotLowHi.y * 32.0 + rotLowHi.x;
        // texture coodrinates bit6->bit16
        v_texcoord = floor(a_texcoord / 32.0) * u_atlasScale;

        vec2 labelOffset = u_offset;

        labelOffset *= DEVICE_PIXEL_RATIO;

        rotation = rotation / 1024.0 * PI_20;// 9bit -> 2PI;

        if (u_alignMap){
            float absRotation = mod(u_rotate + rotation, PI_20);

            if (absRotation > PI_05 && absRotation < PI_15){
                rotation += M_PI;
                labelOffset *= -1.0;
            }

            vec2 posOffset = rotate(a_point.xy * OFFSET_SCALE + labelOffset, -rotation) / u_scale / DEVICE_PIXEL_RATIO;
            gl_Position = u_matrix * vec4(u_topLeft + position + posOffset, 0.0, 1.0);
        } else {
            vec4 cpos = u_matrix * vec4((u_topLeft + position), 0.0, 1.0);
            vec2 offset = rotate(a_point * OFFSET_SCALE + labelOffset, -rotation);
            gl_Position = vec4(cpos.xy / cpos.w + vec2(1, -1) * offset / DEVICE_PIXEL_RATIO / u_resolution * 2.0, 0.0, 1.0);
        }

        if (u_fixedView){
            // round/snap to pixelgrid if mapview is static -> crisp
            gl_Position = snapToScreenPixel(gl_Position, u_resolution);
        }
    }
}
