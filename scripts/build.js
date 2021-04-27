const exec = require('child_process').spawnSync;
const path = require('path');
const yargs = require("yargs");
const fs = require("fs");

const APP_PATH = path.resolve(__dirname, '..');
const CPP_PATH = path.resolve(APP_PATH, 'src/cpp');
const BUILD_PATH = path.resolve(APP_PATH, 'build');
if (!fs.existsSync(BUILD_PATH)) {
    fs.mkdirSync(BUILD_PATH)
}

const files = [
    // Real Entry Point
    "./emscripten/VBA.cpp",

    // Driver classes
    "./emscripten/EmscriptenSoundDriver.cpp",

    // Util
    "./Util.cpp",

    // Settings File
    "./common/ConfigManager.cpp",

    // APU files
    "./apu/Blip_Buffer.cpp",
    "./apu/Effects_Buffer.cpp",
    "./apu/Gb_Apu.cpp",
    "./apu/Gb_Apu_State.cpp",
    "./apu/Gb_Oscs.cpp",
    "./apu/Multi_Buffer.cpp",

    // GBA Files
    "./gba/bios.cpp",
    "./gba/EEprom.cpp",
    "./gba/Flash.cpp",
    "./gba/GBA.cpp",
    "./gba/GBA-arm.cpp",
    "./gba/GBA-thumb.cpp",
    "./gba/GBAGfx.cpp",
    "./gba/GBALink.cpp",
    "./gba/GBASockClient.cpp",
    "./gba/Globals.cpp",
    "./gba/Mode0.cpp",
    "./gba/Mode1.cpp",
    "./gba/Mode2.cpp",
    "./gba/Mode3.cpp",
    "./gba/Mode4.cpp",
    "./gba/Mode5.cpp",
    "./gba/RTC.cpp",
    "./gba/Sound.cpp",
    "./gba/Sram.cpp",
    "./gba/ereader.cpp",
    "./gba/agbprint.cpp",

];

const opt = yargs.argv.opt;
const size = yargs.argv.size;

const MB = Math.pow(2, 20);

const options = [
    "--memory-init-file", "0",
    "-Werror",
    opt ? "--closure 1" : "",
    opt ? size ? "-Oz" : "-O3" : "-g3",
    "-DC_CORE",
    "-DNO_PNG",
    "-DNO_LINK",
    "-DNO_DEBUGGER",
    "-DFINAL_BUILD",
    "-DFINAL_VERSION",
    "-s", "MODULARIZE=1",
    "-s", "EXPORT_NAME=\"'gbaninja'\"",
    ...(opt ? [] : ["-s", "ASSERTIONS=2"]),
    "-s", "NO_FILESYSTEM=1",
    "-s", "NO_EXIT_RUNTIME=1",
    "-s", "\"EXTRA_EXPORTED_RUNTIME_METHODS=['ccall']\"",
    "-s", "TOTAL_MEMORY=" + (80 * MB),
    "-s", "SINGLE_FILE=1",
];


exec('emcc', [...options, ...files, '-o', path.resolve(BUILD_PATH, 'emu.js')], {
    stdio: 'inherit',
    cwd: CPP_PATH,
    shell: true,
});

exec('npx', ['webpack'], {
    stdio: 'inherit',
    cwd: APP_PATH,
    shell: true,
});
