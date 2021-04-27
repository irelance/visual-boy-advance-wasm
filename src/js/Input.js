const defaultBindings = {
    KEY_BUTTON_A: {
        friendlyName: "A",
        codes: ["KeyZ"],
        keyCodes: [90],
    },
    KEY_BUTTON_B: {
        friendlyName: "B",
        codes: ["KeyX"],
        keyCodes: [88],
    },
    KEY_BUTTON_SELECT: {
        friendlyName: "Select",
        codes: ["Backspace"],
        keyCodes: [8],
    },
    KEY_BUTTON_START: {
        friendlyName: "Start",
        codes: ["Enter"],
        keyCodes: [13],
    },
    KEY_RIGHT: {
        friendlyName: "Right",
        codes: ["ArrowRight"],
        keyCodes: [39],
    },
    KEY_LEFT: {
        friendlyName: "Left",
        codes: ["ArrowLeft"],
        keyCodes: [37],
    },
    KEY_UP: {
        friendlyName: "Up",
        codes: ["ArrowUp"],
        keyCodes: [38],
    },
    KEY_DOWN: {
        friendlyName: "Down",
        codes: ["ArrowDown"],
        keyCodes: [40],
    },
    KEY_BUTTON_R: {
        friendlyName: "R",
        codes: ["KeyA"],
        keyCodes: [65],
    },
    KEY_BUTTON_L: {
        friendlyName: "L",
        codes: ["KeyS"],
        keyCodes: [83],
    },
    PERF_STATS: {
        friendlyName: "Performance Stats",
        codes: ["Backquote"],
        keyCodes: [192],
    },
    PAUSE: {
        friendlyName: "Pause",
        codes: ["Escape"],
        keyCodes: [27],
    },
    //todo
    /*SPEED_UP:{
        friendlyName: "Speed Up",
        codes: ["Space"],
        keyCodes: [32],
    },*/
};

class VBAInput {
    constructor(app) {
        this.app = app;
        this.downCodes = {};
        this.downKeyCodes = {};

        this.app.canvas.addEventListener("keydown", (e) => {
            let wasPerfKeyDownBefore = this.isKeyDown(this.bindings.PERF_STATS);
            let wasPauseKeyDownBefore = this.isKeyDown(this.bindings.PAUSE);
            this.downCodes[e.code] = 1;
            this.downKeyCodes[e.keyCode] = 1;
            let isPerfKeyDownNow = this.isKeyDown(this.bindings.PERF_STATS);
            if (!wasPerfKeyDownBefore && isPerfKeyDownNow) this.app.doPerfCalc();
            let isPauseKeyDownNow = this.isKeyDown(this.bindings.PAUSE);
            if (!wasPauseKeyDownBefore && isPauseKeyDownNow) this.app.togglePause();
            return false;
        });
        this.app.canvas.addEventListener("keyup", (e) => {
            let wasPerfKeyDownBefore = this.isKeyDown(this.bindings.PERF_STATS);
            this.downCodes[e.code] = 0;
            this.downKeyCodes[e.keyCode] = 0;
            let isPerfKeyDownNow = this.isKeyDown(this.bindings.PERF_STATS);
            if (wasPerfKeyDownBefore && !isPerfKeyDownNow) this.app.doPerfCalc();
            return false;
        });

        this.bindings = null;
        this.loadBindings();
        if (this.bindings === null) this.resetBindings();
    }

    listBindings() {
        return Object.keys(this.bindings).map(function (v) {
            return {
                name: v,
                friendlyName: this.bindings[v].friendlyName,
                codes: this.bindings[v].codes,
            };
        }.bind(this));
    }

    setBinding(name, code, keyCode) {
        this.bindings[name].codes = [code];
        this.bindings[name].keyCodes = [keyCode];
        this.saveBindings();
    }

    loadBindings(antiInfiniteLoopJustInCase) {
        this.bindings = JSON.parse(localStorage.VBABindings || "null") || defaultBindings;
        if (Object.keys(this.bindings).sort().join() !== Object.keys(defaultBindings).sort().join()) {
            // Binding keys are wrong
            if (antiInfiniteLoopJustInCase) return;
            this.resetBindings(true);
        }
    }

    saveBindings() {
        localStorage.VBABindings = JSON.stringify(this.bindings);
    }

    resetBindings(antiInfiniteLoopJustInCase) {
        this.bindings = defaultBindings;
        // Lazy clone bindings object
        this.saveBindings();
        this.loadBindings(antiInfiniteLoopJustInCase);
    }

    isKeyDown(binding) {
        for (let i = 0; i < binding.codes.length; i++) if (this.downCodes[binding.codes[i]]) return true;
        for (let i = 0; i < binding.keyCodes.length; i++) if (this.downKeyCodes[binding.keyCodes[i]]) return true;
        return false;
    }

    getJoypad() {
        let res = 0;
        if (this.isKeyDown(this.bindings.KEY_BUTTON_A)) res |= 1;
        if (this.isKeyDown(this.bindings.KEY_BUTTON_B)) res |= 2;
        if (this.isKeyDown(this.bindings.KEY_BUTTON_SELECT)) res |= 4;
        if (this.isKeyDown(this.bindings.KEY_BUTTON_START)) res |= 8;
        if (this.isKeyDown(this.bindings.KEY_RIGHT)) res |= 16;
        if (this.isKeyDown(this.bindings.KEY_LEFT)) res |= 32;
        if (this.isKeyDown(this.bindings.KEY_UP)) res |= 64;
        if (this.isKeyDown(this.bindings.KEY_DOWN)) res |= 128;
        if (this.isKeyDown(this.bindings.KEY_BUTTON_R)) res |= 256;
        if (this.isKeyDown(this.bindings.KEY_BUTTON_L)) res |= 512;
        // disallow L+R or U+D from being pressed at the same time
        if ((res & 48) === 48) res &= ~48;
        if ((res & 192) === 192) res &= ~192;
        return res;
    }
}


export default VBAInput;


