# Megamania: Atari 2600 → Commodore 64

A port of Activision's 1982 *Megamania* cartridge (programmed by Steve Cartwright) to the C64.
The original 2600 program runs (almost) unchanged on the C64's 6510; new C64 code takes over
everything the 2600's hardware did: the display, the collisions, the controls and the sound.

## Play it

The C64 version is `build\megamania-1.0.prg`, also on the disk image `build\megamania-1.0.d64`.
On a real C64: `LOAD"MEGAMANIA",8` then `RUN`. Type `LIST` first to see the credits and controls.

## Controls

| Action | Keys | Joystick |
|---|---|---|
| Move left / right | **A** / **D** | left / right |
| Fire | **Space** | fire button |

Player 1 uses a joystick in port 2, player 2 (two-player games) one in port 1; the keys work
for whoever's turn it is.

| Console | Key |
|---|---|
| Start a game (Game Reset); fire also starts one | **F1** |
| Power off and on (back to the copyright screen and game 1) | **F2** |
| Game Select (games 1-4) | **F3** |
| Colour / black and white | **F5** |
| Left / right difficulty (A: a slower laser, for that player) | **F7** / **F8** |

Games 1 and 3 are for one player, 2 and 4 for two (taking turns); in games 1 and 2 the laser
follows the ship as it moves and holding fire keeps firing, in 3 and 4 it goes straight up.
Megamania doesn't flicker, so there is no flicker key.

## Build it

Needs the original 4K cartridge dump (MD5 `318a9d6dda791268df92d72679914ac3`, any file name, or
its `.zip`) in `roms_port\`, plus the shared tools described in the top-level README. Then run
`build.cmd` in this folder. `2600\megamania.asm` (made by `tools\disasm.js` from
`2600\symbols.js`, with the RAM map in `2600\RAM-MAP.md`) rebuilds the exact ROM.

## How it works

* **Same game code.** A plain 4K cartridge: the program is copied to `$F000`, where it was
  written to run, in the RAM under the C64's KERNAL. Patches (listed in `c64/data.asm`): no
  `SEI` at power-on, the RAM clear kept out of the C64's zero page, the VSYNC / VBLANK writes
  moved off `$00`/`$01`, the delay before positioning an object left out, and the game hands
  over where the 2600 would draw the picture. All the waves, the enemies' movement, the energy,
  scoring and sound effects are the original code.
* **Collisions.** Megamania reads the TIA's collision registers (the laser against each row of
  enemies, a bomb or an enemy against the ship), so the C64 works them out from RAM, by the rules
  of `tools/c64ref.js`: the kernel's line counter, where each register write lands on its line,
  the players' copies (NUSIZ), the HMOVE comb, the bombs copied with their players inside the
  rows. Then it leaves the RAM the kernel would have left.
* **Display** (`c64/`). Laid out line for line like the 2600 picture: one 2600 pixel is one
  multicolour pixel (two C64 pixels), one 2600 line one C64 line. A multicolour bitmap: the bombs,
  the middle row of enemies (three-row waves), the energy bar, ships left, score and logo; the
  other rows of enemies, the ship and the laser are X-expanded sprites, moved down the screen by
  raster interrupts (in three-row waves a bomb below the rows is a sprite too). The middle row is drawn by generated store code (one per buffer), patched as
  the enemies move. There are three buffers (VIC banks 1, 2 and 0): one shown, one waiting, one
  being drawn, so a slow frame can borrow time from quick ones. Each buffer remembers what it
  shows and only what changed is drawn again.
* **Quirks kept.** The HMOVE comb (the first 8 pixels of every line black, hiding what's there,
  colliding with nothing), bombs wrapping round the kernel's 8-bit test near the bottom, the
  laser cut off part way along line 169, a bomb hiding behind player 0.
* **Sound.** The game's TIA sound registers are translated to SID voices 1 and 2 (Stargate's
  mapping of the TIA's circuits).
* **Speed.** The 2600 game runs 60 frames/s. On a PAL C64 (50 Hz) the logic runs 6 times every
  5 frames, so the game plays at the original speed.

## How it was checked

| Tool | What |
|---|---|
| `tools/model.js` | A model of what the 2600 kernel draws and its collisions, built only from RAM; matches the 2600 (`tools/vcs.js`) pixel for pixel, quirks included, over 12,000+ frames of random play |
| `tools/c64ref.js` | The C64 version's rules for the collisions and the bombs' pixels, in JavaScript, checked against the model |
| `tools/lockstep.js` | Runs the C64 version's game ticks (the patched program plus the collision code) on a 6502 next to the original, with the same inputs: the game RAM must be identical every frame (0 differences over thousands of frames, waves 0-14). `--profile`, `--slow`, `--slowsum` count the cycles |
| `tools/screencheck.js` | Draws the C64 frame from what the C64 code set up (bitmap, screen, colour RAM, sprites moved by the raster events, the VIC's sprite reuse rule) in all three buffers and compares it with the 2600's picture, in C64 colours (0 differences) |
| `tools/c64run.js` | The whole C64 program with its raster interrupt on the 6502 core: crash checks |
| `tools/c64test.js`, `tools/c64late.js` | Play tests and screenshots in VICE (`--c64c`: checked for grey dots with `tools/greydots.js`; none), F1 / F2; frames shown and late on PAL and NTSC, `--from` for later waves |
| `tools/stellacheck.js` | `tools/vcs.js`'s picture against Stella's (the same inputs in Stella's debugger, snapshots compared line by line): found the logo's pixel 28, which vcs.js gets wrong |
| `tools/play.js` | The checks' random player |

Timing in VICE (3600 ticks of the self-playing game, waves 0-5 and 6-11): no late sprite moves;
on PAL no frame shows the last picture again, on NTSC 0.1-0.2% (a few frames in busy three-row
waves).

## Differences from the 2600

* Colours are approximated from the 2600 NTSC palette to the C64's 16.
* TIA sounds are approximated on the SID (not yet compared by ear).
* The colours in the C64's colour RAM (the enemies', the energy bar's gaps, the logo's first
  line) are shared by the buffers, so when they change they show a frame or two early.
* Now and then, in a busy three-row wave, a picture is skipped (the last one shown again); the
  game itself keeps its speed.
* On PAL, every fifth frame runs two game steps, so movement has a slight rhythm to it.
