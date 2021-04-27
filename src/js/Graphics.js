const shaderScripts ={
    '2d-vertex-shader':{
        text:`attribute vec2 a_position;varying highp vec2 v_textureCoord;void main(){gl_Position=vec4((a_position.x*2.0*1.0666)-1.0,(a_position.y*2.0*1.6)*-1.0+1.0,0,1);v_textureCoord=vec2(a_position.x,a_position.y);}`,
        type:'x-shader/x-vertex',
    },
    '2d-fragment-shader':{
        text: `varying highp vec2 v_textureCoord;uniform sampler2D u_sampler;void main(void){gl_FragColor=texture2D(u_sampler,vec2(v_textureCoord.s,v_textureCoord.t));}`,
        type:'x-shader/x-fragment',
    },
};
const util = {
    compileShader: function (gl, shaderSource, shaderType) {
        const shader = gl.createShader(shaderType);
        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);
        const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (!success) {
            throw new Error("could not compile shader:" + gl.getShaderInfoLog(shader));
        }
        return shader;
    },

    createProgram: function (gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        const success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!success) {
            throw new Error("program filed to link:" + gl.getProgramInfoLog(program));
        }
        return program;
    },

    createShaderFromScript: function (gl, scriptId, opt_shaderType) {
        // look up the script tag by id.
        const shaderScript=shaderScripts[scriptId];
        const shaderSource = shaderScript.text;
        if (!opt_shaderType) {
            if (shaderScript.type === "x-shader/x-vertex") {
                opt_shaderType = gl.VERTEX_SHADER;
            } else if (shaderScript.type === "x-shader/x-fragment") {
                opt_shaderType = gl.FRAGMENT_SHADER;
            } else {
                throw new Error("Unreachable");
            }
        }
        return this.compileShader(gl, shaderSource, opt_shaderType);
    },

    createProgramFromScripts: function (gl, vertexShaderId, fragmentShaderId) {
        const vertexShader = this.createShaderFromScript(gl, vertexShaderId);
        const fragmentShader = this.createShaderFromScript(gl, fragmentShaderId);
        return this.createProgram(gl, vertexShader, fragmentShader);
    },

    createTexture: function (gl, size) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        const tempPixels = new Uint16Array(size * size);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_SHORT_5_5_5_1, tempPixels);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        return texture;
    },

    updateTexture: function (gl, texture, width, height, pixels) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0,
            width, height, gl.RGBA, gl.UNSIGNED_SHORT_5_5_5_1, pixels);
    },

    createFullscreenQuad: function (gl, lower, upper) {
        const fullscreenQuadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenQuadBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                lower, lower,
                upper, lower,
                lower, upper,
                lower, upper,
                upper, lower,
                upper, upper]),
            gl.STATIC_DRAW);
        return fullscreenQuadBuffer;
    },

};


const GBA_WIDTH = 240;
const GBA_HEIGHT = 160;
const TEXTURE_SIZE = 256;


class VBAGraphics {
    constructor(app) {
        this.app = app;
        this.emscriptenModule = app.gbaninja;
        this.canvas = app.canvas;

        this.totalFrames = 0;
        this.lastFrameTime = window.performance.now();

        // Webgl assets
        this.gl = null;
        this.fullscreenQuadBuffer = null;
        this.texture = null;
        this.shaderProgram = null;
        this.positionLocation = null;
        this.textureSamplerLocation = null;

        // Temporary buffer to store pixels as they're being
        // sub'd into the texture.
        this.pixels = new Uint16Array(GBA_WIDTH * GBA_HEIGHT);

    }

    initScreen() {
        // Get webgl
        this.gl = this.canvas.getContext("webgl", {alpha: false}) ||
            this.canvas.getContext("experimental-webgl", {alpha: false});

        if (!this.gl) return false;

        // Set up assets
        this.shaderProgram = util.createProgramFromScripts(this.gl, "2d-vertex-shader", "2d-fragment-shader");
        this.texture = util.createTexture(this.gl, TEXTURE_SIZE);
        this.fullscreenQuadBuffer = util.createFullscreenQuad(this.gl, 0, 1);

        // Get locations
        this.positionLocation = this.gl.getAttribLocation(this.shaderProgram, "a_position");
        this.textureSamplerLocation = this.gl.getUniformLocation(this.shaderProgram, "u_sampler");

        return true;
    }

    drawGBAFrame(gbaPointer8) {
        const deltaTime = window.performance.now() - this.lastFrameTime;
        this.app.vbaPerf.renderDeadlineResultsThisSecond.push(this.app.hasRequestedFrameButNotRendered);
        this.app.hasRequestedFrameButNotRendered = false;
        this.lastFrameTime = window.performance.now();

        const gbaPointer16 = gbaPointer8 / 2;
        const gbaHeap16 = this.emscriptenModule.HEAP16;
        for (let i = 0; i < this.pixels.length; i++) {
            this.pixels[i] = gbaHeap16[gbaPointer16 + i];
        }
        util.updateTexture(this.gl, this.texture, GBA_WIDTH, GBA_HEIGHT, this.pixels);
        this.drawFrame();
        this.totalFrames++;
    }

    drawFrame() {

        // Bind shader
        this.gl.useProgram(this.shaderProgram);

        // Bind verts
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.fullscreenQuadBuffer);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        // Bind texture
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.uniform1i(this.textureSamplerLocation, 0);

        // Draw
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

    }

    onResize() {
        const canvas = this.canvas;
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        this.gl.viewport(0, 0, canvas.width, canvas.height);
    }
}


export default VBAGraphics;



