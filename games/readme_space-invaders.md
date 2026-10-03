# Space Invaders: Atari 2600 → Commodore 64

A port of Atari's 1980 *Space Invaders* cartridge to the C64. The original 2600 program
runs (almost) unchanged on the C64's 6510; new C64 code takes over everything the 2600's
hardware did: the display, collision detection, controls and sound.

## Play it

The finished game is in `build\spaceinvaders-c64.prg` and on the disk image
`build\spaceinvaders-c64.d64`. Open either in VICE (e.g. drag it onto the `x64sc` window).
On a real C64: `LOAD"SPACE INVADERS",8` then `RUN`. Type `LIST` before `RUN` to see the
title, credits and controls.

## Build it

Needs the original 4K cartridge dump (MD5 `72ffbef6504b75e69ee1045af9075f66`, any file name, or its
`.zip`) in `roms_port\`, plus the shared tools described in the top-level README. Then run `build.cmd`
in this folder.

| Action | Player 1 | Player 2 |
|---|---|---|
| Move | **A** / **D** (W/S unused by the game) | **J** / **L** (I/K unused) |
| Fire | **Space** | **Return** |
| Joystick | port 2 | port 1 |

| 2600 switch | C64 key |
|---|---|
| Game Reset (start a game) | **F1** |
| Power off and on (back to game 1, no score) | **F2** |
| Game Select (pick one of 112 games) | **F3** |
| Colour / B&W | **F5** (toggle) |
| Left / right difficulty (A = wide cannon) | **F7** / **F8** (toggle) |

| C64 extra | Key |
|---|---|
| Start a game when none is running (the 2600 needs Game Reset) | **Space**, **Return** or either joystick's fire button |
| Shot flicker on / off (on = like the 2600, lasers and bombs on alternate frames) | **6** (toggle) |

## How it works

* **Same game code.** The 4K ROM is copied to `$F000` (RAM under the KERNAL). Three `JMP`s are
  patched in (`$F4CF`, `$F50C`, `$FA43`) so it skips the 2600's timer waits and video sync and
  hands control back once per frame. Everything else, including the rules, scoring, all 112
  game variations, invader speed-up, UFO, and two-player modes, is the original code.
* **Hardware stand-ins.** The game's TIA register writes land harmlessly in zero page
  `$02-$2C`; its joystick/switch/timer reads (`$0280-$0284`) hit plain RAM that the C64 code
  fills in from the keyboard and joysticks each frame.
* **Display** (`c64/main.asm`). Laid out line-for-line like the 2600 picture: one 2600
  pixel = two C64 pixels (160 → 320), one 2600 line = one C64 line. Invaders and shields are
  custom characters regenerated from the game's own graphics; cannons, UFO, lasers, bombs
  and explosions are hardware sprites.
* **Collisions.** The 2600 learned about hits from its video chip while drawing. The port
  computes the same pixel overlaps in software and hands the results to the game in the
  form the TIA would have.
* **Sound.** The game's TIA sound registers are translated to SID voices 1 and 2.
* **Speed.** The 2600 game runs 60 frames/s. On a PAL C64 (50 Hz) the logic runs 6 times every
  5 frames, so the game plays at the original speed.

## Files

| Path | What |
|---|---|
| `2600/spaceinvaders.asm` | Disassembled 2600 source, rebuilds the exact original ROM (generated) |
| `2600/symbols.js` | Names and notes for the game's RAM and routines → the source and RAM map |
| `2600/RAM-MAP.md` | What every byte of the 2600 game's RAM means, plus its routines (generated) |
| `c64/main.asm` | The C64 port |
| `c64/tables.inc` | Generated tables (colours, SID frequencies); `tools/mkc64tables.js` |
| `tools/fit.js`, `tools/geometry.js` | Measure where the 2600 draws everything |
| `tools/collcheck.js` | Checks the port's software collisions against the 2600's, frame by frame |
| `tools/c64test.js` | Scripted play test in VICE through its remote monitor |
| `build/` | The finished `.prg` and `.d64` (kept in git); everything else there is temporary |

## Differences from the 2600

* Shot flicker (lasers and bombs on alternate frames, as the 2600 draws them) is on by default;
  key 6 turns it off. On PAL it runs at 25 Hz instead of the 2600's 30 Hz.
* Colours are approximated from the 2600 NTSC palette to the C64's 16.
* TIA sounds are approximated on the SID.
* On PAL, every fifth frame runs two game steps, so movement has a slight rhythm to it.
* A joystick held in port 1 hides some keys while held (the C64 keyboard shares those lines).
* The 2600 draws shots with irregular line spacing in the cannon rows; the port copies that
  pattern exactly so bombs hit your cannon exactly when they would on the 2600
  (checked frame by frame with `tools/collcheck.js`).
