#!/usr/bin/env node
const ioctl = require("ioctl");
const HID = require("node-hid");
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

const ps3 = {
    leftStickX: 0,
    leftStickY: 0,
    rightStickX: 0,
    rightStickY: 0,
    up: 0,
    right: 0,
    down: 0,
    left: 0,
    triangle: 0,
    circle: 0,
    cross: 0,
    square: 0,
    select: 0,
    leftStickButton: 0,
    rightStickButton: 0,
    start: 0,
    l2: 0,
    r2: 0,
    l1: 0,
    r1: 0,
    ps: 0,
    l2Analog: 0,
    r2Analog: 0,
    upAnalog: 0,
    rightAnalog: 0,
    downAnalog: 0,
    leftAnalog: 0,
    l1Analog: 0,
    r1Analog: 0,
    triangleAnalog: 0,
    circleAnalog: 0,
    crossAnalog: 0,
    squareAnalog: 0
};

const keyboardEvents = [];
const keyboard = {};
const keyboardPrev = {};
const vjoyA = {};
const vjoyAPrev = {};
const vjoyB = {};
const vjoyBPrev = {};



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

function readAnalog(data, index) {
    return (data[index] - 127.5) / 127.5;
}

function readDPad(dpad, dPadValue) {
    return (dpad === dPadValue) ? 1 : 0;
}

function readDigitalButton(data, index, bit) {
    return (data[index] >> bit) % 2;
}

function readPsButton(data, index) {
    return (data[index] != 0) ? 1 : 0;
}

function readAnalogButton(data, index) {
    return data[index] / 255;
}

var uinput;

var running;
async function onPs3Data(data) {
    if (running) return;
    running = true;
    try {
        ps3.leftStickX = readAnalog(data, 6);
        ps3.leftStickY = readAnalog(data, 7);
        ps3.rightStickX = readAnalog(data, 8);
        ps3.rightStickY = readAnalog(data, 9);
        const dpad = data[2] & 240;
        ps3.up = readDPad(dpad, 16);
        ps3.right = readDPad(dpad, 32);
        ps3.down = readDPad(dpad, 64);
        ps3.left = readDPad(dpad, 128);
        ps3.triangle = readDigitalButton(data, 3, 4);
        ps3.circle = readDigitalButton(data, 3, 5);
        ps3.cross = readDigitalButton(data, 3, 6);
        ps3.square = readDigitalButton(data, 3, 7);
        ps3.select = readDigitalButton(data, 2, 0);
        ps3.leftStickButton = readDigitalButton(data, 2, 1);
        ps3.rightStickButton = readDigitalButton(data, 2, 2);
        ps3.start = readDigitalButton(data, 2, 3);
        ps3.l2 = readDigitalButton(data, 3, 0);
        ps3.r2 = readDigitalButton(data, 3, 1);
        ps3.l1 = readDigitalButton(data, 3, 2);
        ps3.r1 = readDigitalButton(data, 3, 3);
        ps3.ps = readPsButton(data, 4);
        ps3.upAnalog = readAnalogButton(data, 14);
        ps3.rightAnalog = readAnalogButton(data, 15);
        ps3.downAnalog = readAnalogButton(data, 16);
        ps3.leftAnalog = readAnalogButton(data, 17);
        ps3.l2Analog = readAnalogButton(data, 18);
        ps3.r2Analog = readAnalogButton(data, 19);
        ps3.l1Analog = readAnalogButton(data, 20);
        ps3.r1Analog = readAnalogButton(data, 21);
        ps3.triangleAnalog = readAnalogButton(data, 22);
        ps3.circleAnalog = readAnalogButton(data, 23);
        ps3.crossAnalog = readAnalogButton(data, 24);
        ps3.squareAnalog = readAnalogButton(data, 25);

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
    } finally {
        running = false;
    }
}

async function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function main() {
    var device;
    while (!device) {
        try {
            var devices = HID.devices();
            var deviceInfo = _.find(devices, d => d.manufacturer === "Sony" && d.product === "PLAYSTATION(R)3 Controller");

            if (!deviceInfo) {
                console.info("Waiting for PS3 controller...");
                await sleep(1000);
                continue;
            }

            // for this line to work, must `chmod 666 /dev/hidrawX`, or use udev rule to make this the default permission
            device = new HID.HID(deviceInfo.path);
        } catch (err) {
            console.log(err);
            console.info("Error opening PS3 HID raw device; will try again...");
            await sleep(1000);
        }
    }

    console.info("PS3 controller acquired");
    console.info("Setting up uinput...");

    uinput = await UInput.setup(SETUP_OPTIONS);

    await uinput.create(CREATE_OPTIONS);

    console.info("Ready");

    device.on("data", onPs3Data);
    device.on("error", err => {
        if (ioctl(uinput.stream.fd, UInput.UI_DEV_DESTROY)) {
            throw new Error("Could not destroy uinput device");
        }
        uinput = null;

        console.log(err);
        console.log("Trying again to acquire PS3 controller...");
        mainSync();
    });
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

mainSync();
