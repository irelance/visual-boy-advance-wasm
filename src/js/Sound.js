const AudioContext = window.AudioContext || window.webkitAudioContext;

class VBASound {
    constructor(app) {
        this.isPlay = false;
        this.app = app;
        this.emscriptenModule = app.gbaninja;
        this.audioCtx = new AudioContext();
        this.pause();
        this.Gain = this.audioCtx.createGain();
        this.Gain.connect(this.audioCtx.destination);
        this.audioChannels = 2;
        this.audioScriptNode = this.audioCtx.createScriptProcessor(512, this.audioChannels);
        this.audioScriptNode.onaudioprocess = (e) => this.handleAudioEvent(e);
        this.audioScriptNode.connect(this.Gain);
        this.audioSpareSamplesRingBuffer = new Int16Array(1024 * 16);
        this.audioSpareWritePtr = 0;
        this.audioSpareReadPtr = 0;
        this.spareSamplesAtLastEvent = 0;
    }

    volume(input) {
        this.Gain.gain.value = input / 200;
    }

    resume() {
        if (this.isPlay) return Promise.resolve(this.isPlay);
        return new Promise(resolve => {
            this.audioCtx.resume().then(() => {
                this.isPlay = true;
                resolve(this.isPlay)
            }).catch(() => resolve(this.isPlay))
        })
    }

    pause() {
        if (!this.isPlay) return Promise.resolve(this.isPlay);
        return new Promise(resolve => {
            this.audioCtx.suspend().then(() => {
                this.isPlay = false;
                resolve(this.isPlay)
            }).catch(() => resolve(this.isPlay))
        });
    }

    getSampleRate() {
        return this.audioCtx.sampleRate;
    }

    currentAudioTime() {
        return this.audioCtx.currentTime;
    }

    getNumExtraSamples() {
        const samples = this.audioSpareWritePtr - this.audioSpareReadPtr;
        return samples >= 0 ? samples : (samples + this.audioSpareSamplesRingBuffer.length);
    }

    resetSound() {
    }

    writeSound(pointer8, length16) {
        if (pointer8 % 2 === 1) {
            console.error("Audio pointer must be 16 bit aligned.");
            return;
        }
        if (length16 % 2 !== 0) {
            console.error("Number of audio samples must be even.");
            return;
        }
        let pointer16 = pointer8 >> 1;
        let heap16 = this.emscriptenModule.HEAP16;
        for (let i = 0; i < length16; i++) {
            this.audioSpareSamplesRingBuffer[this.audioSpareWritePtr] = heap16[pointer16 + i];
            this.audioSpareWritePtr++;
            if (this.audioSpareWritePtr >= this.audioSpareSamplesRingBuffer.length) this.audioSpareWritePtr = 0;
        }
    }

    handleAudioEvent(event) {
        if (!VBAInterface.VBA_get_emulating||!VBAInterface.VBA_get_emulating()) return;

        let audioBuffers = [];
        let numChannels = event.outputBuffer.numberOfChannels;
        let requiredSamples = event.outputBuffer.length;
        let deadlineResult = 1; // Hit
        for (let i = 0; i < numChannels; i++) {
            audioBuffers.push(event.outputBuffer.getChannelData(i));
        }
        for (let i = 0; i < requiredSamples; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                if (this.audioSpareReadPtr === this.audioSpareWritePtr) {
                    audioBuffers[channel][i] = 0;
                    deadlineResult = 0; // Miss
                } else {
                    audioBuffers[channel][i] = this.audioSpareSamplesRingBuffer[this.audioSpareReadPtr] / 0x4000;
                    this.audioSpareReadPtr++;
                    if (this.audioSpareReadPtr >= this.audioSpareSamplesRingBuffer.length) {
                        this.audioSpareReadPtr -= this.audioSpareSamplesRingBuffer.length;
                    }
                }
            }
        }

        this.spareSamplesAtLastEvent = this.getNumExtraSamples();
        this.app.vbaPerf.spareAudioSamplesThisSecond.push(this.spareSamplesAtLastEvent);

        this.app.vbaPerf.audioDeadlineResultsThisSecond.push(deadlineResult);

        let frameNum = this.app.frameNum;
        setTimeout(() => {
            this.app.doTimestep(frameNum + 1);
        }, 0);


    }
}


class VBASoundNotSupport {
    constructor(app) {
    }

    volume(input) {
    }

    resume() {
        return Promise.resolve(true);
    }

    pause() {
        return Promise.resolve(true);
    }

    getSampleRate() {
        return 44100;
    }

    currentAudioTime() {
        return Date.now() / 1000;
    }

    getNumExtraSamples() {
        return 0;
    }

    resetSound() {
    }

    writeSound() {
    }

    handleAudioEvent() {
    }
}

VBASound = AudioContext ? VBASound : VBASoundNotSupport;
export default VBASound
