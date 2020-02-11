precision lowp float;

uniform vec4 u_fill;
uniform vec4 u_stroke;

varying float vStrokeWidth;
varying vec2 vSize;
varying mat2 vRotMatrix;

const float COLOR_UNDEF = -1.0;

void main(void){

    vec2 center = vec2(0.5, 0.5);
    vec2 rotPointCoord = (gl_PointCoord-center) * vRotMatrix + center;

    float pointCoordX = rotPointCoord.x;
    float pointCoordY = rotPointCoord.y;
    float dx = distance( pointCoordX, 0.5 );
    float dy = distance( pointCoordY, 0.5 );

    if (dx > vSize.x || dy > vSize.y) discard;

    if( dx > vSize.x-vStrokeWidth || dy > vSize.y-vStrokeWidth){
        gl_FragColor = u_stroke;
    }else{
        if(u_fill[0] == COLOR_UNDEF) discard;
        gl_FragColor = u_fill;
    }
}
