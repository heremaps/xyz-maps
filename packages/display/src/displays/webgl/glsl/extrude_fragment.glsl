precision lowp float;

uniform vec4 u_fill;
uniform vec4 u_stroke;
uniform bool u_strokePass;
uniform vec3 u_lightDir;
varying vec3 v_normal;

#define top vec2(0.0)

void main(void){
    if (u_strokePass){
        gl_FragColor = u_stroke;
    } else {
        vec3 normal = normalize(v_normal);
        float light = max(.3,dot(normal, u_lightDir));

        gl_FragColor.rgb = u_fill.rgb * light;
        gl_FragColor.a = u_fill.a;
    }
}
