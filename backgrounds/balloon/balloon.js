export default class balloon {
    x;
    y;
    w;
    h;

    epoch;
    vx;
    vy;

    position;

    constructor(gl, w, h){
        const image = document.getElementById("balloontexture");

        if(!image || image.tagName != "IMG"){
            throw Error("Failed to load image 'balloontexture'");
        }

        let texture_id = gl.request_texture_id();

        const balloon = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + texture_id);
        gl.bindTexture(gl.TEXTURE_2D, balloon);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        const texture_uniform = gl.uniform("balloon_texture");
        gl.uniform1i(texture_uniform, texture_id);

        const balloon_dimensions = gl.uniform("balloon_dimensions");
        gl.uniform2f(balloon_dimensions, image.width, image.height);

        this.position = gl.uniform("balloon_offset");
        gl.uniform2f(this.position, w, h);

        this.w = image.width;
        this.h = image.height;

        this.randomize(w, h);
    }

    randomize(w, h){
        if(h > w){
            this.x = w;
            this.y = h;
        }

        const speed = 50;

        const lerp = (a, b, t) => (1 - t) * a + t * b;
        this.x = -this.w;

        if(w > h){
            this.y = 7 * h / 8 - this.h * Math.random();
        } else {
            this.y = 2 * h / 3 - this.h / 2;
        }

        let angle = lerp(Math.PI / 10, Math.PI / 8, Math.random());

        this.vx = Math.cos(angle);
        this.vy = -Math.sin(angle);
        
        let mod = Math.sqrt(this.vx * this.vx + this.vy * this.vy) / speed;
        
        this.vx /= mod;
        this.vy /= mod;
    }

    outofbounds(w, h){
        return this.x > w || this.y + this.h < 0;
    }
    
    update(gl, time, w, h){
        if(h > w){
            return;
        }
        
        if(this.outofbounds(w, h)){
            setTimeout(() => {if(this.outofbounds(w, h)){this.randomize(w, h);}}, 5000 + 5000 * Math.random());
        }

        this.x += this.vx * time.dt;
        this.y += this.vy * time.dt;

        let x = this.x;
        let y = this.y + 50 * Math.sin(time.time / 1000) + 100 * Math.cos(time.time / 3000);

        gl.uniform2f(this.position, x, y);
    }

    resize(gl, w, h){
        if(h > w){
            this.x = w;
            this.y = h;
            gl.uniform2f(this.position, w, h);
        }
    }
}