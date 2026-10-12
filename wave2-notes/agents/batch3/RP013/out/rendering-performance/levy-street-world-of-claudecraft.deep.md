# levy-street-world-of-claudecraft (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/background_gpu_queue.ts` (queue) with `src/render/gpu_prep_budget_core.ts` (per-frame budget) and `src/render/gpu_prep_admission.ts` (adapter) | Licence: MIT (read: LICENSE line 1 "MIT License", line 3 "Copyright (c) 2026 Levy Street") | TypeScript | symbols `createBackgroundGpuQueue`, `createGpuPrepBudget`, `createGpuPrepAdmission`

Checked: Read end to end: `background_gpu_queue.ts` header (1-80), priority and types (80-310), factory and constants (405-460), queue state and enqueue (460-640), detached tail and wake (647-690), selection (690-790), drain loop (790-890), enqueue and `noteFrame` (891-962). Read end to end: `gpu_prep_budget_core.ts` 25-140 (classes, config, defaults) and 140-434 (admission, EMA, headroom). `gpu_prep_admission.ts` 1-58 (whole file). Call sites: `renderer.ts` 1799-1801 and 9732-9750 (read) plus 4574 (grep only). Tier table: `gfx.ts` drop thresholds via grep (lines 392-452), tier names by line. Not read: `background_gpu_queue.ts` 962-1048 (stats readout); `chosen_cadence.ts` `chosenCadenceLoadMs` (so the unit of the frame-load reading is not verified); `arrival_cover.ts` (not read). Scope: client renderer only (WebGL prep), not a world camera note. Confidence: high on the queue order and the per-frame admission rules (read all of them); medium on the frame-load reading, which feeds the budget's frame average. Candidate files opened: 5 (queue, budget core, adapter, renderer call sites, gfx tier table).

## 1. Mechanism

- Every piece of WebGL preparation (shader compile links, texture and mesh uploads, zone prep) is a unit with a label and a priority. Units go into one queue. The queue runs one unit at a time (the serial slot). A unit that asks for a released tail can hand its async driver wait off and keep the slot, but at most `tailLimit` tails may be in flight at once (default 2, line 421). Only units with no tail may start when the cap is full (drain, 770-771).
- Order of steps, per frame and per arrival:
  (a) Frame boundary: the host calls `noteFrame` on the queue (renderer.ts 9741) and on the budget (renderer.ts 9747, with the tier drop threshold). The queue ages every refused unit by one frame (queue `noteFrame`, deferral loop, 945). The budget resets the frame's spend and its two per-frame slots (progress and first-sample), then folds the frame duration into an EMA (alpha 0.2, first sample sets the average).
  (b) Selection: candidates are walked highest priority first, FIFO within a priority (`outranks`, 691). For each, `admission.admit` is asked (745). A refused candidate is marked for this pass only (753), and the next candidate is asked. So a cheap lower-priority unit can run while an expensive higher-priority one waits. If every candidate is refused, the loop parks until the next frame or the next arrival.
  (c) Budget decision (`admit`, in this order, first match wins): actionable units always pass (367). A unit deferred at least 30 frames (approaching, visible, boot debt) or 240 frames (cosmetic) passes as `starvation` (369-371). Cosmetic units are refused while the governor is degrading (372). A visible or approaching unit whose cost is known, that does not fit the headroom, passes once per frame as `progress` (389-393). An unmeasured kind passes once per frame as `first-sample` (402). Otherwise a unit passes if its predicted cost fits the headroom (406).
  (d) Headroom: `floor = max(1.5 ms, 0.12 x frame average)`; `slice = max(floor, target - frame average) - spent this frame` (290-291). The target is the tier drop threshold (22, 24, 30 ms in the donor's tiers). A frame that already overruns still gets the floor, so preparation is never starved to zero.
  (e) Charge: after a unit runs, the adapter records its main-thread ms as the new cost of that kind (EMA alpha 0.3, line 348) and charges the frame (adapter 54-55). A second unit in the same frame sees the smaller headroom.
- Tick or timer: no timer. The budget runs on the host's frame clock. Between frames, the queue parks on a promise, not on a poll.

## 2. Key functions

- `createBackgroundGpuQueue` with its drain loop: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/background_gpu_queue.ts` 453-890 (queue state, drain, selection, tails). Frame aging: 926-962.
- `selectNext`: same file, 723-756. Refused candidates skipped per pass; admission asked in priority order.
- `createGpuPrepBudget`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/gpu_prep_budget_core.ts` 249-434. Headroom 289-292; cost ledger `record` 343; `admit` 355-410.
- `createGpuPrepAdmission`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/gpu_prep_admission.ts` 19-57. Maps label to cost kind (31), priority to class (32), charges the frame after a unit runs (54-55).
- Default config: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/gpu_prep_budget_core.ts` 131-139.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Per-frame headroom from a frame-time EMA and a target | Target = tier drop threshold: low 22, medium 24, high 22, ultra 30, insane 30 ms (`gfx.ts` 392 low, 406 medium, 420 high, 436 ultra, 452 insane; renderer.ts 1799 and 9747 pass it in). The 1000/60 default (132) is overridden |
| Floor so a slow frame still gets some prep | minimum slice 1.5 ms (133); overrun share 0.12 of the frame average (134) |
| Starvation bound: delay, never drop | 30 frames for visible and approaching (135); 240 frames for cosmetic (136) |
| Cost prior for an unmeasured kind | 4 ms (137) |
| Smoothing | cost EMA 0.3 (138); frame EMA 0.2 (139), lower because one GC frame must not shut the lane |
| Ledger bound | 64 kinds (81); beyond it a kind gets no slot (352) |
| Kind key | label prefix before `:`, cut at 48 characters (`gpu_prep_budget_core.ts`, `MAX_KIND_LENGTH`; not quoted) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order of rules (actionable, starvation, pressure, progress, first-sample, fits), the headroom formula, the EMA ledger with its cap, the one-progress and one-first-sample slots per frame, and the refuse-and-continue selection. It omits: the released-tail cap and the parking on tails; the arrival cover and the legacy kill switch; the frame-gap and stall statistics; the drop of a non-admitted unit's stats; the adapter's label-to-kind and priority-to-class mapping (the caller supplies `kind` and `cls`); the wake on an arrival (the sketch pumps on submit and on frame). It does not reorder any donor rule.

```ts
// Licence: MIT (donor, Levy Street 2026). This sketch is a re-expression of the mechanism, written fresh; it is not a copy of the donor lines.
// clean-room
type Cls = "actionable" | "visible" | "approaching" | "cosmetic";

interface Unit {
  label: string;
  kind: string;         // cost family, e.g. the label prefix before ':'
  cls: Cls;
  priority: number;     // higher starts first; FIFO within a priority
  run: () => number;    // runs the synchronous part, returns its main-thread ms
}

interface Pending extends Unit {
  seq: number;
  deferred: number;     // frames this unit has been refused
  refused: boolean;
}

export class FrameBudget {
  private frameEma: number;
  private frames = 0;
  private spent = 0;
  private progressUsed = false;
  private firstUsed = false;
  private degrading = false;
  private costs = new Map<string, number>(); // kind -> cost EMA in ms

  // target is the tier's drop threshold in ms; the donor passes a different value per quality tier
  constructor(
    private target: number,
    private minSlice = 1.5,
    private overrunShare = 0.12,
    private unknownCost = 4,
    private costAlpha = 0.3,
    private frameAlpha = 0.2,
    private maxDefer = 30,
    private cosmeticMaxDefer = 240,
    private maxKinds = 64,
  ) {
    this.frameEma = target; // no frame measured yet: assume the whole target is spent
  }

  noteFrame(frameMs: number): void {
    this.spent = 0;
    this.progressUsed = false;
    this.firstUsed = false;
    if (!Number.isFinite(frameMs) || frameMs < 0) return;
    this.frameEma = this.frames === 0 ? frameMs : this.frameEma + (frameMs - this.frameEma) * this.frameAlpha;
    this.frames++;
  }

  setPressure(on: boolean): void {
    this.degrading = on;
  }

  headroom(): number {
    const floor = Math.max(this.minSlice, this.frameEma * this.overrunShare);
    const slice = Math.max(floor, this.target - this.frameEma) - this.spent;
    return slice > 0 ? slice : 0;
  }

  record(kind: string, ms: number): void {
    const ema = this.costs.get(kind);
    if (ema !== undefined) {
      this.costs.set(kind, ema + (ms - ema) * this.costAlpha);
      return;
    }
    if (this.costs.size < this.maxKinds) this.costs.set(kind, ms);
  }

  spend(ms: number): void {
    if (Number.isFinite(ms) && ms > 0) this.spent += ms;
  }

  // ordered rules, first match wins (the donor's order, minus its arrival-cover and legacy switches)
  admit(u: Pending): boolean {
    if (u.cls === "actionable") return true;                       // never gated by budget
    const bound = u.cls === "cosmetic" ? this.cosmeticMaxDefer : this.maxDefer;
    if (u.deferred >= bound) return true;                          // starvation: delay, never drop
    if (u.cls === "cosmetic" && this.degrading) return false;      // pressure
    const known = this.costs.has(u.kind);
    const predicted = this.costs.get(u.kind) ?? this.unknownCost;
    if ((u.cls === "visible" || u.cls === "approaching") && !this.progressUsed && known
        && this.headroom() > 0 && predicted > this.headroom()) {
      this.progressUsed = true;                                    // one piece per frame, even if it does not fit
      return true;
    }
    if (!known) {
      if (this.firstUsed) return false;                            // one unmeasured kind per frame
      this.firstUsed = true;
      return true;
    }
    return predicted <= this.headroom();
  }
}

export class PrepQueue {
  private pending: Pending[] = [];
  private seq = 0;

  constructor(private budget: FrameBudget) {}

  submit(u: Unit): void {
    this.pending.push({ ...u, seq: this.seq++, deferred: 0, refused: false });
    this.pump();
  }

  // once per rendered frame, on the frame boundary
  onFrame(frameMs: number): void {
    this.budget.noteFrame(frameMs);
    for (const p of this.pending) if (p.refused) p.deferred++;
    this.pump();
  }

  // start the highest-priority unit the budget admits; a refused unit lets a lower one run
  private pump(): void {
    for (;;) {
      const order = [...this.pending].sort((a, b) => b.priority - a.priority || a.seq - b.seq);
      let next: Pending | undefined;
      for (const p of order) {
        if (this.budget.admit(p)) {
          next = p;
          break;
        }
        p.refused = true;
      }
      if (next === undefined) return; // park until the next frame or the next arrival
      this.pending.splice(this.pending.indexOf(next), 1);
      const ms = next.run();
      this.budget.record(next.kind, ms);
      this.budget.spend(ms);
    }
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/RP013-prep-budget.ts`: exit 0.

## 5. Lands in

- TARGET `origins/client/gpu-prep-budget.ts` (client renderer only; the engine never reads it). Parity-checklist row 16 (colour grade and quality: the tier drop threshold is the quality tier's frame target). Hint row 12 from the brief does not fit this mechanism (row 12 is combat sound cues), so row 16 is used.
- today: not read in Frankendom by this pass (no Frankendom file opened).
- Reuse tag: adapt-from-idea (MIT; adaptation allowed with the licence kept; this sketch is written fresh)
- Brief rule served: client-only rendering (the engine is untouched); zones as data (the tier table is data, not code); server-verified kills are not involved.

## 6. Gaps and risks

- MIT: code may be adapted. The sketch is written fresh, from the described rules.
- Defect (fix in the sketch: no): the cost ledger stops at 64 kinds (81, 352). A kind past the cap is never learned, so it is always priced at the 4 ms prior. Its units then compete for the one unmeasured-kind slot per frame, which is shared by all such kinds (402). Silent throughput loss for overflow kinds. Fix: keep the cap but evict the least-used kind, or report `kinds` overflow in the stats so a dropped kind is visible. The donor's bound is deliberate (unique labels cannot grow the map), so the fix keeps the bound.
- Defect (cosmetic, not in the sketch): the kind key is cut at 48 characters (`MAX_KIND_LENGTH`), so two families that share a 48-character prefix share one cost ledger. Fix: key on the full prefix before the first ':' and cap only the stored length, or hash the prefix.
- Units are charged by the renderer's frame-load reading (renderer.ts 9747 via `frameLoadMs`), not by the wall frame. `chosenCadenceLoadMs` was not read, so the unit of that reading is unverified. Frankendom must feed one clock to both the queue and the budget or the average and the spend disagree.
- Frame-gap accounting (background_gpu_queue.ts header paragraph from line 33; `widenFrameGap` at 545): a unit is charged the longest span with no frame, which says which unit overlapped a slow frame, but the header states it cannot prove cause. Keep it as a diagnostic, not a gate.
- The starvation bound (30 and 240 frames) counts frames, not milliseconds. On a 30 fps phone tier, 30 frames is one second; on a 120 Hz display it is a quarter second. Frankendom should state the bound in ms per tier, or the phone tier will wait twice as long as a desktop.
- The admission is bypassed until the first frame clock tick (queue `selectNext` returns early when no frame has been noted, 724). Frankendom should keep the same boot rule, or boot-time units park with nothing to wake them.
- Parity note: this pass is about frame pacing, not the camera; the world camera has no link to this queue.

Reuse tag: adapt-from-idea (MIT; adaptation allowed with the licence kept)
Brief rule served: client-only rendering; engine untouched; quality tier data.

Best transferable idea: Admit background prep units (shader compiles, texture uploads, zone prep) into each frame against a headroom computed from the frame-time average and the tier target, learn each unit kind's cost by EMA, and guarantee progress with one slot per frame and a starvation bound so a piece is delayed but never dropped.
Decision (proposed): adapt - keep the per-frame headroom, the cost ledger and the starvation bound; fix the 64-kind overflow and the 48-character kind key in the sketch's successor, and state the starvation bound in ms per tier so a phone tier does not wait twice as long.
Acceptance: a client unit test feeds 40 ms frames against a 22 ms phone target with a 6 ms visible piece: the piece starts within 30 frames, actionable units start in the same frame as they arrive, a cosmetic piece is started within 240 frames, and no submitted piece is dropped.
