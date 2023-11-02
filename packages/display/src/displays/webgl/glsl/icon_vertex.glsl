precision lowp float;

attribute vec2 a_size;
attribute highp vec3 a_position;
attribute vec2 a_texcoord;

uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform float u_scale;
uniform vec2 u_texSize;
uniform vec4 u_offset;
uniform vec2 u_offsetZ;
uniform bool u_alignMap;
uniform vec2 u_resolution;
uniform bool u_fixedView;
uniform float u_zMeterToPixel;
uniform bool u_scaleByAltitude;

varying float vOpacity;
varying vec2 v_texcoord;

const float EXTENT_SCALE = 1.0 / 32.0;// 8912->512

void main(void){

    // LSB defines visibility
    if (mod(a_position.x, 2.0) == 1.0)
    {
        vec2 rotLowHi = mod(a_texcoord, 32.0);
        float rotation = rotLowHi.x + floor(rotLowHi.y * 32.0);

        rotation = rotation / 1024.0 * 2.0 * M_PI;// 10bit -> 2PI;

        // bit1 is direction/normal vector [-1,+1]
        vec2 dir = mod(floor(a_position.xy / 2.0), 2.0) * 2.0 - 1.0;
        vec2 pos = floor(a_position.xy / 4.0) * EXTENT_SCALE;
        float z = a_position.z * SCALE_UINT16_Z + toPixel(u_offsetZ, u_scale)/ u_zMeterToPixel/ u_scale;

        vec2 offsetXY = vec2(toPixel(u_offset.xy, u_scale),toPixel(u_offset.zw, u_scale));

        if (u_alignMap){
            vec3 posWorld = vec3(u_topLeft + pos, -z);
            vec2 shift = rotateZ(offsetXY + dir * vec2(a_size.x, -a_size.y) * 0.5, rotation) / u_scale;

            if(!u_scaleByAltitude){
                float scaleDZ = 1.0 + posWorld.z * u_matrix[2][3] / (u_matrix[0][3] * posWorld.x + u_matrix[1][3] * posWorld.y + u_matrix[3][3]);
                shift *= scaleDZ;
            }

            gl_Position = u_matrix * vec4(posWorld.xy + shift, posWorld.z, 1.0);
        } else {
            vec4 cpos = u_matrix * vec4(u_topLeft + pos, -z, 1.0);
            vec2 shift = rotateZ(dir * a_size, -rotation) * 0.5;
            vec2 offset = offsetXY * vec2(1.0, -1.0);
            gl_Position = vec4(cpos.xy / cpos.w + (offset + shift) / u_resolution * 2.0, cpos.z / cpos.w, 1.0);
        }

        if (u_fixedView){
            gl_Position = snapToScreenPixel(gl_Position, u_resolution);
        }

        // textcoords bit6->bit16
        v_texcoord = floor(a_texcoord / 32.0) / u_texSize;
    }
}
