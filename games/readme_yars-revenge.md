# Yars' Revenge: Atari 2600 → Commodore 64

A port of Atari's 1982 *Yars' Revenge* cartridge (programmed by Howard Scott Warshaw) to the C64,
by **Zeiche** (made with Claude), 0.0.1 beta. This folder brings it in line with the other ports
here: the standard keys, F2 power off/on, and the title, credits and controls in the BASIC
listing. Everything else is Zeiche's program as he made it.

## Play it

`build\yars-1.0.prg`, or the disk image `build\yars-1.0.d64` (`LOAD"YARS' REVENGE",8` then `RUN`).
Type `LIST` before `RUN` to see the title, credits and controls.

## Controls

| Action | Player 1 | Player 2 |
|---|---|---|
| Move | joystick in port 2, or **W A S D** | joystick in port 1, or **W A S D** |
| Fire (also starts a game) | fire button, or **Space** | fire button, or **Space** |

Two players take turns, each with their own joystick as on the 2600 (left and right); the keys
work for whoever's turn it is.

| 2600 switch | C64 key |
|---|---|
| Game Reset (start a game) | **F1** (fire also starts one) |
| Power off and on (back to the title) | **F2** |
| Game Select | **F3** |
| Colour / B&W | **F5** (toggle) |
| Left / right difficulty | **F7** / **F8** (toggle) |

Zeiche's own keys were 1 select, 2 reset and 3 / 4 difficulty.

## Build it

Needs the original 4K cartridge dump (MD5 `c5930d0e8cdae3e037349bfa08e871be`, any file name, or its
`.zip`) in `roms_port\` or `prg contributed\`, plus the shared tools described in the top-level
README. Then run `build.cmd` in this folder.

## How it's made

Zeiche's program is the base, and it isn't stored here as such: `zeiche\yars-revenge.json` is his
web builder profile (his `.prg` with every byte of the ROM blanked), and `tools\base.js` puts the
ROM back in to get `build\zeiche.prg`, checked against his `.prg`'s MD5. `c64\main.asm` then
rebuilds the program region by region from that (`Keep`), with our changes in between:

* **BASIC listing**: title, credits (Zeiche's, then "updated by Claude and Doughboy68"), version
  (1.0) and the controls. It has to fit in front of his code at `$0929`, so it is written
  short.
* **ReadInput** (`$2F0A`, in place of his input routine, which nothing else used): the joysticks,
  W A S D + Space and the console keys, read the way our other ports read them; it fills in the
  2600's SWCHA, SWCHB, INPT4, INPT5 and his copies of them for the power-on code. His frame hook
  at `$09C8` calls it. The switches stay in his `$873D`.
* **F2** clears the 2600's RAM (`$80-$FF`) and our TIA stand-ins (`$02-$3D`), then runs the 2600
  program from its start (`$62C2`, its reset vector moved). Not his whole set-up again: it copies
  tables with a loop that changes its own addresses, so it can't run twice; and the game's own
  start clears only part of its RAM. The switches stay as set.
* **Testing aids** (`DbgSWCHA`, `DbgINPT4`, `DbgSWCHB` at `$30A6`): AND masks applied to the
  inputs, poked from the VICE monitor by `tools\c64shot.js` to play the game.

## How it was checked

| Tool | What |
|---|---|
| `tools/inputtest.js` | ReadInput on a 6502 with the keyboard matrix and joysticks simulated: every direction from both ports and the keys, fire, the console keys, F2 (what it clears and keeps), and a port 1 joystick never taken for a key |
| `tools/c64shot.js` | VICE (PAL or NTSC): fire starts a game, random moves play it, F2 goes back to the title, F3 / F1 select and start |

Outside the listing, the call at `$09C8` and the input routine with its variables, the program
is byte for byte Zeiche's.

Grey dots in VICE: none in 20 attract-mode and 35 play screenshots, on PAL and on NTSC.
