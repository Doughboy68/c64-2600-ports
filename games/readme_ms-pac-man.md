# Ms. Pac-Man: Atari 2600 → Commodore 64

A port of Atari's 1982 *Ms. Pac-Man* cartridge (programmed at General Computer Corporation by
Doug Macrae, Glen Parker, Josh Littlefield and Mark Ackerman) to the C64, by **Zeiche** (made with
Claude), 0.0.1 beta. This folder brings it in line with the other ports here: the standard keys,
F2 power off/on, the title, credits and controls in the BASIC listing, and no grey dot.
Everything else is Zeiche's program as he made it.

## Play it

`build\mspacman-0.0.3.prg`, or the disk image `build\mspacman-0.0.3.d64` (`LOAD"MS. PAC-MAN",8` then
`RUN`). Type `LIST` before `RUN` to see the title, credits and controls.

## Controls

| Action | Keys | Joystick |
|---|---|---|
| Move | **W A S D** | port 2 (or port 1) |
| Fire (starts a game) | **Space** | fire button |

In a two-player game the players take turns with the same joystick (the 2600 game reads only
the left one), so any of these work for whoever's turn it is.

| 2600 switch | C64 key |
|---|---|
| Game Reset (start a game) | **F1** (fire also starts one) |
| Power off and on (back to the title) | **F2** |
| Game Select | **F3** |
| Colour / B&W | **F5** (toggle) |
| Left / right difficulty | **F7** / **F8** (toggle) |

| C64 extra | Key |
|---|---|
| Flicker on / off | **F** |

Zeiche's own keys were 1 select and 2 reset; flicker is F (it was 6, his key, until beta 0.0.3).

## Build it

Needs the original 8K cartridge dump (MD5 `87e79cd41ce136fd4f72cc6e2c161bee`, any file name, or its
`.zip`) in `roms_port\` or `prg contributed\`, plus the shared tools described in the top-level
README. Then run `build.cmd` in this folder.

## How it's made

Zeiche's program is the base, and it isn't stored here as such: `zeiche\ms-pac-man.json` is his
web builder profile (his `.prg` with every byte of the ROM blanked), and `tools\base.js` puts the
ROM back in to get `build\zeiche.prg`, checked against his `.prg`'s MD5. `c64\main.asm` then
rebuilds the program region by region from that (`Keep`), with our changes in between:

* **BASIC listing**: title, credits (GCC's four programmers, Zeiche's line, then "updated by
  Claude and Doughboy68"), version (beta 0.0.3) and the controls. It has to fit in front of his
  code at `$0931`, so it is written short.
* **ReadInput** (`$32ED`, in place of his input routine, which nothing else used): the joysticks,
  W A S D + Space and the console keys, read the way our other ports read them; it fills in the
  2600's SWCHA, SWCHB, INPT4 and his copies of them for the power-on code. His frame hook at
  `$09D0` calls it. The switches and the flicker setting stay in his `$9167` / `$9168`.
* **F2** goes back to his start after the C64 set-up (`$5800`: ROM tables, sound, sprites, then
  the 2600's power-on code, which clears its RAM). The switches stay as set.
* **No grey dot**: the C64C's VIC (8565) shows a grey pixel where the beam is at each colour
  register write. His raster splits change colours at set lines; at the top of the maze (line
  57) the walls' colour (`$D023`) was written again although his end-of-frame code had already
  set it, and when sprites were on that line the VIC held the CPU back and the write landed in
  the picture: a dot on the maze's top edge on PAL. Now a split that would write a colour the
  register already has writes to `$D02F` (unused on the C64) instead (`SplitValue`, checked
  before his wait for the line, so the other writes keep their timing).
* **Testing aids** (`DbgSWCHA`, `DbgINPT4`, `DbgSWCHB` at `$3489`): AND masks applied to the
  inputs, poked from the VICE monitor by `tools\c64shot.js` to play the game.

## How it was checked

| Tool | What |
|---|---|
| `tools/inputtest.js` | ReadInput on a 6502 with the keyboard matrix and joysticks simulated: every direction from both ports and the keys, fire, the console keys, 6, F2, and a port 1 joystick never taken for a key |
| `tools/c64shot.js` | VICE (PAL or NTSC): fire starts a game, random moves play it, F2 goes back to the title, F3 / F1 select and start |

Outside the listing, the call at `$09D0`, the split value at `$0B76` and the input routine with
its variables, the program is byte for byte Zeiche's.

Grey dots in VICE (PAL): 6 of 20 attract-mode and 10 of 40 play screenshots had one before,
none after (20 and 45); NTSC had none before or after.
