precision highp float;

attribute vec3 a_position;
attribute vec3 a_offset;
attribute vec3 a_normal;
attribute vec3 a_tangent;
attribute vec4 a_color;
attribute vec2 a_uv;
attribute mat4 a_modelMatrix;

uniform mat4 u_matrix;
uniform mat4 u_world;
uniform vec2 u_topLeft;
uniform float u_groundResolution;
uniform float pointSize;
uniform vec3 u_camWorld;
uniform vec3 u_lightDir;
varying vec3 v_normal;
varying vec2 v_texCoord;
varying vec4 v_color;
varying vec3 v_lightDir;
varying vec3 v_surfaceToCam;
varying vec3 v_tangent;

void main(void){
    vec4 position = a_modelMatrix * vec4(a_position, 1.0);
    vec3 positionTileWorld = a_offset + vec3(position.xy/u_groundResolution, position.z);
    vec4 worldPos = vec4(u_topLeft + positionTileWorld.xy, -positionTileWorld.z, 1.0);

    gl_PointSize = pointSize;

    gl_Position = u_matrix * worldPos;

    vec3 normal = a_normal * vec3(-1.0);

    if (u_groundResolution==1.0){
        // terrain
        v_texCoord = vec2(positionTileWorld.x/ 512.0, 1.- positionTileWorld.y/ 512.0);
        v_normal = normal;
    } else {
        v_texCoord = a_uv;

        mat3 normalMat = mat3(a_modelMatrix);

        v_normal = normalize(normalMat * normal);
        v_tangent = normalize(normalMat * a_tangent);
    }
    v_surfaceToCam = u_camWorld - worldPos.xyz;
    v_color = a_color;
    v_lightDir = u_lightDir * vec3(-1.0);
}
