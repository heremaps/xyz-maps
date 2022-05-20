precision lowp float;

attribute vec2 a_size;
attribute highp vec3 a_position;
attribute vec2 a_texcoord;

uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform float u_scale;
uniform float u_atlasScale;
uniform vec2 u_offset;
uniform bool u_alignMap;
uniform vec2 u_resolution;
uniform bool u_fixedView;

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


        if (!u_alignMap){
            rotation *= -1.0;
        }

        float rotSin = sin(rotation);
        float rotCos = cos(rotation);
        mat2 mRotate = mat2(rotCos, -rotSin, rotSin, rotCos);

        float z = a_position.z * SCALE_UINT16_Z;

        if (u_alignMap){
            vec2 shift = ((u_offset + dir * vec2(a_size.x, -a_size.y) * 0.5) * mRotate) / u_scale;
            gl_Position = u_matrix * vec4(u_topLeft + pos + shift, -z, 1.0);
        } else {
            vec4 cpos = u_matrix * vec4(u_topLeft + pos, -z, 1.0);
            vec2 shift = dir * a_size * 0.5 * mRotate;
            vec2 offset = vec2(u_offset.x, -u_offset.y);
            gl_Position = vec4(cpos.xy / cpos.w + (offset + shift) / u_resolution * 2.0, cpos.z / cpos.w, 1.0);
        }

        if (u_fixedView){
            gl_Position = snapToScreenPixel(gl_Position, u_resolution);
        }

        // textcoords bit6->bit16
        v_texcoord = floor(a_texcoord / 32.0) * u_atlasScale;
    }
}
