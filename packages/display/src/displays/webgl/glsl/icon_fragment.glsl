precision mediump float;

varying vec2 v_texcoord;
uniform float u_opacity;

uniform sampler2D u_texture;

#include "utils.glsl/terrainOcclusion"

void main() {
    gl_FragColor = texture2D(u_texture, v_texcoord);
    gl_FragColor.a *= u_opacity;

    if (gl_FragColor.a<.1)discard;

    #if defined(TERRAIN_OCCLUSION_DEBUG)
    gl_FragColor = terrainOcclusionDebugColor(gl_FragColor);
    #endif
}
