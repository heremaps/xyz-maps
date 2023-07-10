precision lowp float;
uniform bool u_offscreen;
uniform sampler2D u_texture;
uniform sampler2D u_gradient;
varying float v_weight;
uniform float u_intensity;
uniform float u_opacity;
varying vec2 v_texcoord;
varying vec2 v_direction;


const float INV_SQRT_2_PI = 1.0 / sqrt(2.0 * M_PI);

void main(void) {
    if (u_offscreen) {
        float sqDistance = dot(v_direction, v_direction);
        // Kernel Density Estimation (KDE)
        // Standardize Gaussian Function: 1/sqrt(2*PI) * e^(-1/2x^2)
        // Gaussian
        float density = INV_SQRT_2_PI * exp(-sqDistance / 2.0);
        // Quartic
        // float density = 15.0 / 16.0 * pow(1. - sqDistance, 2.);
        // Triweight
        // float density = 35.0 / 32.0 * pow(1. - sqDistance, 3.);

        gl_FragColor.r = v_weight * u_intensity * density;
    } else {
        float r = texture2D(u_texture, v_texcoord).r;
        gl_FragColor = texture2D(u_gradient, vec2(r, 0.5));
        gl_FragColor.a *= u_opacity;
    }
}
