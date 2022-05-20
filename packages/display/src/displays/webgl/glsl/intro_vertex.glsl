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

const float SCALE_UINT16_Z = 9000.0 / 65535.0; // 0.1373311970702678m precision
