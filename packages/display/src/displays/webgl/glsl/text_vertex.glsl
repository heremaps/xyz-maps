precision highp float;

attribute vec3 a_point;
attribute vec3 a_position;
attribute vec2 a_texcoord;

uniform vec2 u_resolution;
uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform vec4 u_offset;
uniform vec2 u_offsetZ;
uniform float u_zMeterToPixel;
uniform float u_scale;
uniform float u_rotate;
uniform bool u_alignMap;
uniform bool u_fixedView;
uniform vec2 u_texSize;
uniform float u_normalizePosition;

varying vec2 v_texcoord;
varying vec4 vColor;

#include "utils.glsl/snapToScreenPixel"
#include "utils.glsl/heightMapUtils"
#include "utils.glsl/altitudeScaleFactor"

const float OFFSET_SCALE = 1.0 / 32.0;
const float PI_05 = M_PI * 0.5;
const float PI_15 = M_PI * 1.5;
const float PI_20 = M_PI * 2.0;

void main(void) {
    if (mod(a_position.x, 2.0) == 1.0) {

        vec2 position = floor(a_position.xy / 2.0) * u_normalizePosition;

        vec2 rotLowHi = mod(a_texcoord, 32.0);
        float rotationZ = rotLowHi.y * 32.0 + rotLowHi.x;
        // texture coodrinates bit6->bit16
        v_texcoord = floor(a_texcoord / 32.0) / u_texSize;

        vec2 labelOffset = vec2(toPixel(u_offset.xy, u_scale), toPixel(u_offset.zw, u_scale));

        labelOffset *= DEVICE_PIXEL_RATIO;

        rotationZ = rotationZ / 1024.0 * PI_20;// 9bit -> 2PI;

        #ifdef USE_HEIGHTMAP
        float z = getTerrainHeight( position );
        #else
        float z = a_position.z * SCALE_UINT16_Z;
        #endif
        z += toPixel(u_offsetZ, u_scale) / u_zMeterToPixel/ u_scale;

        if (u_alignMap) {
            float absRotation = mod(u_rotate + rotationZ, PI_20);
            float rotationY = a_point.z / 32767.0 * PI_20;

            if (absRotation > PI_05 && absRotation < PI_15) {
                rotationZ += M_PI;
                labelOffset *= -1.0;
                rotationY *= -1.0;
            }

            vec3 offset = vec3(a_point.xy * OFFSET_SCALE + labelOffset, 0.0) / u_scale / DEVICE_PIXEL_RATIO;
            offset = rotateY(offset, rotationY);
            offset.xy = rotateZ(offset.xy, rotationZ);

            vec3 posWorld = vec3(u_topLeft + position, z);

            offset.xy *= altitudeScaleFactor(posWorld, u_matrix);

            gl_Position = u_matrix * vec4(posWorld + offset, 1.0);

        } else {
            vec4 cpos = u_matrix * vec4((u_topLeft + position), z, 1.0);
            vec2 offset = rotateZ(a_point.xy * OFFSET_SCALE + labelOffset, rotationZ);
            //            posOffset = rotateY(vec3(posOffset, 0), a_point.z).xy;
            gl_Position = vec4(cpos.xy / cpos.w + vec2(1, -1) * offset / DEVICE_PIXEL_RATIO / u_resolution * 2.0, cpos.z / cpos.w, 1.0);
        }

        if (u_fixedView) {
            // round/snap to pixelgrid if mapview is static -> crisp
            gl_Position = snapToScreenPixel(gl_Position, u_resolution);
        }
    }
}
