precision mediump float;

varying vec2 v_texcoord;
uniform sampler2D u_texture;

#ifdef SCREEN_COPY_PACK_DEPTH
vec4 encodeDepth(float depth) {
    const vec4 bitShift = vec4(256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0);
    const vec4 bitMask = vec4(0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0);
    vec4 encodedDepth = fract(depth * bitShift);
    encodedDepth -= encodedDepth.xxyz * bitMask;
    return encodedDepth;
}
#endif

void main(void) {
#ifdef SCREEN_COPY_PACK_DEPTH
    gl_FragColor = encodeDepth(texture2D(u_texture, v_texcoord).r);
#else
    gl_FragColor = texture2D(u_texture, v_texcoord);
#endif
}
