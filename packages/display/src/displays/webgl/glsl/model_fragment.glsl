precision lowp float;
uniform vec3 ambient;
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 u_ambientLight;
uniform float opacity;
uniform float illumination;
uniform sampler2D diffuseMap;
uniform sampler2D normalMap;
varying vec4 v_color;
varying vec3 v_normal;
varying vec2 v_texCoord;
varying vec3 v_lightDir;
#ifdef SPECULAR
uniform float shininess;
uniform vec3 specular;
uniform sampler2D specularMap;
varying vec3 v_surfaceToCam;
#endif
#ifdef NORMAL_MAP
varying vec3 v_tangent;
#endif


void main() {
    vec3 color = ambient * u_ambientLight + emissive;

    #ifdef DIFFUSE
    vec3 normal = normalize(v_normal);

    #ifdef NORMAL_MAP
    float flip = float(gl_FrontFacing) * 2.0 - 1.0;
    normal = normal * flip;
    vec3 tangent = normalize(v_tangent) * flip;
    vec3 bitangent = normalize(cross(normal, tangent));
    mat3 matrixTbn = mat3(tangent, bitangent, normal);
    normal = texture2D(normalMap, v_texCoord).rgb * 2. - 1.;
    normal = normalize(matrixTbn * normal);

    #ifdef SPECULAR
    vec3 surfaceToCamDir = normalize(v_surfaceToCam);
    vec3 halfVector = normalize(v_lightDir + surfaceToCamDir);
    float specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);
    color += specular * texture2D(specularMap, v_texCoord).rgb * pow(specularLight, shininess);
    #endif

    #endif
    float diffuseLight = max(.3, dot(normal, v_lightDir));
    #else
    float diffuseLight = 1.0;
    #endif

    vec4 diffuseMapColor = texture2D(diffuseMap, v_texCoord);
    vec3 diffuseColor = diffuse * diffuseMapColor.rgb * v_color.rgb;
    color += diffuseLight * diffuseColor;

    gl_FragColor = vec4(emissive + color, opacity * v_color.a * diffuseMapColor.a);

    #ifdef DBG_GRID
    float dx = distance(gl_FragCoord.x, .5) * 512.;
    float dy = distance(gl_FragCoord.y, .5) * 512.;
    if (dx > 253. || dy > 253.)gl_FragColor = vec4(1., .0, .0, 1.);
    #endif
}
