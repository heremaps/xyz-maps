precision lowp float;

attribute highp vec2 a_position;
uniform vec2 u_radius;
uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform vec4 u_offset;
uniform float u_scale;
uniform vec2 u_resolution;
uniform bool u_alignMap;
uniform float u_strokeWidth;

varying vec2 v_position;
varying float v_radius;

const float EXTENT_SCALE = 1.0 / 16.0;// 8912->512

float toPixel(vec2 size){
    float value = size.x;
    if (size.y > 0.0){
        // value is defined in meters -> convert to pixels at current zoom
        value *= u_scale * size.y;
    }
    return value;
}

void main(void){

    if (mod(a_position.x, 2.0) == 1.0)
    {
        // LSB is direction/normal vector [-1,+1]
        vec2 dir = mod(floor(a_position / 2.0), 2.0) * 2.0 - 1.0;
        vec2 pos = floor(a_position / 4.0) * EXTENT_SCALE;

        float radius = toPixel(u_radius);

        radius = radius + u_strokeWidth / 2.0;

        v_position = dir * radius;
        v_radius = radius;

        vec2 pixel_offset = vec2(toPixel(u_offset.xy), toPixel(u_offset.zw));

        if (u_alignMap){
            vec2 shift = (pixel_offset + v_position) / u_scale;
            gl_Position = u_matrix * vec4(u_topLeft + pos + shift, 0.0, 1.0);
        } else {
            vec4 cpos = u_matrix * vec4(u_topLeft + pos, 0.0, 1.0);
            vec2 offset = pixel_offset * vec2(1.0, -1.0);
            gl_Position = vec4(cpos.xy / cpos.w + (offset + v_position) / u_resolution * 2.0, 0.0, 1.0);
        }
    }
}
