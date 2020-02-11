precision lowp float;

varying vec2 v_textureCoord;
uniform sampler2D u_sampler;

void main(void){
    gl_FragColor = texture2D(u_sampler, v_textureCoord);
}
