# Pac-Man: Atari 2600 → Commodore 64

A port of Atari's 1982 *Pac-Man* cartridge (programmed by Tod Frye) to the C64, by **Zeiche**
(made with Claude), 0.0.1 beta. This folder brings it in line with the other ports here: the
standard keys, F2 power off/on, and the title, credits and controls in the BASIC listing.
Everything else is Zeiche's program as he made it.

## Play it

`build\pacman-1.0.prg`, or the disk image `build\pacman-1.0.d64` (`LOAD"PAC-MAN",8` then `RUN`).
Type `LIST` before `RUN` to see the title, credits and controls.

## Controls

| Action | Keys | Joystick |
|---|---|---|
| Move | **W A S D** | player 1: port 2, player 2: port 1 |
| Fire (starts a game) | **Space** | fire button |

Two players take turns, so W A S D + Space work for both: the game reads only the joystick of
the player whose turn it is (on the 2600, player 2 used the right joystick).

| 2600 switch | C64 key |
|---|---|
| Game Reset (start a game) | **F1** (fire also starts one) |
| Power off and on (back to the title) | **F2** |
| Game Select | **F3** |
| Colour / B&W | **F5** (toggle) |
| Player 1 / player 2 difficulty | **F7** / **F8** (toggle) |
| Flicker on / off | **F** |

Zeiche's own keys were 1 select, 2 reset, 3 / 4 difficulty and 5 colour; flicker is F (it was 6, his key, until beta 0.0.3).

## Build it

Needs the original 4K cartridge dump (MD5 `6e372f076fb9586aff416144f5cfe1cb`, any file name, or its
`.zip`) in `roms_port\` (or `prg contributed\`), plus the shared tools described in the top-level
README. Then run `build.cmd` in this folder.

## How it's made

Zeiche's program is the base, and it isn't stored here as such: `zeiche\pac-man.json` is his
web builder profile (his `.prg` with every byte of the ROM blanked), and `tools\base.js` puts the
ROM back in to get `build\zeiche.prg`, checked against his `.prg`'s MD5. `c64\main.asm` then
rebuilds the program region by region from that (`Keep`), with our changes in between:

* **BASIC listing**: title, credits (Zeiche's, then "updated by Claude and Doughboy68"),
  version (1.0) and the controls. It has to fit in front of his code at `$0932`.
* **ReadInput** (`$30EA`, in place of his input routine, which nothing else used): the joysticks,
  W A S D + Space, and the console keys, read the way our other ports read them; it fills in the
  2600's SWCHA, SWCHB, INPT4 / INPT5 and his copies of them for the power-on code. His frame hook
  at `$09D6` calls it. The switches and the flicker setting stay in his variables (`$86E8`,
  `$86E9`).
* **F2** goes back to his start after the C64 set-up (`$3B91`: ROM tables, sound, sprites, then
  the 2600's power-on code, which clears its RAM). The switches stay as set.
* **Testing aids** (`DbgSWCHA`, `DbgINPT4`, `DbgSWCHB` at `$32A0`): AND masks applied to the
  inputs, poked from the VICE monitor by `tools\c64shot.js` to play the game.

## How it was checked

| Tool | What |
|---|---|
| `tools/inputtest.js` | ReadInput on a 6502 with the keyboard matrix and joysticks simulated: every direction, fire, W A S D + Space, the console keys, 6, F2, and a port 1 joystick never taken for a key |
| `tools/c64shot.js` | VICE (PAL or NTSC): fire starts a game, random moves play it, F2 goes back to the title, F3 / F1 select and start |

Outside the listing, the call at `$09D6` and the input routine with its variables, the program
is byte for byte Zeiche's.

Grey dots (the C64C's VIC shows a grey pixel where the beam is at each colour register write):
none in 20 attract-mode and 40 play screenshots on PAL and on NTSC. Zeiche's interrupt already
writes the colours only when they change, so the only one seen was on the frame a game started.
