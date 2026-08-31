#ifdef GL_OES_standard_derivatives
    #extension GL_OES_standard_derivatives: enable
#endif
precision highp float;
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
#if defined(TERRAIN_MODEL_HM) && defined(TERRAIN_LIGHTING_FRAGMENT)
varying vec2 v_terrainTilePixelPos;
uniform mat3 u_normalMatrix;
uniform float u_zMeterToPixel;
#endif

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

#if defined(TERRAIN_MODEL_HM) && defined(TERRAIN_LIGHTING_FRAGMENT)
#include "utils.glsl/heightMapUtils"
#endif

// Overlay (geometry rendered into a texture)
#ifdef OVERLAY_MAP
uniform sampler2D u_overlayMap;   // RGBA, alpha controls coverage
// xy = offset, z = scale. Remaps terrain UVs to the correct sub-region of the overlay
// when terrain tiles at different zoom levels share the same overlay FBO (overlap resolution).
uniform vec3 u_overlayUVTransform;
const float u_overlayOpacity = 1.0;   // 0..1 overall multiplier
//uniform float u_overlayOpacity;   // 0..1 overall multiplier

vec3 applyOverlay(vec3 baseRgb, vec2 texCoord) {
    vec2 overlayUV = u_overlayUVTransform.xy + texCoord * u_overlayUVTransform.z;
    vec4 overlay = texture2D(u_overlayMap, vec2(overlayUV.x, 1.0 - overlayUV.y));

    float a0 = overlay.a;

    #if defined(GL_OES_standard_derivatives) || __VERSION__ >= 300
    float w = fwidth(a0);
    float aAA = smoothstep(0.5 - w, 0.5 + w, a0);
    float a = clamp(aAA * u_overlayOpacity, 0.0, 1.0);
    #else
    float a = clamp(a0 * u_overlayOpacity, 0.0, 1.0);
    #endif
    return overlay.rgb + baseRgb * (1.0 - a);
    //    color.rgb = overlay.rgb * a + color.rgb * (1.0 - a);
    //    color.rgb = mix(color.rgb, overlay.rgb, a);
    //    alpha = max(alpha, a);
}
#endif

#include "light.glsl"

void main() {
    #if defined(TERRAIN_MODEL_HM) && defined(TERRAIN_LIGHTING_FRAGMENT)
    vec3 normal = normalize(u_normalMatrix * getTerrainNormal(v_terrainTilePixelPos));
    #else
    vec3 normal = normalize(v_normal);
    #endif

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
    float alpha = v_color.a;

    // composite overlay on top of terrain
    #ifdef OVERLAY_MAP
    color.rgb = applyOverlay(color.rgb, v_texCoord);
    #endif

    vec4 totalColor = computeBaseLighting(normal, color, 1.0, opacity * alpha);

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
    float min = 1.0;
    float max = 512.0 - 1.0;
    if (v_tilePos.x < min || v_tilePos.x > max || v_tilePos.y < min || v_tilePos.y > max) {
        gl_FragColor += vec4(1.0, 0.0, 0.0, 0.5);
    }
    #endif
}
