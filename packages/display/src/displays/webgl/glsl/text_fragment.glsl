precision mediump float;

varying vec2 v_texcoord;
uniform sampler2D u_texture;
uniform float u_opacity;
uniform bool u_strokeOnly;
uniform vec4 u_fillColor;
uniform vec4 u_strokeColor;

void main() {
    vec4 glyphColor = texture2D(u_texture, v_texcoord);

    if (u_strokeOnly){
        gl_FragColor = (glyphColor.a - glyphColor.r) * u_strokeColor;
    }else{
        gl_FragColor = glyphColor.r * u_fillColor;
    }

    gl_FragColor.a *= u_opacity;
}
