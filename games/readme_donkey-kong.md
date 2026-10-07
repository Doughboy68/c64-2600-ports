# Donkey Kong: Atari 2600 → Commodore 64

A port of Coleco's 1982 *Donkey Kong* cartridge for the Atari 2600 (programmed by Garry Kitchen,
from Nintendo's arcade game) to the C64. The original 2600 program runs (almost) unchanged on the
C64's 6510; new C64 code takes over everything the 2600's hardware did: the display, collision
detection, the controls and the sound.

Version 1.1.

## Play it

The C64 version is `build\donkeykong-1.1.prg` (the version in its name), also on the disk image
`build\donkeykong-1.1.d64`. On a real C64: `LOAD"DONKEY KONG",8` then `RUN`. Type `LIST` first to
see the credits and controls.

## Controls

| Action | Keys | Joystick |
|---|---|---|
| Run, climb | **W A S D** | port 2 (or port 1) |
| Jump (over a barrel or a fireball, or up to the hammer) | **Space** | fire button |

| Console | Key |
|---|---|
| Start a game (Game Reset); fire also starts one, and a new one after a game over | **F1** |
| Power off and on | **F2** |

Get Mario to the top of the ramps past the rolling barrels, then take every rivet on the rivet
screen; the screens then alternate, faster each time. With the hammer, Mario smashes barrels and
fireballs (800 points). You have 3 Marios and a bonus that counts down from 5000.

Donkey Kong reads no other switch, and it doesn't flicker. After a game over the original
cartridge ignores the button until Game Reset; here the button presses Game Reset for you.

## Build it

Needs the original 4K cartridge dump (MD5 `36b20c427975760cb9cf4a47e41369e4`, any file name, or
its `.zip`) in `roms_port\`, plus the shared tools described in the top-level README. Then run
`build.cmd` in this folder.

## How it works

* **Same game code.** The 4K ROM is copied to `$F000` (RAM under the KERNAL) with seven small
  patches (listed in `c64/data.asm`): the game hands control back where it would draw the
  picture, and it keeps out of the C64's `$00`/`$01`, its stack and its zero page (the 2600's
  power-on and Game Reset clears included). Everything the game does, the barrels, the
  fireballs, Mario, the hammer, scoring and sound, is the original code.
* **Display.** A hires bitmap holds the girders, ladders, lives and score, drawn from the game's
  own tables when they change; Mario, Kong, Pauline, the hammer and the barrels are sprites, laid
  out line for line like the 2600 picture. The 2600 changes Mario's and Pauline's colours line by
  line; a raster interrupt does the same on the C64 (on a badline, at the end of the line before,
  where the VIC leaves the CPU no time). Colours are the nearest of the C64's 16 to each 2600
  colour.
* **Collisions.** What the 2600's TIA would have latched, worked out in software: Mario against
  the barrels, the hammer against Mario (picking it up), and the hammer's head against a barrel
  (smashing it), from the same rules as `tools/model.js`, which matches the 2600 pixel for pixel.
* **Full speed on PAL.** The cartridge was made for 60 Hz NTSC; on a 50 Hz PAL 2600 it runs
  (and sounds) a sixth slower. On a PAL C64 the port runs 6 game frames for every 5 screen
  frames, so the game, its music and its sound effects keep the original NTSC speed, and the
  SID pitch tables are made for each machine's clock (PAL and NTSC), so the notes are in tune
  on both.
* **Sound.** The game's sound registers go to the SID once a frame; a fading sound (the jump)
  lowers the SID's sustain level instead of restarting the note, so it fades without clicks.

## How it is checked

| Tool | What |
|---|---|
| `tools/model.js` | A model of what the 2600 kernel draws, built only from RAM: matches the 2600 (`tools/vcs.js`, real-TIA rules) pixel for pixel over tens of thousands of frames, both screens, collisions included |
| `tools/lockstep.js` | The C64 version's game ticks on a 6502 next to the original, with the same inputs: the game RAM and the collisions identical every frame (both screens, Game Reset and power cycles, `--hammer` for the hammer); it also stops if the 2600 code writes into the C64's zero page |
| `tools/screencheck.js` | The C64 frame (bitmap, sprites, colour events) against the 2600's picture: objects and colours |
| `tools/c64time.js` | In VICE: every frame drawn gets its picture, PAL and NTSC, and the main loop keeps up |
| `tools/c64colours.js` | In VICE: Mario's per-line colours on screen against what they should be, badlines included |
| `tools/c64test.js` | Play tests and screenshots in VICE |

Ported by Claude and Doughboy68.
