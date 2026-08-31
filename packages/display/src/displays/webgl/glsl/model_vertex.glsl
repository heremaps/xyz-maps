precision highp float;

attribute vec3 a_position;
attribute vec3 a_offset;
attribute vec3 a_normal;
attribute vec3 a_tangent;
attribute vec4 a_color;
attribute vec2 a_uv;
attribute mat4 a_modelMatrix;

uniform bool useUVMapping;
//uniform vec2 u_textureSize;
uniform mat3 u_normalMatrix;
uniform mat4 u_matrix;
uniform vec4 u_tile;
uniform bool u_isPixelCoords;
uniform float u_zMeterToPixel;
uniform float pointSize;

varying vec3 v_normal;
varying vec2 v_texCoord;
varying vec4 v_color;
varying vec3 v_lightDir;
#if defined(TERRAIN_MODEL_HM) && defined(TERRAIN_LIGHTING_FRAGMENT)
varying vec2 v_terrainTilePixelPos;
#endif
#ifdef SPECULAR
uniform vec3 u_camWorld;
varying vec3 v_surfaceToCam;
#endif
#ifdef NORMAL_MAP
varying vec3 v_tangent;
#endif

#ifdef DBG_GRID
varying vec2 v_tilePos;
#endif

#ifdef TERRAIN_MODEL_HM
#include "utils.glsl/heightMapUtils"
#else
uniform float u_exaggeration;
#endif


void main(void) {

    vec4 color = a_color;

    #ifdef TERRAIN_MODEL_HM
    float x = mod(a_position.x, 32768.0);
    float y = a_position.y;
    vec2 normalizedPos = vec2(x, y) / 32767.0;
    float skirtFlag = step(32768.0, a_position.x);
    float tileSize = uHeightMapTileSize.y;
    vec2 terrainTilePixelPos = normalizedPos * tileSize;
    float terrainHeight = getTerrainHeight(terrainTilePixelPos);
    float z = terrainHeight * (1.0 - 0.2 * skirtFlag);
    vec3 normal = getTerrainNormal(terrainTilePixelPos);

    #ifdef TERRAIN_LIGHTING_FRAGMENT
    v_terrainTilePixelPos = terrainTilePixelPos;
    #else
    v_normal = normalize(u_normalMatrix * normal);
    #endif

    vec4 position = a_modelMatrix * vec4(x, y, z, 1.0);
    #else
    vec4 position = a_modelMatrix * vec4(a_position, 1.0);
    vec3 normal = a_normal;
    // only correct if model is not scaled (not uniform), otherwise normals are distorted
    // v_normal = normalize(mat3(a_modelMatrix) * a_normal);
    v_normal = normalize(u_normalMatrix * normal);
    #endif

    float xyUnitScale = u_isPixelCoords ? 1.0 : u_zMeterToPixel;

    #ifdef USE_HEIGHTMAP
    vec3 localTilePosition = vec3(a_offset.xy, getTerrainHeight(a_offset.xy));
    #else
    vec3 localTilePosition = vec3(a_offset.xy, a_offset.z * u_exaggeration);
    #endif
    vec3 positionTileWorld = localTilePosition + vec3(position.xy * xyUnitScale, position.z);
    vec4 worldPos = vec4(u_tile.xy + positionTileWorld.xy, positionTileWorld.z, 1.0);

    gl_Position = u_matrix * worldPos;
    gl_PointSize = pointSize;

    if (useUVMapping) {
        v_texCoord = a_uv;
    } else {
        // terrain
        float tileSize = u_tile.z;
        v_texCoord = positionTileWorld.xy / tileSize;
//        v_texCoord = positionTileWorld.xy / u_textureSize;
    }

    #ifdef DBG_GRID
        v_tilePos = positionTileWorld.xy;
    #endif

    #ifdef NORMAL_MAP
    v_tangent = normalize(normalMat * a_tangent);
    #endif

    #ifdef SPECULAR
    v_surfaceToCam = u_camWorld - worldPos.xyz;
    // The view-projection matrix scales Z non-uniformly (typically to match ground resolution),
    // so we need to rescale the Z-component of the surface-to-camera vector
    // to ensure lighting calculations (e.g. specular intensity) are physically consistent.
    v_surfaceToCam.z *= u_zMeterToPixel;
    #endif
    v_color = color;
}
