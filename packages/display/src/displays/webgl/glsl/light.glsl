struct AmbientLight {
    vec3 color;
    float intensity;
};
struct EmissiveLight {
    vec3 color;
//    float intensity;
};
struct DirectionalLight {
    vec3 color;
    float intensity;
    vec3 direction;
};

#define MAX_DIR_LIGTHS 6

uniform EmissiveLight u_emissive;
uniform AmbientLight u_ambient;

uniform DirectionalLight u_directionalLight[MAX_DIR_LIGTHS];
uniform int u_numDirectionalLights;


vec4 computeBaseLighting(vec3 normal, vec3 color, float colorIntensity, float alpha) {
    vec3 totalLighting = color * u_ambient.color * u_ambient.intensity;

    //Directional/diffuse Lights
    for (int i = 0; i < MAX_DIR_LIGTHS; i++) {
        if (i >= u_numDirectionalLights) break;
        vec3 lightDir = normalize(u_directionalLight[i].direction);
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 directionalColor = u_directionalLight[i].color * color * colorIntensity;
        vec3 diffuse = diff * directionalColor * u_directionalLight[i].intensity;
        totalLighting += diffuse;
    }

    // Emissive Light with alpha
    vec3 emissive = u_emissive.color * alpha; // * u_emissive.intensity;

    // Calculate final color with alpha
   return vec4(totalLighting + emissive, alpha);
}

vec4 addSpecularHighlights(vec3 normal, vec4 totalLighting, vec3 surfaceToCam, float shininess, vec3 specular) {
    // Specular lights
    for (int i = 0; i < MAX_DIR_LIGTHS; i++) {
        if (i >= u_numDirectionalLights) break;
        vec3 lightDir = normalize(u_directionalLight[i].direction);
        // Specular lighting (Blinn-Phong reflection model)
        vec3 viewDir = normalize(surfaceToCam);
        // vec3 viewDir = surfaceToCam;
        vec3 halfwayDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfwayDir), 0.0), shininess);
        totalLighting.rgb += specular * spec * u_directionalLight[i].color * u_directionalLight[i].intensity;
    }
    return totalLighting;
}
#ifdef SPECULAR
vec4 computeLighting(vec3 normal, vec3 color, float colorIntensity, float alpha, vec3 surfaceToCam, float shininess, vec3 specular) {
    vec4 light = computeBaseLighting(normal, color, colorIntensity, alpha);
    light = addSpecularHighlights(normal, light, surfaceToCam, shininess, specular);
    return light;
}
#else
vec4 computeLighting(vec3 normal, vec3 color, float colorIntensity, float alpha) {
    return computeBaseLighting(normal, color, colorIntensity, alpha);
}
#endif
