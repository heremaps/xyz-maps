precision mediump float;

varying vec2 v_texcoord;
uniform sampler2D u_texture;
uniform bool u_strokeOnly;
uniform vec4 u_fillColor;
uniform vec4 u_strokeColor;

void main() {
    vec4 glyph = texture2D(u_texture, v_texcoord);
    vec4 color;
    float glyphAlpha;

    if (u_strokeOnly){
        color = u_strokeColor;
        glyphAlpha = glyph.a;
    } else {
        color = u_fillColor;
        glyphAlpha = glyph.r;
    }

    gl_FragColor = glyphAlpha * vec4(color.rgb * color.a, color.a);
}
