// Licence: MIT (donor, Ikemen GO). Shape adapted from the mechanism; the byte layout here is ours, not a copy of the donor.
export {};

const SLOTS = 8;          // controller slots per logical tick (donor: MaxSimul * 2 with MaxSimul = 4)
const AXES = 6;
const SLOT_BYTES = 8;     // 2 bytes buttons (LE) + 6 signed axis bytes
const HEADER_BYTES = 14;  // version u16, seed i32, preMatchTime i32, tickCount u32
const FORMAT_VERSION = 2;

interface Slot { buttons: number; axes: number[]; }   // axes: 6 values, -128..127
type Tick = Slot[];                                    // SLOTS entries

function emptySlot(): Slot { return { buttons: 0, axes: [0, 0, 0, 0, 0, 0] }; }
function emptyTick(): Tick { return Array.from({ length: SLOTS }, emptySlot); }

function encodeSlot(s: Slot, v: DataView, off: number): void {
  v.setUint16(off, s.buttons & 0xffff, true);
  for (let i = 0; i < AXES; i++) {
    v.setInt8(off + 2 + i, Math.max(-128, Math.min(127, Math.trunc(s.axes[i] ?? 0))));
  }
}

function decodeSlot(v: DataView, off: number): Slot {
  const axes: number[] = [];
  for (let i = 0; i < AXES; i++) axes.push(v.getInt8(off + 2 + i));
  return { buttons: v.getUint16(off, true), axes };
}

export class Recorder {
  private ticks: Tick[] = [];
  constructor(private readonly seed: number, private readonly preMatchTime: number) {}

  // Only confirmed inputs go in. A gap is an error, not zero padding.
  record(tick: number, slots: Slot[]): void {
    if (tick !== this.ticks.length) {
      throw new Error(`replay gap: expected tick ${this.ticks.length}, got ${tick}`);
    }
    const frame = emptyTick();
    slots.slice(0, SLOTS).forEach((s, i) => { frame[i] = { buttons: s.buttons, axes: s.axes.slice(0, AXES) }; });
    this.ticks.push(frame);
  }

  toBytes(): Uint8Array {
    const buf = new Uint8Array(HEADER_BYTES + this.ticks.length * SLOTS * SLOT_BYTES);
    const v = new DataView(buf.buffer);
    v.setUint16(0, FORMAT_VERSION, true);
    v.setInt32(2, this.seed, true);
    v.setInt32(6, this.preMatchTime, true);
    v.setUint32(10, this.ticks.length, true);
    let off = HEADER_BYTES;
    for (const frame of this.ticks) {
      for (const s of frame) { encodeSlot(s, v, off); off += SLOT_BYTES; }
    }
    return buf;
  }
}

export class Player {
  readonly seed: number;
  readonly preMatchTime: number;
  private readonly v: DataView;
  private readonly total: number;
  private pos = 0;

  constructor(bytes: Uint8Array) {
    this.v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (this.v.getUint16(0, true) !== FORMAT_VERSION) throw new Error("replay format mismatch");
    this.seed = this.v.getInt32(2, true);
    this.preMatchTime = this.v.getInt32(6, true);
    this.total = this.v.getUint32(10, true);
  }

  // Called once per logical tick, not once per render frame. Null at end of record.
  nextTick(): Tick | null {
    if (this.pos >= this.total) return null;
    const base = HEADER_BYTES + this.pos * SLOTS * SLOT_BYTES;
    const frame: Tick = [];
    for (let i = 0; i < SLOTS; i++) frame.push(decodeSlot(this.v, base + i * SLOT_BYTES));
    this.pos++;
    return frame;
  }
}

// Donor seeds its match RNG from the file (Srand(seed)); a small LCG stands in here.
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
