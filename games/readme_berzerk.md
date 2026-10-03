# Berzerk: Atari 2600 → Commodore 64

A port of Atari's 1982 *Berzerk* cartridge (programmed by Dan Hitchens) to the C64. The
original 2600 program runs (almost) unchanged on the C64's 6510; new C64 code takes over
everything the 2600's hardware did: the display, collision detection, controls and sound.

## Play it

The C64 version is `build\berzerk-c64.prg`, also on the disk image `build\berzerk-c64.d64`.
On a real C64: `LOAD"BERZERK",8` then `RUN`. Type `LIST` first to see the credits and controls.

## Controls

| Action | Keys | Joystick |
|---|---|---|
| Move (8 directions) | **W A S D** | port 2 (or port 1) |
| Fire (in the direction you last moved; hold it and push to aim) | **Space** | fire button |

| Console | Key |
|---|---|
| Start a game (Game Reset); fire also starts one | **F1** |
| Power off and on (back to game 1, no score) | **F2** |
| Game Select (games 1-12) | **F3** |
| Evil Otto and the humanoid alternate on screen like on the 2600 (flicker) on / off | **6** |

F5, F7 and F8 are the standard colour and difficulty keys; Berzerk doesn't use those switches.

The 12 games (from the original manual):

| Game | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Bonus life | 1,000 | 1,000 | 1,000 | 2,000 | 2,000 | 2,000 | - | - | - | 1,000 | 1,000 | 1,000 |
| Evil Otto | - | rebound | invincible | - | rebound | invincible | - | rebound | invincible | invincible | rebound | - |
| Robots shoot | yes | yes | yes | yes | yes | yes | yes | yes | yes | - | - | - |

## Build it

Needs the original 4K cartridge dump (MD5 `136f75c4dd02c29283752b7e5799f978`, any file name, or its
`.zip`) in `roms_port\`, plus the shared tools described in the top-level README. Then run `build.cmd`
in this folder.

## How it works

* **Same game code.** The 4K ROM is copied to `$F000` (RAM under the KERNAL) with a few patches
  (listed at the end of `c64/data.asm`): the game stops where the 2600 would draw a picture and hands
  control back once per frame, it doesn't touch the C64's `$00`/`$01` or its stack, and two spots
  that relied on the 2600's hardware are emulated. Everything else, all 12 games, the robots, Evil
  Otto and the scoring, is the original code.
* **Display** (`c64/`). Laid out line for line like the 2600 picture: one 2600 pixel = two C64
  pixels, one 2600 line = one C64 line. The maze is characters (each maze row is half a character);
  the humanoid, Evil Otto, robots, shots and the score line are sprites. Robots reuse four sprites
  down the screen with raster interrupts; frames are built in a second buffer and swapped at the top
  of the screen. The room-change effect switches to a blank character set above and below a window.
* **Collisions.** The 2600 learned about hits from its video chip while drawing, and its kernel
  saved them per robot as it went. The port works out the same pixel overlaps in software, quirks
  of the 2600's timing included (a robot drawn 3 pixels late, shots updated part-way across a line,
  walls rewritten before a line ends, the humanoid's last rows at the bottom exit), and hands the
  results to the game in the form the hardware would have.
* **Sound.** The game's TIA sound registers are translated to SID voices 1 and 2.
* **Speed.** The 2600 game runs 60 frames/s. On a PAL C64 (50 Hz) the logic runs 6 times every
  5 frames, so the game plays at the original speed.

## How it was checked

| Tool | What |
|---|---|
| `tools/model.js` | A model of what the 2600 kernel draws, built only from RAM; matches the 2600 (`tools/vcs.js`) pixel for pixel, collisions included, over tens of thousands of frames of random play in all game types, heading for every exit |
| `tools/lockstep.js` | Runs the C64 version's game logic (the patched program plus the collision code) on a 6502 next to the original, with the same inputs: the game RAM must be identical every frame. Also profiles the cycles. |
| `tools/screencheck.js` | Draws the C64 frame from what the C64 code set up (characters, sprites, raster schedule) and compares it with the 2600's picture |
| `tools/c64test.js`, `tools/c64seq.js` | Play tests and screenshots in VICE |
| `tools/watch.js`, `tools/geometry.js`, `tools/run.js` | Watching RAM and positions in the 2600 emulator |

## Differences from the 2600

* Colours are approximated from the 2600 NTSC palette to the C64's 16.
* TIA sounds are approximated on the SID.
* With flicker off (key 6), the humanoid and Evil Otto are both shown every frame.
* A few 2600 drawing quirks are copied for the collisions but not drawn: the humanoid's shape
  "smearing" down the screen when its last row isn't blank, two pixels of wall drawn a line early,
  and part of a line of the robot shot.
* On PAL, every fifth frame runs two game steps, so movement has a slight rhythm to it.
