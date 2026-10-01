# Atari 2600 → C64 builder

A web page that turns your own Atari 2600 cartridge ROMs into Commodore 64 versions
(`.prg` and `.d64`). Open `index.html`, drop in a ROM (or its `.zip`), download the result.
Everything runs in the browser; nothing is uploaded.

This folder contains **no original game code**. Each game's profile in `games/` holds the
finished C64 program with every byte of the original ROM blanked out, plus a list of where
those bytes go back. The user's ROM, checked by MD5, fills them in.

## Files

| File | What |
|---|---|
| `index.html` | the builder page |
| `make-profile.html` | makes a profile from a finished C64 port and its ROM |
| `builder-core.js` | ROM check (MD5), `.zip` reading, `.prg` and `.d64` building, profile making |
| `games/games.js` | the list of profiles to load |
| `games/<id>.js` | one profile per game |

## Adding a game

1. Open `make-profile.html`, drop in the finished `.prg` and the ROM it was made from, check the
   details (filled in from the `.prg`'s BASIC lines), and download `<id>.js`. The page refuses
   to make a profile unless it rebuilds the `.prg` byte for byte and the ROM clearly matches.
2. Put `<id>.js` in `games/` and add it to the list in `games/games.js`
   (the maintainer's `publish.cmd` does this automatically).

Profiles are code that the builder page runs, so look over any you receive before adding them.

## Hosting on GitHub Pages

Put the contents of this folder at the root of a public repository, then in the repository's
**Settings → Pages** choose *Deploy from a branch*, branch `main`, folder `/ (root)`.
The page also works opened straight from disk.
