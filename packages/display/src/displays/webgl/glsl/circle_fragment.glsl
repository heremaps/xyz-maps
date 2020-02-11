precision lowp float;

uniform vec4 u_stroke;
uniform vec4 u_fill;
varying float vFillRadius;

const float COLOR_UNDEF = -1.0;
const vec2 center = vec2(0.5,0.5);

void main(void){

    float dist = distance( gl_PointCoord, center );
    if (dist > 0.5) discard;


    if(dist < vFillRadius){
        if(u_fill[0] == COLOR_UNDEF)discard;
        gl_FragColor = u_fill;
    }
    else
        gl_FragColor = u_stroke;
}
