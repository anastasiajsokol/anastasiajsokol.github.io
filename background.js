import Meta from "./backgrounds/meta/meta.js";
import Balloon from "./backgrounds/balloon/balloon.js";

const floor = Math.floor;
const sqrt = Math.sqrt;

function create_shader(gl, type, source){
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        return shader;
    }
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
}

function create_program(gl, vertex_shader, fragment_shader){
    const program = gl.createProgram();
    gl.attachShader(program, vertex_shader);
    gl.attachShader(program, fragment_shader);
    gl.linkProgram(program);
    if(gl.getProgramParameter(program, gl.LINK_STATUS)){
        return program;
    }
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
}

function create_attribute_buffer(gl, data, program, name, size, stride = 0, offset = 0){
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
    return buffer;
}

function unwrap(option, name){
    name ??= "unknown";
    if(!option){ throw Error(`Failed to unwrap ${name}`); }
    return option;
}

window.addEventListener("load", async () => {
    // setup canvas webgl context
    const canvas = unwrap(document.getElementById("screen"), "screen");
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const gl = unwrap(canvas.getContext("webgl2"), "webgl");

    gl.viewport(0, 0, w, h);
    gl.clearColor(0.996,0.427,0.451, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // compile shaders
    const vertex_code = await (await fetch("backgrounds/shaders/vertex.glsl")).text();
    const fragment_code = await (await fetch("backgrounds/shaders/fragment.glsl")).text();

    const vertex_shader = unwrap(create_shader(gl, gl.VERTEX_SHADER, vertex_code), "vertex shader");
    const fragment_shader = unwrap(create_shader(gl, gl.FRAGMENT_SHADER, fragment_code), "fragment shader");

    const shader = unwrap(create_program(gl, vertex_shader, fragment_shader), "shader program");
    gl.useProgram(shader);

    // common buffer for all panels
    let panel_size = (w < 600) ? 20 : 50;

    create_attribute_buffer(gl, [
        1, -1,
        -1, -1,
        -1, 1,
        
        1, 1,
        1, -1,
        -1, 1
    ], shader, "vertex", 2);
    
    // panel control uniforms
    const utrans = gl.getUniformLocation(shader, "translate");
    const ures = gl.getUniformLocation(shader, "resolution");
    const uepoch = gl.getUniformLocation(shader, "epoch");
    const ufront = gl.getUniformLocation(shader, "front");
    const uback = gl.getUniformLocation(shader, "back");
    const utime = gl.getUniformLocation(shader, "time");
    const utilesize = gl.getUniformLocation(shader, "tilesize");

    // set tilesize
    gl.uniform1f(utilesize, panel_size);

    // current page view
    let front = 0;
    let back = 1;

    // panel offsets
    let positions = [];
    let max_pos_time = undefined;

    function gen_positions(){
        positions = [];

        const tps = 2 * panel_size;

        for(let x = 0; x < w; x += tps){
            for(let y = 0; y < h; y += tps){
                positions.push([x, y]);
            }
        }
        let [x, y] = positions[positions.length - 1];
        x = floor(x / tps) * tps;
        y = floor(y / tps) * tps;
        const dist = sqrt(x * x + y * y);
        max_pos_time = (dist / 1000) * 0.3 + 1;
    }

    gen_positions();

    // initialize backgrounds
    gl.uniform = (name) => gl.getUniformLocation(shader, name);
    gl._text_id = 0;
    gl.request_texture_id = () => { let res = gl._text_id; ++gl._text_id; return res; }
    
    const meta = new Meta(gl, w, h);
    const balloon = new Balloon(gl, w, h);
    
    // handle resize
    window.addEventListener("resize", () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;

        gl.viewport(0, 0, w, h);
        gl.uniform2f(ures, w, h);

        panel_size = (w < 600) ? 20 : 50;
        gl.uniform1f(utilesize, panel_size);
        gen_positions();

        meta.resize(gl, w, h);
        balloon.resize(gl, w, h);
    });
    
    // time tracker
    const time = {
        time: 0,
        dt: 0,
        epoch: undefined, // set to undefined to stay at zero, set to zero to restart
    };

    // update background objects
    function update(pid){
        switch(pid){
            case 0: meta.update(gl, time, w, h); break;
            case 1: balloon.update(gl, time, w, h); break;
        }
    }

    // render loop
    function render(timestamp){
        time.dt = (timestamp - time.time) * 0.001;
        time.epoch += time.dt / 1.5; // animate over 0.5 seconds
        time.time = timestamp;

        // change epoch
        if(time.epoch > max_pos_time){
            if(!isNaN(window.background.next)){
                if(window.background.next == back){ // note 'back' is current the front face
                    console.log("Skipping next to same side");
                    front = back;
                    time.epoch = undefined;
                } else {
                    front = back;
                    back = window.background.next;
                    window.background.next = undefined;
                    console.log(`Starting next ${back}`);
                    time.epoch = 0;
                }
            } else {
                console.log("Done");
                front = back;
                time.epoch = undefined;
            }
        }

        update(front);
        if(!isNaN(time.epoch)){ update(back); }

        // render
        gl.useProgram(shader);
        gl.uniform2f(ures, w, h);
        gl.uniform1f(uepoch, time.epoch || 0);
        gl.uniform1f(utime, time.time / 1000);
        gl.uniform1i(ufront, front);
        gl.uniform1i(uback, back);

        for(const pos of positions){
            gl.uniform2f(utrans, ...pos);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        requestAnimationFrame(render);
    }

    // setup window object controls (defined elsewhere)
    function impliment_window_interface(){
        window.background.flipto = (pid) => {
            if(isNaN(time.epoch)){
                if(pid != front){
                    console.log(`Flipping to ${pid}`);
                    back = pid;
                    time.epoch = 0;
                } else {
                    console.log("Skipping flipto same side");
                }
            } else {
                console.log(`Queuing ${pid}`);
                window.background.next = pid;
            }
        };

        for(const fn of window.background._onloadqueue){
            fn();
        }

        window.background.loaded = true;
    }

    function start(timestamp){
        // clear CSS background
        setTimeout(() => {document.body.style.background = "#FE6D73"; impliment_window_interface();}, 2000);

        // start fade in
        canvas.classList.add('fade');

        // pass control
        render(timestamp);
    }

    requestAnimationFrame(start);
});