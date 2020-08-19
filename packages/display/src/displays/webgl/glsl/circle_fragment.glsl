precision lowp float;

uniform vec4 u_fill;
uniform vec4 u_stroke;
uniform float u_radius;
uniform float u_strokeWidth;

varying vec2 vDir;

#define COLOR_UNDEF -1.0

void main(void){

    float r = length(vDir);

    if (r > u_radius) discard;

    if (r < u_radius - u_strokeWidth){
        if(u_fill[0] == COLOR_UNDEF) discard;
        gl_FragColor = u_fill;
    } else {
        gl_FragColor = u_stroke;
    }
}
