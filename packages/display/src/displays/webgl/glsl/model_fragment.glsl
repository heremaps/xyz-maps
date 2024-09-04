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
uniform highp float u_scale;
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
    vec4 totalColor = computeBaseLighting(normal, color, opacity * v_color.a);

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
    float tileSize = 512. * u_scale;
    float dx = distance(v_texCoord.x, .5) * tileSize;
    float dy = distance(v_texCoord.y, .5) * tileSize;
    if (dx > (tileSize * .5 - 1.5) || dy > (tileSize * .5 - 1.5))
    gl_FragColor += vec4(1., .0, .0, .2);
    #endif
}
