// Pure helpers for luora-export.mjs: keccak256, ABI decoding, solc source maps.
// No dependencies (Node's crypto has no keccak256, and spawning `cast` per signature is slow).

// ---------- keccak256 (Keccak-f[1600], 64-bit lanes as BigInt) ----------
const M64 = (1n << 64n) - 1n;
const RC = [], PI = [], ROT = [];
for (let r = 0, R = 1n, x = 1, y = 0; r < 24; r++) {
  [x, y] = [y, (2 * x + 3 * y) % 5];
  PI.push(5 * y + x);
  ROT.push(BigInt((((r + 1) * (r + 2)) / 2) % 64));
  let t = 0n;
  for (let j = 0; j < 7; j++) {
    R = ((R << 1n) ^ ((R >> 7n) * 0x71n)) % 256n;
    if (R & 2n) t ^= 1n << ((1n << BigInt(j)) - 1n);
  }
  RC.push(t);
}
const rotl = (v, n) => (n ? ((v << n) | (v >> (64n - n))) & M64 : v);

function keccakF(s) {
  const C = new Array(5);
  for (let r = 0; r < 24; r++) {
    for (let x = 0; x < 5; x++) C[x] = s[x] ^ s[x + 5] ^ s[x + 10] ^ s[x + 15] ^ s[x + 20];
    for (let x = 0; x < 5; x++) {
      const D = C[(x + 4) % 5] ^ rotl(C[(x + 1) % 5], 1n);
      for (let y = 0; y < 25; y += 5) s[x + y] ^= D;
    }
    let cur = s[1];
    for (let t = 0; t < 24; t++) { const tmp = s[PI[t]]; s[PI[t]] = rotl(cur, ROT[t]); cur = tmp; }
    for (let y = 0; y < 25; y += 5) {
      const row = s.slice(y, y + 5);
      for (let x = 0; x < 5; x++) s[y + x] = row[x] ^ (~row[(x + 1) % 5] & M64 & row[(x + 2) % 5]);
    }
    s[0] ^= RC[r];
  }
}

/** keccak256 of a UTF-8 string → 0x-prefixed hex. */
export function keccak256(str) {
  const msg = Buffer.from(str, 'utf8'), rate = 136;
  const buf = Buffer.alloc(Math.ceil((msg.length + 1) / rate) * rate);
  msg.copy(buf);
  buf[msg.length] ^= 0x01;
  buf[buf.length - 1] ^= 0x80;
  const s = new Array(25).fill(0n);
  for (let off = 0; off < buf.length; off += rate) {
    for (let i = 0; i < rate / 8; i++) s[i] ^= buf.readBigUInt64LE(off + 8 * i);
    keccakF(s);
  }
  const out = Buffer.alloc(32);
  for (let i = 0; i < 4; i++) out.writeBigUInt64LE(s[i], 8 * i);
  return '0x' + out.toString('hex');
}

// ---------- ABI ----------
export const typeOf = p => (p.type.startsWith('tuple') ? `(${p.components.map(typeOf).join(',')})${p.type.slice(5)}` : p.type);
export const sig = it => `${it.name}(${it.inputs.map(typeOf).join(',')})`;

export const word = (hex, i) => hex.slice(i * 64, i * 64 + 64);
export function fmtWord(type, w) {
  if (!w || w.length < 64) return '?';
  if (type === 'address') return '0x' + w.slice(24);
  if (type === 'bool') return BigInt('0x' + w) ? 'true' : 'false';
  if (/^uint/.test(type)) return BigInt('0x' + w).toString();
  if (/^int/.test(type)) { let v = BigInt('0x' + w); if (v >> 255n) v -= 1n << 256n; return v.toString(); }
  if (/^bytes\d+$/.test(type)) return '0x' + w.slice(0, 2 * +type.slice(5));
  return '…';
}

const ARR = /\[(\d*)\]$/;
const elem = p => ({ ...p, type: p.type.replace(ARR, '') });
const isDyn = p => {
  const m = p.type.match(ARR);
  if (m) return m[1] === '' || isDyn(elem(p));
  if (p.type === 'tuple') return p.components.some(isDyn);
  return p.type === 'string' || p.type === 'bytes';
};
/** Words a static value occupies in the head (dynamic values: one offset word). */
const headWords = p => {
  if (isDyn(p)) return 1;
  const m = p.type.match(ARR);
  if (m) return +m[1] * headWords(elem(p));
  if (p.type === 'tuple') return p.components.reduce((n, c) => n + headWords(c), 0);
  return 1;
};
const num = (hex, i) => {
  const w = word(hex, i);
  if (w.length < 64) throw new Error('short');
  const n = Number(BigInt('0x' + w));
  if (n > hex.length) throw new Error('bad offset/length');
  return n;
};

function decodeVal(p, hex, fmt) {
  const m = p.type.match(ARR);
  if (m) {
    const len = m[1] === '' ? num(hex, 0) : +m[1];
    return `[${decodeSeq(Array(len).fill(elem(p)), m[1] === '' ? hex.slice(64) : hex, fmt).join(', ')}]`;
  }
  if (p.type === 'tuple') return `(${decodeSeq(p.components, hex, fmt).join(', ')})`;
  if (p.type === 'string' || p.type === 'bytes') {
    const b = hex.slice(64, 64 + 2 * num(hex, 0));
    return p.type === 'string' ? JSON.stringify(Buffer.from(b, 'hex').toString()) : '0x' + b;
  }
  return fmt(p.type, fmtWord(p.type, word(hex, 0)));
}

/** Head/tail decode of a parameter list; `hex` starts at the encoding's base. */
function decodeSeq(params, hex, fmt) {
  let w = 0;
  return params.map(p => {
    const v = isDyn(p) ? decodeVal(p, hex.slice(2 * num(hex, w)), fmt) : decodeVal(p, hex.slice(w * 64), fmt);
    w += headWords(p);
    return v;
  });
}

/** Decode ABI params (static + dynamic: string, bytes, arrays, tuples); `fmt(type, value)` prettifies leaves. */
export function decodeParams(params, hex, fmt = (_, v) => v) {
  try { return decodeSeq(params, hex.replace(/^0x/, ''), fmt); }
  catch { return params.map(() => '?'); }
}

/** Revert data → readable reason: Error(string), Panic(uint256), or "revert". */
export function revertReason(out) {
  out = out.replace(/^0x/, '');
  if (out.startsWith('08c379a0')) { const [s] = decodeParams([{ type: 'string' }], out.slice(8)); return s === '?' ? 'revert' : JSON.parse(s); }
  if (out.startsWith('4e487b71')) return `Panic(0x${BigInt('0x' + (word(out.slice(8), 0) || '0')).toString(16)})`;
  return 'revert';
}

// ---------- source maps ----------
/** Compressed solc source map → [offset, length, fileId] per instruction. */
export function parseSourceMap(sm) {
  const out = [];
  let prev = [0, 0, -1];
  for (const e of sm.split(';')) {
    const parts = e.split(':'), cur = [...prev];
    for (let i = 0; i < 3; i++) if (parts[i]) cur[i] = +parts[i];
    out.push(cur);
    prev = cur;
  }
  return out;
}

/** pc → instruction index (PUSH1..PUSH32 carry immediates). */
export function pcToIc(code) {
  code = code.replace(/^0x/, '');
  const ic = new Int32Array(code.length / 2).fill(-1);
  for (let pc = 0, i = 0; pc < ic.length; i++) {
    ic[pc] = i;
    const op = parseInt(code.substr(pc * 2, 2), 16);
    pc += 1 + (op >= 0x60 && op <= 0x7f ? op - 0x5f : 0);
  }
  return ic;
}

/** Byte offset → 1-based line for a source file. */
export function lineIndex(src) {
  const buf = Buffer.from(src, 'utf8'), starts = [0];
  for (let i = 0; i < buf.length; i++) if (buf[i] === 10) starts.push(i + 1);
  return off => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= off) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
}

/** Drop ranges that strictly contain another hit range (contract/function/block wrappers). */
export function innermost(ranges) {
  // ponytail: O(n²) over distinct ranges per frame; sort + sweep if frames get huge.
  return ranges.filter(([f, s, l]) => !ranges.some(([f2, s2, l2]) => f2 === f && s2 >= s && s2 + l2 <= s + l && (s2 !== s || l2 !== l)));
}
