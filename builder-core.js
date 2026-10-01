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

  // ---------------------------------------------------------------- matching
  // Each segment is [romStart, prgOffset, length, rollHash, md5]. The two hashes
  // fingerprint the bytes a port needs without containing them: the rolling hash
  // finds candidates anywhere in a ROM quickly, MD5 confirms them.
  const BASE = 0x01000193;
  function rollHash(bytes, start, n) {
    let h = 0;
    for (let i = 0; i < n; i++) h = (Math.imul(h, BASE) + bytes[start + i]) >>> 0;
    return h;
  }

  // Find every piece of `game` in `rom` (at the expected address first, then
  // anywhere). Returns the ROM position of each piece, or null if one is missing.
  function locatePieces(game, rom) {
    const segs = game.segments;
    if (!segs.length || segs[0].length < 5) return null;   // old profile without fingerprints
    const found = new Array(segs.length).fill(-1);
    const check = (k, at) => {
      const [, , n, rh, h] = segs[k];
      return at >= 0 && at + n <= rom.length && rollHash(rom, at, n) === rh && md5(rom.subarray(at, at + n)) === h;
    };
    const byLength = new Map();
    segs.forEach(([r, , n], k) => {
      if (check(k, r)) found[k] = r;
      else { if (!byLength.has(n)) byLength.set(n, []); byLength.get(n).push(k); }
    });
    for (const [n, ks] of byLength) {            // slide a window of each length over the ROM
      if (n > rom.length) return null;
      let pow = 1;
      for (let i = 1; i < n; i++) pow = Math.imul(pow, BASE) >>> 0;
      let h = rollHash(rom, 0, n);
      for (let at = 0; ; at++) {
        for (const k of ks) if (found[k] < 0 && h === segs[k][3] && md5(rom.subarray(at, at + n)) === segs[k][4]) found[k] = at;
        if (at + n >= rom.length) break;
        h = (Math.imul((h - Math.imul(rom[at], pow)) >>> 0, BASE) + rom[at + n]) >>> 0;
      }
      if (ks.some(k => found[k] < 0)) return null;
    }
    return found;
  }

  // Which game is this file (a ROM, or a .zip holding one)?
  // -> {game, rom, exact, at} or null. exact: the listed dump. Otherwise a
  // different dump that still holds every piece the port needs (at[k] = where).
  async function identify(bytes) {
    const candidates = [bytes];
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) for (const f of await unzip(bytes)) candidates.push(f.data);
    for (const data of candidates) {
      const h = md5(data), g = games.find(g => g.md5 === h);
      if (g) return { game: g, rom: data, exact: true };
    }
    for (const data of candidates) {
      if (data.length < 1024 || data.length > 65536) continue;
      for (const g of games) {
        const at = locatePieces(g, data);
        if (at) return { game: g, rom: data, exact: false, at };
      }
    }
    return null;
  }

  // Put the ROM's bytes back into the template. `at` (optional) says where each
  // piece sits in this particular ROM; by default, where it sits in the listed dump.
  function buildPrg(game, rom, at) {
    const out = game.templateBytes.slice();
    game.segments.forEach(([r, p, n], k) => {
      const from = at ? at[k] : r;
      out.set(rom.subarray(from, from + n), p);
    });
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

  return { games, md5, unzip, rollHash, addGame, identify, locatePieces, buildPrg, buildD64 };
})();

if (typeof module !== 'undefined') module.exports = Builder;
