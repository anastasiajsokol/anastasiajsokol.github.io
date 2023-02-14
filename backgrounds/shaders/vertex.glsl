attribute vec3 vertex;

uniform vec2 translate;
uniform highp vec2 resolution;
uniform float epoch;

uniform float tilesize;

varying vec2 fragment_position;

mat4 rotation(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(
        oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
        oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
        oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
        0.0,                                0.0,                                0.0,                                1.0
    );
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
    return (rotation(axis, angle) * vec4(v, 1.0)).xyz;
}

float distance_origin(vec2 p){
    return sqrt(p.x * p.x + p.y * p.y);
}

const float TAU = 6.28318530718;

void main(){
    // shift t by position
    float dist_to_top_corner = distance_origin(floor(translate / 100.0) * 100.0) / 1000.0;

    float t = min(max(epoch - dist_to_top_corner * 0.3, 0.0), 1.0);

    // initialize position to vertex
    vec3 pos = vertex * tilesize;
    
    // rotate
    vec3 axis = vec3(1.0, -1.0, 0.0);
    pos = rotate(pos, axis, t * TAU / 2.0);

    // translate with offset
    pos += vec3(translate + vec2(tilesize), 0);

    fragment_position = pos.xy;

    // clip to screen space and save
    vec2 clip = ((pos.xy / resolution) * 2.0 - 1.0) * vec2(1.0, -1.0);
    gl_Position = vec4(clip, 0.0, 1.0);
}