# flareteam-flare-engine (progression, cell 10)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/StatBlock.cpp` (kill reward, 879-940), `CampaignManager.cpp` (rewardXP, 207-221), `XPScaling.cpp` (136-178), `EngineSettings.cpp` (XP table, 1298-1364) | Licence: GPL-3.0-or-later (XPScaling.cpp header: "version 3 of the License, or (at your option) any later version"; repo COPYING is GPL v3) | C++ | symbol `StatBlock::takeDamage` (kill reward), `CampaignManager::rewardXP`, `XPScaling::getMultiplier`

Checked: Read end to end: the kill-reward block in `StatBlock::takeDamage` (879-940), `rewardXP` (207-221), `XPScaling::getMultiplier` (136-178), `StatBlock::addXP` (1543-1548), the XP table lookups `getLevelXP` / `getLevelFromXP` (1342-1364) and the table loader (1298-1340), and the per-frame level check in `Avatar::logic` (523-544). Death penalty read at MenuInventory.cpp 307-340 (the item-loss part 341-360 is (not read)). Caller of `Avatar::logic` only grep-read (GameStatePlay.cpp:888). The relative-level curve data was not read (only the absolute sample). Confidence: high on the award pipeline and its order; medium on the death path. `camera_scope` n/a (not a camera cell). The hint file was INFERRED (no file given); the mechanism was found with grep on `xp`, `rewardXP`, `getLevelXP` across `src/`.

## 1. Mechanism

Order of operations, from a kill to a level-up:

(a) Kill. `StatBlock::takeDamage` takes `hp` to 0 and, for a non-hero enemy that is not a hero ally (or was converted), runs the reward block (881-927). The base is the enemy's own `xp` field. The multiplier starts at 1. If the killing damage's source type is an ally, it becomes `party_exp_percentage / 100` (918-920; default 100, so 1). It is then multiplied by `getMultiplier(enemy, player)` (922). The award goes to the player's campaign with the silent flag (924). Loot is generated after the award (927). The award does not look at which attacker dealt the damage, only at the ally source type.

(b) Level-gap curves. `getMultiplier` returns 1 when the enemy has no scaling table (139-140). Otherwise it applies an absolute curve keyed by the enemy's level (147-158), then a relative curve keyed by enemy level minus player level (162-170). A key with no entry is clamped to the nearest defined end of its range (154-157 for the absolute table; the relative table is clamped the same way). Gaps inside the range are filled at load (119).

(c) Award accumulator. `rewardXP` returns at once while the player's `block_xp_gain` flag is set (208-209). Otherwise `bonus_xp += amount x (100 + XP_GAIN) / 100` (211), where XP_GAIN is a percent bonus stat (Stats.cpp:101). The whole part of `bonus_xp` is added to the total through `addXP` (213-214), and the fraction is kept for the next award (215). `addXP` adds and caps the total at the top table threshold (1544-1547).

(d) Level. Level is never incremented directly; it is looked up from total XP by scanning the table (`getLevelFromXP`, 1358-1359). The level-up check runs each frame in `Avatar::logic`: if the level is below max and XP reaches the next threshold (523), level is recomputed from XP (525), a message is logged, and `level_up` is set (524). A player who levels up while dead is put back into the stance state (538-539). Stat points per level default to 1 (StatBlock.cpp:102). The `level_up` flag is cleared by the menu logic (MenuManager.cpp:663).

(e) Dead-frame gate. At the end of each `Avatar::logic` the flag is recomputed as `block_xp_gain = (stats.hp == 0)` (544). While it is set, step (c) drops XP. The level check at 523 runs before this update in the same frame, so the frame in which the player is at 0 HP can still level them up (per the comment at 543).

(f) Death. When the player dies outside permadeath the flag `death_penalty` is raised (Avatar.cpp:888). Permadeath clears it and deletes the save instead (Avatar.cpp:881). `MenuInventory::logic` applies the penalty when the flag and the setting are on (309-310). If the total-XP percent is above 0, that percent of total XP is removed (321-324). Otherwise, if the current-level percent is above 0, that percent of the XP above the current level's threshold is removed (326-330). Last, XP is raised back to the current level's threshold if it fell below it (333-334). The shipped default is `xp_current_level=0` (death_penalty.txt:14) and `xp_total=0` (line 11, grep-read only).

Tick: none. Kill XP is event-driven (one call per enemy death, from the damage path). Level and dead-frame checks run once per frame in `Avatar::logic`. The frame driver is `pc->logic()` at GameStatePlay.cpp:888 (caller context not read).

## 2. Key functions

- `StatBlock::takeDamage`: `/mnt/frankendom-donors/flareteam-flare-engine/src/StatBlock.cpp` 879-940. Kill reward at 881-927.
- `CampaignManager::rewardXP`: `/mnt/frankendom-donors/flareteam-flare-engine/src/CampaignManager.cpp` 207-221. Dead-frame gate, percent bonus, whole/fraction split.
- `XPScaling::getMultiplier`: `/mnt/frankendom-donors/flareteam-flare-engine/src/XPScaling.cpp` 136-178. Absolute then relative curve, nearest-end clamp.
- `StatBlock::addXP`: `/mnt/frankendom-donors/flareteam-flare-engine/src/StatBlock.cpp` 1543-1548. Cap at top threshold.
- `EngineSettings::XPTable::getLevelXP` / `getLevelFromXP`: `/mnt/frankendom-donors/flareteam-flare-engine/src/EngineSettings.cpp` 1342-1364. Level 1 or below is 0; above the table is the last entry; level from total is a scan.
- `Avatar::logic` level and dead-frame block: `/mnt/frankendom-donors/flareteam-flare-engine/src/Avatar.cpp` 523-544.
- `MenuInventory::logic` death penalty: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuInventory.cpp` 309-334 (item loss at 341-360 not read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Kill XP = base x party share x curve(enemy level) x curve(enemy level minus player level), each curve clamped to its nearest defined end | Party share default 100 percent (theirs, EngineSettings.cpp:73). Curve values are data: sample absolute table `il.txt` gives level 20 = 508288 (theirs, flareteam-flare-game `mods/empyrean_campaign/enemies/xp_scaling/il.txt:21`). Relative table not read. |
| Fractional award accumulator: percent bonus, whole points out, remainder kept | XP_GAIN is a percent stat named `xp_gain` (theirs, Stats.cpp:101). Comment gives a +25% ring example (grep-read, CampaignManager.h:70). |
| Level from total XP via a threshold table, total capped at the top threshold | Table is data: `level=20,134217472` (theirs, flareteam-flare-game `mods/empyrean_campaign/engine/xp_table.txt:20`). Table must be strictly increasing; the loader repairs it (1331). |
| Death penalty: percent of total or of XP since level start, never below the level's threshold | Defaults: total 0 percent, current-level 0 percent (death_penalty.txt). Currency percent is 50 in the default file (not part of this mechanism). |
| One stat point per level | `stat_points_per_level(1)` (StatBlock.cpp:102). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: base x party share x absolute curve x relative curve; then the percent bonus with a carried remainder; then the cap; then the level from total XP; then the death penalty with its floor. It omits: the per-frame level check and its level-up messages and flags (the sketch sets the level inline), the one-frame dead-state window (the sketch uses a plain `blockXp` flag), gap filling at table load and the table repair, the stat and power points, the currency and item penalties, and the silent flag on kill awards. Curve lookup returns 1 for a gap inside a range, where the donor fills the gap at load.

```ts
// clean-room: written from the described mechanism (GPL-3.0-or-later donor), not a translation of the donor lines.
// table[i] = total XP needed to reach level i+1 (table[0] = 0). Levels are 1-based.
type XpTable = number[];

// Level -> multiplier curve (enemy level, or enemy level minus player level).
// The donor clamps to the nearest defined end outside the range and fills gaps at load; this sketch returns 1 for a gap.
interface Curve { points: Map<number, number>; lo: number; hi: number; }

function curveAt(c: Curve | null, key: number): number {
  if (c === null || c.points.size === 0) return 1;
  const hit = c.points.get(key);
  if (hit !== undefined) return hit;
  if (key < c.lo) return c.points.get(c.lo) ?? 1;
  if (key > c.hi) return c.points.get(c.hi) ?? 1;
  return 1;
}

function levelXp(table: XpTable, level: number): number {
  if (level <= 1 || table.length === 0) return 0;
  return level > table.length ? table[table.length - 1] : table[level - 1];
}

function levelFromXp(table: XpTable, xp: number): number {
  let level = 0;
  for (let i = 0; i < table.length; i++) if (xp >= table[i]) level = i + 1;
  return level;
}

interface Player {
  level: number;
  xp: number;
  xpGainPct: number;      // XP_GAIN stat: +25 means +25 percent per award
  bonusCarry: number;     // fraction of an XP point kept between awards
  blockXp: boolean;       // set while the player is at 0 HP
}

interface Enemy {
  level: number;
  baseXp: number;
  absolute: Curve | null;
  relative: Curve | null;
}

// Kill reward: base x party share x level-gap curves, then the award pipeline.
function onKill(p: Player, table: XpTable, e: Enemy, partyPct: number, fromAlly: boolean): void {
  let mult = fromAlly ? partyPct / 100 : 1;
  mult *= curveAt(e.absolute, e.level);
  mult *= curveAt(e.relative, e.level - p.level);
  rewardXp(p, table, e.baseXp * mult);
}

function rewardXp(p: Player, table: XpTable, amount: number): void {
  if (p.blockXp) return;
  p.bonusCarry += (amount * (100 + p.xpGainPct)) / 100;
  const whole = Math.trunc(p.bonusCarry);
  p.xp = Math.min(p.xp + whole, levelXp(table, table.length));  // total is capped at the top threshold
  p.bonusCarry -= whole;                                         // keep the remainder for the next award
  p.level = levelFromXp(table, p.xp);  // donor derives level in Avatar::logic each frame; inlined here
}

// Death: lose a share of total XP, or of XP since the current level, never below the level floor.
function deathXpPenalty(p: Player, table: XpTable, pctTotal: number, pctCurrentLevel: number): void {
  if (pctTotal > 0) {
    if (p.xp > 0) p.xp -= Math.trunc((p.xp * pctTotal) / 100);
  } else if (pctCurrentLevel > 0) {
    const sinceLevel = p.xp - levelXp(table, p.level);
    if (sinceLevel > 0) p.xp -= Math.trunc((sinceLevel * pctCurrentLevel) / 100);
  }
  const floor = levelXp(table, p.level);
  if (p.xp < floor) p.xp = floor;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/progression.ts` (new, kill award and level derivation on the one ledger). Parity-checklist row 18 (loot roll and XP award). The death penalty belongs with row 17 (death/respawn), but the row for this note is 18.
- today: Frankendom's current XP code location was not read (not checked).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one ledger, awards decided on the server); zones as data for the curve tables.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism.
- Server-verified kills: the donor awards XP from inside the damage path of the enemy (StatBlock.cpp:879-927). In Frankendom the award must be made by the server from the verified kill record, never from a client event.
- Double-award check: `takeDamage` itself has no dead-state guard. The hit path guards it (Entity.cpp:338-339). The reflect path calls `takeDamage` on the attacker (Entity.cpp:604) and I did not confirm a dead-state guard there. Whether a dead enemy can be credited twice is not verified. Frankendom needs an explicit "already credited" flag per enemy.
- One ledger: the donor recomputes level in two places (Avatar::logic and recalc, 954-957) and the frame check is client-side. Frankendom should derive level once, at award time, on the server.
- Dead-frame gate: this is a per-frame client flag. Frankendom's server needs an explicit dead state, and the Pit (client) must not award or penalise the world ledger.
- Many-on-one: the donor has no split of kill XP across several attackers; only the ally share exists (919-920). With MAX_ATTACKERS = 3 Frankendom needs its own rule (e.g. credit by hate table or by damage share). That rule is not in this donor.
- Death penalty: the donor loses XP and never levels down (floor, 333-334). Permadeath deletes the save (Avatar.cpp:881-882); do not port that.
- Floats: the donor uses floats for the accumulator. Frankendom should keep integer milli-XP so carried fractions do not drift.

Best transferable idea: scale each kill's XP by an enemy-vs-player level-gap curve and carry the fractional remainder into the next award, so small rewards are not lost.

Decision (proposed): adapt — the level-gap curve and the carried remainder fit a server award; the per-frame level derivation and the client dead-frame gate do not fit our one ledger, so Frankendom takes the shape and keeps the state on the server.
Acceptance: a server test asserts that a kill of an enemy 3 levels above the player awards base x the relative-curve value for +3, that two awards of 0.5 XP give one whole point on the second kill, and that after a death with a 10 percent penalty total XP never falls below the current level's threshold.
