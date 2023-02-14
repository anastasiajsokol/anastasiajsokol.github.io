const num_metaballs = 40;

export default class Meta {
    metaballs;
    umetaballs;
    ulevel;
    velocity;

    constructor(gl, w, h){
        this.metaballs = new Float32Array(3 * num_metaballs);
        this.velocity = new Float32Array(2 * num_metaballs);

        this.randomize(w, h);

        this.umetaballs = gl.uniform("metaballs");
        this.ulevel = gl.uniform("level");

        gl.uniform1i(this.ulevel, this.get_level(w, h));
    }

    get_level(w, h){
        let scale = w * h * 0.000021817750223413762;
        let base = Math.round(scale / 10);
        if(base < 0){
            return 0;
        } else if(base > 4){
            return 4;
        }
        return base;
    }
    
    randomize(w, h){
        for(var i = 0, j = 0; i < 3 * num_metaballs; i += 3, j += 2){
            let r = Math.random() * 60 + 10;

            this.metaballs[i + 0] = Math.random() * (w - 2 * r) + r;
            this.metaballs[i + 1] = Math.random() * (h - 2 * r) + r;
            this.metaballs[i + 2] = r; 

            this.velocity[j + 0] = (Math.random() * 2 - 1) * 20;
            this.velocity[j + 1] = (Math.random() * 2 - 1) * 20;
        }
    }

    update(gl, time, w, h){
        for(var i = 0, j = 0; i < 3 * num_metaballs; i += 3, j += 2){
            this.metaballs[i + 0] += this.velocity[j + 0] * time.dt;
            this.metaballs[i + 1] += this.velocity[j + 1] * time.dt;

            let r = this.metaballs[i + 2];

            if(this.metaballs[i] < r){
                this.metaballs[i] = r;
                this.velocity[j] = -this.velocity[j];
            } else if(this.metaballs[i] > w - r){
                this.metaballs[i] = w - r;
                this.velocity[j] = -this.velocity[j];
            }

            if(this.metaballs[i + 1] < r){
                this.metaballs[i + 1] = r;
                this.velocity[j + 1] = -this.velocity[j + 1];
            } else if(this.metaballs[i + 1] > h - r){
                this.metaballs[i + 1] = h - r;
                this.velocity[j + 1] = -this.velocity[j + 1];
            }
        }

        gl.uniform3fv(this.umetaballs, this.metaballs);
    }

    resize(gl, w, h){
        this.randomize(w, h);
        gl.uniform1i(this.ulevel, this.get_level(w, h));  // update number of metaballs
    }
};