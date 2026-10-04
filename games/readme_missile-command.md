# Missile Command: Atari 2600 → Commodore 64

A port of Atari's 1981 *Missile Command* cartridge (programmed by Rob Fulop) to the C64. The
original 2600 program runs (almost) unchanged on the C64's 6510; new C64 code takes over
everything the 2600's hardware did: the display, the controls and the sound.

## Play it

The C64 version is `build\missilecmd-1.0.prg` (the version in its name), also on the disk image
`build\missilecmd-1.0.d64`. On a real C64: `LOAD"MISSILE COMMAND",8` then `RUN`. Type `LIST`
first to see the credits and controls.

## Controls

| Action | Keys | Joystick |
|---|---|---|
| Move the cursor (8 directions) | **W A S D** | port 2 |
| Launch an ABM at the cursor | **Space** | fire button |

In two-player games player 2 uses a joystick in port 1; the keys work for whoever's turn it is.

| Console | Key |
|---|---|
| Start a game (Game Reset); fire also starts one | **F1** |
| Power off and on (back to game 1, no score) | **F2** |
| Game Select (games 1-34) | **F3** |
| Colour / black and white | **F5** |
| Left / right difficulty (A: your ABMs fly slower) | **F7** / **F8** |
| The two attacking missiles and the three ABM slots take turns on screen like on the 2600 (flicker) on / off | **F** |

The games (from the original manual, and the game's own table): 1-17 for one player, 18-34 the
same for two (taking turns, a wave each).

| Game | Two players | First wave | Cruise missiles | Cursor |
|---|---|---|---|---|
| 1 / 2 | 18 / 19 | 1 | dumb | slow / fast |
| 3 / 4 | 20 / 21 | 1 | smart | slow / fast |
| 5 / 6 | 22 / 23 | 7 | dumb | slow / fast |
| 7 / 8 | 24 / 25 | 7 | smart | slow / fast |
| 9 / 10 | 26 / 27 | 11 | dumb | slow / fast |
| 11 / 12 | 28 / 29 | 11 | smart | slow / fast |
| 13 / 14 | 30 / 31 | 15 | dumb | slow / fast |
| 15 / 16 | 32 / 33 | 15 | smart | slow / fast |
| 17 | 34 | children's game: slower, dumb cruise missiles only | | |

Each wave gives you 30 ABMs (10 in the base, 20 in reserve). Interplanetary missiles score 25,
cruise missiles 125, ABMs left 5 and cities left 100 each, times the wave's multiplier (1 for
waves 1-2 up to 6 from wave 11); a bonus city every 10,000 points.

## Build it

Needs the original 4K cartridge dump (MD5 `3a2e2d0c6892aa14544083dfb7762782`, any file name, or
its `.zip`) in `roms_port\`, plus the shared tools described in the top-level README. Then run
`build.cmd` in this folder.

## How it works

* **Same game code.** The 4K ROM is copied to `$F000` (RAM under the KERNAL) with a few patches
  (listed at the end of `c64/data.asm`): the game stops where the 2600 would draw a picture and
  hands control back once per frame, and it doesn't touch the C64's `$00`/`$01`, its stack or its
  interrupts. Everything else, all 34 games, the attacking missiles, smart cruise missiles,
  scoring and sound effects, is the original code.
* **No collision registers.** Missile Command works out every hit itself (it never reads the
  TIA's collision registers), so the picture is all the C64 code has to reproduce. Where the game
  would draw it (`c64/capture.asm`), the C64 notes what the picture would show and leaves the
  RAM exactly as the 2600's kernel would have left it.
* **Display** (`c64/render.asm`). A multicolour bitmap, laid out line for line like the 2600
  picture: one 2600 pixel = one multicolour pixel (two C64 pixels), one 2600 line = one C64 line.
  The 2600 draws one attacking missile's trail per frame with missile 0, moving it sideways a
  pixel at a time with HMOVE (with up to three copies); the C64 keeps each trail in the bitmap
  and only adds the rows it grew by (and erases trails that end). Warheads are the bitmap's
  fourth colour (colour RAM), the score, cities and ground are drawn into it when they change.
  The cursor, the explosions and the ABMs are sprites. Two buffers (two VIC banks) take turns, so
  a half-drawn frame is never shown.
* **Quirks kept.** The black HMOVE comb (the first 8 pixels of the first line of every play row,
  and one line near the top whose place depends on how long the kernel takes to position the
  explosion), explosions and ABMs whose left part is a line late (the kernel changes them
  part-way across a line), explosions at the bottom running on into the line above the cities,
  a city's last pixel showing its neighbour's.
* **Sound.** The game's TIA sound registers are translated to SID voices 1 and 2.
* **Speed.** The 2600 game runs 60 frames/s. On a PAL C64 (50 Hz) the logic runs 6 times every
  5 frames, so the game plays at the original speed.

## How it was checked

| Tool | What |
|---|---|
| `tools/stellacheck.js` | Plays the same inputs in `tools/vcs.js` and in Stella's debugger (the reference for the real 2600) and compares the pictures: they match once vcs.js follows two rules of the real TIA (`wideDelay`: double-width players start a pixel late; `respDelay`: no main copy on the line of a mid-line reset), apart from a pixel now and then where the exact timing of a mid-line write differs |
| `tools/model.js` | A model of what the 2600 kernel draws, built only from RAM: matches the 2600 (`tools/vcs.js` with those two rules) pixel for pixel, objects and colours, over tens of thousands of frames of play (all copy patterns, explosions big and small across the kernel's mid-line writes, ABMs, the moving comb, cities being destroyed) |
| `tools/lockstep.js` | Runs the C64 version's game ticks (the patched program plus the capture code) on a 6502 next to the original, with the same inputs: the game RAM must be identical every frame. `--power=N` tries F2 at frame N, `--pal` draws 5 ticks in 6, `--profile` counts the cycles |
| `tools/screencheck.js` | Draws the C64 frame from what the C64 code set up (the bitmap, its colours and colour RAM, the sprites with their priorities) and compares it with the 2600's picture, in C64 colours |
| `tools/inputtest.js` | The controls, on an emulated keyboard and joysticks |
| `tools/c64test.js`, `tools/c64late.js` | Play tests and screenshots in VICE; time per frame on PAL and NTSC, and frames shown of each kind (`--game=N` for the later waves; `--auto`: the C64 plays by itself, the same game in every build whatever its timing, so builds can be compared) |
| `tools/rendercheck.js` | Two builds' renders side by side on the same inputs: what each would show (bitmaps, sprites, colours) must be identical, flicker on or off, with the cycles each takes (for speed changes: with flicker off there's no 2600 picture to compare with) |
| `tools/c64irq.js` | Where the border colour writes land in VICE (raster line and cycle, by breakpoints): the ground's inside the display window, the black ones in the horizontal blank, so the 8565's grey dots don't show |
| `tools/play.js` | The checks' player (aims at the lowest warhead part of the time) |
| `tools/mkhpos.js`, `tools/run.js` | Where the positioning routine puts each object; running the original and saving pictures |

## Differences from the 2600

* Colours are approximated from the 2600 NTSC palette to the C64's 16.
* TIA sounds are approximated on the SID.
* The C64 shows the picture from the 2600's line 39 (two black lines above the score) to line 238;
  below that the ground goes on to line 260 as on the 2600, in the C64's border (its colour, the whole
  width; the borders beside the ground's last lines too).
* With flicker off (key F), both attacking missiles and all three ABMs or explosions are shown
  every frame. (There an explosion that changes in the same frame as another may show its new
  shape a frame late.)
* On PAL, every fifth frame runs two game steps, so movement has a slight rhythm to it, and with
  flicker on, the two attacking missiles don't quite alternate evenly.
