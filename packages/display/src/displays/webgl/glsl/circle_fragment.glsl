precision lowp float;

uniform vec4 u_fill;
uniform vec4 u_stroke;
uniform float u_strokeWidth;

varying float v_radius;
varying vec2 v_position;

#define COLOR_UNDEF -1.0

void main(void){
    float r = length(v_position);

    if (r > v_radius) discard;

    if (r < v_radius - u_strokeWidth){
        if(u_fill[0] == COLOR_UNDEF) discard;
        gl_FragColor = u_fill;
    } else {
        gl_FragColor = u_stroke;
    }
}
