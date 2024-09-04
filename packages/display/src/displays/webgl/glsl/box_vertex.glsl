precision mediump float;


attribute vec3 a_normal;

attribute highp vec3 a_position;
attribute highp vec3 a_point;

uniform float u_scale;

uniform vec4 u_size;
uniform mat4 u_matrix;
uniform mat4 u_inverseMatrix;
uniform float u_strokeWidth;
uniform vec2 u_topLeft;
uniform float u_rotation;
uniform vec4 u_offset;
uniform bool u_alignMap;
uniform vec2 u_resolution;
uniform vec2 u_offsetZ;
uniform float u_zMeterToPixel;
uniform bool u_scaleByAltitude;

#ifdef SPHERE
varying vec3 v_rayOrigin;
varying vec3 v_rayDirecton;
varying vec3 v_worldPos;
uniform vec2 u_radius;
#else
varying vec3 vPosition;
varying float v_strokeWidth;
varying vec3 v_normal;
#endif
varying vec3 vSize;

const float EXTENT_SCALE = 1.0 / 32.0;// 8912->512

#ifdef SPECULAR
varying vec3 v_surfaceToCam;
uniform vec3 u_camWorld;
#endif


void main(void) {

    #ifdef SPHERE
    vec3 dir = a_point * 2.0 - 1.0;
    vec3 size = vec3(toPixel(u_radius, u_scale)) / u_scale;
    #else
    vec3 dir = mod(a_point, 2.0) * 2.0 - 1.0;
    vec3 size = floor(a_point * .5) / u_scale;
    #endif


    vec3 boxCenter = vec3(u_topLeft + a_position.xy * EXTENT_SCALE, -a_position.z * SCALE_UINT16_Z);
    boxCenter += vec3(toPixel(u_offset.xy, u_scale), toPixel(u_offset.zw, u_scale), -toPixel(u_offsetZ, u_scale) / u_zMeterToPixel) / u_scale;


    float scaleDZ = 1.0 + (u_scaleByAltitude ? 0.0 : boxCenter.z * u_matrix[2][3] / (u_matrix[0][3] * boxCenter.x + u_matrix[1][3] * boxCenter.y + u_matrix[3][3]));

    size *= scaleDZ;

    vec3 vertexOffset = vec3(size.xy, -size.z / u_zMeterToPixel) * dir;
    vec3 vertexPos = vec3(boxCenter.xy + rotateZ(vertexOffset.xy, u_rotation), boxCenter.z + vertexOffset.z);
    //    vec3 vertexPos = vec3(boxCenter.xy + rotateZ(vertexOffset.xy / u_scale, u_rotation), boxCenter.z + vertexOffset.z / u_scale);

    // clip on ground plane
    vertexPos.z = min(vertexPos.z, 0.0);


    gl_Position = u_matrix * vec4(vertexPos, 1.0);

    #ifdef SPHERE
    //    vec4 vertexScreen = u_screenMatrix * vec4(vertexPos, 1.0);
    //    vec4 origin = u_iSMatrix * vec4(vertexScreen.xy, -1.0, vertexScreen.w);
    vec4 origin = u_inverseMatrix * vec4(gl_Position.xy, -1.0, gl_Position.w);

    v_rayOrigin = origin.xyz / origin.w;
    v_rayDirecton = vertexPos - v_rayOrigin;
    v_worldPos = boxCenter;

    v_rayOrigin.z *= u_zMeterToPixel;
    v_rayDirecton.z *= u_zMeterToPixel;
    v_worldPos.z *= u_zMeterToPixel;
    //    vec3 vertexScreen = mul(u_screenMatrix, vertexPos);
    //    vec3 origin = mul(u_iSMatrix, vec3(vertexScreen.xy, -1.0));
    //    vec3 target = mul(u_iSMatrix, vec3(vertexScreen.xy, 0.0));
    //    v_rayDirecton = target - origin;
    //    v_rayOrigin = origin;
    //    v_worldPos = boxCenter;
    #else
    //    vPosition = vertexOffset;
    vPosition = vec3(vertexOffset.xy, vertexOffset.z * u_zMeterToPixel);
    v_strokeWidth = u_strokeWidth / u_scale * scaleDZ;
    v_normal = a_normal;
    #endif


    #ifdef SPECULAR
    v_surfaceToCam = u_camWorld - vertexPos;
//    v_surfaceToCam = u_camWorld - worldPos.xyz;
    #endif

    vSize = size;
}
