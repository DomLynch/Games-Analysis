# LostCityRS-Engine-TS (gods-legends-favour, cell 2)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/script/handlers/PlayerOps.ts` (with `src/engine/entity/Npc.ts`, `src/engine/entity/Player.ts`, `src/cache/config/NpcType.ts`, `src/engine/World.ts`) | Licence: MIT (LICENSE: "MIT License", Copyright (c) 2023-2026 Lost City) | TypeScript | symbol `STAT_BOOST` / `STAT_DRAIN` / `STAT_HEAL` / `STAT_SUB` / `STAT_ADD` (script ops), `processRegen` (NPC decay)

Checked: opened `PlayerOps.ts` 514-625 and 591-600 (all five stat ops and `STAT_RANDOM`, bodies read), `Npc.ts` 62-63, 109 (`turn()` entry), 170-176 and 528-546 (regen), `NpcType.ts` 99 and 246, `World.ts` 120, 330-345, 496-510 (tick driver, read), `HeroPoints.ts` (all 48 lines), `Player.ts` 297-298, 701-712, 1835-1850 (read), 1940-1945 (grep only). Candidates opened: 7 (`PlayerOps.ts`, `Npc.ts`, `NpcType.ts`, `Player.ts`, `HeroPoints.ts`, `World.ts`, `PlayerStat.ts` by grep). Not read: the content scripts that call these ops (the repo's `data/` holds only `wordenc` and keys, so no content scripts are here); any player-side stat decay (grep of `src` finds none, so it may live in content that is not in this repo); the death handler; `NPC_STATADD`/`NPC_STATSUB` handlers. Confidence: high on the five op formulas and NPC decay; medium on "no player decay in this donor" (a grep, not a full read). camera_scope: n/a (not a camera cell).

## 1. Mechanism

- One ladder per stat. Each stat has a base level (`baseLevels`, from XP) and a current level (`levels`). `levels` is a `Uint8Array(21)` (Player.ts 298). Blessings and curses are ops on the current level, measured against the base or the current value.
- Common order in every stat op: pop stat, constant and percent; reject bad arguments (`check` guards); read base and current; compute `delta = (constant + base x percent / 100) | 0` (the `| 0` truncates toward zero); clamp; write; call `changeStat` only if the value changed (for example PlayerOps 514-532 for `STAT_ADD`).
- Blessing shape, `STAT_BOOST` (551-570): `boost = delta(base)`; `boosted = max(min(current + boost, base + boost), current)`; then capped at 255 (564). It raises the stat toward base + boost and never lowers it. A second identical boost is a no-op once the stat is at base + boost.
- Heal, `STAT_HEAL` (610-630): `healed = current + delta(base)`; `max(min(healed, base), current)` (620-621). It restores up to base and never pulls a boosted stat down.
- Curse by base, `STAT_SUB` (534-550): `subbed = current - delta(base)`, floored at 0 (544-545).
- Curse by current, `STAT_DRAIN` (574-590): `subbed = current - ((constant + current x percent / 100) | 0)`, floored at 0 (583-584). The donor comment says it is "same as stat_sub except it drains the current level instead of base level" (573).
- `STAT_ADD` (514-532): `added = current + delta(base)`, capped at 255 (524-525), with no cap at base. This is how a stat rises above base for good.
- Decay (NPC only in this donor): `Npc.turn()` calls `processRegen()` (Npc.ts 175). On each call `regenClock` goes up by one; when it reaches `regenInterval` the interval is reloaded from the NPC type (`regenrate`, default 100, NpcType.ts 99 and 246), the clock resets, and every stat moves one step toward its base (Npc.ts 528-546).
- Clock: the world cycle runs every 600 ms (World.ts 120). Each cycle is scheduled with `setTimeout` minus the elapsed time and a drift term (World.ts 343, 508). "Per NPC turn" therefore means "per world tick" (`processNpcs` runs once per cycle, read).
- Level-up refill (Player.ts 1839-1848): when XP raises the base and the current level was equal to the old base, the current level is re-derived from XP. If the current level was below the old base, it rises by the gain.
- Luck roll, `STAT_RANDOM` (591-600): level clamped to 99 (595); `value = floor(low x (99 - L) / 98) + floor(high x (L - 1) / 98) + 1` (596); `chance = floor(rand x 256)` (597); the result is 1 if `value > chance` (599). The odds slide from `low` at level 1 to `high` at level 99.

## 2. Key functions

- `STAT_ADD` 514-532, `STAT_SUB` 534-550, `STAT_BOOST` 551-570, `STAT_DRAIN` 573-590, `STAT_RANDOM` 591-600, `STAT_HEAL` 610-630: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/script/handlers/PlayerOps.ts`.
- `Npc.processRegen`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Npc.ts` 528-546; called from `Npc.turn()` at 175.
- Tick driver `World.cycle`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts` 120 (600 ms), 340-345 (drift), 503-508 (reschedule).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Boost raises toward base + boost and never lowers; a repeat boost stops at base + boost | 255 cap (theirs, PlayerOps 564) |
| Heal restores up to base and never pulls a boosted stat down | Heal cap = base (theirs, 621) |
| Curse by base (flat + base %) vs curse by current (flat + current %) | Floor 0 (theirs, 545, 584); percent taken of current in drain only (583) |
| Decay: one step toward base every N ticks; N reloaded each time | N = 100 default (theirs, NpcType.ts 99); step = 1 (theirs, Npc.ts 542, 544) |
| Tick | 600 ms (theirs, World.ts 120) |
| Level-scaled odds | 99, 98, 256 (theirs, PlayerOps 595-597) |

Worked by hand (not run): base 40, boost constant 10, no percent. The first boost gives 50. A second boost stays at 50, because the cap is base + boost = 50. A heal of 20 from 30 gives 40 (cap at base). With a regen interval of 100 ticks, a +10 boost decays in 10 steps, so 1000 ticks, which is about 600 s at 600 ms (derived).

## 4. TypeScript sketch

simplified: the sketch keeps the five ops and the decay step in donor order: boost raises toward base + boost, heal restores to base, sub and drain floor at 0, add caps at 255, and decay moves each stat one step toward base once the clock is due. It drops the opcode layer (`popInts`, `check` guards), the change notifications (`changeStat`), the hit-point hero-point clear, the level-up refill, the luck roll, the run energy, and the NPC-only binding. It reorders nothing else. Fix in the sketch: the donor starts `regenInterval` at 0, so its first turn regens at once; the sketch expects the caller to start the clock with `interval = regenrate`. The file is checked on the VPS with `tsc --noEmit --strict --target es2020` (exit 0).

```ts
// Licence: MIT (donor, LICENSE: Copyright (c) 2023-2026 Lost City). Re-expressed from the mechanism; not a line-by-line translation.
type Ladder = { base: number; current: number };

const CAP = 255;

// Shared rounding for every op: the donor uses "| 0", which truncates toward zero.
function delta(constant: number, percentOf: number, percent: number): number {
  return (constant + (percentOf * percent) / 100) | 0;
}

// Blessing shape: raises current toward base + d. Never lowers a stat, never above CAP.
function boost(l: Ladder, constant: number, percent: number): void {
  const d = delta(constant, l.base, percent);
  const boosted = Math.max(Math.min(l.current + d, l.base + d), l.current);
  l.current = Math.min(boosted, CAP);
}

// Heal: raises current up to base. Never lowers a boosted stat.
function heal(l: Ladder, constant: number, percent: number): void {
  const healed = l.current + delta(constant, l.base, percent);
  l.current = Math.max(Math.min(healed, l.base), l.current);
}

// Curse by base: lowers current by constant + base x percent. Floor 0.
function sub(l: Ladder, constant: number, percent: number): void {
  l.current = Math.max(l.current - delta(constant, l.base, percent), 0);
}

// Curse by current: lowers current by constant + current x percent. Floor 0.
function drain(l: Ladder, constant: number, percent: number): void {
  l.current = Math.max(l.current - delta(constant, l.current, percent), 0);
}

// Add: raises current by constant + base x percent. No base cap, capped at CAP.
function add(l: Ladder, constant: number, percent: number): void {
  l.current = Math.min(l.current + delta(constant, l.base, percent), CAP);
}

// Decay: every regenInterval ticks, every stat moves one step toward its base.
// fix: the donor starts regenInterval at 0, so its first tick regens at once. Create the clock with interval = regenrate.
interface RegenClock { clock: number; interval: number; regenrate: number }

function regenTick(c: RegenClock, ladders: Ladder[]): void {
  if (++c.clock >= c.interval) {
    c.interval = c.regenrate;   // reloaded on every regen, as the donor does
    c.clock = 0;
    for (const l of ladders) {
      if (l.current < l.base) l.current++;
      else if (l.current > l.base) l.current--;
    }
  }
}

export {};
```

Best transferable idea: one current-vs-base ladder where a blessing is a boost that never lowers the stat and a curse is a drain, with the boost decaying back toward base on a timer, so buffs and curses end by themselves.

Decision (proposed): adapt - take the ladder shape (boost capped at base + boost, heal capped at base, curse by base or by current, decay toward base) as the blessing and curse rows on one effect ladder; drop the stat ids and the 255 cap as donor numbers; fix the decay clock start and clamp the luck roll level to 1..99 (see section 6).

Acceptance: a +10 blessing on a base-40 stat shows 50 in the fight HUD; a second +10 leaves it at 50; a heal of 20 from 30 shows 40; a curse that drains 15% of current leaves a smaller loss at low current; after 10 decay steps (N ticks each) the stat is back at base; a server test asserts each of these numbers.

Reuse tag: rewrite-from-idea (MIT; code may be adapted, re-expressed here)
Brief rule served: GL-FOCUS 2 (blessings and curses as timed status rows on one ladder); the server owns the ladder, the client only shows it; new blessings are data rows, no code.

## 5. Lands in

- TARGET `src/fight/effects.ts` (new module: the one effect and CC ladder that blessings and curses write to). Parity-checklist row 13 (specials).
- Blessing and curse rows carry a constant, a percent, a base-or-current flag and a decay interval as zone or catalogue data.
- The decay runs in the server tick (post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget").

## 6. Gaps and risks

- MIT: adaptable. The sketch is a re-expression, not a copy.
- Player-side decay is not in this donor (grep of `src` finds only the NPC `processRegen`). Frankendom must design the player timer itself: decay every N ticks, one step toward base, for each row.
- The content scripts that call these ops are not in the repo. The meaning of each call (what a blessing is, how long it runs) is unknown from this donor.
- Defect 1 (keep the idea, fix): the regen clock starts at 0 (Npc.ts 62), so the first turn regens at once. Fix: create the clock with `interval = regenrate`.
- Defect 2 (keep the idea, fix): `STAT_RANDOM` clamps the level only from above (PlayerOps 595). A level of 0 makes `(L - 1)` equal -1 (596). Fix: clamp to 1..99 before the odds are computed.
- Defect 3 (keep the idea, fix): the 255 cap is enforced per op (525, 564), not in one setter, and `levels` is a `Uint8Array` (298), which wraps at 256. Fix: put the cap in one setter that every write goes through.
- Rounding rule: `| 0` truncates toward zero, so a fractional curse rounds in the victim's favour. State the rule in the spec (floor or truncate) rather than inherit it.
- Frankendom rulings: server-owned ladder (kills are server-verified). A curse that drains hit points to 0 must go through the death rule (row 17); the donor's death path (Player.ts 1940-1945, damage) was not read beyond grep.
- One ledger: blessings and curses are status rows on the one effect ladder, not a second meter. The Pit is a client (row 22), so the ladder runs in the engine only.
- Second mechanism, not written up as a note (one note per cell): the damage-contribution ledger `HeroPoints` (16 slots per player and per NPC). `BOTH_HEROPOINTS` adds the attacker's damage to the target's ledger (PlayerOps 1232); `FINDHERO` and `NPC_FINDHERO` return the top contributor (PlayerOps 1204, NpcOps 130); `NPC_HEROPOINTS` adds to the NPC ledger (NpcOps 494). This is a live favour-by-contribution rule (the top hitter is credited). Donor defect: `addHero` drops any new attacker once all 16 slots are full (HeroPoints.ts 31-34), with no eviction. Fix: evict the lowest slot. Licence MIT: adaptable. Read: `HeroPoints.ts` in full; the script callers were read only at the lines cited.
