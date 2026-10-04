# Kaboom!: Atari 2600 → Commodore 64

A port of Activision's 1981 *Kaboom!* cartridge (programmed by Larry Kaplan, graphics by David
Crane) to the C64, by **Zeiche** (made with Claude), 0.0.1 beta: played with paddles or a 1351
mouse. This folder brings it in line with the other ports here: a joystick or the keyboard as
well, the standard keys, F2 power off/on, fire to start, the title, credits and controls in the
BASIC listing, and no grey dot. Everything else is Zeiche's program as he made it.

## Play it

`build\kaboom-1.0.prg`, or the disk image `build\kaboom-1.0.d64` (`LOAD"KABOOM!",8` then `RUN`).
Type `LIST` before `RUN` to see the title, credits and controls.

## Controls

| Action | Paddles / mouse | Joystick | Keys |
|---|---|---|---|
| Move the buckets | paddles in port 2 (A: player 1, B: player 2), or a mouse in port 1 | port 2 (or port 1): left / right | **A** / **D** |
| Drop the bombs (start a wave) | the paddle's button, or the mouse's left button | fire | **Space** |

With a joystick or the keys the buckets start slowly and speed up while held. Two players take
turns, so the joystick and keys work for whoever's turn it is. Paddles in port 2 take that port
over: its left / right lines are then their buttons.

| 2600 switch | C64 key |
|---|---|
| Game Reset (start a game) | **F1** (any button also starts one when no game is running) |
| Power off and on (back to the title) | **F2** |
| Game Select | **F3** |
| Colour / B&W | **F5** (toggle) |
| Left / right difficulty | **F7** / **F8** (toggle) |

Zeiche's own keys were 1 select, 2 reset, 3 / 4 difficulty, 5 colour and 6 restart and start.

## Build it

Needs the original 2K cartridge dump (MD5 `5428cdfada281c569c74c7308c7f2c26`, any file name, or its
`.zip`) in `roms_port\` or `prg contributed\`, plus the shared tools described in the top-level
README. Then run `build.cmd` in this folder.

## How it's made

Zeiche's program is the base, and it isn't stored here as such: `zeiche\kaboom.json` is his web
builder profile (his `.prg` with every byte of the ROM blanked), and `tools\base.js` puts the ROM
back in to get `build\zeiche.prg`, checked against his `.prg`'s MD5. `c64\main.asm` then rebuilds
the program region by region from that (`Keep`), with our changes in between:

* **BASIC listing**: title, credits (Zeiche's, then "updated by Claude and Doughboy68"), version
  (1.0) and the controls. It has to fit in front of his code at `$094C`.
* **ReadInput** (`$3549`, in place of his input routine). His paddle and mouse code stays: it
  reads the SID's pot lines (`$331B`), works out which of a mouse (port 1) and paddles (port 2) is
  there (`$87C6`), and moves the paddles from them (`$33E7`), now only for what it has seen, so
  an empty port can't push the buckets to one side. New: the joysticks and A / D move both
  paddles (`$87C0` / `$87C1`, what the 2600 game reads); fire, Space and the buttons go into
  SWCHA bits 7 / 6, where Kaboom! reads its paddle buttons. The console keys as in our other
  ports. His frame hook at `$09F1` calls it.
* **Fire starts a game** when none is running (`FireStart`, in his old button routine's place at
  `$33C3`): the 2600 game's `$A1` is the buckets left, 0 when no game is running; then any button
  holds Game Reset down, but not until 2 seconds after a game ends, so a last press doesn't wipe
  the final score.
* **F2** sets his restart flag (`$87DF`, which his own 6 key set): his frame code then sets up his
  tables again and runs the 2600's power-on code, which clears its RAM. The switches stay as set.
* **No grey dot**: the C64C's VIC (8565) shows a grey pixel where the beam is at each colour
  register write. His frame code wrote the border colour every frame, in the visible border; now
  only when it changes (`SetBorder`, for the writes at `$0ACD` and `$0ADB`).
* **More room**: his routine at `$34DF` (joystick left / right into paddle moves; nothing called
  it) holds PowerKey and the key tables now.
* **Testing aids** (`DbgSWCHA`, `DbgINPT4`, `DbgSWCHB` at `$371F`): AND masks applied to the
  inputs, poked from the VICE monitor by `tools\c64shot.js` to play the game.

## How it was checked

| Tool | What |
|---|---|
| `tools/inputtest.js` | ReadInput on a 6502 with the keyboard matrix, the joysticks and the SID's pot lines simulated, his paddle code running too: nothing connected never moves the buckets; both joysticks and A / D move both paddles, speeding up; fire, Space and the mouse button are the button; with paddles in port 2 its lines are their buttons and the buckets follow the paddle; fire starts a game only when none is running and not within 2 seconds of one ending; the console keys and F2 |
| `tools/c64shot.js` | VICE (PAL or NTSC): fire starts a game, the buckets go left and right, random moves and buttons play it, F2 goes back to the title, F3 / F1 select and start |

Grey dots in VICE: attract mode, 20 screenshots each, NTSC 10 and PAL 8 with a dot before, none
after. In 74 play screenshots (PAL and NTSC) one dot was left: one of his background changes at
the bottom of the field, which normally land just outside the picture, came early that once.
