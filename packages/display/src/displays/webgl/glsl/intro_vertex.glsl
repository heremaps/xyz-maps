vec2 round(vec2 point){
    vec2 fractPoint = fract(point);
    point += step(0.5, fractPoint) - fractPoint;
    return point;
}

vec4 snapToScreenPixel(vec4 position, vec2 resolution){
    resolution *= DEVICE_PIXEL_RATIO;
    vec2 screenPixel = ((position.xy / position.w + 1.0) / 2.0) * resolution;
    position.xy = (round(screenPixel) / resolution * 2.0 - 1.0) * position.w;
    return position;
}

vec2 rotateZ(vec2 v, float a){
    float rotSin = sin(a);
    float rotCos = cos(a);
    mat2 m = mat2(rotCos, -rotSin, rotSin, rotCos);
    return v * m;
}

//vec2 rotateZ(vec2 point, float rad){
//    float s = sin(rad);
//    float c = cos(rad);
//    return vec2(point.x * c + point.y * s, point.y * c - point.x * s);
//}



const float SCALE_UINT16_Z = 9000.0 / 65535.0; // 0.1373311970702678m precision
