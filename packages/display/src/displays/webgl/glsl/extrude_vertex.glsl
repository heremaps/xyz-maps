precision lowp float;

attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_matrix;
uniform vec4 u_tile;
uniform vec4 u_fill;
uniform float u_fillIntensity;
uniform bool u_strokePass;
uniform vec4 u_stroke;

varying vec4 v_fill;

#include "light.glsl"


#if defined(SPECULAR) || defined(USE_HEIGHTMAP)
uniform float u_zMeterToPixel;
#endif

#ifdef SPECULAR
uniform vec3 u_camWorld;
uniform vec3 specular;
uniform float shininess;
#endif

#include "utils.glsl/heightMapUtils"

const vec3 TopSurfaceNormal = vec3(0, 0, 1);
void main(void) {

    float z = a_position.z;

    #ifdef USE_HEIGHTMAP
        z += getTerrainHeight(a_position.xy);
    #endif

    vec3 worldPos = vec3(u_tile.xy + a_position.xy, z);
    gl_Position = u_matrix * vec4(worldPos, 1.0);

    if(u_strokePass){
        v_fill = u_stroke;
    }else{
        // because exterior normals are stores as vec2 int8, when .xy equals 0 it must be top surfce normal, otherwise exterior normal (.z=0)
        vec3 normal = a_normal.xy == TopSurfaceNormal.xy ? TopSurfaceNormal : a_normal;

        vec4 light = computeBaseLighting(normal, u_fill.rgb, u_fillIntensity, u_fill.a);

        #ifdef SPECULAR
        vec3 surfaceToCam = normalize(u_camWorld - worldPos);
        surfaceToCam.z *= u_zMeterToPixel;

        light = addSpecularHighlights(normal, light, surfaceToCam, shininess, specular);
        #endif

        v_fill = light;
    }
}
