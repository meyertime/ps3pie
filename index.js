#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const ps3Module = require("./ps3.js");
const uinput = require("./uinput.js");
const vm = require("vm");
const _ = require("lodash");

const keyboardEvents = [];
const keyboard = {};
const keyboardPrev = {};
const vjoyA = {};
const vjoyAPrev = {};
const vjoyB = {};
const vjoyBPrev = {};

var scriptGlobal = {
    console,
    exports: {},
    module: {
        exports: {}
    },

    keyboard,
    keyboardEvents,
    vjoyA,
    vjoyB,
    ps3: {}
};
scriptGlobal.exports = scriptGlobal.module.exports;

var running;
async function onPs3Data(data) {
    if (running) return;
    running = true;
    try {
        scriptGlobal.ps3 = data;
        scriptGlobal.module.exports.loop()

        for (const code of keyboardEvents) {
            if (typeof(code) === "string") {
                await uinput.keyPress(code);
            } else {
                await uinput.keyCombo(code);
            }
        }
        keyboardEvents.splice(0, keyboardEvents.length);

        for (const code in keyboard) {
            const nextValue = keyboard[code];
            const prevValue = keyboardPrev[code];
            if (nextValue === prevValue) continue;

            await uinput.key(code, nextValue);
            keyboardPrev[code] = nextValue;
        }

        for (const code in vjoyA) {
            const nextValue = vjoyA[code];
            const prevValue = vjoyAPrev[code];
            if (nextValue === prevValue) continue;

            const value = nextValue * 500 + 500;

            await uinput.axis(code, value);
            vjoyAPrev[code] = nextValue;
        }

        for (const code in vjoyB) {
            const nextValue = vjoyB[code];
            const prevValue = vjoyBPrev[code];
            if (nextValue === prevValue) continue;

            await uinput.button(code, nextValue);
            vjoyBPrev[code] = nextValue;
        }

        await uinput.sync();
    } catch (err) {
        console.log(err)
    } finally {
        running = false;
    }
}

async function main() {
    await ps3Module.setup();

    await uinput.setup();

    console.info("Ready");

    const scriptCode = fs.readFileSync(path.join(__dirname, "scripts/descent.js"));
    const script = new vm.Script(scriptCode);
    script.runInNewContext(scriptGlobal);

    ps3Module.on("data", onPs3Data);
}

function mainSync() {
    (async() => {
        try {
            await main();
        } catch (err) {
            console.log(err);
        }
    })();
}

process.on("SIGINT", function() {
    uinput.teardown();
    process.exit();
});

mainSync();
