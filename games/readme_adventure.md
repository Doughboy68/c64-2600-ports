# Adventure: Atari 2600 → Commodore 64

A port of Atari's 1980 *Adventure* cartridge (programmed by Warren Robinett) to the C64. The
original 2600 program runs (almost) unchanged on the C64's 6510; new C64 code takes over
everything the 2600's hardware did: the display, collision detection, controls and sound.

Version 1.1: on the web builder (<https://doughboy68.github.io/c64-2600-ports/>), which builds it from your own ROM.

## Play it

The C64 version is `build\adventure-1.1.prg`, also on the disk image `build\adventure-1.1.d64`.
On a real C64: `LOAD"ADVENTURE",8` then `RUN`. Type `LIST` first to see the credits and controls.

## Controls

| Action | Keys | Joystick |
|---|---|---|
| Move (8 directions) | **W A S D** | port 2 (or port 1) |
| Drop what you carry (you pick things up by touching them) | **Space** | fire button |

| Console | Key |
|---|---|
| Start a game (Game Reset); during a game it brings you back to life in front of the gold castle; fire on the game number screen also starts one | **F1** |
| Power off and on (back to game 1) | **F2** |
| Game Select (games 1-3, on the game number screen) | **F3** |
| Colour / black and white | **F5** |
| Left difficulty: B, the dragons hesitate before they bite; A, they don't | **F7** |
| Right difficulty: A, the dragons run from the sword | **F8** |
| Flicker on / off: on, the objects in a crowded room take turns as on the 2600; off, they are all shown at once | **F** |

The three games (from the original manual): 1 is the small kingdom, with the gold key in view
and the chalice in the black castle; 2 is the full kingdom with the catacombs and three castles;
3 is game 2 with the objects and dragons in random places.

## Build it

Needs the original 4K cartridge dump (USA, MD5 `157bddb7192754a45372be196797f284`, any file name,
or its `.zip`) in `roms_port\`, plus the shared tools described in the top-level README. Then run
`build.cmd` in this folder.

The European (PAL) cartridge differs from the USA one in 43 bytes only: its frame timer values,
a few movement speeds (made faster for 50 frames a second) and the room colours. The C64 version
uses the USA program and keeps the 2600's speed on a PAL C64 itself (below), so it plays the
same on both.

## How it works

* **Same game code.** The 4K ROM is copied to `$F000` (RAM under the KERNAL) with three patches
  (listed at the end of `c64/data.asm`): the kernel becomes a jump to our code, the wait for
  vertical sync returns at once (its writes to `$00`/`$01` would remap the C64's memory), and the
  start-up `SEI` goes. Adventure's main loop takes three frames per pass and calls the kernel as
  a subroutine three times, so the game runs as a coroutine with a stack of its own: each tick
  switches to it and back where it calls the kernel.
* **Display** (`c64/render.asm`). One 2600 pixel = two C64 pixels, one 2600 line = one C64 line.
  The rooms are multicolour characters: one playfield block is exactly one character, so the 40
  columns line up with the C64 screen. Every room's characters are made at start-up. The thin side
  walls (the 2600's missiles) are in the characters too, in their own colour. Objects and the
  player's square are sprites (double width; double height, as the 2600 draws each row twice),
  in the 2600's priority order; tall objects (the author's name) reuse sprites down the screen,
  and objects crossing the right edge come back at the left as on the 2600. The dark mazes' light
  around the player is a plain 32 x 64 pixel block behind the walls, so it is drawn in the
  characters. Every object shape's sprite images are made at start-up. Frames are built in a
  second buffer (screen, characters, sprites) and swapped at the end of the picture.
* **Flicker off** (key F). The 2600 shows two objects a frame and takes turns when a room has
  more. With flicker off the C64 adds the room's other objects as well, each laid out as the kernel
  would draw it, behind the two the game shows this frame. Eight sprites go a long way but not
  always all the way (the bridge alone takes four): an object that doesn't fit takes its turns as on
  the 2600. On the first frame in a new room the extra objects wait a frame (there is no time
  left then). The game itself, and its collisions, are the 2600's either way.
* **Collisions** (`c64/kernel.asm`). The 2600 learned about hits from its video chip while
  drawing. The port works out what the kernel would have drawn (which rows of each object on
  which lines, the ball, the playfield rows) and the six collisions the game reads (the player
  with the walls, the thin walls and each object; the two objects with each other), quirks of the
  2600's timing included: the square left over on the top line, the last line's players cut off at
  pixel 37, a player's last row repeated when its drawing stops early, double and quad width
  players starting a pixel late.
* **Sound.** The game's TIA sound registers are translated to the SID.
* **Speed.** The 2600 game runs 60 frames/s. On a PAL C64 (50 Hz) the logic runs 6 times every
  5 frames, so the game plays at the original speed. Each object shown stays for three 2600
  frames (the game changes its objects once a pass), so on PAL every object still shows.

## How it was checked

| Tool | What |
|---|---|
| `tools/model.js` | A model of what the 2600 kernel draws and of every collision the game reads, built only from RAM; matches `tools/vcs.js` pixel for pixel over tens of thousands of frames of random play in random rooms |
| `tools/lockstep.js` | Runs the C64 version's game logic (the patched program plus the kernel code) on a 6502 next to the original, with the same inputs: the game RAM must be identical every frame, and the collision bits the model's. Also profiles the cycles. |
| `tools/screencheck.js` | Draws the C64 frame from what the C64 code set up (characters, sprites, raster schedule, the VIC's sprite restart rule) and compares it with the 2600's picture; with `--noflicker`, with the room's other objects added |
| `tools/vicecheck.js` | A VICE screenshot compared with the simulated C64 picture (PAL and NTSC) |
| `tools/c64late.js` | Timing in VICE, PAL and NTSC (flicker on or off): passes, late passes, frames shown twice, sprite reuses too late |
| `tools/c64test.js` | Play test and screenshots in VICE (`--crowd`: a crowded room, flicker on and off) |
| `tools/trace.js` | Finds where the C64 code crashes (the last instructions; `--watch` for a memory address) |
| `tools/run.js`, `tools/tables.js`, `tools/shapes.js`, `tools/mkhpos.js` | Running the 2600 emulator; the object and room tables; the sprite images made at start-up; where the kernel's positioning puts things |

`tools/play.js` gives the tests their random play (`--teleport` jumps to random rooms, `--every=N`
to every room in turn).

## Differences from the 2600

* Colours are approximated from the 2600 NTSC palette to the C64's 16 (the light grey background,
  white castle and black and white walls kept apart).
* TIA sounds are approximated on the SID.
* Line 193, which the 2600 blanks except for its first 4 pixels, isn't shown.
