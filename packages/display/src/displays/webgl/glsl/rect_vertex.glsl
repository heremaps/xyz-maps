precision lowp float;

attribute vec2 a_position;

uniform vec2 u_size;
uniform mat4 u_matrix;
uniform float u_strokeWidth;
uniform highp float u_zIndex;
uniform vec2 u_topLeft;
uniform float u_rotation;
uniform vec2 u_offset;
uniform float u_scale;

varying vec2 vSize;
varying float vStrokeWidth;
varying mat2 vRotMatrix;

void main(void){

    vec2 size = DEVICE_PIXEL_RATIO * (u_size + u_strokeWidth);

    if ( size.x > size.y ){
        gl_PointSize = size.x;
    } else {
        gl_PointSize = size.y;
    }

    gl_Position = u_matrix * vec4(u_topLeft + a_position + u_offset / u_scale, u_zIndex, 1.0);

    float rotSin = sin(u_rotation);
    float rotCos = cos(u_rotation);
    float rotScale = rotCos + rotSin; // 45deg -> 1.414

    gl_PointSize *= rotScale;

    vSize = size/2.0 / gl_PointSize;
    vStrokeWidth = u_strokeWidth / gl_PointSize;

    vRotMatrix = mat2(rotCos, rotSin, -rotSin, rotCos);
}
