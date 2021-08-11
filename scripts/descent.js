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


module.exports = {
    loop() {
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
                            vulcanState = false;
                            break;

                        case "two":
                            vulcanState = true;
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
};
