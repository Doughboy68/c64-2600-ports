# Demon Attack: Atari 2600 → Commodore 64

A port of Imagic's 1982 *Demon Attack* cartridge (programmed by Rob Fulop) to the C64. The
original 2600 program runs (almost) unchanged on the C64's 6510; new C64 code takes over
everything the 2600's hardware did: the display, collision detection, controls and sound.

Version 1.1: on the web builder (<https://doughboy68.github.io/c64-2600-ports/>), which builds it from your own ROM.

## Play it

The C64 version is `build\demonattack-c64.prg`, also on the disk image `build\demonattack-c64.d64`.
On a real C64: `LOAD"DEMON ATTACK",8` then `RUN`. Type `LIST` first to see the credits and controls.

| Action | Keys | Joystick |
|---|---|---|
| Move the laser cannon | **A D** | port 2 (player 2 in a two-player game: port 1) |
| Fire | **Space** | fire button |

| Console | Key |
|---|---|
| Start a game (Game Reset); fire also starts one | **F1** |
| Power off and on (back to game 1, no score) | **F2** |
| Game Select | **F3** |
| Left / right difficulty switch | **F7** / **F8** |

F5 (colour / black and white) and 6 (flicker) are the standard keys of our ports; Demon Attack
doesn't read the colour switch and doesn't flicker, so they do nothing here.

The games and difficulty switches are as in the
[original manual](https://atariage.com/manual_html_page.php?SystemID=2600&SoftwareID=974&itemTypeID=HTMLMANUAL):
one and two players, tracer shots (the laser follows the cannon), harder demons, and co-operative
games where the players take turns at the cannon.

## Build it

Needs the original 4K cartridge dump (MD5 `b12a7f63787a6bb08e683837a8ed3f18`, "Demon Attack (USA)
(Rev 1)", any file name, or its `.zip`) in `roms_port\`, plus the shared tools described in the
top-level README. Then run `build.cmd` in this folder.

The cartridge is a plain 4K ROM (no bank switching). `2600\demonattack.asm` is a disassembly that
rebuilds it byte for byte (`build.cmd` checks this), with the RAM map in `2600\RAM-MAP.md`.

## How it works

* **Same game code.** Imagic assembled the game at `$1000`, so the 4K ROM is copied there (rather
  than `$F000`) with a few patches (listed in `c64/image.asm`): the game stops where the 2600 would
  draw a picture and hands control back once per frame, and it leaves the C64's `$00`/`$01` and its
  stack alone; and one small helper (a score byte's digit pointers) is done by table, leaving
  exactly what the original leaves. Everything else (all the games, the demons, the scoring, the
  sounds' timing) is the original code.
* **Display** (`c64/render.asm`). Laid out line for line like the 2600 picture: one 2600 pixel = two
  C64 pixels, one 2600 line = one C64 line. Demons are sprite pairs; the 2600 changes their colour
  every line, so a raster interrupt does too, each line's colour going into the register the line
  before doesn't use (that also gives the 2600's "previous colour" pixels left of where it writes
  the colour). A demon split in two, its halves too far apart for one pair, gets a pair for each
  half when the sprites allow it (a sprite can start again only 22 lines after its last start:
  each picture works out which band, top to bottom, goes on which pair, and where the pairs move
  down); both pairs then take the same colours, the interrupt writing two registers a line.
  When only one pair is free, the left half goes on it and the right half is characters.
  Demons too wide for that (split ones the sprites can't take, materializing four times as wide)
  are multicolour characters; each cell of a materializing demon has a pair of characters of its own
  (one above the other), so its eight lines are eight bytes in a row, copied from lines worked
  out at the start for the shapes materializing demons use (16 bytes a cell, as the pairs are, so
  one loop with one index does all of a demon half's cells). Score and bunkers are
  characters, the laser, cannon and bullets sprites;
  the ground's colours change line by line (two registers taking turns, like the demons'). Frames
  are built in a second buffer and swapped at the top of the screen.
* **Collisions** (`c64/collide.asm`). The 2600 learned about hits from its video chip while drawing,
  and the kernel read some of them part-way down the screen. The port works out the same pixel
  overlaps in software, quirks of the 2600's timing included (graphics and colours written part-way
  along a line, the laser's enable landing late, a reflection switched off part-way across the
  explosion's last line), and hands the game the values it would have read.
* **Sound** (`c64/sound.asm`). The game's TIA sound registers are translated to SID voices 1 and 2.
* **Speed.** The game logic runs 60 times a second as on the 2600 (on PAL: 6 game steps every 5
  frames). Drawing takes what time is left; when a picture isn't finished in time, the game steps
  still all run and the next picture catches up (see below). On NTSC, while a finished picture
  waits for the top of the screen, the next game step runs early.

## How it was checked

| Tool | What |
|---|---|
| `tools/model.js` | A model of what the 2600 kernel draws, built only from RAM; matches the 2600 (`tools/vcs.js`) pixel for pixel, colours and collisions included, over tens of thousands of frames of random play (with a cheat mode that jumps to random waves) |
| `tools/lockstep.js` | Runs the C64 version's game logic (the patched program plus the collision code) on a 6502 next to the original, with the same inputs: the game RAM must be identical every frame (`--power`: with F2 power cycles). Also profiles the cycles. |
| `tools/screencheck.js` | Draws the C64 frame from what the C64 code set up (characters, sprites, the raster schedule and the cycle each colour write lands on) and compares it with the 2600's picture, pixel for pixel |
| `tools/c64run.js` | The whole C64 program with a model of the VIC's timing (bad lines, sprite fetches, raster interrupts), PAL or NTSC: how often a picture is ready, per-pass costs, profiles (`--tickinput`: the inputs go in at each game step, so every version plays the same game) |
| `tools/c64test.js` | Play test and screenshots in VICE, with the same timing counters (pictures per frame) |
| `tools/vicecheck.js` | Stops VICE at the end of frames, saves its screen and the C64's memory, and compares what VICE shows with the picture that memory should give (`tools/c64picture.js`, as `screencheck.js` draws it): catches what only real timing gets wrong (`--cheat`: the later waves) |
| `tools/bench.js` | Pictures per frame from `c64run.js --tickinput` over 48 random games, PAL and NTSC, run in parallel (about half a minute), to compare versions |
| `tools/inputtest.js` | The joysticks, keys and console keys against the 2600 ports the game reads |
| `tools/run.js`, `tools/look.js`, `tools/play.js` | Running the 2600 emulator, pictures, the random player |

## Differences from the 2600

* Colours are approximated from the 2600 NTSC palette to the C64's 16.
* TIA sounds are approximated on the SID.
* Not every picture is drawn in time: game steps are never skipped, but when a picture takes too
  long the C64 shows the next one instead. About 95% of frames get a new picture on PAL and 92-93%
  on NTSC (the timing model over 48 games); in the later waves, with demons splitting in two and
  diving, about 90% and 87% (version 1.0: 84% and 81%, before split demons were sprites).
* VICE's screen matches the model of the C64's picture in most frames; now and then a few demon
  pixels on a few lines show the previous line's colour (a colour write landing late).
