precision lowp float;

attribute vec3 a_position;
//uniform vec2 u_offsetZ;
//uniform float u_scale;
uniform mat4 u_matrix;
uniform vec2 u_topLeft;

#ifdef SPECULAR
uniform float u_zMeterToPixel;
uniform vec3 u_camWorld;
varying vec3 v_surfaceToCam;
#endif

void main(void){
    float z = a_position.z; // + u_offsetZ.x / u_zMeterToPixel / u_scale;
    vec3 worldPos = vec3(u_topLeft + a_position.xy, z);

    gl_Position = u_matrix * vec4(worldPos, 1.0);

    #ifdef SPECULAR
    v_surfaceToCam = u_camWorld - worldPos;
    v_surfaceToCam.z *= u_zMeterToPixel;
    #endif
}
