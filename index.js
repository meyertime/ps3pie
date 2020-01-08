#!/usr/bin/env node
const ioctl = require("ioctl");
const ps3Module = require("./ps3.js");
const UInput = require("uinput");
const _ = require("lodash");

// Poly-fill some missing constants:
UInput.BTN_DPAD_UP = 0x220;
UInput.BTN_DPAD_DOWN = 0x221;
UInput.BTN_DPAD_LEFT = 0x222;
UInput.BTN_DPAD_RIGHT = 0x223;

const keys = {
    esc: "KEY_ESC",
    one: "KEY_1",
    two: "KEY_2",
    three: "KEY_3",
    four: "KEY_4",
    five: "KEY_5",
    six: "KEY_6",
    seven: "KEY_7",
    eight: "KEY_8",
    nine: "KEY_9",
    zero: "KEY_0",
    tab: "KEY_TAB",
    enter: "KEY_ENTER",
    shift: "KEY_RIGHTSHIFT",
    space: "KEY_SPACE",
    f1: "KEY_F1",
    f2: "KEY_F2",
    f3: "KEY_F3",
    ralt: "KEY_RIGHTALT",
    home: "KEY_HOME",
    up: "KEY_UP",
    pageUp: "KEY_PAGEUP",
    left: "KEY_LEFT",
    right: "KEY_RIGHT",
    end: "KEY_END",
    down: "KEY_DOWN",
    pageDown: "KEY_PAGEDOWN"
};

const buttons = {
    a: "BTN_A",
    b: "BTN_B",
    x: "BTN_X",
    y: "BTN_Y",
    tl: "BTN_TL",
    tr: "BTN_TR",
    tl2: "BTN_TL2",
    tr2: "BTN_TR2",
    select: "BTN_SELECT",
    start: "BTN_START",
    mode: "BTN_MODE",
    thumbl: "BTN_THUMBL",
    thumbr: "BTN_THUMBR",
    up: "BTN_DPAD_UP",
    down: "BTN_DPAD_DOWN",
    left: "BTN_DPAD_LEFT",
    right: "BTN_DPAD_RIGHT"
};

const axes = {
    x: "ABS_X",
    y: "ABS_Y",
    z: "ABS_Z",
    rx: "ABS_RX",
    ry: "ABS_RY",
    rz: "ABS_RZ"
};

const keyboardEvents = [];
const keyboard = {};
const keyboardPrev = {};
const vjoyA = {};
const vjoyAPrev = {};
const vjoyB = {};
const vjoyBPrev = {};

var ps3;



// BEGIN embedded script adapted from ps3.js from JsPie

const buttonMappings = {
    r1: "a",
    r2: "b",
    leftStickButton: "x",
    rightStickButton: "y",
    circle: "tl",
    triangle: "tr"
};

const keyMappings = {
    up: "up",
    down: "down",
    left: "left",
    right: "right",
    cross: "enter",
    square: "space"
};

var shiftState;
var shiftAction;

const shiftMappings = {
    ps: {
        cross: [ "ralt", "f1" ],
        circle: [ "ralt", "f3" ],
        square: "f2",
        triangle: "tab",
        left: [ "shift", "f1" ],
        right: [ "shift", "f2" ],

        up: "pageUp",
        down: "pageDown",
        left: "home",
        right: "end"
    },

    start: {
        down: "one",
        left: "two",
        up: "three",
        right: "four",
        select: "five"
    },

    select: {
        cross: "six",
        circle: "seven",
        triangle: "eight",
        square: "nine",
        start: "zero"
    }
};

const buttonState = {};
for (var button in buttonMappings) {
    buttonState[button] = 0;
}
for (var button in keyMappings) {
    buttonState[button] = 0;
}
for (var shiftButton in shiftMappings) {
    buttonState[shiftButton] = 0;
    for (var button in shiftMappings[shiftButton]) {
        buttonState[button] = 0;
    }
}

const axisMappings = {
    x: "leftStickX",
    y: "leftStickY",
    z: "rightStickX",
    rx: "rightStickY"
};

const axisInvertion = {
    x: 1,
    y: -1,
    z: 1,
    rx: -1
};

const axisCenters = {};
const axisFactors = {};
for (var axis in axisMappings) {
    axisCenters[axis] = 0;
    axisFactors[axis] = axisInvertion[axis];
}

var vulcanState = false;
var defaultWeapon = "one";


function script() {
    if (ps3.ps && ps3.start && ps3.select && !(buttonState["ps"] && buttonState["start"] && buttonState["select"])) {
        console.info("Calibrating...");
        for (var axis in axisMappings) {
            var mapping = axisMappings[axis];
            var center = ps3[mapping];
            var factor = (1 / (1 - Math.abs(center))) * axisInvertion[axis];

            console.info("Axis: " + axis + ", Mapping: " + mapping + ", Center: " + center + ", Factor: " + factor);

            axisCenters[axis] = center;
            axisFactors[axis] = factor;
        }
        console.info("Calibrated.");
        shiftAction = "calibrate";
    }

    for (var axis in axisMappings) {
        var input = ps3[axisMappings[axis]];
        var output = (input - axisCenters[axis]) * axisFactors[axis];
        output = Math.max(-1, Math.min(1, output));
        output = output * Math.abs(output);
        vjoyA[axis] = output;
        //console.info(axis + " " + input + " - " + axisCenters[axis] + " * " + axisFactors[axis] + " = " + output);
    }

    if (ps3.l1 && ps3.l2) {
        vjoyB.tl2 = 1;
        vjoyA.ry = -ps3.l2Analog;
    } else {
        vjoyB.tl2 = 0;
        vjoyA.ry = ps3.l1Analog - ps3.l2Analog;
    }

    if (!shiftState) {
        for (var shiftButton in shiftMappings) {
            if (!buttonState[shiftButton] && ps3[shiftButton]) {
                shiftState = shiftButton;
                console.debug("Shift: " + shiftState);
            }
        }
    } else if (!ps3[shiftState]) {
        if (!shiftAction) {
            if (shiftState === "ps") {
                keyboardEvents.push("esc");
            } else if (shiftState === "select" ) {
                if (vulcanState) {
                    keyboardEvents.push(defaultWeapon);
                } else {
                    keyboardEvents.push("two");
                }

                vulcanState = !vulcanState;
            }
        }

        shiftState = null;
        shiftAction = null;
        console.debug("No shift");
    } else {
        for (var button in shiftMappings[shiftState]) {
            if (!buttonState[button] && ps3[button]) {
                shiftAction = button;
                var action = shiftMappings[shiftState][button];
                keyboardEvents.push(action);
                switch (action) {
                    case "one":
                    case "three":
                    case "four":
                    case "five":
                        defaultWeapon = action;
                        break;
                }
            }
        }
    }

    for (var button in buttonMappings) {
        if (!buttonState[button] && ps3[button]) {
            if (!shiftState) {
                vjoyB[buttonMappings[button]] = 1;
            }
        } else if (buttonState[button] && !ps3[button]) {
            vjoyB[buttonMappings[button]] = 0;
        }
    }

    for (var button in keyMappings) {
        if (!buttonState[button] && ps3[button]) {
            if (!shiftState) {
                keyboard[keyMappings[button]] = 1;
            }
        } else if (buttonState[button] && !ps3[button]) {
            keyboard[keyMappings[button]] = 0;
        }
    }

    for (var button in buttonState) {
        buttonState[button] = ps3[button];
    }
}

// END embedded script adapted from ps3.js from JsPie




const SETUP_OPTIONS = {
    EV_KEY: _([_.values(keys), _.values(buttons)]).flatten().map(v => UInput[v]).value(),
    EV_ABS : _(axes).values().map(v => UInput[v]).value()
};

const CREATE_OPTIONS = {
    name: "ps3pie",
    id: {
        busType: UInput.BUS_VIRTUAL,
        vendor: 0x1,
        product: 0x1,
        version: 1
    },
    absMax: _(axes).values().map(v => UInput.Abs(UInput[v], 1000)).value(),
    absMin: _(axes).values().map(v => UInput.Abs(UInput[v], 0)).value()
};

var uinput;

var running;
async function onPs3Data(data) {
    if (running) return;
    running = true;
    try {
        ps3 = data;

        script();

        for (const code of keyboardEvents) {
            if (typeof(code) === "string") {
                await uinput.keyEvent(UInput[keys[code]]);
            } else {
                await uinput.emitCombo(_.map(code, c => UInput[keys[c]]));
            }
        }
        keyboardEvents.splice(0, keyboardEvents.length);

        for (const code in keyboard) {
            const nextValue = keyboard[code];
            const prevValue = keyboardPrev[code];
            if (nextValue === prevValue) continue;

            await uinput.sendEvent(UInput.EV_KEY, UInput[keys[code]], nextValue);
            keyboardPrev[code] = nextValue;
        }

        for (const code in vjoyA) {
            const nextValue = vjoyA[code];
            const prevValue = vjoyAPrev[code];
            if (nextValue === prevValue) continue;

            const value = nextValue * 500 + 500;

            await uinput.sendEvent(UInput.EV_ABS, UInput[axes[code]], value);
            vjoyAPrev[code] = nextValue;
        }

        for (const code in vjoyB) {
            const nextValue = vjoyB[code];
            const prevValue = vjoyBPrev[code];
            if (nextValue === prevValue) continue;

            await uinput.sendEvent(UInput.EV_KEY, UInput[buttons[code]], nextValue);
            vjoyBPrev[code] = nextValue;
        }

        await uinput.sendEvent(UInput.EV_SYN, UInput.SYN_REPORT, 0);
    } catch (err) {
        console.log(err)
    } finally {
        running = false;
    }
}

async function main() {
    await ps3Module.setup();

    console.info("Setting up uinput...");

    uinput = await UInput.setup(SETUP_OPTIONS);

    await uinput.create(CREATE_OPTIONS);

    console.info("Ready");

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
    if (uinput) {
        if (ioctl(uinput.stream.fd, UInput.UI_DEV_DESTROY)) {
            console.log("Could not destroy uinput device");
        }
        uinput = null
    }
    
    process.exit();
});

mainSync();
