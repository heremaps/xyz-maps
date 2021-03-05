precision lowp float;

attribute highp vec2 a_position;
uniform float u_scale;

uniform vec4 u_size;
uniform mat4 u_matrix;
uniform float u_strokeWidth;
uniform vec2 u_topLeft;
uniform float u_rotation;
uniform vec4 u_offset;
uniform bool u_alignMap;
uniform vec2 u_resolution;

varying vec2 vSize;
varying vec2 vDir;

const float EXTENT_SCALE = 1.0 / 32.0;// 8912->512

float toPixel(vec2 size){
    float pixel = size.x;
    if (size.y > 0.0){
        // value is defined in meters -> convert to pixels at current zoom
        pixel *= u_scale * size.y;
    }
    return pixel;
}

void main(void){
    // LSB is direction/normal vector [-1,+1]
    vec2 dir = mod(a_position, 2.0) * 2.0 - 1.0;
    vec2 pos = floor(a_position * .5) * EXTENT_SCALE;

    vec2 size = vec2(toPixel(u_size.xy), toPixel(u_size.zw));

    size = (size + u_strokeWidth) * .5;

    float rotation = u_rotation;

    if (!u_alignMap){
        rotation *= -1.0;
    }

    float rotSin = sin(rotation);
    float rotCos = cos(rotation);
    mat2 mRotate = mat2(rotCos, -rotSin, rotSin, rotCos);

    vec2 pixel_offset = vec2(toPixel(u_offset.xy),toPixel(u_offset.zw));

    if (u_alignMap){

        vec2 shift = (pixel_offset + dir * size * mRotate) / u_scale;
        gl_Position = u_matrix * vec4(u_topLeft + pos + shift, 0.0, 1.0);
    } else {
        vec4 cpos = u_matrix * vec4(u_topLeft + pos, 0.0, 1.0);
        vec2 shift = dir * size * mRotate;
        vec2 offset = pixel_offset * vec2(1.0, -1.0);

        gl_Position = vec4(cpos.xy / cpos.w + (offset + shift) / u_resolution * 2.0, 0.0, 1.0);
    }

    vSize = size;
    vDir = dir;
}
