precision lowp float;

uniform sampler2D u_pattern;
uniform vec4 u_fill;
uniform highp float u_strokeWidth;
varying vec2 v_normal;
varying float v_lengthSoFar;
varying vec2 texCoord;
varying vec2 v_width;

void main(void){

    float width = length(v_normal) * (v_width.s + v_width.t);
    float alpha = 1.0 - clamp(.5 * (width - v_width.s + v_width.t) / v_width.t, .0, 1.);

    gl_FragColor = u_fill;
    gl_FragColor.a *= alpha;
}
