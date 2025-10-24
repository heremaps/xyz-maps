precision lowp float;

attribute highp vec3 a_position;
uniform float u_scale;

uniform vec4 u_size;
uniform mat4 u_matrix;
uniform float u_strokeWidth;
uniform vec2 u_topLeft;
uniform float u_rotation;
uniform vec4 u_offset;
uniform vec2 u_offsetZ;
uniform float u_zMeterToPixel;
uniform bool u_alignMap;
uniform vec2 u_resolution;
uniform float u_normalizePosition;

varying vec2 vSize;
varying vec2 vDir;

#include "utils.glsl/heightMapUtils"
#include "utils.glsl/altitudeScaleFactor"

void main(void){
    // LSB defines visibility
    if (mod(a_position.x, 2.0) == 1.0)
    {
        // bit1 is direction/normal vector [-1,+1]
        vec2 dir = mod(floor(a_position.xy / 2.0), 2.0) * 2.0 - 1.0;
        vec2 pos = floor(a_position.xy / 4.0) * u_normalizePosition;
        vec2 size = vec2(toPixel(u_size.xy, u_scale), toPixel(u_size.zw, u_scale));

        size = (size + u_strokeWidth) * .5;

        float rotation = u_rotation;

        if (!u_alignMap){
            rotation *= -1.0;
        }

        vec2 pixel_offset = vec2(toPixel(u_offset.xy, u_scale), toPixel(u_offset.zw, u_scale));

        #ifdef USE_HEIGHTMAP
        float z = getTerrainHeight( pos );
        #else
        float z = a_position.z * SCALE_UINT16_Z + toPixel(u_offsetZ, u_scale) / u_zMeterToPixel / u_scale;
        #endif

        if (u_alignMap){
            vec2 posCenterWorld = u_topLeft + pos;
            vec2 shift = (pixel_offset + rotateZ(dir * vec2(size.x, -size.y), rotation)) / u_scale;
            vec3 posWorld = vec3(posCenterWorld + shift, z);

            shift *= altitudeScaleFactor(posWorld, u_matrix);

            gl_Position = u_matrix * vec4(posCenterWorld + shift, z, 1.0);
        } else {
            vec4 cpos = u_matrix * vec4(u_topLeft + pos, z, 1.0);
            vec2 shift = rotateZ(dir * size, rotation);
            vec2 offset = pixel_offset * vec2(1.0, -1.0);

            gl_Position = vec4(cpos.xy / cpos.w + (offset + shift) / u_resolution * 2.0, cpos.z / cpos.w, 1.0);
        }

        vSize = size;
        vDir = dir;


    }
}
