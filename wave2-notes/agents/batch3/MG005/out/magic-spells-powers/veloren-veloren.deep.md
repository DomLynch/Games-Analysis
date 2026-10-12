# veloren-veloren (magic-spells-powers, cell 3)

Donor: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/buff.rs` (with `common/systems/src/buff.rs`, `server/src/events/entity_manipulation.rs`, `common/src/comp/energy.rs`, `common/systems/src/stats.rs`) | Licence: GNU GPL-3.0 (`/mnt/frankendom-donors/veloren-veloren/LICENSE` lines 1-2: "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007") | Rust | symbols `BuffKind::resilience_ccr_strength`, `BuffKind::modify_data`, `Buffs::insert`, `Buffs::iter_active` (not read as a symbol: the effect loop in `common/systems/src/buff.rs` 466-520), server `BuffChange::Add` handler, `Energy::regen`

Checked: Read in full: `comp/buff.rs` 369-382 (queueable and stacking kinds), 626 (Resilience effect), 765-812 (`modify_data`, `resilience_ccr_strength`, `apply_item_effect_reduction`), 833-860 (`BuffData`), 1034-1108 (`Buff` and `Buff::new`), 1112-1137 (ordering), 1180-1262 (`Buffs`, `sort_kind`, `insert`), 1262-1334 (lookups and `delay_queueable_buffs`); `common/systems/src/buff.rs` 425-520 (effect loop by kind) and 826-840 (CC effect); `server/src/events/entity_manipulation.rs` 2405-2480 (the Add handler: immunity, Resilience grant, insert); `common/src/comp/energy.rs` 96-130 (regen, reset); `common/systems/src/stats.rs` 96-170 (regen by character state). Not read: `common/src/comp/ability.rs` (3732 lines; beam, summon and self-buff bodies), the effects table `buff.rs` 384-700 beyond the Resilience line, the body of `remove_by_category` (1335 onward), the max energy formula, `body.negates_buff`, the Saturation queue numbers, the item-effect values. Confidence: high on the crowd-control ladder and the buff selection rules (read end to end, server and systems); high on the energy regen constants (read the call sites). The "one ladder across all CC kinds" claim is confirmed only for the four kinds listed in `resilience_ccr_strength` (Amnesia, Frozen, Winded, Rooted); no Stun, Sleep, Charm or Fear variant exists in the `BuffKind` list I read (`buff.rs` 44-290). camera_scope: not applicable.

Best transferable idea: one shared crowd-control resistance pool per target: each hit adds resistance equal to its own shortened length and lasts 5x that length, so each later root is shorter by a fixed share of what is left, with no hard rule.

Decision (proposed): adapt — keep the shared pool, the gain-from-the-shortened-duration rule and the 5x window; add a cap on the summed resistance (proposed 0.9) so a root never reaches zero, and make the window and cap data fields, because Proof 3 needs a visible floor, not an immunity wall.
Acceptance: a server test with five 3-second roots inside 15 s on one target lasts 3.0, 2.1, 1.47, 1.03 and 0.72 s (the donor sequence, no cap reached); with the cap at 0.9 no 3-second root is shorter than 0.3 s; the HUD shows a resilience pip with the summed value.

## 1. Mechanism

- Every crowd-control buff (only four kinds feed the ladder: Amnesia, Frozen, Winded, Rooted, `buff.rs` 801-804) is first shaped by `modify_data`, then the server adds one Resilience buff for it, then inserts the hit itself (`entity_manipulation.rs` 2436-2479).
- Order inside one hit (as the code runs):
  1. Immunity gate: if any active buff carries `BuffImmunity` for this kind, the hit is dropped (2425); a dead target or a body that is immune to the kind is also dropped.
  2. `modify_data` (`buff.rs` 765-792): for Rooted only, the duration is multiplied by the attacker/target mass ratio clamped between `low = clamp(0.25 + 0.25 x strength, 0, 1)` and `high = max(1, 1 + 0.5 x strength)` (780-781). Then, for every CC kind, the duration is multiplied by `max(0, 1 - sum)`, where `sum` is the crowd-control resistance stat of the target at that moment (788-791).
  3. Resilience gain for this hit is computed from the already-modified data (`resilience_ccr_strength`, 799-805): Amnesia 0.3 flat; Frozen = strength; Winded = strength / 3; Rooted = modified duration in seconds / 10 (0.1 if the root has no duration).
  4. The Resilience buff is added with duration = modified duration x 5, or 30 s if the hit has no duration (2439-2446), and inserted (2461). Its effect is `CrowdControlResistance(strength)` (626), summed into the stat (`common/systems/src/buff.rs` 833-834).
  5. The hit itself is inserted (2479). It is not shortened by its own gain, because its duration was fixed in step 2.
- The sum is the sum of all active Resilience buffs (Resilience is a stacking kind, `buff.rs` 382 and `systems/src/buff.rs` 471), so one ladder is shared by every CC kind and every source (the Resilience buff is built with no source entity, 2439-2461, comment at 2456).
- Ladder arithmetic: with a base root of length D and no mass effect, the remaining headroom (1 - sum) is multiplied by (1 - D / 10) at every hit. For D = 3 this is 0.7 per hit. The donor sequence for five 3-second roots is 3.0, 2.1, 1.47, 1.03, 0.72 s (sum 0.832 after five). Without a cap the sum tends to 1 but never reaches it, so the root length tends to zero.
- Tick: the stat is rebuilt each tick (`common/systems/src/buff.rs`: `stat.reset_temp_modifiers()` at 454, effects applied in the loop at 466-520). The step-2 read uses `dest_info.stats`, the stored stat at that moment (the last tick's value), not a live value.
- Buff selection for non-stacking kinds (general rule, read): `Buffs::insert` (1214-1247) refreshes an existing buff of the same kind, data, categories and source whose end time overlaps (1238), instead of adding a duplicate; `sort_kind` (1190-1200) orders each kind strongest first, with strength compared first (1116), then no-delay beats delay, then later end time (1134). The effect loop (470-476) applies only the first entry of each non-stacking kind. Stacking kinds (PotionSickness, Resilience) apply all their entries (471).
- Energy pool (general rule, read): `Energy::regen` adds `regen_rate x dt` to energy, then raises `regen_rate` by `accel x dt`, capped at 10 per second (101-102). Idle uses accel 1.0 per second squared, sitting 2.5 (`common/systems/src/stats.rs` 14-15, 112-132). Any ability state in the reset list (BasicRanged, BasicBeam, BasicSummon, SelfBuff, Blink and others, 135-166) sets `regen_rate` back to 0 each tick (165-166). Some states stall energy but keep the rate (listed after 170, not read in full).

## 2. Key functions

- `BuffKind::resilience_ccr_strength`: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/buff.rs` 799-805. Gain from each CC hit, by kind.
- `BuffKind::modify_data`: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/buff.rs` 765-795. Root mass ratio, then resilience duration multiplier.
- `Buff::new`: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/buff.rs` 1070-1107. Builds the buff with modified data and end time.
- `Buffs::insert` and `sort_kind`: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/buff.rs` 1190-1247.
- Server Add handler: `/mnt/frankendom-donors/veloren-veloren/server/src/events/entity_manipulation.rs` 2405-2480.
- Effect loop: `/mnt/frankendom-donors/veloren-veloren/common/systems/src/buff.rs` 466-520 (selection), 833-834 (CC effect).
- Energy regen: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/energy.rs` 99-103; state table `/mnt/frankendom-donors/veloren-veloren/common/systems/src/stats.rs` 96-170.

## 3. Numbers vs mechanism

TABLE (name | effect | formula | number ranges | cost | cooldown/cast time | caps | file:line)

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Amnesia gain | resistance from an Amnesia hit | flat 0.3 | 0.3 regardless of duration | none | none | none (sum uncapped in donor) | buff.rs:801 |
| Frozen gain | resistance from a Frozen hit | = hit strength | strength as authored (not read) | none | none | none | buff.rs:802 |
| Winded gain | resistance from a Winded hit | strength / 3 | strength / 3 | none | none | none | buff.rs:803 |
| Rooted gain | resistance from a root | modified duration (s) / 10; 0.1 if no duration | 3 s root = 0.3; 2.1 s root = 0.21 | none | none | none | buff.rs:804 |
| Resilience window | how long a gain lasts | modified duration x 5; 30 s if infinite | 3 s root gives 15 s | none | none | none | entity_manipulation.rs:2446 |
| Duration multiplier | crowd-control hits shorten as resistance builds | duration x max(0, 1 - sum) | sum 0 -> 3.0 s; 0.3 -> 2.1 s; 0.51 -> 1.47 s; 0.66 -> 1.03 s; 0.76 -> 0.72 s (3 s root, same window) | none | none | floor 0 (no cap) | buff.rs:788-791 |
| Donor ladder, five roots | the sequence in one window | recursion above | 3.0, 2.1, 1.47, 1.03, 0.72 s; sum 0.832 | none | none | none | computed from buff.rs:790-804 (arithmetic, not a donor line) |
| Proposed cap | keeps a floor | multiplier uses min(sum, 0.9) | with 3 s base, min root 0.3 s | none | none | 0.9 (proposal, not in donor) | (proposal) |
| Root mass ratio | heavier attacker roots longer | clamp(mass ratio, low, high) | low = clamp(0.25 + 0.25 x s, 0, 1); high = max(1, 1 + 0.5 x s) | none | none | as above | buff.rs:780-781 |
| Immunity gate | a buff that blocks this kind | any active BuffImmunity(kind) drops the hit | binary | none | none | none | entity_manipulation.rs:2425 |
| Item reduction | items shorten Burning, Frozen, Resilience | duration x (1 - item_effect_reduction) | per stat (not read) | none | none | none | buff.rs:808-827 |
| Strongest-only | non-stacking kinds | only buff index 0 applies its effects | binary | none | none | one per kind | systems/buff.rs:471-476 |
| Stacking kinds | Resilience, PotionSickness | every entry applies | sum | none | none | none | buff.rs:382; systems/buff.rs:471 |
| Energy regen (idle) | pool refills | rate grows by 1.0 per s per s; rate capped at 10 per s | after 5 s idle the rate is 5/s; cap reached at 10 s | none | none | 10 energy/s | energy.rs:101-102; stats.rs:14 |
| Energy regen (sit) | faster refill | accel 2.5 per s per s | cap reached in 4 s | none | none | 10 energy/s | stats.rs:15 |
| Energy reset | casting stops the ramp | regen_rate = 0 on ability states | every tick in the state | ability use (cost not read) | none | none | stats.rs:142, 165-166 |
| Energy maximum | pool size | not read | | | | | |

Which numbers suit a fast mobile fight: the 5x window and the 1/10 rule for roots are readable on a phone (a 3-second root gives 15 seconds of resistance), and the decay of about 30 per cent per hit at a 3-second root is the amount a designer can tune with one number. The energy ramp (1 per second per second, cap 10 per second, sit 2.5) is a usable regen curve for a mana or focus pool, because it rewards pausing after a burst of casts. Strength of the effect for the fight: at a sum of 0.8 a 3-second root lasts 0.6 s; the donor never reaches zero, the cap decides the floor.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (immunity gate, root mass ratio, then the resilience sum shortens the duration, then the hit's own gain and window from the modified duration) and the four gain rules. It adds the cap as a proposed constant `SUM_CAP` (the donor has no cap), and reads the sum at apply time instead of the last tick's stat. It omits the item-effect reduction, the strongest-only and refresh rules of `Buffs::insert`, the delay and queue logic for Saturation, body negation, the damage-break and expiry handling, and the energy regen (see the table).

```ts
// Licence: GNU GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type CcKind = "amnesia" | "frozen" | "winded" | "rooted";

export interface CcHit {
  kind: CcKind;
  strength: number;          // the hit's strength (donor data.strength)
  durationS: number | null;  // null = no duration (infinite)
  massRatio: number;         // attacker mass / target mass, used by roots only
}

export interface Resilience {
  gain: number;              // crowd-control resistance this entry adds while active
  untilS: number;            // absolute time the entry expires
}

export interface Target {
  resilience: Resilience[];  // one list shared by every crowd-control kind
  immune: boolean;           // a BuffImmunity effect for this kind is active
}

export const WINDOW_MULT = 5;       // resilience lasts 5x the crowd-control duration
export const DEFAULT_WINDOW_S = 30; // used when the crowd-control hit has no duration
export const SUM_CAP = 0.9;         // proposed cap: the donor has no cap, so the sum can reach 1.0 and zero the duration

const clamp01 = (x: number): number => Math.min(Math.max(x, 0), 1);

// Resilience gained from one hit, by kind.
export function resilienceGain(kind: CcKind, strength: number, durationS: number | null): number {
  switch (kind) {
    case "amnesia": return 0.3;
    case "frozen": return strength;
    case "winded": return strength / 3;
    case "rooted": return durationS === null ? 0.1 : durationS / 10;
  }
}

export function activeSum(t: Target, now: number): number {
  return t.resilience.filter((r) => r.untilS > now).reduce((acc, r) => acc + r.gain, 0);
}

// Applies one crowd-control hit. Returns the duration in seconds the hit lasts (null = infinite), or 0 if immune.
// Order: roots scale by mass first, then the resilience sum shortens the duration, then the hit adds its own resilience.
// The hit's own resilience is added after its duration is set, so the first hit is never shortened by itself.
export function applyCc(t: Target, hit: CcHit, now: number): number | null {
  if (t.immune) return 0;
  let dur = hit.durationS;
  if (hit.kind === "rooted" && dur !== null) {
    const low = clamp01(0.25 + hit.strength * 0.25);
    const high = Math.max(1, 1 + hit.strength * 0.5);
    dur = dur * Math.min(Math.max(hit.massRatio, low), high);
  }
  const sum = Math.min(activeSum(t, now), SUM_CAP);
  if (dur !== null) dur = dur * Math.max(0, 1 - sum);
  t.resilience.push({
    gain: resilienceGain(hit.kind, hit.strength, dur),
    untilS: now + (dur === null ? DEFAULT_WINDOW_S : dur * WINDOW_MULT),
  });
  return dur;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/status.ts` (new module, engine: crowd-control pool per target, one ledger with the hit). This is the Proof 3 CC ladder.
- Parity-checklist row 13 (specials): the crowd-control hit comes from a special or a skill. Row 13 is the one row that owns the outcome of a special.
- Reuse tag: rewrite-from-idea (GNU GPL-3.0; clean-room only)
- Brief rule served: one engine (the pool and the hit are engine state, one per target, any source); server-verified (the server reads the pool and inserts the hit); clean-room only (GPL-3.0).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- Stale read in the donor: the duration multiplier reads `dest_info.stats`, the stat from the last tick (`systems/buff.rs` resets temporary modifiers each tick, 84-94). Two hits in one tick can both see a sum that is one tick old. Frankendom should read the sum at apply time on the server, as the sketch does.
- Uncapped sum: the donor sum tends to 1 but never reaches it, so roots tend to zero. This is a design choice in the donor, not an error; Frankendom should decide the floor (proposed 0.9, so a 3-second root keeps 0.3 s). This is the one change to the idea.
- Only four kinds join the ladder. The Frankendom CC list (stun, root, sleep, charm, fear, silence) needs an explicit mapping to these four gains. Silence, sleep, charm and fear have no donor counterpart, so their gain must be set by the Frankendom designer (data field), not copied.
- Item and mass numbers: Rooted's mass ratio and item effect reduction are donor values not yet read in full; Frankendom should keep the mass term as a data field with the donor's clamp shape as default.
- Against the one-ledger ruling: the pool, the hit and the window are one engine record. The donor's Resilience buff has no source entity (2439-2440), so the pool is per target, which matches the ruling.
- Against server-verified outcomes: the donor applies the hit in the server event handler (2405-2480), so the shape transfers; the client shows the pool and the remaining time only.
- Against zones as data: the 0.3 Amnesia gain, the /3 Winded rule, the /10 Rooted rule, the 5x window and the 30 s default are engine constants (where: engine constant). The cap is an engine constant proposal; the per-kind strength values are zone or encounter data.
- Energy pool (secondary, read): the ramp is per second per second and resets on any ability state in the list. For a fast fight, the reset means a burst of casts is paid for by a pause; the donor's reset list (stats.rs 135-150) is the knob to tune. Energy maximum formula not read, so the pool size per character is not given here.
- Not read: the ability state bodies (ability.rs), the damage-break rule for CC (not found in the buff code read), the Saturation queue numbers.

Reuse tag: rewrite-from-idea (GNU GPL-3.0; clean-room only)
Brief rule served: one engine (the pool and hit live in src/fight); server-verified outcomes; clean-room only (GPL-3.0). Parity row 13.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN
- No errors found: BuffKind::stacks, resilience_ccr_strength values, modify_data clamps, server Add handler, CrowdControlResistance sum, energy regen, five-root ladder arithmetic (3.0/2.1/1.47/1.03/0.72), absence of Stun/Sleep/Charm/Fear kinds and GPL-3 all verified.
- Missed (minor): Rooted/Amnesia/Winded/Frozen are the only ladder kinds; Resilience gain is taken from the already-shortened duration (note already has this).
