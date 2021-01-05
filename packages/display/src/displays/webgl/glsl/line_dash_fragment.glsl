precision lowp float;

uniform vec4 u_fill;
uniform highp float u_strokeWidth;

varying vec2 v_normal;
varying vec2 v_width;
varying float v_lengthSoFar;

uniform sampler2D u_pattern;

void main(void){

    float width = length(v_normal) * (v_width.s + v_width.t);
    float alpha = 1.0 - clamp(.5 * (width - v_width.s + v_width.t) / v_width.t, .0, 1.);

    gl_FragColor = u_fill;
    gl_FragColor.a *= alpha * texture2D(u_pattern, vec2(fract(v_lengthSoFar))).r;
}
