# River Raid: Atari 2600 → Commodore 64

A port of Activision's 1982 *River Raid* cartridge (programmed by Carol Shaw) to the C64.
The original 2600 program runs (almost) unchanged on the C64's 6510; new C64 code takes over
everything the 2600's hardware did: the display, the collisions, the controls and the sound.

Version 1.0.

## Play it

The C64 version is `build\riverraid-1.0.prg`, also on the disk image `build\riverraid-1.0.d64`
and as an EasyFlash cartridge, `build\riverraid-1.0.crt`.
On a real C64: `LOAD"RIVER RAID",8` then `RUN`. Type `LIST` first to see the credits and controls.

## Controls

| Action | Keys | Joystick |
|---|---|---|
| Steer left / right | **A** / **D** | left / right |
| Speed up / slow down | **W** / **S** | up / down |
| Fire | **Space** | fire button |

Player 1 uses a joystick in port 2, player 2 (two-player game) one in port 1; the keys work
for whoever's turn it is.

| Console | Key |
|---|---|
| Start a game (Game Reset); fire also starts one | **F1** |
| Power off and on (back to the start: game 1, no score) | **F2** |
| Game Select (game 1: one player, game 2: two taking turns) | **F3** |
| Colour / black and white | **F5** |
| Left / right difficulty (A: the missiles fly straight; B: they can be steered) | **F7** / **F8** |

River Raid doesn't flicker, so there is no flicker key.

## Build it

Needs the original 4K cartridge dump (MD5 `393948436d1f4cc3192410bb918f9724`, any file name, or
its `.zip`) in `roms_port\`, plus the shared tools described in the top-level README. Then run
`build.cmd` in this folder. `2600\river-raid.asm` (made by `tools\disasm.js` from
`2600\symbols.js`, with the RAM map in `2600\RAM-MAP.md`) rebuilds the exact ROM.

## How it works

* **Same game code.** A plain 4K cartridge: the program is copied to `$F000`, where it was
  written to run, in the RAM under the C64's KERNAL. Patches (listed in `c64/data.asm`): no
  `SEI` at power-on, the RAM clear kept out of the C64's zero page, the VSYNC writes moved off
  `$00`, the delay before positioning an object left out, a 5-byte colour table read from a copy
  (its last two bytes are the NMI vector), and the game hands over where the 2600 would draw the
  picture. The river, the fuel, the enemies, scoring and the sound effects are the
  original code.
* **Collisions.** River Raid reads the TIA's collision latches between the river's blocks (the
  shot against an object and the banks, the plane against the banks and an object, the moving
  objects against the banks), so the C64 works them out from RAM by the rules of
  `tools/model.js`: which lines each block, object, the plane and the shot are drawn on, where on
  the line each latch is read and cleared. Only the lines that can matter are looked at (the shot's
  cell and an object near it, the land under the plane's three cells, the first hit in each latch
  window). Then it leaves the RAM the kernel would have left.
* **Display** (`c64/`). Laid out line for line like the 2600 picture: one 2600 pixel is one
  multicolour pixel (two C64 pixels), one 2600 line one C64 line.
  * The river is multicolour characters (a character is one playfield cell across, four of its
    two-line rows down) scrolled with the VIC's vertical scroll, on three screens taken in turn every eight lines
    of scroll; a character row is made once for its content and copied where it is needed, the
    next screen built ahead over the frames before it shows.
  * The banks' colour (roads, sections) is changed line by line by raster interrupts.
  * Each block's object is up to six multicolour sprites (four for its lines 6-26, two for
    27-29), made from the 2600's shapes and colours: the two colours most of its rows have are the
    sprites' shared ones, the others each a sprite's own. The images the game shows are made at
    start-up and kept; a raster interrupt two lines above each block runs that block's own short
    code, which moves the six sprites there.
  * The plane and the shot are sprites 0 and 1; the panel (score, fuel gauge) is fixed character
    rows, the ships left and the logo sprites 0 and 1 again.
  * There are three buffers (event lists, the objects' sprite code): one shown, one waiting, one
    being drawn, so a slow frame can borrow time from quick ones.
* **Quirks kept.** The HMOVE comb (the first 8 pixels of every line black), the shot shown in
  pairs of lines, an object's last line not drawn on the river's top line, double and quad width
  objects a pixel later than the others (as the real TIA).
* **Sound.** The game's TIA sound registers are translated to SID voices 1 and 2 (Stargate's
  mapping of the TIA's circuits).
* **Speed.** The 2600 game runs 60 frames/s. On a PAL C64 (50 Hz) the logic runs 6 times every
  5 frames, so the game plays at the original speed.

## How it was checked

| Tool | What |
|---|---|
| `tools/model.js`, `tools/modelcheck.js` | A model of what the 2600 kernel draws and its collisions, built only from RAM; matches the 2600 (`tools/vcs.js`) pixel for pixel and in its collisions |
| `tools/lockstep.js` | Runs the C64 version's game ticks (the patched program plus the collision code) on a 6502 next to the original, with the same inputs: the game RAM and the collisions must be identical every frame (0 differences, several seeds; `--bw`, `--diff=A`, `--power=F`). `--profile`, `--slow` count the cycles |
| `tools/screencheck.js` | Draws the C64 frame from what the C64 code set up (the characters with the VIC's badlines and scroll, the colour events, each block's sprite code run on the 6502, the VIC's sprite reuse rule, the panel and logo) and compares it with the 2600's picture in C64 colours. Left: a bridge's explosion has more colours than its sprites can show (one row, a few frames) |
| `tools/inputtest.js` | The joysticks, keys and F1-F8 against the 2600's ports and switches, with the C64's keyboard matrix simulated |
| `tools/c64run.js` | The self-playing game on the 6502 core: cycles per frame by routine |
| `tools/c64late.js` | Frames shown and late in VICE, PAL and NTSC, `--from` for later in the game, `--bw` |
| `tools/c64test.js` | Play tests and screenshots in VICE; `--power` (F1, F2); `--c64c` checked for grey dots with `tools/greydots.js` |
| `tools/c64irq.js` | The raster interrupt's lines in VICE (a `DBGLOG` build) |
| `tools/play.js` | The checks' player |

Timing in VICE (3600 ticks of the self-playing game, from ticks 300 and 3900): no late sprite
moves; on PAL no frame shows the last picture again, on NTSC 0-0.1% (a few frames where a road
crosses a busy stretch); in black and white NTSC up to 0.3% (the first time each object is seen,
its image is made then).

## Differences from the 2600

* Colours are approximated from the 2600 NTSC palette to the C64's 16; two chosen by hand: the
  land green (so the trees beside the houses, light green, show against it) and the road light
  grey (in black and white it stays white, apart from the land).
* TIA sounds are approximated on the SID.
* A bridge's explosion can show one colour fewer (its sprites can't hold them all).
* The logo is two lines higher (its last lines would be in the C64's bottom border).
* At one scroll position in eight the river is drawn one line higher for that frame (the C64's
  switch to the panel between lines 215 and 216 has no time there when sprites are at the bottom);
  when the river scrolls very slowly it can pause for a frame.
* On a C64C (8565 VIC) a one-pixel grey dot can show now and then where a bank colour changes near
  the bottom of the river, or on the panel's second line.
* Now and then a picture is skipped (the last one shown again), more on NTSC; the game itself
  keeps its speed.
* On PAL, every fifth frame runs two game steps, so movement has a slight rhythm to it.
