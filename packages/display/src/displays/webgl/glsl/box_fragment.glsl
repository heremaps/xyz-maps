precision mediump float;

uniform vec4 u_fill;
uniform vec4 u_stroke;
uniform vec3 u_lightDir;

varying vec3 vSize;

#ifdef SPHERE
varying vec3 v_worldPos;
varying vec3 v_rayOrigin;
varying vec3 v_rayDirecton;
#else
varying float v_strokeWidth;
varying vec3 vPosition;
const float smoothness = .25;
#endif

uniform float u_zMeterToPixel;


varying vec3 v_normal;



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

    float a = smoothstep(v_strokeWidth, v_strokeWidth + smoothness, length(abs(vPosition.xy) - vSize.xy));
    a *= smoothstep(v_strokeWidth, v_strokeWidth + smoothness, length(abs(vPosition.yz) - vSize.yz));
    a *= smoothstep(v_strokeWidth, v_strokeWidth + smoothness, length(abs(vPosition.xz) - vSize.xz));
    color = mix(u_stroke, u_fill, a);

    // interpolated varying -> unit vector
    normal = normalize(v_normal);
    #endif

    float light = clamp(0.0,1.0,dot(normal, u_lightDir));
    color.rgb *= light;

    gl_FragColor = color;
}
