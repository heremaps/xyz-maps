precision lowp float;

uniform vec2 u_horizon;
uniform sampler2D u_fill;

varying vec2 v_texcoord;

void main(void) {
    float horizonScale = u_horizon.x/u_horizon.y;
    gl_FragColor = texture2D(u_fill, vec2((1.0 - v_texcoord.y) * horizonScale, 0.0));
}
