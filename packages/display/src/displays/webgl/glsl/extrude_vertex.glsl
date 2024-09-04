precision lowp float;

attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform vec4 u_fill;
uniform bool u_strokePass;
uniform vec4 u_stroke;
uniform vec3 u_camWorld;

#include "light.glsl"

#ifdef SPECULAR
uniform vec3 specular;
uniform float shininess;
#endif

varying vec4 v_fill;

const vec3 TopSurfaceNormal = vec3(0, 0, -1);
void main(void) {
    vec3 worldPos = vec3(u_topLeft + a_position.xy, -a_position.z);
    gl_Position = u_matrix * vec4(worldPos, 1.0);

    vec4 color = u_strokePass ? u_stroke : u_fill;

    // because exterior normals are stores as vec2 int8, when .xy equals 0 it must be top surfce normal, otherwise exterior normal (.z=0)
    vec3 normal = a_normal.xy == TopSurfaceNormal.xy ? TopSurfaceNormal : a_normal;

    vec4 light = computeBaseLighting(normal, color.rgb, color.a);

    #ifdef SPECULAR
    vec3 surfaceToCam = normalize(u_camWorld - worldPos);
    light = addSpecularHighlights(normal, light, surfaceToCam, shininess, specular);
    #endif

    v_fill = light;
}
