precision highp float;

uniform vec3 ambient;
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 u_ambientLight;
uniform float illumination;
uniform float shininess;
uniform vec3 specular;
uniform sampler2D specularMap;
uniform sampler2D diffuseMap;
uniform sampler2D normalMap;
varying vec4 v_color;
varying vec3 v_normal;
varying vec2 v_texCoord;
varying vec3 v_surfaceToCam;
varying vec3 v_tangent;
varying vec3 v_lightDir;

void main() {
    float flip = float(gl_FrontFacing) * 2.0 - 1.0;
    vec3 normal = normalize(v_normal);

    vec3 color = ambient * u_ambientLight + emissive;

    //******** normal mapping *******//
    normal = normal * flip;
    vec3 tangent = normalize(v_tangent) * flip;
    vec3 bitangent = normalize(cross(normal, tangent));
    mat3 matrixTbn = mat3(tangent, bitangent, normal);
    normal = texture2D(normalMap, v_texCoord).rgb * 2. - 1.;
    normal = normalize(matrixTbn * normal);
    //*******************************//

    //******* diffuse light ********//
    float diffuseLight = illumination == 0.0 ? 1.0 : max(.3, dot(normal, v_lightDir));
    vec4 diffuseMapColor = texture2D(diffuseMap, v_texCoord);
    vec3 diffuseColor = diffuse * diffuseMapColor.rgb * v_color.rgb;
    float opacity = v_color.a * diffuseMapColor.a;
    color += diffuseLight * diffuseColor;
    //*******************************//

    //******* specular light ********//
    vec3 surfaceToCamDir = normalize(v_surfaceToCam);
    vec3 halfVector = normalize(v_lightDir + surfaceToCamDir);
    float specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);
    color += specular * texture2D(specularMap, v_texCoord).rgb * pow(specularLight, shininess);
    //*******************************//

    gl_FragColor = vec4(emissive + color, opacity);

    #ifdef DBG_GRID
    float dx = distance(gl_FragCoord.x, .5) * 512.;
    float dy = distance(gl_FragCoord.y, .5) * 512.;
    if (dx > 253. || dy > 253.)gl_FragColor = vec4(1., .0, .0, 1.);
    #endif
}
