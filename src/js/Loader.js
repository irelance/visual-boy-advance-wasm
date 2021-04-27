const ignoreInvalidRomCode = false;

function isPowerOf2 (x) {
    return (x != 0) && ((x & (x - 1)) == 0);
}

function loadRomFromBuffer(_romBuffer8, filename) {
    return new Promise((resolve, reject) => {
        if (_romBuffer8.length < 512) return reject("That file isn't a GBA ROM. (It's too small to be a ROM.)");

        // Check if it's a real rom
        const romCode = String.fromCharCode(
            _romBuffer8[0xAC], _romBuffer8[0xAD], _romBuffer8[0xAE], _romBuffer8[0xAF]
        );
        const gbMagic = [
            _romBuffer8[0x0104], _romBuffer8[0x0105], _romBuffer8[0x0106], _romBuffer8[0x0107],
            _romBuffer8[0x0108], _romBuffer8[0x0109], _romBuffer8[0x010A], _romBuffer8[0x010B],
        ].map(function (v) {
            return v.toString(16);
        }).join();

        if (filename.search(/\.zip$/i) !== -1) return reject("You need to extract the rom file from the zip.");

        if (String.fromCharCode(_romBuffer8[0], _romBuffer8[1]) === "PK") return reject("You need to extract the rom file.");


        if (filename.search(/\.sav$/i) !== -1) return reject("That's not a ROM, it's a savegame file. GBA ROM files usually end in '.gba'.");


        if (filename.search(/\.smc$/i) !== -1 || filename.search(/\.sfc$/i) !== -1) return reject("That's a SNES ROM, this emulator runs Gameboy Advance ROMs.");


        if (gbMagic === "ce,ed,66,66,cc,d,0,b") {
            let colorMaybe = "";
            if (filename.search(/\.gbc$/i) !== -1) {
                colorMaybe = "Color ";
            }
            return reject("That's a Gameboy " + colorMaybe + "ROM, this emulator only runs Gameboy Advance ROMs.");
        }

        if (!isPowerOf2(_romBuffer8.length)) {
            // Some roms are actually non-pot, so don't enforce this.
            // Don't return
        }

        if (romCode.search(/^[A-Z0-9]{4}$/) && !ignoreInvalidRomCode) {
            return reject("That file doesn't look like a GBA ROM. (Couldn't find a rom code in the file.)");
        } else {
            resolve(_romBuffer8);
        }
    })
}

function loadRomFromFile(file) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = function () {
            const _romBuffer8 = new Uint8Array(fr.result);
            loadRomFromBuffer(_romBuffer8, file.name).then(resolve).catch(reject);
        };
        fr.onerror = function (e) {
            reject("There was an error loading the ROM.", e);
        };
        fr.readAsArrayBuffer(file);
    });
}

function loadRomFromNetwork(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function (e) {
            loadRomFromBuffer(new Uint8Array(xhr.response), url).then(resolve).catch(reject);
        };
        xhr.onprogress = function (e) {
            //modalOpts.setProgress((e.loaded / e.total) * 100);
        };
        xhr.onerror = function (e) {
            reject("There was an error loading the ROM.", e);
        };
        xhr.open("GET", url);
        xhr.responseType = "arraybuffer";
        xhr.send();
    });
}

function loadRom(file) {
    if (file instanceof File || file instanceof Blob) {
        return loadRomFromFile(file);
    } else if ('string' === typeof file) {
        if (0 === file.indexOf('http://') || 0 === file.indexOf('https://')) {
            return loadRomFromNetwork(file);
        }
        //todo dataurl
        //todo file://
    }
    return Promise.reject("not support");
}

export default {loadRom};
