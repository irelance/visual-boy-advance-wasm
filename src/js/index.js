import App from './App';

const gbaninja = require("../../build/emu.js")();
const deps = {
    app: null,
};

function createApp(canvas) {
    if (deps.app) return Promise.resolve(deps.app);
    return new Promise(resolve => {
        gbaninja.then(gba => {
            deps.app = new App(gba, canvas);
            resolve(deps.app);
        });
    })
}

function VBA_get_emulating() {
    return gbaninja.ccall("VBA_get_emulating", "int", [], []);
}

function VBA_start() {
    return gbaninja.ccall("VBA_start", "int", [], []);
}

function VBA_do_cycles(cycles) {
    return gbaninja.ccall("VBA_do_cycles", "int", ["int"], [cycles]);
}

function VBA_stop() {
    return gbaninja.ccall("VBA_stop", "int", [], []);
}

function VBA_get_bios() {
    return gbaninja.ccall("VBA_get_bios", "int", [], []);
}

function VBA_get_rom() {
    return gbaninja.ccall("VBA_get_rom", "int", [], []);
}

function VBA_get_internalRAM() {
    return gbaninja.ccall("VBA_get_internalRAM", "int", [], []);
}

function VBA_get_workRAM() {
    return gbaninja.ccall("VBA_get_workRAM", "int", [], []);
}

function VBA_get_paletteRAM() {
    return gbaninja.ccall("VBA_get_paletteRAM", "int", [], []);
}

function VBA_get_vram() {
    return gbaninja.ccall("VBA_get_vram", "int", [], []);
}

function VBA_get_pix() {
    return gbaninja.ccall("VBA_get_pix", "int", [], []);
}

function VBA_get_oam() {
    return gbaninja.ccall("VBA_get_oam", "int", [], []);
}

function VBA_get_ioMem() {
    return gbaninja.ccall("VBA_get_ioMem", "int", [], []);
}

function VBA_get_systemColorMap16() {
    return gbaninja.ccall("VBA_get_systemColorMap16", "int", [], []);
}

function VBA_get_systemColorMap32() {
    return gbaninja.ccall("VBA_get_systemColorMap32", "int", [], []);
}

function VBA_get_systemFrameSkip() {
    return gbaninja.ccall("VBA_get_systemFrameSkip", "int", [], []);
}

function VBA_set_systemFrameSkip(n) {
    return gbaninja.ccall("VBA_set_systemFrameSkip", "int", ["int"], [n]);
}

function VBA_get_systemSaveUpdateCounter() {
    return gbaninja.ccall("VBA_get_systemSaveUpdateCounter", "int", [], []);
}

function VBA_reset_systemSaveUpdateCounter() {
    return gbaninja.ccall("VBA_reset_systemSaveUpdateCounter", "int", [], []);
}

function VBA_emuWriteBattery() {
    return gbaninja.ccall("VBA_emuWriteBattery", "int", [], []);
}

function VBA_agbPrintFlush() {
    return gbaninja.ccall("VBA_agbPrintFlush", "int", [], []);
}


// ------- VBA EXIT POINTS --------

function NYI(feature) {
    console.log("Feature is NYI: ", feature);
}

function getAudioSampleRate() {
    return deps.app.vbaSound.getSampleRate();
}

function getRomSize(startPointer8) {
    return deps.app.romBuffer8.byteLength;
}

function copyRomToMemory(startPointer8) {
    const gbaHeap8 = gbaninja.HEAP8;
    const byteLength = deps.app.romBuffer8.byteLength;
    for (let i = 0; i < byteLength; i++) {
        gbaHeap8[startPointer8 + i] = deps.app.romBuffer8[i];
    }
}

function renderFrame(pixPointer8) {
    deps.app.vbaGraphics.drawGBAFrame(pixPointer8);
}

function initSound() {
}

function pauseSound() {
    deps.app.soundPause();
}

function resetSound() {
    deps.app.vbaSound.resetSound();
}

function resumeSound() {
    deps.app.soundResume();
}

function writeSound(pointer8, length16) {
    return deps.app.vbaSound.writeSound(pointer8, length16);
}

function setThrottleSound(pointer8, length16) {
}

function getSaveSize() {
    return deps.app.vbaSaves.getSaveSize();
}

function commitEeprom(pointer8, size) {
    return deps.app.vbaSaves.softCommit(pointer8, size);
}

let commitFlash = commitEeprom;

function restoreSaveMemory(pointer8, targetBufferSize) {
    return deps.app.vbaSaves.restoreSaveMemory(pointer8, targetBufferSize);
}

function getJoypad(joypadNum) {
    return deps.app.vbaInput.getJoypad(joypadNum);
}

function dbgOutput(textPointer8, unknownPointer8) {
    return console.log("dbgOutput", textPointer8, unknownPointer8);
}

export {
    createApp, VBA_get_emulating, VBA_start,
    VBA_do_cycles, VBA_stop, VBA_get_bios, VBA_get_rom, VBA_get_internalRAM,
    VBA_get_workRAM, VBA_get_paletteRAM, VBA_get_vram, VBA_get_pix, VBA_get_oam,
    VBA_get_ioMem, VBA_get_systemColorMap16, VBA_get_systemColorMap32,
    VBA_get_systemFrameSkip, VBA_set_systemFrameSkip, VBA_get_systemSaveUpdateCounter,
    VBA_reset_systemSaveUpdateCounter, VBA_emuWriteBattery, VBA_agbPrintFlush,
    NYI, getAudioSampleRate, getRomSize, copyRomToMemory, renderFrame,
    initSound, pauseSound, resetSound, resumeSound, writeSound, setThrottleSound,
    getSaveSize, commitFlash, commitEeprom, restoreSaveMemory, getJoypad, dbgOutput
}

