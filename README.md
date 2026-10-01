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
| `index.html` | the page |
| `builder-core.js` | ROM check (MD5), `.zip` reading, `.prg` and `.d64` building |
| `games/games.js` | the list of profiles to load |
| `games/<id>.js` | one profile per game |

## Adding a game

In the development repository, describe the port in a small JSON file (see
`src/web/space-invaders.json`) and run

```bash
node tools/mkprofile.js src/web/<game>.json
```

It writes `games/<id>.js` and adds it to `games/games.js`. It refuses to write a profile
that doesn't rebuild the exact `.prg`. Copy both files here (or this whole folder) and publish.

## Hosting on GitHub Pages

Put the contents of this folder at the root of a public repository, then in the repository's
**Settings → Pages** choose *Deploy from a branch*, branch `main`, folder `/ (root)`.
The page also works opened straight from disk.
