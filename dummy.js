const UInput = require("uinput");
const _ = require("lodash");

// Poly-fill some missing constants:
UInput.BTN_DPAD_UP = 0x220;
UInput.BTN_DPAD_DOWN = 0x221;
UInput.BTN_DPAD_LEFT = 0x222;
UInput.BTN_DPAD_RIGHT = 0x223;

const SETUP_OPTIONS = {
    EV_KEY: [
        UInput.BTN_A,
        UInput.BTN_B,
        UInput.BTN_X,
        UInput.BTN_Y,
        UInput.BTN_TL,
        UInput.BTN_TR,
        UInput.BTN_TL2,
        UInput.BTN_TR2,
        UInput.BTN_SELECT,
        UInput.BTN_START,
        UInput.BTN_MODE,
        UInput.BTN_THUMBL,
        UInput.BTN_THUMBR,
        UInput.BTN_DPAD_UP,
        UInput.BTN_DPAD_DOWN,
        UInput.BTN_DPAD_LEFT,
        UInput.BTN_DPAD_RIGHT
    ],
    EV_ABS: [
        UInput.ABS_X,
        UInput.ABS_Y,
        UInput.ABS_Z,
        UInput.ABS_RX,
        UInput.ABS_RY,
        UInput.ABS_RZ
    ]
};

const CREATE_OPTIONS = {
    name: "ps3pie",
    id: {
        busType: UInput.BUS_VIRTUAL,
        vendor: 0x1,
        product: 0x1,
        version: 1
    },
    absMax: [
        UInput.Abs(UInput.ABS_X, 255),
        UInput.Abs(UInput.ABS_Y, 255),
        UInput.Abs(UInput.ABS_Z, 255),
        UInput.Abs(UInput.ABS_RX, 255),
        UInput.Abs(UInput.ABS_RY, 255),
        UInput.Abs(UInput.ABS_RZ, 255)
    ]
};

async function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

var uinput;

async function main() {
    uinput = await UInput.setup(SETUP_OPTIONS);

    await uinput.create(CREATE_OPTIONS);

    while (true) {
        await sleep(1000);
    }
}

(async() => {
    try {
        await main();
    } catch (err) {
        console.log(err);
    }
})();
