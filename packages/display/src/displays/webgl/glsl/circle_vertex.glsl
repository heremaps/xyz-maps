precision lowp float;

attribute highp vec3 a_position;
uniform vec2 u_radius;
uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform vec4 u_offset;
uniform float u_scale;
uniform vec2 u_resolution;
uniform bool u_alignMap;
uniform float u_strokeWidth;
uniform vec2 u_offsetZ;
uniform float u_zMeterToPixel;

varying vec2 v_position;
varying float v_radius;

const float EXTENT_SCALE = 1.0 / 32.0;// 8912->512

void main(void){

    if (mod(a_position.x, 2.0) == 1.0)
    {
        // LSB is direction/normal vector [-1,+1]
        vec2 dir = mod(floor(a_position.xy / 2.0), 2.0) * 2.0 - 1.0;
        vec2 pos = floor(a_position.xy / 4.0) * EXTENT_SCALE;

        float radius = toPixel(u_radius, u_scale);

        radius = radius + u_strokeWidth / 2.0;

        v_position = dir * radius;
        v_radius = radius;

        vec2 pixel_offset = vec2(toPixel(u_offset.xy, u_scale), toPixel(u_offset.zw, u_scale));

        float z = a_position.z * SCALE_UINT16_Z + toPixel(u_offsetZ, u_scale)/ u_zMeterToPixel/ u_scale;

        if (u_alignMap){
            vec2 shift = (pixel_offset + v_position * vec2(1.0, -1.0)) / u_scale;

            gl_Position = u_matrix * vec4(u_topLeft + pos + shift, -z, 1.0);
        } else {
            vec4 cpos = u_matrix * vec4(u_topLeft + pos, -z, 1.0);
            vec2 offset = pixel_offset * vec2(1.0, -1.0);
            gl_Position = vec4(cpos.xy / cpos.w + (offset + v_position) / u_resolution * 2.0, cpos.z / cpos.w, 1.0);
        }
    }
}
