precision lowp float;

uniform vec4 u_fill;
uniform vec4 u_stroke;
uniform float u_strokeWidth;

varying vec2 vSize;
varying vec2 vDir;

#define COLOR_UNDEF -1.0

void main(void){
    float dx = distance(vDir.x, 0.0) * vSize.x;
    float dy = distance(vDir.y, 0.0) * vSize.y;

    if (dx > vSize.x-u_strokeWidth || dy > vSize.y-u_strokeWidth){
        gl_FragColor = u_stroke;
    } else {
        gl_FragColor = u_fill;
        if(u_fill[0] == COLOR_UNDEF){
//            discard;
            gl_FragColor.a = 0.0;
        };

    }
}
