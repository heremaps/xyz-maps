#ifdef GL_OES_standard_derivatives
    #extension GL_OES_standard_derivatives: enable
#endif
precision highp float;

uniform vec4 u_fill;
varying vec2 v_normal;
varying vec2 v_dir;
uniform bool u_no_antialias;

#ifdef DASH_ARRAY
uniform highp float u_scale;
#ifdef DASH_PATTERN
uniform sampler2D u_dashPattern;
#endif
varying float v_lengthSoFar;
#ifdef DASH_TEXTURE
uniform sampler2D u_dashTexture;
uniform bool u_hasDashTexture;
#endif
varying vec2 v_dashSize;
#endif
varying vec2 v_width;

void main(void){
    highp float lineWidth = v_width.s + v_width.t;// including alias overhead;
    highp float width = length(v_normal) * lineWidth;

    if (width > lineWidth){ // discard round caps ("cones")
        discard;
    }

#ifdef DASH_ARRAY
    // Ensure dashSize remains valid: if set to 0 (dynamic uniform), set to large value to force a solid line
    float dashSize = v_dashSize.x + (1.0 - step(0.1, v_dashSize.x)) * 1e5;
    float gapSize = v_dashSize.y;
    float totalDashSize = dashSize + gapSize;

#ifdef DASH_PATTERN
    float dash = texture2D(u_dashPattern, vec2(fract(v_lengthSoFar / totalDashSize * u_scale))).r;
    gl_FragColor = u_fill * step(0.1, dash);
#else
    float patternPosition = fract(v_lengthSoFar / totalDashSize * u_scale);
    float dashPosition = dashSize / totalDashSize;

#ifdef DASH_TEXTURE
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
        // "width" is the distance from the line center in "expanded" units.
        // the visible half-width is v_width.s, and v_width.t is the AA gutter size.
        float halfWidth = v_width.s;
        float dist = width;
        // derivative-based smoothing in screen space (stable under pitch/zoom).
        #if defined(GL_OES_standard_derivatives) || __VERSION__ >= 300
        float w = max(fwidth(dist), 1e-4);
        // fade out over the AA region around the edge.
        float alpha = 1.0 - smoothstep(halfWidth - w, halfWidth + w, dist);
        #else
        // use the precomputed AA gutter (v_width.t) as a linear fade.
        float alpha = 1.0 - clamp((dist - halfWidth) / max(v_width.t, 1e-4), 0.0, 1.0);
        #endif
        gl_FragColor *= alpha;
    }
}
