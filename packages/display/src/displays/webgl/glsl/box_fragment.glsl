precision mediump float;

uniform vec4 u_fill;
uniform vec4 u_stroke;
varying vec3 vSize;

#ifdef SPHERE
varying vec3 v_worldPos;
varying vec3 v_rayOrigin;
varying vec3 v_rayDirecton;
#else
varying float v_strokeWidth;
varying vec3 vPosition;
varying vec3 v_normal;
const float smoothness = .25;
#endif

#include "light.glsl"

#ifdef SPECULAR
uniform vec3 specular;
uniform float shininess;
varying vec3 v_surfaceToCam;
#endif

#ifdef SPHERE
float sphereIntersect(vec3 rayOrigin, vec3 rayDirection, vec3 spherePosition, float sphereRadius){
    vec3 oc = rayOrigin - spherePosition.xyz;
    float b = dot(oc, rayDirection);
    float c = dot(oc, oc) - sphereRadius * sphereRadius;
    float d = b * b - c;
    return (d < 0.0) ? -1.0 : -b -sqrt(d);
}
#endif

void main(void){

    vec4 color = u_fill;
    vec3 normal;

    #ifdef SPHERE
    float radius = vSize.x;
    vec3 rayDir = normalize(v_rayDirecton);
    float distance = sphereIntersect(v_rayOrigin, rayDir, v_worldPos, radius);
    if (distance == -1.0) discard;
//    float c = (length(v_worldPos-v_rayOrigin)-distance)/radius * 0.3 + 0.7;
//    color *= vec4(c, c, c, 1.0);
    vec3 surfacePos = rayDir * distance + v_rayOrigin;
    // surface normal in world space
    normal = normalize(surfacePos - v_worldPos);
    #else

    float a = smoothstep(v_strokeWidth, v_strokeWidth + smoothness, length(abs(vPosition.xy) - vSize.xy));
    a *= smoothstep(v_strokeWidth, v_strokeWidth + smoothness, length(abs(vPosition.yz) - vSize.yz));
    a *= smoothstep(v_strokeWidth, v_strokeWidth + smoothness, length(abs(vPosition.xz) - vSize.xz));
    color = mix(u_stroke, u_fill, a);

    // interpolated varying -> unit vector
    normal = normalize(v_normal);
    #endif

    color = computeBaseLighting(normal, color.rgb, u_fill.a);

    #ifdef SPECULAR
    color = addSpecularHighlights(
        normal,
        color,
        v_surfaceToCam,
        shininess,
        specular
    );
    #endif

    gl_FragColor = color;
}
