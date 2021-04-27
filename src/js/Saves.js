import {saveAs} from "./saveAs";

const MODE_LOCAL = "local";
const MODE_DRIVE = "drive";

class VBASaves {
    constructor(app) {
        this.app = app;
        this.emscriptenModule = app.gbaninja;
        this.mode = MODE_LOCAL;
        this.safeSaveTimeout = null;
        this.unsafeSaveTimeout = null;
        this.unsafeSaveBuffer = null;
        this.localStoragePrefix = "VBAsave_";
        this.lastWarningTime = 0;
    }

    getRomCode() {
        const heapu8 = this.emscriptenModule.HEAPU8;
        const romAddress8 = VBAInterface.VBA_get_rom();
        let romCode = String.fromCharCode(
            heapu8[romAddress8 + 0xAC], heapu8[romAddress8 + 0xAD],
            heapu8[romAddress8 + 0xAE], heapu8[romAddress8 + 0xAF]
        ).replace(/[^ -~]/g, function () {
            return "?";
        });
        return romCode;
    }

    getSave(romCode) {
        // If no rom code supplied, use the currently loaded game
        romCode = romCode || this.getRomCode();
        const base64 = localStorage[this.localStoragePrefix + romCode];
        if (!base64) return null;
        return new Uint8Array(atob(base64).split("").map(function (c) {
            return c.charCodeAt(0);
        }));
    }

    getSaveSize() {
        const save = this.getSave();
        return save ? save.byteLength : 0;
    }

    softCommit(pointer8, size) {
        const heapu8 = this.emscriptenModule.HEAPU8;
        let bufu8 = new Uint8Array(size);
        for (let i = 0; i < size; i++) bufu8[i] = heapu8[pointer8 + i];
        this.unsafeSaveBuffer = bufu8;
    }

    hardCommit(romCode, uint8Array) {
        let binary = "";
        const len = uint8Array.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        try {
            localStorage[this.localStoragePrefix + romCode] = btoa(binary);
        } catch (e) {
            if (window.isShittyLocalstorage) return; // User is already warned.
            if (this.lastWarningTime < Date.now() - 5000) {
                this.lastWarningTime = Date.now();
                //todo
                console.error("Unable to save because the storage quota is exceeded. Try opening a new gba.ninja tab and deleting some saves, then save again.", {title: "Error"});
            }
        }
    }

    restoreSaveMemory(pointer8, targetBufferSize) {
        const save = this.getSave();
        if (!save) return;
        if (save.byteLength !== targetBufferSize) {
            throw new Error("Incompatible save size");
        }
        const heap8 = this.emscriptenModule.HEAPU8;
        for (let i = 0; i < targetBufferSize; i++) {
            heap8[pointer8 + i] = save[i];
        }
    }

    checkSaves() {
        if (VBAInterface.VBA_get_systemSaveUpdateCounter()) {

            // Copy the save to a temporary buffer if it's
            // recently updated.
            if (!this.unsafeSaveTimeout) {
                this.unsafeSaveTimeout = setTimeout(function () {
                    this.unsafeSaveTimeout = null;
                    if (VBAInterface.VBA_get_emulating()) {
                        console.log("[SAVE] changes detected");
                        VBAInterface.VBA_emuWriteBattery();
                        VBAInterface.VBA_reset_systemSaveUpdateCounter();
                    }
                }.bind(this), 32);
            }

        }

        // Commit the save to localstorage if it hasn't been
        // changed in a while.
        if (this.unsafeSaveBuffer) {
            let tempUnsafeSaveBuffer = this.unsafeSaveBuffer;
            this.unsafeSaveBuffer = null;
            clearTimeout(this.safeSaveTimeout);
            this.safeSaveTimeout = setTimeout(() => {
                this.safeSaveTimeout = null;
                if (VBAInterface.VBA_get_emulating()) {
                    this.hardCommit(this.getRomCode(), tempUnsafeSaveBuffer);
                    console.log("[SAVE] changes committed");
                } else {
                    console.log("[SAVE] changes discarded, emulator not running");
                }
            }, 70);
        }

    }

    exportSave(romCode) {
        const save = this.getSave(romCode);
        if (!save) {
            throw new Error("No save found for " + romCode);
        }
        const blob = new Blob([save], {contentType: "application/octet-stream"});
        saveAs(blob, `${this.localStoragePrefix}-${romCode}.sav`, true);
    }

    deleteSave(romCode) {
        delete localStorage[this.localStoragePrefix + romCode];
    }

    onFileImportInputChanged(e, callback) {
        let binaryFile = e.currentTarget.files[0];
        e.currentTarget.form.reset();
        if (binaryFile) {
            const fr = new FileReader();
            fr.readAsArrayBuffer(binaryFile);
            fr.onload = () => {
                const romCodeValidator = /^[A-Z1-9]{4}/;
                let romCode = binaryFile.name.substr(0, 4);

                const romCodeOk = () => {
                    this.importSave(romCode, new Uint8Array(fr.result));
                    callback();
                };

                if (romCode.search(romCodeValidator) === -1) {
                    //todo
                    console.error("What is the ROM code of the game that this save file belongs to? (4 uppercase letters or numbers)");
                } else {
                    romCodeOk();
                }
            };
        }
    }

    listSaves() {
        return Object.keys(localStorage)
            .filter(v => v.indexOf(this.localStoragePrefix) === 0)
            .map(v => {
                return {
                    romCode: v.substr(this.localStoragePrefix.length, 4),
                };
            });
    }

    importSave(romCode, byteArray) {
        this.hardCommit(romCode, byteArray);
    }
}

export default VBASaves;








