# Asteroids: Atari 2600 → Commodore 64

A port of Atari's 1981 *Asteroids* cartridge (programmed by Brad Stewart) to the C64. The
original 2600 program runs (almost) unchanged on the C64's 6510; new C64 code takes over
everything the 2600's hardware did: the display, the controls and the sound.

## Play it

The C64 version is `build\asteroids-1.3.prg`, also on the disk image `build\asteroids-1.3.d64`.
On a real C64: `LOAD"ASTEROIDS",8` then `RUN`. Type `LIST` first to see the credits and controls.

## Controls

| Action | Keys | Joystick |
|---|---|---|
| Turn left / right | **A** / **D** | left / right |
| Thrust | **W** | up |
| Hyperspace, shields or flip (depends on the game) | **S** | down |
| Fire | **Space** | fire button |

Player 1 uses a joystick in port 2, player 2 (two-player games) one in port 1; the keys work
for whoever's turn it is.

| Console | Key |
|---|---|
| Start a game (Game Reset); fire also starts one | **F1** |
| Power off and on (back to the copyright screen and game 1) | **F2** |
| Game Select (games 1-66) | **F3** |
| Colour / black and white | **F5** |
| Left / right difficulty (A: UFOs and satellites for that player) | **F7** / **F8** |
| The asteroids and the ship take turns on screen like on the 2600 (flicker) on / off | **F** |

The games (from the original manual): 1-33 for one player, 34-65 for two (taking turns), 66
for children. Each comes with hyperspace, shields, flip (a 180° turn) or no special feature
(down on the joystick), slow or fast asteroids, and an extra ship every 5,000, 10,000 or
20,000 points, or none. Large asteroids score 20, medium 50, small 100; satellites 200, UFOs
1,000. The players start with four ships.

## Build it

Needs the original 8K cartridge dump (MD5 `dd7884b4f93cab423ac471aa1935e3df`, the "Asteroids
(Japan, USA)" dump, any file name, or its `.zip`) in `roms_port\`, plus the shared tools
described in the top-level README. Then run `build.cmd` in this folder.

## How it works

* **Same game code.** The cartridge is 8K: two 4K banks, switched by touching `$1FF8`/`$1FF9`
  (F8 bank switching), always through a little stub that then jumps through `$F7`. Bank 0 is
  written to run at `$D000` and bank 1 at `$F000`, so on the C64 both are simply copied there
  (bank 0 into the RAM under the I/O area) and the stub's switch is left out: a bank switch is
  just the game's own `JMP ($F7)`. The game runs with all RAM visible; the C64's interrupts
  switch the I/O in while they run. Other patches (listed at the end of `c64/data.asm`): the
  game stops where the 2600 would draw a picture and hands control back once per frame, and it
  doesn't touch the C64's `$00`/`$01`, its stack or its interrupts. Everything else, all 66
  games, the asteroids, the UFO and satellite, scoring and sound effects, is the original code.
* **No collision registers.** Asteroids works out every hit itself (it never reads the TIA's
  collision registers), so the picture is all the C64 code has to reproduce.
* **Display** (`c64/`). Laid out line for line like the 2600 picture: one 2600 pixel = two C64
  pixels, one 2600 line = one C64 line. The asteroids, the ship and the UFO are sprites; the
  score band and the shots are multicolour characters (one multicolour pixel is exactly one 2600
  pixel). The 2600 draws the asteroids with two "threads" of kernel code, player 0 and player 1
  on alternate lines, each moving its asteroid sideways row by row with HMOVE and switching
  between single and double width: each of the eight shapes becomes one sprite image, made at
  start-up from the game's own graphics. Sprites are reused down the screen with raster
  interrupts; frames are built in a second buffer and swapped at the top of the screen.
* **Quirks kept.** The black HMOVE bars (the first 8 pixels of every line of the field are
  black on the 2600), objects wrapping round the screen's edges (and hiding in those 8 pixels),
  asteroids half above the top, two playfield timing quirks on the score band's last line.
* **Sound.** The game's TIA sound registers are translated to SID voices 1 and 2.
* **Speed.** The 2600 game runs 60 frames/s. On a PAL C64 (50 Hz) the logic runs 6 times every
  5 frames, so the game plays at the original speed.

## How it was checked

| Tool | What |
|---|---|
| `tools/model.js` | A model of what the 2600 kernels draw, built only from RAM; matches the 2600 (`tools/vcs.js`) pixel for pixel, objects and colours, over 80,000 frames of random play (UFOs and satellites, the ship wrapping round, asteroids half off the top, game over) |
| `tools/lockstep.js` | Runs the C64 version's game ticks (the patched program plus the capture code) on a 6502 next to the original, with the same inputs: the game RAM must be identical every frame. `--power=N` tries F2 at frame N; `--profile` counts the cycles |
| `tools/screencheck.js` | Draws the C64 frame from what the C64 code set up (characters, sprites, the raster schedule, the VIC's sprite reuse rule) and compares it with the 2600's picture, in C64 colours; `--noflicker` checks the combined frame |
| `tools/inputtest.js` | The controls, on an emulated keyboard and joysticks |
| `tools/c64test.js`, `tools/c64late.js` | Play tests and screenshots in VICE; time per frame on PAL and NTSC |
| `tools/coverage.js`, `tools/mirrors.js` | Finding the code the disassembler can't trace (bank switches, the kernel's computed jumps); checking that no game code reads the other bank's addresses |
| `tools/play.js` | The checks' random player |

## Differences from the 2600

* Colours are approximated from the 2600 NTSC palette to the C64's 16.
* TIA sounds are approximated on the SID.
* With flicker off (key F), the asteroids and the ship, UFO and shots are all shown every frame.
* Where the UFO's shot crosses the UFO, the shot is drawn in front (on the 2600 the UFO covers
  it): the C64's two multicolour colours can't follow all of the 2600's priorities.
* Where the background colour changes (game over), the 2600 changes it a few lines into the
  frame, the C64 for the whole frame.
* On PAL, every fifth frame runs two game steps, so movement has a slight rhythm to it, and with
  flicker on, the asteroids and the ship don't quite alternate evenly.
