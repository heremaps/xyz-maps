#begin heightMapUtils
#if defined(USE_HEIGHTMAP) || defined(TERRAIN_MODEL_HM)
uniform sampler2D uHeightMap;
uniform vec2 uHeightMapTileSize; // heigtMapWidth, tileSize
uniform float meterPerpixel;

float getTerrainHeight(vec2 tilePixelPos) {
    float texSize  = uHeightMapTileSize.x; // z. B. 512
    float tileSize = uHeightMapTileSize.y; // z. B. 512
    vec2 uv = (tilePixelPos + 0.5) / tileSize;
    return texture2D(uHeightMap, uv).r;
}

float sampleHeightWithPadding(vec2 tilePixelPos) {
    float texSize = uHeightMapTileSize.x;
    float tileSize = uHeightMapTileSize.y;
    float invTexSize = 1.0 / texSize;
    // +1.0: data region shifted by left padding
    vec2 uv = (tilePixelPos * ((texSize - 2.0) / tileSize) + 1.0 + 0.5) * invTexSize;
    // Access with slightly expanded range (padding allowed)
    uv = clamp(uv, vec2(invTexSize * 0.5), vec2(1.0 - invTexSize * 0.5));
    return texture2D(uHeightMap, uv).r;
}

vec3 getTerrainNormal(vec2 tilePixelPos) {
    float hL = getTerrainHeight(tilePixelPos + vec2(-1.0, 0.0));
    float hR = getTerrainHeight(tilePixelPos + vec2( 1.0, 0.0));
    float hD = getTerrainHeight(tilePixelPos + vec2( 0.0,-1.0));
    float hU = getTerrainHeight(tilePixelPos + vec2( 0.0, 1.0));
    float heightScale = u_zMeterToPixel / uHeightMapTileSize.y; // meterPerpixel
    float dx = (hR - hL) * heightScale;
    float dy = (hU - hD) * heightScale;
    return normalize(vec3(-dx, -dy, 1.0));
}

#endif
#end heightMapUtils

#begin altitudeScaleFactor
uniform bool u_scaleByAltitude;
// Helper function to compute altitude-based perspective scaling
float altitudeScaleFactor(vec3 posWorld, mat4 u_matrix) {
    // Compensate for perspective scaling due to altitude so the pixel shift
    // (symbol size/offset) stays consistent in screen space even at higher z
    float scaleDZ = 1.0 + posWorld.z * u_matrix[2][3] / (u_matrix[0][3] * posWorld.x + u_matrix[1][3] * posWorld.y + u_matrix[3][3]);
    // Limit the scaling factor to a reasonable range to prevent flickering when the camera is near the symbol's altitude.
    scaleDZ = clamp(scaleDZ, 0.5, 2.0);
    // Precompute scaleDZ to avoid branching in shader
    return mix(scaleDZ, 1.0, float(u_scaleByAltitude));
}
#end altitudeScaleFactor
