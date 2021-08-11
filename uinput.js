const ioctl = require("ioctl");
const UInput = require("uinput2");
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

const SETUP_OPTIONS = {
    UI_SET_EVBIT: [
        UInput.EV_KEY,
        UInput.EV_ABS,
    ],
    UI_SET_KEYBIT: _([_.values(keys), _.values(buttons)]).flatten().map(v => UInput[v]).value(),
    UI_SET_ABSBIT: _(axes).values().map(v => UInput[v]).value()
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

var setupPromise;
var uinput;

async function setup() {
    console.info("Setting up uinput...");

    uinput = await UInput.setup(SETUP_OPTIONS);

    await uinput.create(CREATE_OPTIONS);
}

function setupSync() {
    setupPromise = setup()
    return setupPromise
}

module.exports = {
    setup() {
        return setupPromise || setupSync()
    },

    teardown() {
        if (uinput) {
            console.log("Destroying uinput device...")
            if (ioctl(uinput.stream.fd, UInput.UI_DEV_DESTROY)) {
                console.log("Could not destroy uinput device");
            }
            uinput = null
        }
    },

    async keyPress(code) {
        await uinput.sendEvent(UInput.EV_KEY, UInput[keys[code]], 1);
        await uinput.sendEvent(UInput.EV_KEY, UInput[keys[code]], 0);
    },

    async keyCombo(codes) {
        await uinput.emitCombo(_.map(codes, c => UInput[keys[c]]));
    },

    async key(code, value) {
        await uinput.sendEvent(UInput.EV_KEY, UInput[keys[code]], value);
    },

    async button(code, value) {
        await uinput.sendEvent(UInput.EV_KEY, UInput[buttons[code]], value);
    },

    async axis(code, value) {
        await uinput.sendEvent(UInput.EV_ABS, UInput[axes[code]], value);
    },

    async sync() {
        await uinput.sendEvent(UInput.EV_SYN, UInput.SYN_REPORT, 0);
    }
};
