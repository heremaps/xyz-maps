#version 300 es
precision lowp float;

uniform vec4 u_fill;
uniform float u_fillIntensity;

#ifdef SPECULAR
#include "light.glsl"

uniform vec3 specular;
uniform float shininess;
uniform vec3 u_camWorld;
in vec3 v_surfaceToCam;
in vec3 fragNormal;
#endif

const vec3 surfaceNormal = vec3(0, 0, 1);

out vec4 fragColor;

void main(void) {

    #ifdef SPECULAR
    // Compute lighting with specular component
    vec4 light = computeBaseLighting(surfaceNormal, u_fill.rgb, u_fillIntensity, u_fill.a);
    light = addSpecularHighlights(surfaceNormal, light, v_surfaceToCam, shininess, specular);

    fragColor = light;
    #else
    fragColor = u_fill;
    #endif
}
