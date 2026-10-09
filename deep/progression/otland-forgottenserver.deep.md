# otland-forgottenserver (progression, cell 10)

Donor: /mnt/frankendom-donors/otland-forgottenserver/src/player.cpp | Licence: GPL-2 | C++ | symbol Player::addExperience
Symbol check: addExperience opens at 1754 and closes at 1823; addSkillAdvance 479-531; getExpForLevel is an inline in /mnt/frankendom-donors/otland-forgottenserver/src/player.h 146-149; Vocation::getReqSkillTries /mnt/frankendom-donors/otland-forgottenserver/src/vocation.cpp 141-148; Player::getBasisPointLevel is defined in player.cpp at 1908 (opened, first lines only: returns 0 when the divisor is 0, truncates count x 10000 / next to a 16-bit value, 0 above 10000). All opened this pass.

## 1. Mechanism
- addExperience(source, exp, sendText) (1754-1823) is event-driven: it runs on each XP grant. First it reads the current and next level thresholds; if the current one is not below the next (max level reached) it sets levelPercent 0, sends stats and returns without adding anything (1759-1764). Then it runs the onGainExperience script hook (1766), (its body was not read; the call passes exp and rawExp, and exp is used after it, so the hook may adjust it); if exp is then 0 it returns (1767-1769).
- It adds exp to the total (1771) and loops while the total reaches the next threshold (1774-1788): increments level, adds the vocation's HP, mana and capacity gains (health and mana current values too), moves currLevelExp to the old next threshold, recomputes the next threshold, and breaks if the new current threshold is not below the new next (max level), after the increment.
- If the level changed (1790-1813): refills health and mana to max, updates base speed and creature speed, sends creature health, refreshes walkthrough when the level crosses the protection level, updates party shared experience if in a party, runs the level-advance script hook (playerAdvance), and sends the "advanced from Level a to Level b" message.
- Then (1815-1822) it sets levelPercent to getBasisPointLevel(exp into level, level span) / 100, which is an integer percent (basis points truncated), or 0 at the cap, sends stats, and sends the experience tracker with rawExp times the stage multiplier for the level (ConfigManager::getExperienceStage, body not read).
- getExpForLevel(lv) (player.h 146-149) is ((((lv - 6) x lv + 17) x lv - 12) / 6) x 100 in unsigned 64-bit integers, so the division by 6 truncates before the x 100.
- addSkillAdvance(skill, count) (479-531) is a separate skill path. It returns when the current skill requirement is not below the next (max skill, 481-486), runs the onGainSkillTries hook (488, count may change), returns if count is 0, then loops while tries + count reaches the next requirement: subtracts what was needed, raises the skill level, resets tries and percent, sends the advance message, runs the playerAdvance event, recomputes the next requirement, and breaks with count 0 if it is not above the current. Leftover count is added to tries; the percent is recomputed (basis points, 16-bit) and the skills packet sent if anything changed.
- getReqSkillTries(skill, level) (vocation.cpp 141-148): returns 0 if the skill id is past the last; otherwise skillBase[skill] (static table {50, 50, 50, 50, 30, 100, 20}, line 139) times pow(vocation skillMultipliers[skill], level - (MINIMUM_SKILL_LEVEL + 1)), with MINIMUM_SKILL_LEVEL 10 (player.h 75). The multipliers default {1.5, 2.0, 2.0, 2.0, 2.0, 1.5, 1.1} (vocation.h 64) and are overridden per vocation from data (vocation.cpp 84).
- Inputs: source, exp or tries, skill. Outputs: level, HP, mana, capacity, skill level, messages, script events.

## 2. Key functions
- Player::addExperience | /mnt/frankendom-donors/otland-forgottenserver/src/player.cpp | 1754-1823 | max-level guard, XP hook, XP add, multi-level loop with vocation gains, refill and events on level change.
- Player::addSkillAdvance | /mnt/frankendom-donors/otland-forgottenserver/src/player.cpp | 479-531 | tries accumulation with multi-level carry, hooks and messages (skill training, beyond the 22 rows).
- Player::getExpForLevel | /mnt/frankendom-donors/otland-forgottenserver/src/player.h | 146-149 | exp threshold for a level (cubic in lv).
- Vocation::getReqSkillTries | /mnt/frankendom-donors/otland-forgottenserver/src/vocation.cpp | 141-148 | geometric requirement per skill level.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Multi-level loop on a cumulative threshold, refill on change | Exp cubic ((lv - 6) lv + 17) lv - 12, over 6, times 100 (theirs, player.h 148) |
| Geometric skill requirement with carry of leftover tries | skillBase {50, 50, 50, 50, 30, 100, 20} (theirs, vocation.cpp 139) and skillMultipliers (theirs, vocation.h 64 and vocation data) |
| Per-level gains applied in the loop | Vocation HP, mana and capacity gains (theirs) |

## 4. TypeScript sketch
simplified: mana, speed, party, walkthrough, the two script hooks (onGainExperience may change exp), the experience tracker and messages are omitted; addSkillAdvance is not sketched (only getReqSkillTries); the experience stage multiplier is omitted; unsigned 64-bit integer arithmetic is replaced by JavaScript numbers (safe for these sizes); the donor adds the HP gain to current health inside the loop and then refills, here only the refill is kept.
```ts
// Licence: GPL-2 (otland-forgottenserver) | clean-room: written from the mechanism, no donor lines.
interface Vocation { hpGain: number; capGain: number; skillBase: number; skillMult: number; }
interface Hero { level: number; exp: number; hp: number; maxHp: number; cap: number; levelPercent: number; }

// Cumulative exp needed to reach a level (theirs: the cubic).
function expForLevel(lv: number): number {
  return Math.floor((((lv - 6) * lv + 17) * lv - 12) / 6) * 100;
}

function addExperience(h: Hero, v: Vocation, exp: number): void {
  let cur = expForLevel(h.level);
  let next = expForLevel(h.level + 1);
  if (cur >= next) { h.levelPercent = 0; return; }       // max level: nothing is added
  if (exp === 0) return;
  h.exp += exp;
  const prev = h.level;
  while (h.exp >= next) {
    h.level++;
    h.maxHp += v.hpGain;
    h.cap += v.capGain;
    cur = next;
    next = expForLevel(h.level + 1);
    if (cur >= next) break;                              // cap reached after this increment
  }
  if (h.level !== prev) h.hp = h.maxHp;                  // full refill on level change
  // integer percent from basis points, truncated
  h.levelPercent = next > cur ? Math.floor(Math.floor(((h.exp - cur) * 10000) / (next - cur)) / 100) : 0;
}

// Geometric requirement for a skill level (theirs: base and multiplier; minimum skill level 10).
function reqSkillTries(v: Vocation, level: number): number {
  return Math.floor(v.skillBase * Math.pow(v.skillMult, level - 11));
}
```

## 5. Lands in
- Frankendom file(s): TARGET origins/progression/model.ts (exists). Its levelOfCredit(credit, cap) already is the multi-level loop on a cumulative threshold (several levels from one award), with an integer cumulative(level) in place of the donor's cubic, so the donor adds nothing to build. Health and the other per-level numbers resolve through src/fight/stats.ts (statsAt(id, level)), so the donor's per-level HP, mana and capacity gains have no consumer. The "stage multiplier by level" idea (ConfigManager::getExperienceStage) is already covered by the falloffPermille and type weights in model.ts.
- Parity-checklist row: 18 (loot roll and XP award). addSkillAdvance is skill training, beyond the 22 rows.
- Reuse tag: rewrite-from-idea (GPL-2; mechanism only), not planned.
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks
- Frankendom ruling "server-verified kills": this is server state in the donor, but the exp amount is whatever the caller passes and a script hook runs on it first and may rewrite it (1766, hook body not read). Frankendom's CP comes only from a server-replayed kill (origins/server/mob-rewards.ts), with no hook that edits it.
- Frankendom ruling "one ledger": the donor changes level, health, mana, capacity, party state and sends messages in one function, but persists elsewhere (not read). Frankendom writes CP and level in one transaction.
- The loop refills health and mana fully on any level change (1790-1792). Frankendom's respawn rule (row 17) must agree; stats come from the catalogue, so a refill is a fight-start rule, not a level-up rule.
- The max-level check happens twice, before adding (so an XP grant at the cap is discarded entirely, 1759-1764) and after each increment. Frankendom's cap is the ladder cap passed to model.ts functions (46 to 50 per its comment).
- Threshold and vocation tables are theirs; Frankendom's curve is requirement() in model.ts, not a donor constant. No hidden numbers: any per-level gain would be a catalogue field.
- Offline training, stamina and party shared-exp internals sit in other code and were not read; getExperienceStage was not read.
- GPL-2: mechanism only, no code lifted.
