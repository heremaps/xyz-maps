#begin snapToScreenPixel
vec4 snapToScreenPixel(vec4 position, vec2 resolution) {
    resolution *= DEVICE_PIXEL_RATIO;
    vec2 screenPixel = ((position.xy / position.w + 1.0) / 2.0) * resolution;
    position.xy = (round(screenPixel) / resolution * 2.0 - 1.0) * position.w;
    return position;
}
#end snapToScreenPixel

#begin terrainOcclusion
#if defined(TERRAIN_OCCLUSION)

#ifndef texture2D
#if __VERSION__ >= 300
#define texture2D texture
#endif
#endif
// DBG only: Keep occluded symbols visible and tint them red while validating the depth snapshot.
// #define TERRAIN_OCCLUSION_DEBUG 1

#if defined(TERRAIN_OCCLUSION_DEBUG)
varying float v_hidden;
#endif

#if defined(XYZ_VERTEX_SHADER)
uniform sampler2D u_terrainDepth;

const float TERRAIN_OCCLUSION_EPSILON = 0.0005;

#if defined(TERRAIN_DEPTH_RGBA)
float unpackTerrainDepth(vec4 packedDepth) {
    const vec4 bitShift = vec4(
        1.0 / (256.0 * 256.0 * 256.0),
        1.0 / (256.0 * 256.0),
        1.0 / 256.0,
        1.0
    );
    return dot(packedDepth, bitShift);
}
#endif

bool isTerrainAnchorOccluded(vec4 anchorClip) {
    vec2 depthUV = anchorClip.xy / anchorClip.w * 0.5 + 0.5;
    float anchorDepth = anchorClip.z / anchorClip.w * 0.5 + 0.5;
    bool outsideDepthTexture = depthUV.x < 0.0 || depthUV.x > 1.0
    || depthUV.y < 0.0 || depthUV.y > 1.0;

    if (outsideDepthTexture) {
        return false;
    }

    vec4 sampledDepth = texture2D(u_terrainDepth, depthUV);
    #if defined(TERRAIN_DEPTH_RGBA)
    float terrainDepth = unpackTerrainDepth(sampledDepth);
    #else
    float terrainDepth = sampledDepth.r;
    #endif
    return anchorDepth > terrainDepth + TERRAIN_OCCLUSION_EPSILON;
}

bool applyTerrainOcclusion(vec4 anchorClip) {
    bool hidden = isTerrainAnchorOccluded(anchorClip);
    #if defined(TERRAIN_OCCLUSION_DEBUG)
    v_hidden = hidden ? 1.0: 0.0;
    return false;
    #else
    if (hidden) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return true;
    }
    return false;
    #endif
}
#endif

#if defined(XYZ_FRAGMENT_SHADER) && defined(TERRAIN_OCCLUSION_DEBUG)
vec4 terrainOcclusionDebugColor(vec4 color) {
    if (v_hidden > 0.5) {
        color.rgb = mix(color.rgb, vec3(1.0, 0.0, 0.0), 0.7);
        color.a *= 0.45;
    }
    return color;
}
#endif
#endif
#end terrainOcclusion

#begin heightMapUtils
#ifndef texture2D
#if __VERSION__ >= 300
#define texture2D texture
#endif
#endif
uniform float u_exaggeration;
#if defined(USE_HEIGHTMAP) || defined(TERRAIN_MODEL_HM)
uniform sampler2D uHeightMap;
uniform vec3 uHeightMapTileSize; // textureWidth, tileSize, padding
uniform float meterPerpixel;
// transform from data-tile pixel space to heightmap UV space.
// xy = offset (in UV), z = scale. Identity = vec3(0, 0, 1).
// used when the heightmap comes from a parent tile (e.g. data at z14, heightmap at z13).
uniform vec3 uHeightMapTransform;

float getTerrainHeight(vec2 tilePixelPos) {
    float texSize = uHeightMapTileSize.x;
    float tileSize = uHeightMapTileSize.y;
    float padding = uHeightMapTileSize.z;
    float logicalSize = texSize - 2.0 * padding;
    float logicalGridSize = max(1.0, logicalSize - 1.0);

    // map tile-local coordinates into the logical heightmap area. Coordinates
    // outside the tile intentionally address the neighbour padding ring.
    vec2 logicalUV = tilePixelPos / tileSize;
    logicalUV = uHeightMapTransform.xy + logicalUV * uHeightMapTransform.z;
    vec2 texCoord = vec2(padding) + logicalUV * logicalGridSize;
    vec2 baseTexel = clamp(floor(texCoord), vec2(0.0), vec2(texSize - 2.0));
    vec2 f = clamp(texCoord - baseTexel, vec2(0.0), vec2(1.0));
    vec2 base = (baseTexel + 0.5) / texSize;
    vec2 dd = vec2(1.0 / texSize);

    // Manual bilinear filtering keeps float-texture sampling consistent with the
    // heightmap transform, padding, and CPU-side interpolation.
    float tl = texture2D(uHeightMap, base).r;
    float tr = texture2D(uHeightMap, base + vec2(dd.x, 0.0)).r;
    float bl = texture2D(uHeightMap, base + vec2(0.0, dd.y)).r;
    float br = texture2D(uHeightMap, base + dd).r;

    return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y) * u_exaggeration;
}

vec3 getTerrainNormal(vec2 tilePixelPos) {
    float texSize = uHeightMapTileSize.x;
    float tileSize = uHeightMapTileSize.y;
    float padding = uHeightMapTileSize.z;
    float logicalSize = texSize - 2.0 * padding;
    // effective coverage of source height samples across the current tile.
    // 1.0 -> native tile source, <1.0 -> synthetic child extracted from parent source.
    float sourceScale = max(0.0001, uHeightMapTransform.z);
    float hmSamples = max(1.0, (logicalSize - 1.0) * sourceScale);
    float stepPx = max(1.0, tileSize / hmSamples);

    float hL = getTerrainHeight(tilePixelPos + vec2(-stepPx, 0.0));
    float hR = getTerrainHeight(tilePixelPos + vec2(stepPx, 0.0));
    float hD = getTerrainHeight(tilePixelPos + vec2( 0.0, - stepPx));
    float hU = getTerrainHeight(tilePixelPos + vec2(0.0, stepPx));

    float heightScale = u_zMeterToPixel / tileSize; // meterPerpixel
    float gradientScale = heightScale / stepPx;
    float dx = (hR - hL) * gradientScale;
    float dy = (hU - hD) * gradientScale;
    return normalize(vec3(- dx, - dy, 1.0));
}

#endif
#end heightMapUtils

#begin altitudeScaleFactor
uniform bool u_scaleByAltitude;
uniform highp float u_referenceW;
// Perspective scale of a pixel-defined size at posWorld, relative to the calibration depth.
float perspectiveScaleFactor(vec3 posWorld, mat4 u_matrix) {
    float groundW = u_matrix[0][3] * posWorld.x + u_matrix[1][3] * posWorld.y + u_matrix[3][3];
    float clipW = groundW + u_matrix[2][3] * posWorld.z;
    // Pixel-defined sizes reach the screen as: screenSize = worldOffset * k / clipW.
    // groundW (u_referenceW == 0): cancels only the altitude part of clipW, so screenSize stays
    // proportional to 1/groundW -> the size it would have on the ground below, still narrowing
    // with distance. Flat geometry (clipW == groundW) gets exactly 1.0.
    // u_referenceW > 0: cancels the perspective division entirely -> constant screen size at any
    // depth. Only for geometry anchored at a single position; geometry extending in depth would
    // stop narrowing, see GeometryBuffer.usesFixedScreenSizeScale().
    float calibrationW = u_referenceW > 0.0 ? u_referenceW : groundW;
    return clipW / calibrationW;
}

// Helper function to compute altitude-based perspective scaling
float altitudeScaleFactor(vec3 posWorld, mat4 u_matrix) {
    return mix(perspectiveScaleFactor(posWorld, u_matrix), 1.0, float(u_scaleByAltitude));
}
#end altitudeScaleFactor
