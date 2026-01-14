precision lowp float;

attribute vec2 a_size;
attribute highp vec3 a_position;
attribute vec2 a_texcoord;

uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform float u_scale;
uniform vec4 u_offset;
uniform vec2 u_offsetZ;
uniform bool u_alignMap;
uniform vec2 u_resolution;
uniform bool u_fixedView;
uniform float u_zMeterToPixel;
uniform float u_normalizePosition;

varying float vOpacity;
varying vec2 v_texcoord;

#include "utils.glsl/altitudeScaleFactor"
#include "utils.glsl/snapToScreenPixel"

void main(void){

    // LSB defines visibility
    if (mod(a_position.x, 2.0) == 1.0)
    {
        vec2 rotLowHi = mod(a_texcoord, 16.0);
        float roationMSB = mod(a_position.y, 2.0);
        // 9 bit rotation
        float rotation = rotLowHi.x + floor(rotLowHi.y * 16.0) + (roationMSB * 256.0);

        rotation = rotation / 511.0 * 2.0 * M_PI; // 9 bit deg -> rad;

        // bit1 is direction/normal vector [-1,+1]
        vec2 dir = mod(floor(a_position.xy / 2.0), 2.0) * 2.0 - 1.0;
        vec2 pos = floor(a_position.xy / 4.0) * u_normalizePosition;
        float z = a_position.z * SCALE_UINT16_Z + toPixel(u_offsetZ, u_scale)/ u_zMeterToPixel/ u_scale;

        vec2 offsetXY = vec2(toPixel(u_offset.xy, u_scale),toPixel(u_offset.zw, u_scale));

        if (u_alignMap){
            vec3 posWorld = vec3(u_topLeft + pos, z);
            vec2 shift = rotateZ(offsetXY + dir * vec2(a_size.x, -a_size.y) * 0.5, rotation) / u_scale;

            shift *= altitudeScaleFactor(posWorld, u_matrix);

            gl_Position = u_matrix * vec4(posWorld.xy + shift, posWorld.z, 1.0);
        } else {
            vec4 cpos = u_matrix * vec4(u_topLeft + pos, z, 1.0);
            vec2 shift = rotateZ(dir * a_size, -rotation) * 0.5;
            vec2 offset = offsetXY * vec2(1.0, -1.0);
            gl_Position = vec4(cpos.xy / cpos.w + (offset + shift) / u_resolution * 2.0, cpos.z / cpos.w, 1.0);
        }

        if (u_fixedView){
            gl_Position = snapToScreenPixel(gl_Position, u_resolution);
        }

        // 12bit texture coordinates, bit4->bit15
        v_texcoord = floor(a_texcoord / 16.0) / 4095.0;
    }
}
