precision lowp float;

uniform vec4 u_fill;
uniform vec4 u_stroke;
uniform bool u_strokePass;
varying vec3 v_normal;

#define lightDir normalize(vec3(0.5, 0.0, -1.0))
#define top vec2(0.0)

void main(void){
    if (u_strokePass){
        gl_FragColor = u_stroke;
    } else {
        if (v_normal.xy == top){
            gl_FragColor = u_fill;
        } else {
            float diffuse = 0.3 + dot(v_normal, lightDir) * 0.7;
            gl_FragColor.rgb = u_fill.rgb * diffuse;
        }
        gl_FragColor.a = u_fill.a;
    }
}
