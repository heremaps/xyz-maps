#version 300 es
precision lowp float;

uniform vec2 u_horizon;
uniform sampler2D u_fill;

in vec2 v_texcoord;
out vec4 fragColor;

void main() {
    float horizonScale = u_horizon.x / u_horizon.y;
    fragColor = texture(u_fill, vec2((1.0 - v_texcoord.y) * horizonScale, 0.0));
}
