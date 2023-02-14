precision highp float;

// panel uniforms
uniform highp float time;
uniform highp vec2 resolution;
uniform int front;
uniform int back;

// metaball uniforms
const int MAX_METABALLS = 40;
uniform vec3 metaballs[MAX_METABALLS];
uniform int level;

// from vertex
varying vec2 fragment_position;

// ballon texture for clouds
uniform sampler2D balloon_texture;
uniform highp vec2 balloon_dimensions;
uniform highp vec2 balloon_offset;

// noise (for clouds) - Simplex 3d + FBM
vec3 random3(vec3 c) {
	float j = 4096.0 * sin(dot(c,vec3(17.0, 59.4, 15.0)));
	vec3 r;
	r.z = fract(512.0*j);
	j *= 0.125;
	r.x = fract(512.0*j);
	j *= 0.125;
	r.y = fract(512.0*j);
	return r-0.5;
}

const float F3 =  0.3333333;
const float G3 =  0.1666667;

/* 3d simplex noise */
float simplex3d(vec3 p) {
	 vec3 s = floor(p + dot(p, vec3(F3)));
	 vec3 x = p - s + dot(s, vec3(G3));
	 
	 vec3 e = step(vec3(0.0), x - x.yzx);
	 vec3 i1 = e*(1.0 - e.zxy);
	 vec3 i2 = 1.0 - e.zxy*(1.0 - e);
	 	
	 vec3 x1 = x - i1 + G3;
	 vec3 x2 = x - i2 + 2.0*G3;
	 vec3 x3 = x - 1.0 + 3.0*G3;
	 
	 vec4 w, d;
	 
	 w.x = dot(x, x);
	 w.y = dot(x1, x1);
	 w.z = dot(x2, x2);
	 w.w = dot(x3, x3);
	 
	 w = max(0.6 - w, 0.0);
	 
	 d.x = dot(random3(s), x);
	 d.y = dot(random3(s + i1), x1);
	 d.z = dot(random3(s + i2), x2);
	 d.w = dot(random3(s + 1.0), x3);
	 
	 w *= w;
	 w *= w;
	 d *= w;
	 
	 return dot(d, vec4(52.0));
}

float fbm(vec3 pos){
    const int NUM_OCTAVES = 8;
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * simplex3d(pos);
        pos.xy = rot * pos.xy * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

vec3 cloud(vec2 pos){
    float noise = fbm(vec3(pos.x - time * 0.02, pos.y, time / 10.0)) * 2.0;
    return mix(vec3(0.388,0.769,0.859), vec3(1.0, 1.0, 1.0), noise);
}

// main
void main(){
    // shift time
    float t = time / 4.0;

    // get screen space position
    vec2 pos = fragment_position / resolution;

    // get page id
    int pid = back;
    if(gl_FrontFacing){
        pid = front;
    }

    // default color
    vec3 color = vec3(1.0, 0.0, 0.0);

    // set color
    if(pid == 0){                                    // metaballs
        float x = gl_FragCoord.x;
        float y = gl_FragCoord.y;
        float sum = 0.0;
        if(level == 0){
            for(int i = 0; i < 4; ++i){
                vec3 md = metaballs[i];

                float dx = md.x - x;
                float dy = md.y - y;
                float r  = md.z;

                sum += r * r / (dx * dx + dy * dy);
            }
        } else if(level == 1){
            for(int i = 0; i < 6; ++i){
                vec3 md = metaballs[i];

                float dx = md.x - x;
                float dy = md.y - y;
                float r  = md.z;

                sum += r * r / (dx * dx + dy * dy);
            }
        } else if(level == 2){
            for(int i = 0; i < 20; ++i){
                vec3 md = metaballs[i];

                float dx = md.x - x;
                float dy = md.y - y;
                float r  = md.z;

                sum += r * r / (dx * dx + dy * dy);
            }
        } else if(level == 3){
            for(int i = 0; i < 30; ++i){
                vec3 md = metaballs[i];

                float dx = md.x - x;
                float dy = md.y - y;
                float r  = md.z;

                sum += r * r / (dx * dx + dy * dy);
            }
        } else if(level == 4){
            for(int i = 0; i < MAX_METABALLS; ++i){
                vec3 md = metaballs[i];

                float dx = md.x - x;
                float dy = md.y - y;
                float r  = md.z;

                sum += r * r / (dx * dx + dy * dy);
            }
        }

        vec2 origin = vec2(0.5, 0.5);
        pos -= origin;
        float angle = 3.92699 + atan(pos.y, pos.x);
        float t = sin(angle) * length(pos) + origin.x;

        if(sum > 1.0){
            vec3 A = vec3(0.639,0.467,0.812);
            vec3 B = vec3(0.706,0.996,0.906);
            color = mix(A, B, t);
        } else {
            vec3 A = vec3(0.945, 0.561, 0.004);
            vec3 B = vec3(1.0, 0.984, 0.275);
            color = mix(A, B, t);
        }
    } else if(pid == 1){
        vec4 balloon = texture2D(balloon_texture, (fragment_position - balloon_offset) / balloon_dimensions);
        color = cloud(fragment_position / 900.0) * (1.0 - balloon.w) + balloon.xyz * balloon.w;
    }
    
    gl_FragColor = vec4(color, 1.0);
}