# EQEmu (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/EQEmu/zone/attack.cpp` | Licence: GPL-3.0-or-later (`attack.cpp` header: "either version 3 of the License, or (at your option) any later version"; `LICENSE.md` is the GPL v3 text) | C++ | symbol `Mob::TryFinishingBlow`

Checked: The cell's hint file (`utils/sql/svn/1548_nimbuseffect_required.sql`) is a single `ALTER TABLE` adding a `nimbuseffect` column. It is not combat logic and I did not use it. The real mechanism is `Mob::TryFinishingBlow` (`zone/attack.cpp` 5579-5640), called only from `Mob::TryCriticalHit` (5476). Opened in full: `zone/attack.cpp` 1-12, 5351-5530, 5579-5642, 6400-6428; `zone/mob.h` 608-609; `zone/bot.cpp` 5112-5135. Grep-only lines: `common/ruletypes.h` 640, `common/spdat.h` 1341 and 1503, `common/bonuses.cpp` 3542-3556 and 5543-5555, `zone/special_attacks.cpp` 2459-2520 (Assassinate and HeadShot, similar style, not read). Confidence high on the threshold, roll and flat-damage order. Not read: `attack.cpp` 5530-5578 (cripple and berserk), `GetCritDmgMod`, `GetCriticalChanceBonus`, `zone->random.Int` (inclusive range assumed from its 1..1000 use), `currently_fleeing`, the Lua hook, and the rest of the file's pet branches (`TryPetCriticalHit`). camera_scope: n/a (not a camera cell).

Best transferable idea: A finisher that replaces a hit's damage with a flat amount only when the target is under an HP ratio, under a level cap, and on a per-mille roll, so the rule is data and the server rolls it.
Decision (proposed): adapt - take the gate order (HP threshold, level cap, chance roll, then a flat number) as the Frankendom finisher rule; drop the crit-roll coupling and the client exemption until the Pit's rules say otherwise, and let the server, not the client, roll it.
Acceptance: A rival below 10% of max HP takes a finishing blow on a server-rolled hit ("Finishing Blow!" then death), a rival at 11% never does, and a player-controlled target is never finished; a server test with a fixed roll sequence asserts the fire condition exactly.

## 1. Mechanism

- Melee path order: the damage roll is built, `ApplyMeleeDamageMods` runs, the minimum-damage cap is applied (6420-6423), then `TryCriticalHit` runs (6425). After it returns, the caller adds the minimum damage to the hit (`hit.damage_done += hit.min_damage;`, 6427).
- `TryCriticalHit` (5351): returns at once if the damage is below 1 or there is no defender (5362-5364). Pets and NPCs with crits disabled take other branches (5368-5380). Slay Undead (5382-5427) can end the hit early.
- Melee crit gate (5429-5474): innate crit for some class and level combinations, or a crit chance bonus. A difficulty comes from a rule (5445-5453); `roll = Int(1, difficulty)` (5455); the DEX-based chance is built (5456-5471). A crit happens when `roll < dex_bonus` (5474).
- Inside a crit, the first step is the finishing blow (5476). If it fires, `TryCriticalHit` returns (5477), so the crit damage, deadly strike and cripple steps are skipped.
- `Mob::TryFinishingBlow` (5579-5640), in order: (a) the HP limit starts at 10 (5581); a finishing-blow HP value from AA, spell or item bonuses, if set, replaces it as `value / 10` (5582-5592). (b) Gate: the defender is not a client and its HP ratio (percent) is below the limit (5594). (c) The flat damage is the sum over AA, spell and item bonuses (5595-5596). (d) The level cap is the largest of the AA, spell and item level values (5598-5604). (e) The chance is the sum of AA, item and spell proc-chance values (5607-5611). (f) The fleeing-only rule: if set, the defender must be fleeing (5613-5617). (g) All of: fleeing check passes, level cap nonzero, flat damage nonzero, defender level within the cap, and `proc_chance >= Int(1, 1000)` (5618-5621). (h) On success: a message to nearby players (5624-5633), `damage = flat` (5635) and `return true` (5636).
- Numbers the caller sees: when the finish fires, `hit.damage_done` is the flat amount, then the caller still adds `hit.min_damage` (6427). I did not trace `min_damage` at that point, so the delivered damage is the flat amount plus the minimum-damage part of the hit.
- When the finish does not fire, the crit damage runs: `max(damage, base) + 5` (5481), then multiplied by `170 + GetCritDmgMod(skill)` (5483-5489), with a floor of 100 (5485-5487).
- Tick: none. This runs once per melee hit, synchronously, inside the attack routine.

## 2. Key functions

- `Mob::TryFinishingBlow`, `/mnt/frankendom-donors/EQEmu/zone/attack.cpp` 5579-5640: the rule.
- `Mob::TryCriticalHit`, same file, 5351-5530 (read to 5530): the crit gate, the finish call, the crit damage.
- Melee caller, same file, 6400-6428: the damage order around the crit step.
- `Bot::TryFinishingBlow`, `/mnt/frankendom-donors/EQEmu/zone/bot.cpp` 5115-5135: a separate copy for bots (see gaps).
- `Mob::GetHPRatio`, `/mnt/frankendom-donors/EQEmu/zone/mob.h` 608: percent of max HP.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Finish only when the target is under an HP ratio | Default 10 percent (theirs, attack.cpp 5581); the stored bonus is divided by 10 before use, so its unit is tenths of a percent (inferred from the division and from GetHPRatio's percent, theirs, 5591) |
| Level cap on the finish | Effect value; SPA 440 "Sets the level Finishing blow can be triggered on an NPC" (theirs, spdat.h 1503) |
| Chance per mille against a 1 to 1000 roll | Chance per mille: the code comment says 500 is 50 percent (theirs, attack.cpp 5606 and 5621) |
| Flat replacement damage | Effect base2 value (theirs, spdat.h 1341 comment and bonuses.cpp 3546-3547) |
| Fleeing-only switch | Rule flag, default false (theirs, ruletypes.h 640) |
| Client exemption | Always (theirs, attack.cpp 5594) |
| Crit damage without the finish | `+ 5` then `170 + crit mod`, floor 100 (theirs, attack.cpp 5481-5487) |

Worked example by hand (not run): with a 10 percent limit and a chance of 500, a defender at 9 percent HP and within the cap has a 50 percent chance per attack of the flat finish. A defender at 11 percent never gets it.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's gate order: client exemption, HP ratio below the limit, fleeing-only flag, nonzero cap and damage, level within cap, and the per-mille roll, after which the flat number replaces the damage. It also keeps the rule that the finish is tried only after a crit roll succeeds. It omits: the slay-undead branch before the crit gate, the pet branches, the Lua hook, the crit chance and DEX arithmetic (the caller passes the result as a boolean), the cripple, berserk and deadly-strike steps after the crit, the chat message, the bonus aggregation (sums over AA, spell and item), and the `+ min_damage` top-up after the caller returns. The donor's HP limit conversion (value / 10) is not in the sketch: the sketch takes a percent.

```ts
// Licence: GPL-3.0-or-later (donor, zone/attack.cpp header: "either version 3 of the License, or (at your option) any later version"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface FinishRule {
  hpLimitPct: number;        // donor default 10 (percent of max HP)
  chancePerMille: number;    // 0..1000; donor compares against a 1..1000 roll
  flatDamage: number;        // replaces the hit's damage when it fires
  levelCap: number;          // defender level must be <= this; 0 means no finish
  onlyWhenFleeing: boolean;  // donor rule flag, default false
}

export interface FinishTarget {
  hp: number;
  maxHp: number;
  level: number;
  isPlayer: boolean;   // donor: never finishes a client
  fleeing: boolean;
}

// Returns the flat damage if the finish fires, otherwise null. roll(lo, hi) is an inclusive integer roll.
export function tryFinish(
  rule: FinishRule,
  t: FinishTarget,
  roll: (lo: number, hi: number) => number,
): number | null {
  if (t.isPlayer) return null;
  const hpPct = t.maxHp > 0 ? (t.hp / t.maxHp) * 100 : 0;
  if (!(hpPct < rule.hpLimitPct)) return null;
  if (rule.onlyWhenFleeing && !t.fleeing) return null;
  if (rule.levelCap <= 0 || rule.flatDamage <= 0) return null;
  if (t.level > rule.levelCap) return null;
  if (rule.chancePerMille < roll(1, 1000)) return null;
  return rule.flatDamage;
}

// Donor order: the finish is tried only after a successful crit roll, and it replaces the crit damage.
// Returns null when there is no crit (the caller keeps the normal hit), otherwise the damage to apply.
export function critOrFinish(
  critRollBelow: boolean,   // donor: roll < dexBonus
  rule: FinishRule,
  t: FinishTarget,
  roll: (lo: number, hi: number) => number,
  critDamage: () => number,
): number | null {
  if (!critRollBelow) return null;
  const finished = tryFinish(rule, t, roll);
  return finished !== null ? finished : critDamage();
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/VF001-finishing-blow.ts` (block plus `export {};`), exit 0.

## 5. Lands in

- TARGET `src/fight/finisher.ts` (new engine module): one finisher rule as data (HP limit, chance per mille, flat damage, level cap), rolled by the server inside the hit resolution. Parity-checklist row 9 (finishers).
- today: no finisher rule in `src/fight/` (not read in this pass; the Frankendom side is taken from the brief).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only, the gate shape and the per-mille roll, no translated lines)
- Brief rule served: server-verified kills (the finish is a server roll, and the client only plays it); one engine (one finisher rule, not one copy per character type)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, and the donor numbers (10 percent, 1 to 1000) are defaults to re-tune for our fights.
- Duplicate rule: `Bot::TryFinishingBlow` (bot.cpp 5115-5135) is a second copy. It hard-codes the 10 percent limit (5120), reads only AA bonuses, and never checks the fleeing rule. This is the drift Frankendom's one-engine ruling exists to prevent: the finish must be one function with one rule set.
- Crit coupling: in the donor, the finish can only fire on a successful crit roll. For us, a finisher is a designed moment ("execution available"), not a crit side effect. Decide before building; the sketch keeps the coupling as an option (`critOrFinish`) only for parity testing.
- Player exemption: the donor never finishes a client (5594). Whether a gladiator can finish another player in the Pit is a ruling Frankendom has not made here. Until it does, default to no finish on a player.
- The caller adds `min_damage` after the finish (6427). Frankendom must decide whether a finishing blow is a flat hit or a flat hit plus the normal minimum; the sketch returns the flat number only.
- The kill itself is server-verified in Frankendom. The donor applies the flat damage in the attack routine, so the client copy is not a model for the server.
- Not read: `attack.cpp` 5530-5578, `GetCritDmgMod`, `GetCriticalChanceBonus`, `zone->random.Int` semantics, `currently_fleeing`, the Lua hook, and the bonus aggregation in `bonuses.cpp` beyond the grep lines.
