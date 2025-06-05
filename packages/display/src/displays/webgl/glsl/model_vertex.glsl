precision lowp float;

attribute vec3 a_position;
attribute vec3 a_offset;
attribute vec3 a_normal;
attribute vec3 a_tangent;
attribute vec4 a_color;
attribute vec2 a_uv;
attribute mat4 a_modelMatrix;

uniform bool useUVMapping;
uniform vec2 u_textureSize;
uniform mat3 u_normalMatrix;
uniform mat4 u_matrix;
uniform mat4 u_world;
uniform vec2 u_topLeft;
uniform float u_zMeterToPixel;
uniform float pointSize;

varying vec3 v_normal;
varying vec2 v_texCoord;
varying vec4 v_color;
varying vec3 v_lightDir;
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

void main(void) {
    vec4 position = a_modelMatrix * vec4(a_position, 1.0);
    vec3 positionTileWorld = a_offset + vec3(position.xy * u_zMeterToPixel, position.z);
    vec4 worldPos = vec4(u_topLeft + positionTileWorld.xy, positionTileWorld.z, 1.0);

    gl_Position = u_matrix * worldPos;
    gl_PointSize = pointSize;

    // only correct if model is not scaled (not uniform), otherwise normals are distorted
    // v_normal = normalize(mat3(a_modelMatrix) * a_normal);
    v_normal = normalize(u_normalMatrix * a_normal );

    if (useUVMapping) {
        v_texCoord = a_uv;
    } else {
        // terrain
        v_texCoord = positionTileWorld.xy / u_textureSize;
    }

    #ifdef DBG_GRID
        v_tilePos = positionTileWorld.xy;
    #endif

    #ifdef NORMAL_MAP
    v_tangent = normalize(normalMat * a_tangent);
    #endif

    #ifdef SPECULAR
    v_surfaceToCam = u_camWorld - worldPos.xyz;
    #endif
    v_color = a_color;
}
