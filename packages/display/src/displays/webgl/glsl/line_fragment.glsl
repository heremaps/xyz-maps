precision lowp float;

uniform vec4 u_fill;
varying vec2 v_normal;
varying vec2 v_dir;
uniform bool u_no_antialias;

#ifdef DASHARRAY
uniform highp float u_scale;
uniform sampler2D u_pattern;
varying float v_lengthSoFar;
uniform sampler2D u_dashTexture;
uniform bool u_hasDashTexture;
uniform vec3 u_dashSize;
#endif
varying vec2 v_width;

void main(void){
    highp float lineWidth = v_width.s + v_width.t;// including alias overhead;
    highp float width = length(v_normal) * lineWidth;

    if (width > lineWidth){ // discard round caps ("cones")
        discard;
    }

    #ifdef DASHARRAY
    if (u_hasDashTexture){
        // dash size + gap size
        float totalDashSize = u_dashSize.y + u_dashSize.z;
        //  [dashsize: constant, gabsize: scaling, ->pattern: fix]
        float u = fract(v_lengthSoFar/totalDashSize) * (1. + u_dashSize.z / u_dashSize.y) * u_scale;
        //  [dashsize: constant, gabsize: constant, ->pattern: floating]
//         float u = fract(v_lengthSoFar/totalDashSize * u_scale) * (u_dashSize.z / u_dashSize.y);
        gl_FragColor = u_fill * texture2D(u_dashTexture, vec2(u, v_dir.y));
        // gl_FragColor = vec4(u_fill.rgb, u_fill.a * texture2D(u_dashTexture, vec2(u, v_dir.y)).a);
    } else {
        float dash = texture2D(u_pattern, vec2(fract(v_lengthSoFar / u_dashSize.x * u_scale))).r;
        gl_FragColor = u_fill * dash;
    }
    #else
    gl_FragColor = u_fill;
    #endif

    if (!u_no_antialias){
        //    float antialiasAlpha = 1.0 - clamp(.5 * (width - lineWidth) / v_width.t, .0, 1.);
        gl_FragColor.a *= 1.0 - clamp(.5 * width - .5 * v_width.s + .5, .0, 1.);
    }
}
