precision lowp float;

uniform vec4 u_fill;
uniform highp float u_strokeWidth;

varying vec2 v_normal;
varying vec2 v_width;

varying float v_lengthSoFar;
varying vec2 texCoord;

uniform sampler2D u_pattern;

void main(void){

    float nLength = length(v_normal);
    float alpha = clamp(u_strokeWidth - nLength * u_strokeWidth, .0, 1.);

    vec4 color = u_fill;

    if (alpha < 1.0){
        color.a *= alpha;
    }

    gl_FragColor = texture2D(u_pattern, vec2(fract(v_lengthSoFar))) * color;
}
