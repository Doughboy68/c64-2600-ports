# Stargate: Atari 2600 → Commodore 64

A port of Atari's 1984 *Stargate* cartridge (the 2600 version of Williams' arcade game) to the
C64. The original 2600 program runs (almost) unchanged on the C64's 6510; new C64 code takes over
everything the 2600's hardware did: the display, collision detection, the controls and the sound.

Version 0.1.

## Play it

The C64 version is `build\stargate-0.1.prg` (the version in its name), also on the disk image
`build\stargate-0.1.d64`. On a real C64: `LOAD"STARGATE",8` then `RUN`. Type `LIST` first to see
the credits and controls.

## Controls

Stargate is played with two joysticks, as on the 2600: the left one flies the ship and fires the
laser, the right one works the ship's devices.

| Action | Keys | Joystick |
|---|---|---|
| Fly (up / down, accelerate left / right and turn) | **W A S D** | port 2 |
| Fire the laser | **Space** | port 2's fire button |
| Inviso (invisible for a while) | **I** | port 1 up |
| Hyperspace | **K** | port 1 down |
| Smartbomb (every enemy on the screen) | **Return** | port 1's fire button |

| Console | Key |
|---|---|
| Start a game (Game Reset); fire also starts one | **F1** |
| Power off and on (back to the title) | **F2** |
| Game Select, colour / black and white, left / right difficulty (the cartridge doesn't use them) | **F3**, **F5**, **F7** / **F8** |
| Objects take turns on screen like on the 2600 (flicker) on / off | **F** |

You start with 3 ships, 3 smartbombs and 3 invisos (one more of each every 10,000 points).

## Build it

Needs the original 8K cartridge dump (MD5 `0c48e820301251fbb6bcdc89bd3555d9`, any file name, or
its `.zip`) in `roms_port\`, plus the shared tools described in the top-level README. Then run
`build.cmd` in this folder.

## How it works

* **Same game code.** The 8K ROM is two 4K banks with F8 bank switching and Atari's SuperChip (128
  bytes of RAM on the cartridge). Bank 0 is copied to the C64's RAM at `$D000` (under the I/O) and
  bank 1 to `$F000` (under the KERNAL), where they were written to run, so a bank switch is just a
  jump; the SuperChip's RAM is the C64's RAM at `$F080-$F0FF`. The ticks run with all RAM visible
  (`$01 = $34`); the interrupts switch the I/O in. The patches (`c64/patches.inc`, made by
  `tools/mkpatches.js`) stop the game where the 2600 would draw a picture and hand control back
  once a frame, move the SuperChip writes to where the reads are, keep the C64's `$00`/`$01`, its
  stack and interrupts, and hook a few routines (the score's digit pointers, the 48-pixel bands, the
  scanner's writes, the icon rows, the objects hidden by the flicker). Everything else, the enemies,
  the humanoids, the laser, the stargate, smartbombs, inviso and hyperspace, scoring and sound
  effects, is the original code.
* **The kernel, replaced** (`c64/capture.asm`, `c64/collide.asm`). Where the 2600 would draw the
  scanner and the field, the C64 walks the field line by line as the kernel would (the enemies drawn
  one after another, each repositioned on two lines, the laser's two lines), notes what the picture
  would show, works out the collisions the game reads (each enemy against the ship, the enemy shot
  against the ship and the stars, the laser against an enemy) and leaves the RAM exactly as the
  kernel would have.
* **Display** (`c64/render.asm`, `c64/layer.asm`). A multicolour bitmap, laid out line for line like
  the 2600 picture: one 2600 pixel = one multicolour pixel, one 2600 line = one C64 line. The score,
  the ship, smartbomb and inviso icons and the scanner are drawn into it when they change (the
  scanner by the rows the game wrote, the bands by what their graphics come from). The stars and
  mountains move together: they're one layer, drawn by generated code at a cell offset and moved the
  rest of the way by the VIC's fine scroll. The laser is drawn as runs of cells. The ship, the enemies
  and the enemy shot are multicolour sprites; an enemy's three colours come from its rows (the
  sprite's own and the two shared ones, switched by a raster interrupt as the enemies go down the
  screen). Two buffers (two VIC banks) take turns, so a half-drawn frame is never shown.
* **Quirks kept.** The HMOVE comb (the first 8 pixels of every field line, black), line 223
  repeating line 222, the line after the laser showing the line before left of clock 31, a black
  field while inviso blinks the ship's colour, the background flashes (the stars then drawn one by
  one, without the fine scroll), the screen saver after a long time idle.
* **Sound.** The game's TIA sound registers are translated to SID voices 1 and 2.
* **Speed.** The 2600 game runs 60 frames/s. On a PAL C64 (50 Hz) the logic runs 6 times every 5
  frames, so the game plays at the original speed.

## How it was checked

| Tool | What |
|---|---|
| `tools/disasm.js` (shared) + `2600/symbols.js` | The disassembly, which rebuilds the exact ROM (`build.cmd` checks it) |
| `tools/model.js` | A model of what the 2600 kernel draws and its collisions, built only from RAM: matches `tools/vcs.js` pixel for pixel, objects and colours, and the collision registers, over random games (`--cheat`: endless ships and quick wave ends, for the later waves) |
| `tools/lockstep.js` | Runs the C64 version's game ticks (the patched program plus the capture code) on a 6502 next to the original, with the same inputs: the game RAM and the SuperChip RAM must be identical every frame. `--power=N` tries F2 at frame N, `--noflicker` flicker off, `--idle=N` the screen saver, `--profile` counts the cycles |
| `tools/screencheck.js` | Draws the C64 frame from what the C64 code set up (the bitmap, its colours and colour RAM, the sprites with their priorities, the raster interrupts' changes) and compares it with the 2600's picture, in C64 colours (`--skip=N`: some frames not drawn, as when the C64 runs late) |
| `tools/inputtest.js` | The controls, on an emulated keyboard and joysticks |
| `tools/c64test.js` | A game played in VICE, with screenshots, F2 at the end |
| `tools/c64late.js` | Time per frame in VICE, PAL and NTSC: the C64 plays by itself (`DbgAuto`, `c64/auto.asm`: the same game in every build, into the later waves), late frames and frames shown of each kind |
| `tools/autoload.js`, `tools/autoprof.js`, `tools/heavyprof.js`, `tools/latemodel.js` | Speed: the auto game on the simulator (cycles per frame, per routine, in the heavy frames) and a model of the main loop's lateness fitted to VICE |
| `tools/loopsim.js` | The whole program on the simulator with a raster (the main loop, the raster interrupts, badlines and sprite fetches): the auto game's late and repeated frames in seconds, within ~2% of `c64late.js` in VICE |
| `tools/stress.js` | VICE: random play, checks the main loop keeps running, dumps the state if it stops |
| `tools/soundcheck.js` | The SID writes in VICE (its "dump" sound driver) while the C64 plays: both voices sound and stop |
| `tools/play.js`, `tools/cheat.js` | The checks' player and the later-wave cheat |

## Differences from the 2600

* Colours are approximated from the 2600 NTSC palette to the C64's 16.
* TIA sounds are approximated on the SID.
* An enemy with more colours than a multicolour sprite has (its own, two shared, black) shows the
  extra ones in its own colour; black rows with no colour left are transparent (over a star or a
  flash of the background, they don't hide it).
* With flicker off (key F), the objects the game leaves out on alternate frames (two too close
  above each other) are shown every frame, in their own colour only.
* On PAL, every fifth frame runs two game steps, so movement has a slight rhythm to it, and with
  flicker on, the objects that take turns don't quite alternate evenly.
* Speed: the C64 can't always keep up when the screen is busy (many enemies, the laser, the
  stars scrolling fast): then a frame is shown twice and the game catches up, so with flicker on,
  an object that takes turns may miss its turn.
