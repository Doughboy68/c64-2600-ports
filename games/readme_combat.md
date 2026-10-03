# Combat: Atari 2600 → Commodore 64

Version 1.1. A port of Atari's 1977 *Combat* cartridge (Joe Decuir and Larry Wagner) to the C64, by
**TjLaZer** (shared on the Lemon64 forum), with his computer player for one-person games.
This folder holds his program turned back into source and brought in line with the other
ports here: the standard keys, a keyboard set for each player, F2 power off/on, fire to
start, the title and controls in the BASIC listing, and a fix for scores and border
sprites that flickered.

## Play it

`build\combat-c64.prg`, or the disk image `build\combat-c64.d64` (`LOAD"COMBAT",8` then `RUN`).
Type `LIST` before `RUN` to see the title, credits and controls.

## Build it

Needs the original 2K cartridge dump (MD5 `0d213ac07d3be0d51d3084769bebac17`, any file name, or its
`.zip`) in `roms_port\` (or `prg contributed\`), plus the shared tools described in the top-level
README. Then run `build.cmd` in this folder; it also makes the web builder profile
(`site/games/combat.json`, no original game code). Published (1.0, then 1.1) with TjLaZer's permission.

## Controls

Combat is a game for two players at once, so both have a keyboard set as well as a joystick.

| Action | Player 1 (left) | Player 2 (right) |
|---|---|---|
| Move | **W A S D** | **I J K L** |
| Fire | **Space** | **Return** |
| Joystick | port 2 | port 1 |

| 2600 switch | C64 key |
|---|---|
| Game Reset (start a game) | **F1** |
| Power off and on (back to game 1, no score) | **F2** |
| Game Select (one of 27 games) | **F3** |
| Colour / B&W | **F5** (toggle) |
| Left / right difficulty | **F7** / **F8** (toggle) |

| C64 extra | Key |
|---|---|
| Start a game when none is running (the 2600 needs Game Reset) | either fire button, Space or Return |
| Computer plays player 2 (on / off; the border flashes white for on, black for off) | **C** |
| The computer's level: how often it fires (border flashes green, yellow, red) | **V** |

TjLaZer's own keys were F3 reset, F5 select, B colour, 1 / 2 difficulty, C computer and D level;
D moved to V because it's player 1's "right" now.

## How it works

* **Same game code.** The 2K ROM runs at `$F000` (RAM under the KERNAL), patched in 118 bytes
  (`RomImage` at the end of `c64/main.asm`): its addresses moved from `$1xxx` to `$Fxxx`; the TIA
  strobes that depend on exact timing (RESP0/RESP1, RESMP0/1, HMOVE) became `BRK n`, handled by the
  BRK half of `Irq`; collision reads point at RAM (`$30-$37`); the frame start (VSYNC, timer) is
  `JSR FrameStart` and the display kernel is `JSR Render`.
* **Hardware stand-ins.** The game's other TIA writes land in zero page `$00-$2C`; SWCHA, SWCHB,
  INPT4 and INPT5 are RAM that `ReadInput` fills in each frame.
* **Display.** The playfield is characters, every tank, plane and missile copy a sprite (one 2600
  pixel = two C64 pixels), drawn into one of two buffers while `Irq` shows the other. `Irq` opens the
  top and bottom borders so the score (sprites 4-7) sits above the picture and planes can fly
  through the top and bottom, then reuses sprites 4-7 for objects 4-7.
* **Collisions** are found in software from the same shapes (`Collide`).
* **Sound.** The TIA's sound registers become SID voices 1 and 2 (`Sound`), with PAL and NTSC tables.
* **Speed.** PAL runs 6 game frames every 5 C64 frames, so the game plays at the 2600's speed.
* **Computer player** (`Computer`, TjLaZer's). When on, it drives player 2's joystick and fire: it
  aims at player 1 when it has a line of fire, otherwise follows a path round the maze, found by a
  flood fill over the playfield a few steps per frame (`PathStep`, `PathNext`). Its level sets how
  often it fires. It doesn't exist on the 2600: Combat there needs two people.

## What changed from TjLaZer's version

* The keys, as above (the keyboard is read the way our other ports read it).
* F2 power off and on, and fire starting a game (a second after the last one, so a late shot
  doesn't skip the final score).
* Flicker fix: the interrupt that opens the bottom border must come in lines 249-250. The 2600
  code's `BRK` strobes ran with interrupts off, and when one was under way at that moment the
  border stayed closed for a frame: the scores and anything in the border (planes and shots passing
  the top or bottom) blinked out. Measured in VICE, about 3 frames in 30 seconds of play on PAL and 8
  on NTSC; the BRK handler now lets interrupts in (`BrkStrobe`), and the same tests show none.
* Grey dots: the interrupt at the end of each frame wrote the background and border colours
  (`$D021`, `$D020`) every frame, in the open bottom border. The C64C's VIC (8565, and VICE set to
  that model) shows a one-pixel grey dot where the beam is at each colour write, so a dot flickered
  just below the playfield, mostly on the right. They're now written only when the colour changes
  (a new game, B&W, the C / V border flash): 10 of 17 VICE screenshots had a dot before, none after.
* Bottom wall (1.1): it was twice as thick as the top one. That's the 2600's own picture (top wall
  8 lines, bottom 18: for the last rows the kernel's playfield index keeps the previous row, the
  wall), but a TV's overscan hid most of it; the C64 shows every line, so it was a second row of wall
  characters (screen row 24). `Playfield` now leaves that row empty, so both walls are 8 lines.
  The game is unchanged: tanks and shots always meet row 23's wall first (lockstep: identical apart
  from the screen and the maps made from it).
* Border flash (1.1): while C / V flash the border, the interrupt used to leave the border closed,
  so the scores above the picture vanished and the picture's bottom changed. The border is now
  always opened, and the flash colours the side borders.
* Sprite fix: the renderer skips redrawing a sprite whose object, place and size haven't changed
  since that buffer last showed it, but a change of shape (a tank turning) reached only the slot
  the object had that frame. If the object was missing for a frame, or came back in another slot,
  one buffer kept the old shape and the tank flickered between two directions, sometimes for over
  a second. Every slot showing an object whose shape changed is now redrawn (`ForgetChanged`).
  `tools/lockstep.js --cache=his` finds 40-60 such frames in a few minutes of his original; ours has none.
* The BASIC listing: title, credits, version and controls.

## Files

| Path | What |
|---|---|
| `c64/main.asm` | The C64 version: TjLaZer's code as source (labels and comments ours), plus our changes |
| `tools/lockstep.js` | Runs TjLaZer's original and ours side by side on a 6502 core (raster interrupts, joysticks, keys): the game's RAM, sprites, screen, the computer's maps and the SID must match every frame (`--ntsc`; `--cache=ours` checks no sprite is left with an old shape). Needs his .prg in `prg contributed` |
| `tools/inputtest.js` | Checks every key and joystick direction against the 2600 ports, on a 6502 core |
| `tools/c64shot.js` | VICE screenshots and checks (PAL or NTSC): pick a game, computer on, random play, late borders, F2 and fire start |
| `build/` | The finished `.prg` and `.d64`; everything else there is temporary |

## Known differences

* Colours are approximated from the 2600 palette to the C64's 16.
* TIA sounds are approximated on the SID.
