// C64 port builder: turns a user's own Atari 2600 ROM into a C64 .prg and .d64.
// Each game is a "profile" (games/<id>.js) holding the finished C64 program with
// every byte of the original game blanked, plus where the ROM's bytes go back in.
// So no original game code is ever stored here. Runs in browsers and in Node.

const Builder = (() => {
  const games = [];

  // ---------------------------------------------------------------- MD5
  function md5(bytes) {
    const K = new Uint32Array(64), S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
    const len = bytes.length, total = ((len + 8) >> 6) + 1, M = new Uint32Array(total * 16);
    for (let i = 0; i < len; i++) M[i >> 2] |= bytes[i] << ((i % 4) * 8);
    M[len >> 2] |= 0x80 << ((len % 4) * 8);
    M[total * 16 - 2] = (len * 8) >>> 0;
    M[total * 16 - 1] = Math.floor(len / 2 ** 29);
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let blk = 0; blk < total * 16; blk += 16) {
      let a = a0, b = b0, c = c0, d = d0;
      for (let i = 0; i < 64; i++) {
        let f, g;
        if (i < 16) { f = (b & c) | (~b & d); g = i; }
        else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
        else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
        else { f = c ^ (b | ~d); g = (7 * i) % 16; }
        const tmp = d; d = c; c = b;
        const x = (a + f + K[i] + M[blk + g]) >>> 0, s = S[(i >> 4) * 4 + (i % 4)];
        b = (b + ((x << s) | (x >>> (32 - s)))) >>> 0;
        a = tmp;
      }
      a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
    }
    return [a0, b0, c0, d0].map(v => [0, 8, 16, 24].map(s => ((v >>> s) & 255).toString(16).padStart(2, '0')).join('')).join('');
  }

  // ---------------------------------------------------------------- ZIP
  // [{name, data}] for every stored or deflated file in a .zip
  async function unzip(bytes) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), out = [];
    let p = 0;
    while (p + 30 <= bytes.length && dv.getUint32(p, true) === 0x04034b50) {
      const flags = dv.getUint16(p + 6, true), method = dv.getUint16(p + 8, true);
      let csize = dv.getUint32(p + 18, true);
      const nlen = dv.getUint16(p + 26, true), xlen = dv.getUint16(p + 28, true);
      const name = new TextDecoder().decode(bytes.subarray(p + 30, p + 30 + nlen));
      const start = p + 30 + nlen + xlen;
      if (flags & 8) {          // sizes in a trailing data descriptor: find the next header
        let q = start;
        while (q + 4 <= bytes.length && dv.getUint32(q, true) !== 0x04034b50 && dv.getUint32(q, true) !== 0x02014b50) q++;
        csize = q - start - (dv.getUint32(q - 16, true) === 0x08074b50 ? 16 : 12);
      }
      const raw = bytes.subarray(start, start + csize);
      if (method === 0) out.push({ name, data: raw.slice() });
      else if (method === 8) {
        const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        out.push({ name, data: new Uint8Array(await new Response(stream).arrayBuffer()) });
      }
      p = start + csize + (flags & 8 ? 16 : 0);
    }
    return out;
  }

  // ---------------------------------------------------------------- games
  function addGame(g) {
    g.templateBytes = Uint8Array.from(atob(g.template), c => c.charCodeAt(0));
    games.push(g);
  }

  // Which game is this file (a ROM, or a .zip holding one)? -> {game, rom} or null
  async function identify(bytes) {
    const match = data => { const h = md5(data); return games.find(g => g.md5 === h); };
    let g = match(bytes);
    if (g) return { game: g, rom: bytes };
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
      for (const f of await unzip(bytes)) { g = match(f.data); if (g) return { game: g, rom: f.data }; }
    }
    return null;
  }

  // Put the ROM's bytes back into the template: segments are [romStart, prgOffset, length]
  function buildPrg(game, rom) {
    const out = game.templateBytes.slice();
    for (const [r, p, n] of game.segments) out.set(rom.subarray(r, r + n), p);
    return out;
  }

  // ---------------------------------------------------------------- D64
  // A standard 35-track 1541 disk holding one PRG file
  function buildD64(file, fileName, diskName, diskId) {
    const spt = t => t <= 17 ? 21 : t <= 24 ? 19 : t <= 30 ? 18 : 17;
    const tracks = 35, off = [];
    let o = 0;
    for (let t = 1; t <= tracks; t++) { off[t] = o; o += spt(t) * 256; }
    const img = new Uint8Array(o);
    const used = Array.from({ length: tracks + 1 }, (_, t) => new Uint8Array(t ? spt(t) : 0));
    const at = (t, s) => off[t] + s * 256;
    const petscii = (str, n) => { const b = new Uint8Array(n).fill(0xa0); for (let i = 0; i < Math.min(n, str.length); i++) b[i] = str.toUpperCase().charCodeAt(i); return b; };

    // allocate like the 1541 does: tracks outward from the directory, 10-sector interleave
    const order = [];
    for (let t = 17; t >= 1; t--) order.push(t);
    for (let t = 19; t <= tracks; t++) order.push(t);
    const chain = [], blocks = Math.ceil(file.length / 254);
    let ti = 0, s = 0;
    while (chain.length < blocks) {
      if (ti >= order.length) throw new Error('the program does not fit on a disk');
      const t = order[ti], n = spt(t);
      let tries = 0;
      while (used[t][s] && tries < n) { s = (s + 1) % n; tries++; }
      if (used[t][s]) { ti++; s = 0; continue; }
      used[t][s] = 1; chain.push([t, s]);
      s = (s + 10) % n;
      if (used[t].every(Boolean)) { ti++; s = 0; }
    }
    chain.forEach(([t, s], i) => {
      const p = at(t, s), part = file.subarray(i * 254, (i + 1) * 254);
      if (i + 1 < chain.length) { img[p] = chain[i + 1][0]; img[p + 1] = chain[i + 1][1]; }
      else { img[p] = 0; img[p + 1] = part.length + 1; }
      img.set(part, p + 2);
    });

    used[18][0] = used[18][1] = 1;                // directory: track 18 sector 1
    const dir = at(18, 1);
    img[dir] = 0; img[dir + 1] = 0xff;
    img[dir + 2] = 0x82;                          // closed PRG
    img[dir + 3] = chain[0][0]; img[dir + 4] = chain[0][1];
    img.set(petscii(fileName, 16), dir + 5);
    img[dir + 30] = blocks & 255; img[dir + 31] = blocks >> 8;

    const bam = at(18, 0);                        // block availability map: track 18 sector 0
    img[bam] = 18; img[bam + 1] = 1; img[bam + 2] = 0x41;
    for (let t = 1; t <= tracks; t++) {
      let free = 0, bits = 0;
      for (let k = 0; k < spt(t); k++) if (!used[t][k]) { free++; bits |= 1 << k; }
      const e = bam + 4 * t;
      img[e] = free; img[e + 1] = bits & 255; img[e + 2] = (bits >> 8) & 255; img[e + 3] = (bits >> 16) & 255;
    }
    img.set(petscii(diskName, 16), bam + 0x90);
    img[bam + 0xa0] = img[bam + 0xa1] = 0xa0;
    img.set(petscii(diskId, 2), bam + 0xa2);
    img[bam + 0xa4] = 0xa0;
    img[bam + 0xa5] = 0x32; img[bam + 0xa6] = 0x41;     // DOS type "2A"
    img[bam + 0xa7] = img[bam + 0xa8] = img[bam + 0xa9] = img[bam + 0xaa] = 0xa0;
    return img;
  }

  // ---------------------------------------------------------------- making profiles
  function toBase64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }

  // Turn a finished C64 port (.prg) and the ROM it was made from into a profile.
  // Every stretch of the .prg that is a copy of the ROM (8+ bytes, wherever and
  // however often it occurs) is blanked and recorded as [romStart, prgOffset,
  // length]. Runs of one repeated byte carry nothing of the game and are skipped.
  // -> {profile, ok (rebuilds the .prg exactly), blanked, romUsed}
  function makeProfile(prg, rom, meta) {
    const MIN = 8, key = (b, i) => (b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24) >>> 0;
    const idx = new Map();
    for (let i = 0; i + 4 <= rom.length; i++) {
      const k = key(rom, i);
      if (!idx.has(k)) idx.set(k, []);
      idx.get(k).push(i);
    }
    const segments = [];
    for (let p = 2; p + 4 <= prg.length;) {      // (skip the 2-byte load address)
      let best = 0, bestR = -1;
      for (const r of idx.get(key(prg, p)) || []) {
        let n = 0;
        while (r + n < rom.length && p + n < prg.length && rom[r + n] === prg[p + n]) n++;
        if (n > best) { best = n; bestR = r; }
      }
      let uniform = true;
      for (let i = 1; i < best && uniform; i++) if (prg[p + i] !== prg[p]) uniform = false;
      if (best >= MIN && !uniform) { segments.push([bestR, p, best]); p += best; } else p++;
    }
    const template = prg.slice();
    for (const [, p, n] of segments) template.fill(0, p, p + n);
    const profile = {
      id: meta.id, title: meta.title, system: meta.system, original: meta.original, port: meta.port,
      version: meta.version, romName: meta.romName, romSize: rom.length, md5: md5(rom),
      fileName: meta.fileName, prgName: meta.prgName, diskName: meta.diskName, diskId: meta.diskId,
      controls: meta.controls, segments, template: toBase64(template),
    };
    const rebuilt = buildPrg({ templateBytes: template, segments }, rom);
    const ok = rebuilt.length === prg.length && rebuilt.every((b, i) => b === prg[i]);
    const used = new Uint8Array(rom.length);
    for (const [r, , n] of segments) used.fill(1, r, r + n);
    return { profile, ok, blanked: segments.reduce((a, s) => a + s[2], 0), romUsed: used.reduce((a, b) => a + b, 0) };
  }

  // The text of a profile file (games/<id>.js)
  // The text of a profile file (games/<id>.json): plain data, never code. The
  // "about" field says what it is; every copy of the ROM's bytes is blanked.
  function profileSource(profile) {
    const about = `${profile.title} (${profile.system}) for the C64: builder profile. Contains no original game code: ` +
      `every copy of the ROM's bytes is blanked, and the user's ROM supplies them.`;
    return JSON.stringify({ about, ...profile }, null, 1) + '\n';
  }

  // Load the site's own profiles: games/index.json lists the files. Each is
  // checked like a dropped one. -> number loaded (throws if the list can't be read)
  async function loadHosted(base = 'games/') {
    const list = await (await fetch(base + 'index.json')).json();
    let n = 0;
    for (const file of list.games || []) {
      try {
        const { profile, error } = parseProfile(await (await fetch(base + file)).text());
        if (error) { console.warn(file + ': ' + error); continue; }
        addGame(profile); n++;
      } catch (e) { console.warn(file + ': ' + e.message); }
    }
    return n;
  }

  // The BASIC lines at the start of a .prg: [{num, text}] (REM and SYS spelled out)
  function parseBasic(prg) {
    const load = prg[0] | prg[1] << 8, lines = [];
    let p = 2;
    while (p + 4 < prg.length && lines.length < 100) {
      const next = prg[p] | prg[p + 1] << 8;
      if (!next) break;
      const num = prg[p + 2] | prg[p + 3] << 8;
      let q = p + 4, text = '';
      while (q < prg.length && prg[q]) {
        const c = prg[q++];
        text += c === 0x8f ? 'REM' : c === 0x9e ? 'SYS' : c === 0x99 ? 'PRINT' : c >= 32 && c < 127 ? String.fromCharCode(c) : '';
      }
      lines.push({ num, text });
      const np = next - load + 2;
      if (np <= p) break;
      p = np;
    }
    return lines;
  }

  // ---------------------------------------------------------------- profiles from files
  // A profile someone dropped on the page is read as data, never run: only the
  // object inside Builder.addGame(...) (or a bare JSON object) is parsed, then
  // every field is checked. -> {profile} or {error}
  function parseProfile(text) {
    let start = text.indexOf('Builder.addGame(');
    start = start >= 0 ? text.indexOf('{', start) : text.search(/\S/);
    if (start < 0 || text[start] !== '{') return { error: "this file doesn't contain a game profile" };
    let depth = 0, inStr = false, end = -1;              // find the object's closing brace
    for (let i = start; i < text.length && end < 0; i++) {
      const c = text[i];
      if (inStr) { if (c === '\\') i++; else if (c === '"') inStr = false; }
      else if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) end = i;
    }
    if (end < 0) return { error: 'the profile is incomplete' };
    let p;
    try { p = JSON.parse(text.slice(start, end + 1)); } catch (e) { return { error: 'the profile is damaged (' + e.message + ')' }; }
    const error = checkProfile(p);
    return error ? { error } : { profile: p };
  }

  function checkProfile(p) {
    const str = (v, max, re) => typeof v === 'string' && v.length > 0 && v.length <= max && (!re || re.test(v));
    const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
    if (!p || typeof p !== 'object' || Array.isArray(p)) return 'not a profile';
    if (!str(p.id, 40, /^[a-z0-9-]+$/)) return 'bad id';
    for (const k of ['title', 'system', 'original', 'port', 'version', 'romName']) if (!str(p[k], 200)) return 'missing or bad ' + k;
    if (!str(p.fileName, 40, /^[A-Za-z0-9._-]+$/)) return 'bad fileName';
    for (const k of ['prgName', 'diskName']) if (!str(p[k], 16, /^[\x20-\x5f\x61-\x7a]+$/)) return 'bad ' + k;
    if (!str(p.diskId, 2, /^[\x20-\x5f\x61-\x7a]+$/)) return 'bad diskId';
    if (!str(p.md5, 32, /^[0-9a-f]{32}$/)) return 'bad md5';
    if (!int(p.romSize, 1, 65536)) return 'bad romSize';
    if (p.controls !== undefined && !(Array.isArray(p.controls) && p.controls.length <= 50 &&
      p.controls.every(c => Array.isArray(c) && c.length === 2 && c.every(s => typeof s === 'string' && s.length <= 200)))) return 'bad controls';
    if (typeof p.template !== 'string' || p.template.length > 120000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(p.template)) return 'bad template';
    let t;
    try { t = atob(p.template); } catch { return 'bad template'; }
    if (t.length < 3 || t.length > 65538) return 'bad template size';
    if (!Array.isArray(p.segments) || p.segments.length > 20000) return 'bad segments';
    for (const s of p.segments) {
      if (!Array.isArray(s) || s.length < 3 || !int(s[0], 0, p.romSize - 1) || !int(s[2], 1, p.romSize) || s[0] + s[2] > p.romSize ||
        !int(s[1], 2, t.length - 1) || s[1] + s[2] > t.length) return 'bad segments';
    }
    return null;
  }

  return { games, md5, unzip, addGame, loadHosted, identify, buildPrg, buildD64, toBase64, makeProfile, profileSource, parseBasic, parseProfile, checkProfile };
})();

if (typeof module !== 'undefined') module.exports = Builder;
