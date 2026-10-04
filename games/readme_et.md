# E.T. The Extra-Terrestrial: Atari 2600 → Commodore 64

A port of Atari's 1982 *E.T. The Extra-Terrestrial* cartridge (programmed by Howard Scott
Warshaw) to the C64, by **Zeiche** (made with Claude), 0.0.1 beta. This folder brings it in line
with the other ports here: the standard keys, F2 power off/on, the title, credits and controls
in the BASIC listing, and no grey dot. Everything else is Zeiche's program as he made it.

As Zeiche put it: "recompile's ROM hacks have been included as an option. they address some of
the quirks that players have experienced and may make the game more enjoyable." recompile
(an AtariAge member) published them in 2013 as "Fixing E.T. The Extra-Terrestrial"
([AtariAge thread](https://forums.atariage.com/topic/207249-fixing-et-the-extra-terrestrial/),
[write-up](http://www.neocomputer.org/projects/et/)): E.T. isn't green, walking no longer costs
energy (the "difficulty fix", which the colour / B&W switch turns off), E.T. falls in a well
only when his feet are in it, a few bug fixes (falling when leaving the forest, the ship
crushing Elliott), scoring as the manual says, a hidden "Ninja E.T.", and an extra game
option (scientist only). Zeiche's program holds the hacks as patches it applies to the game
code or takes out again.

## Play it

`build\et-0.0.2.prg`, or the disk image `build\et-0.0.2.d64` (`LOAD"E.T.",8` then `RUN`).
Type `LIST` before `RUN` to see the title, credits and controls.

## Controls

| Action | Keys | Joystick |
|---|---|---|
| Move | **W A S D** | port 2 (or port 1) |
| Fire (also starts a game) | **Space** | fire button |

| 2600 switch | C64 key |
|---|---|
| Game Reset (start a game) | **F1** |
| Power off and on (back to the title) | **F2** |
| Game Select | **F3** (held a little after the key comes up, as Zeiche did) |
| Left / right difficulty | **F7** / **F8** (toggle) |
| Colour / B&W: recompile's difficulty fix on / off | **F5** (on the title screen, with the ROM hacks on) |

| C64 extra | Key |
|---|---|
| recompile's ROM hacks on / off | **H** (on the title screen) |

Zeiche's own keys were 1 select, 2 reset, 3 / 4 difficulty, 5 the colour switch and 6 the ROM
hacks. 6 was the flicker key in all our ports then (F now; E.T. has no flicker), so the hacks moved to H.

## Build it

Needs the original 8K cartridge dump (MD5 `615a3bf251a38eb6638cdc7ffbde5480`, any file name, or its
`.zip`) in `roms_port\` or `prg contributed\`, plus the shared tools described in the top-level
README. Then run `build.cmd` in this folder.

## How it's made

Zeiche's program is the base, and it isn't stored here as such: `zeiche\et.json` is his web
builder profile (his `.prg` with every byte of the ROM blanked), and `tools\base.js` puts the
ROM back in to get `build\zeiche.prg`, checked against his `.prg`'s MD5. `c64\main.asm` then
rebuilds the program region by region from that (`Keep`), with our changes in between:

* **BASIC listing**: title, credits (Zeiche's, then "updated by Claude and Doughboy68"),
  version (beta 0.0.2) and the controls. It has to fit in front of his code at `$095C`.
* **ReadInput** (`$37A3`, in place of his input routine, which nothing else used): the joysticks,
  W A S D + Space and the console keys, read the way our other ports read them; it fills in the
  2600's SWCHA, SWCHB, INPT4 and his copies of them for the power-on code. His frame hook at
  `$09FB` calls it. F5 and H obey his `$F415` (set by his frame code: only on the title screen,
  F5 only with the hacks on); the switches and the hacks stay in his `$F41B` / `$F41C`.
* **F2** jumps to the 2600 program's start in RAM (`$B100`, where his set-up ends): its
  power-on code clears its RAM. Not his whole set-up again: it unpacks the game from data that
  is reused as memory once the game runs. The switches and the ROM hacks stay as set.
* **No grey dot**: the C64C's VIC (8565) shows a grey pixel where the beam is at each colour
  register write. At the end of each frame (line 251 on) his interrupt rewrote the background,
  border and `$D023` whenever one differed, which is every frame because the background changes
  down the screen; the border write landed just inside the visible left border. Now the border
  is written only when it changes (`Border`), the other two where they can't be seen as before.
* **Testing aids** (`DbgSWCHA`, `DbgINPT4`, `DbgSWCHB` at `$3966`): AND masks applied to the
  inputs, poked from the VICE monitor by `tools\c64shot.js` to play the game.

## How it was checked

| Tool | What |
|---|---|
| `tools/inputtest.js` | ReadInput on a 6502 with the keyboard matrix and joysticks simulated: every direction from both ports and the keys, fire, the console keys, F5 and H with and without his lock, Game Select's hold, F2, and a port 1 joystick never taken for a key |
| `tools/c64shot.js` | VICE (PAL or NTSC): fire starts a game, random moves play it, F2 goes back to the title, F3 / F1 select and start |

Outside the listing, the call at `$09FB`, the border write and the input routine with its
variables, the program is byte for byte Zeiche's.

Grey dots in VICE: attract mode, 20 screenshots each, NTSC 15 and PAL 13 with a dot before, none
after. In 70 play screenshots (PAL and NTSC) one dot was left, on the frame a game started: one
of his mid-screen background changes, which normally land off screen at the end of a line, came
late that once.
