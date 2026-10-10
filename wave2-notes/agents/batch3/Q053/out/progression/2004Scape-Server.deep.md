# 2004Scape-Server (progression, cell 10)

Donor: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/Player.ts` | Licence: MIT (LICENSE: "Copyright (c) 2023-2025 Lost City") | TypeScript | symbol `Player.addXp`

Checked: Read in full: `addXp` (Player.ts 1732-1806), the threshold table build (77-85), `getLevelByExp` and `getExpByLevel` (87-99), `setLevel` (1815-1826), `getCombatLevel` (1303-1309). Read in part: the stat arrays (294-323). Read as script op: `stat_advance` (PlayerOps.ts 707-713). Read as cheat setter: ClientCheatHandler.ts 418-425. Config: `NODE_XPRATE` (Environment.ts 35-36). Enabled and free stat tables (PlayerStat.ts 53-55, array lines only). Callers of `addXp`: PlayerOps.ts 713 and ClientCheatHandler.ts 425 (both read); other callers not read. Callers of `getLevelByExp`: PlayerLoading.ts 94 (grep line only). Hint file `network/game/server/codec/ServerProtPriority.ts` is an 11-line packet-priority enum, not progression (checked by grep). Not read: the per-action XP amounts in `data/src/scripts` (grep shows `stat_advance` in about 119 files, for example attack_dummy.rs2 line 11 with `stat_advance(attack, 50);`, not read beyond that), the ADVANCESTAT script bodies, the UpdateStat encoding and the per-tick stat flush, the load path in PlayerLoading.ts. Confidence: high on the XP table and `addXp` (every branch read; the table values were checked by running the same formula in python on the Mac, not in the donor's runtime). Medium on the wider system (the award side in scripts is not read). Not a camera cell (camera_scope not applicable).

Best transferable idea: store XP as the one number per skill, derive the level from a fixed threshold table, and on level-up give back exactly the levels gained to a drained (debuffed) current level instead of resetting it.
Decision (proposed): adapt — keep the XP-to-level derivation and the drained-level replenish rule for fight debuffs, but put the curve in one engine constant and drop the x10 stored encoding unless the HUD needs decimals.
Acceptance: a server test where XP crossing a threshold raises the level by exactly one per threshold crossed (level 2 at 83 XP, level 3 at 174 XP under this curve), and a fight-drained stat one level below base rises by the number of levels gained rather than snapping to base.

## 1. Mechanism

- State. XP per skill sits in `stats` (Int32Array, Player.ts 294). The current level is `levels` (Uint8Array, 295). The base level is `baseLevels` (321). The base level is always derived from XP. The current level tracks the base only while nothing has boosted or drained it.
- Table, built once at load (77-85). For level L from 1 to 99, `delta = floor(L + 2^(L/7) * 300)`, accumulated, and the threshold is `floor(acc / 4) * 10`. The stored value is XP times ten; the comment at 1746 says this gives a decimal point. Checked by running the same formula in python on the Mac: level 2 at stored 830 (83 XP), level 3 at 1740 (174 XP), level 99 at 130,344,310 (13,034,431 XP).
- Lookup. `getLevelByExp` (87-95) scans from the top threshold down and returns `i + 2` for the first threshold at or below the XP, capped at 99; it returns 1 if none match. `getExpByLevel(L)` is the threshold at index `L - 2` (97-99).
- `addXp(stat, xp, allowMulti = true)` (1732-1806), in this order:
  1. A negative amount throws (1734-1736). Zero returns at once (1738-1741).
  2. The multiplier is `NODE_XPRATE` when `allowMulti` is true, otherwise 1 (1743). Environment default is 1 (Environment.ts 36). The gain is added to `stats` (1744).
  3. The stored total is capped at 2,000,000,000 (1747-1749), which is 200 million XP times ten.
  4. `before` is the old base (1751). If the current level equals the base, the current level is recomputed from XP (1752-1755).
  5. The base is recomputed from XP (1756).
  6. If the base rose (1758), and the current level is below the old base, which means it was drained (1759), the current level gains the number of levels gained (1761). It is not reset to the base. Then the change-stat trigger fires (1764), a session log line is written (1767), total-level milestones are checked every 250 (1783-1788), the exact totals 1881 and 1485 log messages (1789-1794), and the ADVANCESTAT script is queued for that stat (1796-1799).
  7. If the combat level changed, it is recomputed and the appearance is rebuilt (1802-1805). The combat level is `floor(base + max(melee, range, magic))`, with melee `0.325 * (att + str)` and the others likewise (1304-1308).
- Callers. `stat_advance` (PlayerOps.ts 707-713) calls `addXp(stat, xp)` with the default, so scripted grants get the world XP rate. The cheat setter (ClientCheatHandler.ts 422-425) first zeroes the XP and sets both levels to 1, then calls `addXp(stat, getExpByLevel(level), false)`, so cheats skip the rate.
- `setLevel` (1815-1826) clamps the level to 1-99, sets base and current to it, and sets XP to the threshold for that level, without any rate. Its callers were not read.

## 2. Key functions

- `addXp`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/Player.ts` 1732-1806.
- `getLevelByExp` and `getExpByLevel`, with the table build: same file, 77-99.
- `getCombatLevel`: same file, 1303-1309.
- `stat_advance` op: `/mnt/frankendom-donors/2004Scape-Server/src/engine/script/handlers/PlayerOps.ts` 707-713.

## 3. Numbers vs mechanism

| Reusable rule | Donor constant |
|---|---|
| Level from XP through one fixed threshold table | Curve `floor(L + 2^(L/7) * 300)` (Player.ts 82); threshold `floor(acc / 4) * 10` (84) |
| Thresholds (arithmetic from the formula, not measured in the donor's runtime) | Level 2 at 83 XP; level 3 at 174 XP; level 99 at 13,034,431 XP (stored times ten) |
| Max level | 99 (Player.ts 90, 1816) |
| XP cap | 2,000,000,000 stored, which is 200 million XP (1747-1749) |
| Global XP rate | `NODE_XPRATE` default 1 (Environment.ts 36); cheat path passes `allowMulti` false (ClientCheatHandler.ts 425) |
| Drained-level replenish | current level gains the levels gained when it sits below the old base (1759-1761) |
| Total-level milestone | every 250 (Player.ts 1783) |
| Exact-total messages | 1881 over enabled stats (1789); 1485 over free stats (1792) |
| Combat level | `floor(base + max(melee, range, magic))`; weights 0.25 and 0.325 (1304-1308) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: rate and cap, capture of the old base, current tracks base only when untouched, recompute base, then replenish a drained current by the levels gained. It uses plain XP and drops the donor's x10 stored encoding, so the thresholds are the plain values (83, 174, ...). It omits the session logging, the total-level milestones, the ADVANCESTAT script queue, the combat-level recompute and appearance rebuild, the enabled and free stat tables, `setLevel`, and the cheat path. It also treats the amount as one skill, where the donor works on a stat index.

```ts
// Licence: MIT (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const MAX_LEVEL = 99;

// thresholds[i] = XP needed for level i + 2 (plain XP, not the donor's x10 storage).
export function buildThresholds(): number[] {
  const out: number[] = [];
  let acc = 0;
  for (let level = 1; level <= MAX_LEVEL; level++) {
    acc += Math.floor(level + Math.pow(2, level / 7) * 300);
    out.push(Math.floor(acc / 4));
  }
  return out;
}

const THRESHOLDS = buildThresholds();

export function levelFromXp(xp: number): number {
  for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= THRESHOLDS[i]) return Math.min(i + 2, MAX_LEVEL);
  }
  return 1;
}

export interface SkillState {
  xp: number;      // the one stored number
  base: number;    // level derived from xp
  current: number; // level after boosts or drains; tracks base while untouched
}

export interface AwardResult extends SkillState {
  leveledBy: number;
}

// Donor order: scale by the rate (if allowed), cap, capture the old base, let current
// track the base only when it is untouched, recompute base, then replenish a drained
// current by the number of levels gained (never reset it to base).
export function addXp(s: SkillState, amount: number, xpRate: number, allowRate: boolean, xpCap = 200_000_000): AwardResult {
  if (amount < 0) throw new Error('negative xp');
  if (amount === 0) return { ...s, leveledBy: 0 };

  const multi = allowRate ? xpRate : 1;
  const xp = Math.min(s.xp + amount * multi, xpCap);

  const before = s.base;
  let current = s.current;
  if (s.current === s.base) current = levelFromXp(xp);

  const base = levelFromXp(xp);
  const leveledBy = Math.max(0, base - before);
  if (leveledBy > 0 && current < before) current += leveledBy;

  return { xp, base, current, leveledBy };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/2004scape-skill-xp.ts) exits 0 with no output.

## 5. Lands in

- TARGET `origins/progression/levels.ts` (proposed new module: skill XP, the level-from-XP table, and the one XP ledger write). Parity-checklist row 18 (loot roll and XP award), on the XP write sub-path.
- Reuse tag: rewrite-from-idea (MIT; adaptation is permitted, but the sketch is clean-room)
- Brief rule served: one ledger (XP is the stored number and the level is derived from it); zones as data (the curve and the rates are constants, not per-zone); rules 7-9 n/a.

## 6. Gaps and risks

- Encoding. The donor stores XP times ten in an Int32 with a 2e9 cap. Frankendom's ledger should store plain integer XP with its own cap, and decide whether decimals are needed at all.
- Drained-level replenish. It serves buffs and drains. If Frankendom's fight debuffs live in the progression ledger, the replenish rule will also fire on unrelated level changes. Keep fight debuffs in fight state, not in the level ledger.
- XP rate. The donor reads the rate from a process environment variable, and cheats skip it. Frankendom must take the rate from server config only, and any test grant path must say so explicitly.
- The curve is the classic 2004 RuneScape curve, not a Frankendom design. Use it as a default and make it data if zones need different pacing.
- Award side not read. The per-action XP amounts live in `data/src/scripts` (`stat_advance` appears in about 119 files by grep). Frankendom would need its own award table; this donor does not give one.
- Side effects. Level-up fires a log line, a script trigger, and an appearance rebuild in one place. Frankendom should emit one event and let the client listen for it.
- Not read: the ADVANCESTAT script bodies, the UpdateStat encoding, the per-tick stat flush, the load path (PlayerLoading.ts 94 is a grep line only), and the callers of `setLevel`. Claims about them are cut.

Reuse tag: rewrite-from-idea (MIT; adaptation permitted, sketch is clean-room)
Brief rule served: one ledger, zones as data (rules 7-9 n/a)
