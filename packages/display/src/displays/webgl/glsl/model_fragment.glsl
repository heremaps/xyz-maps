precision lowp float;

uniform sampler2D diffuseMap;
uniform vec3 diffuse;
varying vec4 v_color;
varying vec3 v_normal;
varying vec2 v_texCoord;
uniform vec3 u_lightDir;
uniform float illumination;

void main(void){

    vec3 normal = normalize(v_normal);

    float light = illumination == 0.0 ? 1.0 : max(.3, dot(normal, u_lightDir));

    gl_FragColor = v_color * vec4(diffuse.rgb, 1.0) * light * texture2D(diffuseMap, v_texCoord);

    #ifdef DBG_GRID
    float dx = distance(gl_FragCoord.x, .5) * 512.;
    float dy = distance(gl_FragCoord.y, .5) * 512.;
    if (dx>253.||dy>253.)gl_FragColor = vec4(1., .0, .0, 1.);
    #endif
}
