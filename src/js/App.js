import VBAGraphics from "./Graphics";
import VBASound from "./Sound";
import VBASaves from "./Saves";
import VBAInput from "./Input";
import Loader from './Loader';

//app.perfTimer = setTimeout(app.doPerfCalc, 1000);
const GBA_CYCLES_PER_SECOND = 16777216;
const TARGET_FRAMERATE = 500;

class App {
    constructor(gbaninja, canvas) {
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.width = 240;
            canvas.height = 180;
            canvas.style.width = '100%';
        }
        canvas.setAttribute('contenteditable', 'true');
        this.canvas = canvas;
        this.gbaninja = gbaninja;
        this.vbaGraphics = null;
        this.vbaSound = null;
        this.vbaSaves = null;
        this.vbaInput = null;

        this.music = true;
        this.isRunning = false;
        this.isPaused = false;

        this.lastFrameTime = window.performance.now();
        this.frameTimeout = null;
        this.animationFrameRequest = null;
        this.frameNum = 1;
        this.lastFocusTime = 0;

        this.vbaPerf = {
            deltaTimesThisSecond: [],
            cyclesThisSecond: [],
            renderDeadlineResultsThisSecond: [],
            spareAudioSamplesThisSecond: [],
            audioDeadlineResultsThisSecond: [],
        };

        this.hasRequestedFrameButNotRendered = false;


        this.perfTimer = null;
        this.lastPerfTime = performance.now();
        this.romBuffer8 = null;
        this.init();
    }

    init() {

        this.vbaGraphics = new VBAGraphics(this);
        let res = this.vbaGraphics.initScreen();

        if (!res) {
            this.vbaGraphics = null;
            //todo
            console.error("can't init");
            return;
        }

        this.vbaGraphics.drawFrame();

        this.vbaSound = new VBASound(this);
        this.vbaSaves = new VBASaves(this);
        this.vbaInput = new VBAInput(this);

        this.doPerfCalc();

    }

    loadRom(file) {
        return Loader.loadRom(file).then(res => this.romBuffer8 = res);
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        VBAInterface.VBA_stop();
    }

    start() {
        if (this.isRunning) throw new Error("Already started");
        if (!this.vbaGraphics) return;
        this.music ? this.vbaSound.resume() : this.vbaSound.pause();

        VBAInterface.VBA_start();

        this.isRunning = true;
        this.focusCheck();
        this.doTimestep(this.frameNum + 1);
    }

    soundVolume(number) {
        this.vbaSound.volume(number);
    }

    soundResume() {
        this.music = true;
        return this.vbaSound.resume();
    }

    soundPause() {
        this.music = false;
        return this.vbaSound.pause();
    }

    doTimestep(frameNum, mustRender) {
        //if (!hasEmuModule()) return;
        if (frameNum !== this.frameNum + 1) return;
        this.frameNum = frameNum;

        let currentTime = window.performance.now();
        let deltaTime = currentTime - this.lastFrameTime;
        let clampedDeltaTime = Math.min(50, deltaTime);

        if (currentTime - this.lastFocusTime > 100 || deltaTime < 0.1) {
            this.animationFrameRequest = window.requestAnimationFrame(() => this.doTimestep(frameNum + 1));
            return;
        }
        this.lastFrameTime = currentTime;

        if (this.isRunning) {
            this.vbaSaves.checkSaves();

            let cyclesToDo = Math.floor(GBA_CYCLES_PER_SECOND / (1000 / clampedDeltaTime));
            if (this.vbaSound.spareSamplesAtLastEvent > 1000) {
                cyclesToDo -= Math.floor(Math.min(cyclesToDo * 0.03, GBA_CYCLES_PER_SECOND / 10000));
            }
            if (this.vbaSound.spareSamplesAtLastEvent < 700) {
                cyclesToDo += Math.floor(Math.min(cyclesToDo * 0.03, GBA_CYCLES_PER_SECOND / 10000));
            }
            if (!this.isPaused) {
                VBAInterface.VBA_do_cycles(cyclesToDo);
            }

            this.vbaPerf.deltaTimesThisSecond.push(deltaTime);
            this.vbaPerf.cyclesThisSecond.push(cyclesToDo);

            clearTimeout(this.frameTimeout);
            this.frameTimeout = setTimeout(() => this.doTimestep(frameNum + 1), 1000 / TARGET_FRAMERATE);
            cancelAnimationFrame(this.animationFrameRequest);
            this.animationFrameRequest = window.requestAnimationFrame(() => this.doTimestep(frameNum + 1));

        } else if (VBAInterface.VBA_get_emulating()) {
            VBAInterface.VBA_stop();
            //todo emit?
        }

    }

    focusCheck() {
        this.lastFocusTime = window.performance.now();
        this.hasRequestedFrameButNotRendered = true;
        window.requestAnimationFrame(() => this.focusCheck());
    }

    samplesToMillis(samples) {
        return Math.floor(samples / this.vbaSound.getSampleRate() * 1000) + "ms";
    }

    doPerfCalc() {

        clearTimeout(this.perfTimer);

        let currentTime = window.performance.now();
        let deltaTime = currentTime - this.lastPerfTime;
        this.lastPerfTime = currentTime;

        if (this.vbaInput.isKeyDown(this.vbaInput.bindings.PERF_STATS)) {

            //document.querySelector(".perf").style.display = "block";

            let romCode = this.vbaSaves.getRomCode();
            let sumCycles = this.vbaPerf.cyclesThisSecond.reduce(function (a, b) {
                return a + b;
            }, 0);
            let maxAudioSamples = this.vbaPerf.spareAudioSamplesThisSecond.reduce(function (a, b) {
                return Math.max(a, b);
            }, 0);
            let minAudioSamples = this.vbaPerf.spareAudioSamplesThisSecond.reduce(function (a, b) {
                return Math.min(a, b);
            }, Infinity);
            if (minAudioSamples === Infinity) {
                minAudioSamples = 0;
            }
            let audioDeadlineResults = this.vbaPerf.audioDeadlineResultsThisSecond.reduce(function (a, b) {
                if (b) {
                    a.hit++;
                } else {
                    a.miss++;
                }
                return a;
            }, {hit: 0, miss: 0});
            let renderDeadlineResults = this.vbaPerf.renderDeadlineResultsThisSecond.reduce(function (a, b) {
                if (b) {
                    a.hit++;
                } else {
                    a.miss++;
                }
                return a;
            }, {hit: 0, miss: 0});
            //document.querySelector(".perf-game").innerText = (romCode ? (romCode + " ") : "") + require("./romCodeToEnglish")(romCode);
            //document.querySelector(".perf-timesteps").innerText = Math.round(vbaPerf.cyclesThisSecond.length / (deltaTime / 1000));
            //document.querySelector(".perf-percentage").innerText = (sumCycles / (GBA_CYCLES_PER_SECOND * (deltaTime / 1000)) * 100).toFixed(1) + "%";
            //document.querySelector(".perf-audio-lag").innerText = samplesToMillis(minAudioSamples) + " - " + samplesToMillis(maxAudioSamples);
            //document.querySelector(".perf-audio-deadlines").innerText = audioDeadlineResults.hit + " / " + (audioDeadlineResults.hit + audioDeadlineResults.miss);
            //document.querySelector(".perf-render-deadlines").innerText = renderDeadlineResults.hit + " / " + (renderDeadlineResults.hit + renderDeadlineResults.miss);

        } else {

            //document.querySelector(".perf").style.display = "none";

        }

    }

    togglePause() {
        if (!this.isRunning) {
            return;
        }
        this.isPaused = !this.isPaused;
    }

    scheduleStop() {
        this.isRunning = false;
    }
}

export default App;
