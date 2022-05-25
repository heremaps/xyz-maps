precision mediump float;

uniform vec4 u_fill;
uniform vec4 u_stroke;
uniform float u_strokeWidth;
uniform float u_scale;

varying vec3 vSize;

#ifdef SPHERE
varying vec3 v_worldPos;
varying vec3 v_rayOrigin;
varying vec3 v_rayDirecton;
#else
varying vec3 vPosition;
const float smoothness = .25;
#endif

uniform float u_zMeterToPixel;


varying vec3 v_normal;
#define lightDir vec3(.5, .0, -1.0)


#ifdef SPHERE
float sphereIntersect(vec3 rayOrigin, vec3 rayDirection, vec3 spherePosition, float sphereRadius){
    vec3 oc = rayOrigin - spherePosition.xyz;
    float b = dot(oc, rayDirection);
    float c = dot(oc, oc) - sphereRadius * sphereRadius;
    float d = b * b - c;
    return (d < 0.0) ? -1.0 : -b -sqrt(d);
}
#endif

void main(void){

    vec4 color = u_fill;
    vec3 normal;

    #ifdef SPHERE
    float radius = vSize.x;
    float distance = sphereIntersect(v_rayOrigin, normalize(v_rayDirecton), v_worldPos, radius);
    if (distance == -1.0) discard;
//    float c = (length(v_worldPos-v_rayOrigin)-distance)/radius * 0.3 + 0.7;
//    color *= vec4(c, c, c, 1.0);
    vec3 surfacePos = normalize(v_rayDirecton) * distance + v_rayOrigin;
    // surface normal in world space
    normal = normalize(surfacePos - v_worldPos);
    #else

    vec3 size = vSize;
//    size.z *= u_zMeterToPixel;
    vec3 pos = vPosition;
//    vec3 pos = vec3(vPosition.xy,vPosition.z*u_zMeterToPixel);

    float a = smoothstep(u_strokeWidth, u_strokeWidth + smoothness, length(abs(pos.xy) - size.xy));
    a *= smoothstep(u_strokeWidth, u_strokeWidth + smoothness, length(abs(pos.yz) - size.yz));
    a *= smoothstep(u_strokeWidth, u_strokeWidth + smoothness, length(abs(pos.xz) - size.xz));
    color = mix(u_stroke, u_fill, a);

    // interpolated varying -> unit vector
    normal = normalize(v_normal);
    #endif

    float light = clamp(0.0,1.0,dot(normal, lightDir));
    color.rgb *= light;

    gl_FragColor = color;
}
