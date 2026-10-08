# Pitfall!: Atari 2600 → Commodore 64

A port of Activision's 1982 *Pitfall!* cartridge (programmed by David Crane) to the C64. The
original 2600 program runs (almost) unchanged on the C64's 6510; new C64 code takes over
everything the 2600's hardware did: the display, collision detection, controls and sound.

## Play it

The C64 version is `build\pitfall-1.0.prg`, also on the disk image `build\pitfall-1.0.d64`.
On a real C64: `LOAD"PITFALL",8` then `RUN`. Type `LIST` first to see the credits and controls.

## Controls

| Action | Keys | Joystick |
|---|---|---|
| Run left / right | **A** / **D** | port 2 (or port 1) |
| Climb a ladder up / down, go down a ladder's hole; let go of a vine | **W** / **S** | up / down |
| Jump (over logs, holes, crocodiles; onto a vine) | **Space** | fire button |

| Console | Key |
|---|---|
| Start a game (Game Reset); the joystick, fire or a key starts the one waiting too | **F1** |
| Power off and on | **F2** |
| Colour / black and white | **F5** |

F3 (Game Select), F7 and F8 (difficulties) are the standard keys; Pitfall! doesn't use those
switches. Once a game is over (no lives left, time up), fire starts a new one.

## Build it

Needs the original 4K cartridge dump (MD5 `3e90cf23106f2e08b2781e41299de556`, any file name, or
its `.zip`) in `roms_port\`, plus the shared tools described in the top-level README. Then run
`build.cmd` in this folder.

## How it works

* **Same game code.** The 4K ROM (a plain 4K cartridge, no bank switching) is copied to `$F000`
  with a few patches (listed at the end of `c64/data.asm`): the game stops where the 2600 would
  draw a picture and hands control back once per frame, the RAM clear leaves the C64's zero page
  alone, and the reads of the 2600's hardware (timer, collision latches) get what the C64 code
  works out. Everything else, the 255 rooms, the treasures, the clock and the scoring, is the
  original code.
* **The kernel, modelled.** `tools/model.js` draws what the 2600 kernel draws from the game's RAM
  alone, quirks included: the vine's position stepped line by line, Harry's rows written part-way
  across lines 106-126 (when depends on the vine's step), the vertical delay from line 127, line
  152 split at pixel 34, line 170 at pixel 40, the HMOVE bars. The C64 code (`c64/collide.asm`)
  works out Harry's lines and the collisions the same way and hands them to the game in the form
  the 2600's video chip would have.
* **Display** (`c64/render.asm`). Laid out line for line like the 2600 picture: one 2600 pixel = two
  C64 pixels, one 2600 line = one C64 line. The playfield (canopy, trees, ground, pits, holes,
  ladder, wall's background) is multicolour characters; Harry is up to five sprites, one per run of
  lines of one colour; the vine is three X-expanded sprites, reused at line 143 for the objects on
  the ground (logs, fire, snakes, crocodiles, treasures) and two of them again at line 174 for the
  tunnel's wall or scorpion. Raster interrupts change the colours where the 2600's do (in the
  border, or where the colour being written doesn't show: no grey dots on a C64C).
* **Three buffers.** Each picture is drawn into one of three buffers (screen, character set,
  sprite blocks) while another is shown and the third waits; the main loop works a frame ahead,
  so a slow frame is absorbed by the one already waiting. Sprite blocks (Harry, the objects, the
  tunnel, the vine) are pools of sets matched by what they were drawn for: a shape drawn once is
  shown from any buffer. The renderer runs at `$8000` (copied there at start).
* **Sound.** The game's TIA sound registers are translated to SID voices.
* **Speed.** The 2600 game runs 60 frames/s. On a PAL C64 (50 Hz) the logic runs 6 times every
  5 frames, so the game plays at the original speed.

## How it was checked

| Tool | What |
|---|---|
| `tools/disasm.js`, `2600/symbols.js` | The disassembly (`2600/pitfall.asm`, `RAM-MAP.md`) rebuilds the exact ROM |
| `tools/model.js` | A model of the 2600 kernel's picture and collisions from RAM; matches the 2600 (`tools/vcs.js`) pixel for pixel |
| `tools/lockstep.js` | Runs the C64 version's game logic (the patched program plus the collision code) on a 6502 next to the original, with the same inputs: the game RAM (and the collision latch the game reads) must be identical every frame. `--drop`, `--hop`: Harry dropped high up, sent through rooms; `--profile`, `--budget`: where the cycles go |
| `tools/screencheck.js` | Draws the C64 frame from what the C64 code set up (characters, sprites with the VIC's rule for reusing them, the raster schedule) and compares it with the 2600's picture |
| `tools/inputtest.js` | The controls on an emulated keyboard and joysticks |
| `tools/c64test.js` | Play test and screenshots in VICE (PAL / NTSC, `--c64c` for the grey-dot check with `tools/greydots.js`), F1 and F2 |
| `tools/c64late.js`, `tools/autoprof.js` | Timing in VICE: the build plays by itself (the same game every time, from power on) and counts frames shown without a new picture; `autoprof.js` plays the same game in the simulator and shows what the slow frames spent their time on |

## Differences from the 2600

* Colours are approximated from the 2600 NTSC palette to the C64's 16.
* TIA sounds are approximated on the SID.
* When a lot changes at once, mostly on entering a room, the C64 shows a picture for an extra
  frame now and then (the game itself keeps its speed). Measured with the self-playing test over
  3,600 frames (it often changes rooms and swings on vines): 3.9% of frames on PAL, 5.4% on NTSC.
