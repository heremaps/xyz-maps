precision lowp float;

attribute vec3 a_position;
attribute vec3 a_offset;
attribute vec3 a_normal;
attribute vec4 a_color;
attribute vec2 a_texcoord;
attribute mat4 a_modelMatrix;

uniform mat4 u_matrix;
uniform vec2 u_topLeft;
uniform float u_groundResolution;
uniform float pointSize;

varying vec3 v_normal;
varying vec2 v_texCoord;
varying vec4 v_color;

void main(void){

    vec4 position = a_modelMatrix * vec4(a_position, 1.0);
    vec3 worldPos = a_offset + vec3(position.xy/u_groundResolution, position.z);

    gl_PointSize = pointSize;

    gl_Position = u_matrix * vec4(u_topLeft + worldPos.xy, -worldPos.z, 1.0);

    vec3 normal = a_normal * vec3(-1.0);

    if (u_groundResolution==1.0){
        // terrain
        v_texCoord = vec2(worldPos.x/ 512.0, 1.- worldPos.y/ 512.0);
        v_normal = normal;
    } else {
        v_texCoord = a_texcoord;
        v_normal = mat3(a_modelMatrix) * normal;
    }

    v_color = a_color;
}
