precision lowp float;

uniform vec4 u_fill;
varying vec2 v_normal;
varying vec2 v_dir;
uniform bool u_no_antialias;

#ifdef DASHARRAY
uniform highp float u_scale;
#if (DASHARRAY & 2)
uniform sampler2D u_dashPattern;
#endif
varying float v_lengthSoFar;
uniform sampler2D u_dashTexture;
uniform bool u_hasDashTexture;
varying vec2 v_dashSize;
#endif
varying vec2 v_width;

void main(void){
    highp float lineWidth = v_width.s + v_width.t;// including alias overhead;
    highp float width = length(v_normal) * lineWidth;

    if (width > lineWidth){ // discard round caps ("cones")
        discard;
    }

    #ifdef DASHARRAY
        float dashSize = v_dashSize.x;
        float gapSize = v_dashSize.y;
        float totalDashSize = dashSize + gapSize;

        #if DASHARRAY & 2
            float dash = texture2D(u_dashPattern, vec2(fract(v_lengthSoFar / totalDashSize * u_scale))).r;
            gl_FragColor = u_fill * step(0.1, dash);
        #else
            float patternPosition = fract(v_lengthSoFar / totalDashSize * u_scale);
            float dashPosition = dashSize / totalDashSize;

            #if DASHARRAY & 4
//            #ifdef DASH_ICON
                // [dashsize: constant, gabsize: scaling, ->pattern: fix]
                // float u = fract(v_lengthSoFar/totalDashSize) * (1. + gapSize / dashSize) * u_scale;
                // [dashsize: constant, gabsize: constant, ->pattern: floating]
                // float u = fract(v_lengthSoFar/totalDashSize * u_scale) * (1. + gapSize / dashSize);
                // gl_FragColor = vec4(u_fill.rgb, u_fill.a * texture2D(u_dashTexture, vec2(u, v_dir.y)).a);
                float u = patternPosition / dashPosition;
                gl_FragColor = u_fill * texture2D(u_dashTexture, vec2(u, v_dir.y));
            #else
                gl_FragColor = u_fill * step(patternPosition, dashPosition);
            #endif
        #endif

    #else
        gl_FragColor = u_fill;
    #endif

    if (!u_no_antialias){
        //    float antialiasAlpha = 1.0 - clamp(.5 * (width - lineWidth) / v_width.t, .0, 1.);
        gl_FragColor.a *= 1.0 - clamp(.5 * width - .5 * v_width.s + .5, .0, 1.);
    }
}
