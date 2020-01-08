const EventEmitter = require("events").EventEmitter
const HID = require("node-hid");
const _ = require("lodash");

const events = new EventEmitter();

var setupPromise;

function createDefaultData() {
    return {
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
    }
};

async function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

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

async function onData(data) {
    const ps3 = createDefaultData();

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

    events.emit("data", ps3);
}

async function setup() {
    var device;
    var waiting = false;
    while (!device) {
        try {
            var devices = HID.devices();
            var deviceInfo = _.find(devices, d => d.manufacturer === "Sony" && d.product === "PLAYSTATION(R)3 Controller");

            if (!deviceInfo) {
                if (!waiting) {
                    waiting = true;
                    console.info("Waiting for PS3 controller...");
                }
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

    device.on("data", onData);
    device.on("error", err => {
        events.emit("data", createDefaultData());

        console.log(err);
        console.log("Trying again to acquire PS3 controller...");
        setupSync();
    });
}

function setupSync() {
    setupPromise = setup()
    return setupPromise
}

module.exports = {
    setup() {
        return setupPromise || setupSync()
    },

    on: events.on.bind(events)
};
