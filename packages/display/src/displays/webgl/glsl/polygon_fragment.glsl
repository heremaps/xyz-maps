precision lowp float;

uniform vec4 u_fill;
uniform float u_fillIntensity;

#ifdef SPECULAR
#include "light.glsl"

uniform vec3 specular;
uniform float shininess;
uniform vec3 u_camWorld;
varying vec3 v_surfaceToCam;
varying vec3 fragNormal;
#endif

const vec3 surfaceNormal = vec3(0, 0, 1);

void main(void) {

    #ifdef SPECULAR
    // Compute lighting with specular component
    vec4 light = computeBaseLighting(surfaceNormal, u_fill.rgb, u_fillIntensity, u_fill.a);
    light = addSpecularHighlights(surfaceNormal, light, v_surfaceToCam, shininess, specular);

    gl_FragColor = light;
    #else
    gl_FragColor = u_fill;
    #endif
}
