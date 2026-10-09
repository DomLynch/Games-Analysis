# levy-street-world-of-claudecraft (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/ui/absorb_bar.ts | Licence: MIT | TypeScript | symbol absorbBarViewInto / absorbSegmentTransform

## 1. Mechanism

- Input: the unit's `hp` and `maxHp`, and either its `auras` list or a pre-summed `total` (used by party snapshots that do not carry full auras).
- `absorbTotal` (absorb_bar.ts 32) sums the remaining value of every aura of kind `absorb`, clamping each to zero or more. Spent or negative shields add nothing.
- `absorbBarViewInto` (55) fills a caller-owned view. It takes `{ hp, maxHp, auras?, total? }`, floors max at 1 and hp at 0, uses `total ?? absorbTotal(auras ?? [])` (clamped at 0), and derives the shield size as total over max (clamped 0 to 1), `fillFrac` (hp plus total over max, clamped, "kept for callers/tests"), overshield when hp plus total reaches max, and the start: the health fraction normally, or right-aligned (1 minus size) when overshielded.
- `absorbSegmentTransform` (82) returns a CSS transform string: `translateX` to the start (quantized to 3 decimals) and `scaleX` to the size, so the segment spans [start, start + size]. A zero shield keeps the same two-function shape, so CSS transitions do not flip.
- The comment at lines 52-53 says HUD unit frames call `absorbBarViewInto` every animation frame (callers are in `unit_frame.ts` and `unit_frame_painter.ts`, found by grep, not read). The header (lines 6-7) says the sim decrements the absorb values in `dealDamage`; that sim code was not read. This module only reads them.
- Output: a view object and a transform string. Nothing written back.

## 2. Key functions

| Name | Absolute VPS path | Lines | What it does |
|---|---|---|---|
| absorbTotal | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/ui/absorb_bar.ts | 32-36 | Sums remaining absorb over `kind: 'absorb'` auras, clamped at zero |
| absorbBarView | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/ui/absorb_bar.ts | 38-49 | Allocating wrapper around absorbBarViewInto |
| absorbBarViewInto | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/ui/absorb_bar.ts | 55-70 | Derives total, size, start and overshield into a reused view |
| absorbSegmentTransform | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/ui/absorb_bar.ts | 82-92 | Builds the CSS transform that places the shield as a segment |
| absorbTranslatePercent | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/ui/absorb_bar.ts | 97-99 | Quantizes the start percent to 3 decimals for stable transform caching |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sum shield values per entry, each clamped at zero | Aura kind string `'absorb'` (theirs) |
| Ratios clamped 0 to 1; max floored at 1 to avoid divide-by-zero (line 56) | Floor of 1 (general, not theirs) |
| Overshield = shield plus health reaches max; segment right-aligned | Rule as written (theirs) |
| Constant transform shape even at zero size, so transitions do not flip | Structural rule (theirs) |
| Quantize translate to 3 decimals so per-frame writes can be elided | 3 decimals (line 98, theirs) |
| Injectable scale writer, so a party row keeps fixed-decimal output | Party row formatter (theirs) |

## 4. TypeScript sketch

Lift: the logic is lifted from the paths above (MIT permits it). Function names match the source. `clamp01` is restated, since the source imports it from `./clamp`.

simplified: the sketch passes `total` as a plain argument (the donor takes an input object and falls back to summing auras), omits the `fillFrac` field, and drops the injectable `scaleX` writer (default `scaleX(n)`, lines 85, 103-105).

```ts
// Licence: MIT
// Lifted from levy-street-world-of-claudecraft, src/ui/absorb_bar.ts (absorbTotal, absorbBarViewInto, absorbSegmentTransform).

interface AbsorbAura { kind: string; value: number; }

interface AbsorbBarView {
  total: number;
  startFrac: number;
  sizeFrac: number;
  overshield: boolean;
}

function clamp01(v: number): number { return Math.min(1, Math.max(0, v)); }

// Total remaining absorb across shield auras. Spent or negative shields add nothing.
function absorbTotal(auras: AbsorbAura[]): number {
  let n = 0;
  for (const a of auras) if (a.kind === 'absorb') n += Math.max(0, a.value);
  return n;
}

// Fill a caller-owned view, so the per-frame path does not allocate.
function absorbBarViewInto(out: AbsorbBarView, hp: number, maxHp: number, total: number): AbsorbBarView {
  const max = Math.max(1, maxHp);
  const hpNow = Math.max(0, hp);
  const sizeFrac = total > 0 ? clamp01(total / max) : 0;
  const overshield = total > 0 && hpNow + total >= max;
  out.total = total;
  out.sizeFrac = sizeFrac;
  out.overshield = overshield;
  out.startFrac = overshield ? clamp01(1 - sizeFrac) : clamp01(hpNow / max);
  return out;
}

// The segment starts at the health edge (or is right-aligned when overshielded) and spans its own width.
function absorbSegmentTransform(startFrac: number, sizeFrac: number): string {
  const size = sizeFrac > 0 ? sizeFrac : 0;
  return `translateX(${Number((startFrac * 100).toFixed(3))}%) scaleX(${size})`;
}
```

## 5. Lands in

- Frankendom: TARGET `src/fight/hud.ts` (shield segment on the health bar), today: `src/hud.ts` (moving), if Frankendom adds a visible shield amount.
- Parity checklist row 14 (HUD); the guard amount it would show is row 3 (guard/parry/stamina).
- Reuse tag: adapt
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- Frankendom has guard and parry, not absorb auras. To use this, map the guard amount to the `total` input; do not copy their buff model.
- The output is a CSS transform string. If src/hud.ts draws to a canvas, keep the math and replace the writer with a rectangle.
- The pre-summed `total` path is for party snapshots. A 1v1 duel does not need it.
- Authority: `total` must come from the server snapshot. The client must not predict guard consumption and draw it locally.
- The donor's shield is consumed by `dealDamage` in the sim. Frankendom's guard consumption must stay in the server tick (post-K item 3), with the HUD reading the result.
- MIT: the lift is permitted. No conflict with the one-engine ruling, since the module is a pure display derivation fed by the one fight state.
