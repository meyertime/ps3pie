# ps3pie

This is basically my attempt to bring something like GlovePIE or FreePIE to Linux, except I only implemented the PS3 controller at this point.  If you are not already aware, these programs are "Programmable Input Emulators" (PIE) which take input from various sources (joysticks, gamepads, keyboard, etc.), perform some mapping or transformation through some sort of scripting language, and generate events through various outputs that can be read by games (virtual joystick, simulated keyboard events, etc.).  This allows some devices to be used by games that do not have native support, or to use a device that does have native support in a way that is not natively supported.  For example, the PS3 controller has pressure-sensitive buttons, but the input from these is not made available to games by the standard driver.

I have another repo, JsPie, which I previously wrote as an alternative on Windows that uses JavaScript for its scripting language.  In this case, I simply implemented ps3pie in nodejs which naturally supports JavaScript.  At the time of this writing, my `ps3.js` script which I used in JsPie to play Descent and Overload is embedded in ps3pie.  It is essentially a proof-of-concept or MVP which I can use to play Descent and Overload on Linux.  It needs work to make it more generally useful.

It works by reading `/dev/hidrawX` for the PS3 controller to read the raw updates from the controller.  The data is adapted to a format similar to what was used in JsPie at which point the embedded script, which is a slightly modified version of `ps3.js` from JsPie, performs some transformation.  The output events are then collected and `uinput` is used to create a virtual event device which emulates the joystick and keyboard outputs.

## Fixing hidraw permission

Reading `/dev/hidrawX` requires a change to the permissions.  For example, `chmod 666 /dev/hidrawX`.  This change is not permanent, however.  To change the automatic permissions when connecting the PS3 controller, you need a `udev` rule.  For example, create the file `/etc/udev/rules.d/99-ps3.rules` with the content:

```
KERNEL=="hidraw*", ATTRS{busnum}=="1", ATTRS{idVendor}=="054c", ATTRS{idProduct}=="0268", MODE="0666"
```

This rule will only apply to PS3 controllers.  This is what I had to do on an Arch-based system; for other distros, your mileage may vary.

## Fixing uinput permissions

Outputting events to a virtual `uinput` device requires permissions to `/dev/uinput`.  I want to be a little more careful about this, since more can be done by a bad actor with access to this as opposed to just the PS3 controller devices.

The basic idea is to make a group with permission to `uinput` and add your regular user to this group.  Eventually, however, I would like to have a separate systemd service which runs as a different user with `uinput` access, and then the user application would communicate with the service to transfer events back and forth.  But for now, this will get it working:

1. `sudo groupadd uinput` to create a `uinput` group.
2. `sudo usermod -a -G uinput "$USER"` to add yourself to that group.
3. Create the file `/etc/udev/rules.d/99-uinput.rules` with the content:
    ```
    SUBSYSTEM=="misc", KERNEL=="uinput", MODE="0660", GROUP="uinput"
    ```
4. Create the file `/etc/modules-load.d/uinput.conf` with the content `uinput`.
5. Reboot.
6. Verify `ls /dev/uinput -l` looks like:
    ```
    crw-rw---- 1 root uinput 10, 223 Nov 30 02:49 /dev/uinput
    ```

## Thoughts

I must say, having implemented basically the same thing separately on both Windows and Linux, it was much easier to implement on Linux.  Granted, I already had a working script from my Windows implementation, and I did a lot more rigor with JsPie than I have at this point with ps3pie, but Linux's flexible subsystems made it trivial to add a virtual joystick device, whereas Windows required an entirely separate virtual joystick driver which had to be signed unless you activate "Test Mode".  From the time I started ps3pie, I had a functional MVP in one night.

## Future

In its current state, ps3pie is only really useful for adapting PS3 controller inputs on Linux.  It needs some work:

- It is difficult to map inputs from the virtual joystick in games, since the game will pick up both the native PS3 controller device and the virtual joystick at the same time.
  - Ideally, ps3pie should somehow block the input from the native PS3 controller device while it is running.  I am not sure how to do this.  You can remove read permission on the event device, but then the game will not pick up the existence of the controller at all, and mappings are messed up unless you also do this before running the game every time.
  - As a workaround, you can use the provided `dummy.js` to create a virtual device very similar to the PS3 controller with the controller not plugged in.  Then, when you plug in the controller, the controller becomes the second device, taking the slot normally filled by the virtual joystick.  You can then use the PS3 controller to perform mappings in the game.
  - Taking the above a step further, some sort of helper script could be written to translate certain keyboard inputs to generate events for mapping purposes.  I have done this as a workaround with GlovePIE, FreePIE, and JsPie, which have a similar issue with natively supported devices.
  - As a last resort, you can look at modifying a game's configuration files in order to manually set the mappings.  I had to resort to this with Overload.
- The script should not be embedded in the application code.  Rather, support for specifying a script file to run should be added.  This would also involve setting up the API that would be used for such scripts.
- The ability to support multiple types of input and output would make this tool more generally useful and along the same lines as FreePIE.  Currently, it only supports PS3 input and virtual joystick and keyboard output.

## Legal

Copyright 2019-2021 David Meyer

GNU General Public License v3.0
