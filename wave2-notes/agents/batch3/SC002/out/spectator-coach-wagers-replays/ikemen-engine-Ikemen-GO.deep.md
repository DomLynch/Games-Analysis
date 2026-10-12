# ikemen-engine-Ikemen-GO (spectator-coach-wagers-replays, cell 1)

Donor: `/mnt/frankendom-donors/ikemen-engine-Ikemen-GO/src/netplay.go` (ReplayFile, replay writers), with `rollback.go`, `input.go`, `system.go` | Licence: MIT ("MIT License", LICENCE.txt; copyright lines from 2016 to 2019; code may be adapted) | Go | symbol `ReplayFile`

Checked: Read in full: `ReplayFile` and its Open/Synchronize/Update/readReplayInput (netplay.go 1104-1300), replay payload encoding (101-116), header and sync writers (663-669, 1040-1058), constants (24-33), rollback recording and SaveReplay (rollback.go 226-234, 576-660), replay input source (input.go 2661-2700), replay branch of the frame loop (system.go 1008-1062, 1251-1258, 1279-1290, 4029-4080 partial, 4150-4172, 4240-4252, 4465-4480), tick accumulator (system.go 2617-2672). Searched `src` for coach, spectator, wager, bet and observer: no coach, spectator or wager code exists in this donor; the only hits are replay and netplay. Confidence: high on the replay format and playback path; medium on the timing detail in section 1 step 5 (I did not trace every caller of `addFrameTime`). Not read: the GGPO backend (`rs.session.backend`), `SaveReplay` callers (rollback.go 173, 818, 832; system.go 566), the delay-netplay recording path beyond the header and sync writes, the motif Replay Info menu (motif.go 1061). camera_scope: not a camera cell.

Best transferable idea: Store only the server-confirmed input stream plus the match seed and pre-match time, then replay a fight by feeding those inputs back through the same engine, so a stored bout is re-run rather than re-recorded.

Decision (proposed): adapt - the record-inputs-not-state shape fits Pit replays as content and the server-verified kill ledger, but it works only if the fight sim is fully deterministic from seed plus inputs; Frankendom must also refuse to replay across a gap (the donor does not).

Acceptance: A server test re-runs a recorded 60-second duel from its stored seed and input log and asserts the same final HP, kill ledger and tick count as the live fight; a Pit viewer opening a stored bout sees the same result.

## 1. Mechanism

- Recording (rollback path). Each frame the rollback session asks the backend for confirmed inputs for that frame (rollback.go 226). If a recording is open, it stores the eight input slots for that frame (rollback.go 233-235; `RecordReplayFrame`, 588-607) and advances `netTime`. Slots are 4 players x 2 (`MaxSimul * 2`, `MaxSimul` = 4). Nothing is written to disk yet: frames sit in memory.
- File order (delay/rollback netplay). Header first: magic `IKRPLCFG`, format version (2), a length, and a JSON body with the sync settings and content fingerprint (netplay.go 1040-1058). Then the host's seed and pre-match time are exchanged, and both are written as a sync block: magic `IKRPLSYN`, int32 seed, int32 pmTime (663-669, 1104-1111). Then the frames.
- Writing. `SaveReplay` runs once (guarded by `replaySaved`, rollback.go 626-632) and writes `netTime` frames, each as eight 8-byte records: 2-byte little-endian buttons, then six signed axis bytes (640-657; 101-106). A frame gap is padded with zeros and logged (rollback.go 576-586). That padding is a defect (see section 6).
- Playback open. `OpenReplayFile` reads the header and rejects a sync-config version mismatch (netplay.go 1124-1148). The match calls `synchronize()`, which for a replay calls `ReplayFile.Synchronize` (system.go 1251-1258).
- Playback start. `Synchronize` reads the seed and pmTime, calls `Srand(seed)`, sets the pre-match time, then calls `Update` once to load the first chunk (netplay.go 1248-1265).
- Playback loop (per render frame). The frame loop calls `update()` first. In replay mode `update()` awaits one frame at the fixed rate, or a quarter of it (x4 fast-forward) while a hard button is down (system.go 1053-1056), then returns `ReplayFile.Update()` (1059). `Update` reads one chunk of eight records only when `sys.oldNextAddTime > 0` (netplay.go 1267-1300). Each controller then reads its slot through `inputRemap` (input.go 2687; netplay.go 1159-1162).
- Logical tick. Later in the same loop, `addFrameTime(s.turbo)` (system.go 4167) adds the turbo step to `tickCountF` and returns whether a logical tick happened (2654-2672). Render rate is 60 Hz in replay and rollback (system.go 4465-4472). At end of file the reader closes and the loop exits (4247).
- Caveat I could not close: in the donor, the input chunk is read per render frame (1059), while the logical tick is decided by `addFrameTime`. At 60 Hz with turbo 1 these coincide. I did not trace the turbo or pause paths far enough to say they always coincide (only that debug pause zeroes `oldNextAddTime`, 2656).

## 2. Key functions

- `ReplayFile.Synchronize`: `/mnt/frankendom-donors/ikemen-engine-Ikemen-GO/src/netplay.go` 1248-1265. Reads seed and pmTime, seeds the RNG, sets pre-match time, loads chunk 0.
- `ReplayFile.Update`: `/mnt/frankendom-donors/ikemen-engine-Ikemen-GO/src/netplay.go` 1267-1300. One chunk of eight records per call, gated by `oldNextAddTime > 0`; closes the file on EOF.
- `RollbackSession.RecordReplayFrame`: `/mnt/frankendom-donors/ikemen-engine-Ikemen-GO/src/rollback.go` 588-607. Clears the frame, then copies the eight slots.
- `RollbackSession.SaveReplay`: `/mnt/frankendom-donors/ikemen-engine-Ikemen-GO/src/rollback.go` 626-657. Writes all frames at once at the end.
- `System.update` replay branch: `/mnt/frankendom-donors/ikemen-engine-Ikemen-GO/src/system.go` 1053-1059. Pacing and hand-off to the reader.
- `System.addFrameTime`: `/mnt/frankendom-donors/ikemen-engine-Ikemen-GO/src/system.go` 2654-2672. Fixed-step accumulator for logical ticks.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A fight is a seed plus a per-tick input log; playback feeds the same log to the same sim | Eight slots per tick: `MaxSimul * 2`, `MaxSimul` = 4 (theirs, netplay.go 26 and system.go 28) |
| Fixed record size so frame N sits at a known byte offset | 8 bytes per slot: 2 buttons + 6 axes (theirs, netplay.go 27; packing 103-105) |
| Replay header with a version so old files are rejected | Format version 2 (theirs, netplay.go 30); sync config version 1 (`syncConfigVersion`, netplay.go 29) |
| Playback at the same rate as the live game | 60 Hz fixed (theirs, system.go 4469-4471); fast-forward x4 on a hard button (theirs, 1055) |
| Search for the sync block without trusting its offset | 64 MiB search limit (theirs, netplay.go 33) |
| Frame gap | Padded with zeros (theirs, rollback.go 581); see defects |

## 4. TypeScript sketch

simplified: the sketch uses its own byte layout (version, seed, pmTime, tick count, then 8 slots of 8 bytes) and omits the donor's JSON header, magic strings, strict/host sync-setting checks, content fingerprint, sync-marker search, EOF close and the fast-forward multiplier. It reads one record per logical tick (the donor reads per render frame; this is the fix). It throws on a frame gap instead of zero-padding (the donor's defect, fixed here). It stores all frames in memory like the donor; the write-as-you-go fix is in section 6. It takes already-confirmed slots and does not model the rollback backend.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/sc002-ikemen-replay.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/replay.ts` (new module): the Recorder (confirmed inputs per logical tick, seed and pre-match time in the header) and the Player (one record per tick, fed into the same `src/fight` step). Parity-checklist row 19 (fight record/replay).
- Pit: replay playback is a client mode of the same engine. The donor does the same (one loop, `replayFile` as an input source, input.go 2686-2687).
- Reuse tag: adapt-shape (MIT: code may be adapted; the sketch is written from the mechanism and does not copy donor lines)
- Brief rule served: 1 (one engine: replay re-runs the same sim from inputs); server-verified (only confirmed inputs are recorded)

## 6. Gaps and risks

- Determinism is the whole mechanism. A replay reproduces the fight only if `src/fight` draws every random number from the seeded RNG and reads no wall clock. The donor relies on `Srand(seed)` (netplay.go 1257) and a single RNG path; I did not audit the donor's sim for stray randomness, and Frankendom's sim must be checked the same way with a test.
- Server-verified kills: the donor stores inputs, not outcomes. A replay must re-derive the kill ledger by re-simulation; a kill list stored by a client is not evidence. Frankendom's ledger must be produced by the re-run, and a test should assert it.
- Defect 1, silent zero-padding of frame gaps (rollback.go 576-586): a missing confirmed frame becomes an all-zero input, which changes the fight with no error. Fix: throw and mark the replay invalid (the sketch does this).
- Defect 2, input read per render frame (netplay.go 1267-1271 via system.go 1059), not per logical tick. At 60 Hz these coincide; under turbo or pause they may not. Fix: read one record per logical tick (the sketch does this). Not run; suspected from reading only.
- Defect 3, all frames held in memory and written once at the end (`SaveReplay`, rollback.go 626-657). A crash mid-bout loses the whole replay. Fix: append each confirmed tick to the record as it lands (not built in the sketch).
- Fixed 60 Hz playback and x4 fast-forward are engine constants here. For Frankendom, the playback rate is a client setting; the record itself is rate-independent.
- No spectator, coach or wager code exists in this donor. Coach instructions mid-fight, live spectator feeds and Pit wagers are not covered by this note and need a different donor.
