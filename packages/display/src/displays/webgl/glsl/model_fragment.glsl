precision lowp float;
uniform vec3 ambient;
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 u_ambientLight;
uniform float opacity;
uniform float illumination;
uniform sampler2D diffuseMap;
uniform sampler2D normalMap;
varying vec4 v_color;
varying vec3 v_normal;
varying vec2 v_texCoord;

#ifdef SPECULAR
uniform float shininess;
uniform vec3 specular;
uniform sampler2D specularMap;
varying vec3 v_surfaceToCam;
#endif
#ifdef NORMAL_MAP
varying vec3 v_tangent;
#endif

#ifdef DBG_GRID
varying vec2 v_tilePos;
#endif

#include "light.glsl"

void main() {

    vec3 normal = normalize(v_normal);

    #ifdef NORMAL_MAP
    float flip = float(!gl_FrontFacing) * 2. - 1.;
    normal = normal * flip;
    vec3 tangent = normalize(v_tangent) * flip;
    vec3 bitangent = normalize(cross(normal, tangent));
    mat3 matrixTbn = mat3(tangent, bitangent, normal);
    normal = texture2D(normalMap, v_texCoord).rgb * 2. - 1.;
    normal = normalize(matrixTbn * normal);
    #endif

    vec4 diffuseMapColor = texture2D(diffuseMap, v_texCoord);
    vec3 color = diffuse * diffuseMapColor.rgb * v_color.rgb;
    vec4 totalColor = computeBaseLighting(normal, color, 1.0, opacity * v_color.a);

    #ifdef SPECULAR
    totalColor = addSpecularHighlights(
        normal,
        totalColor,
        v_surfaceToCam,
        shininess,
        specular * texture2D(specularMap, v_texCoord).rgb
    );
    #endif

    gl_FragColor = totalColor;

    #ifdef DBG_GRID
    float min =1.0;
    float max = 512.0-1.0;
    if (v_tilePos.x < min || v_tilePos.x > max || v_tilePos.y < min || v_tilePos.y > max){
        gl_FragColor += vec4(1.0, 0.0, 0.0, 0.5);
    }
    #endif
}
