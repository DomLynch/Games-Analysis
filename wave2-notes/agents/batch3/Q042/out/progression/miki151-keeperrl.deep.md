# miki151-keeperrl (progression, cell 2)

Donor: `/mnt/frankendom-donors/miki151-keeperrl/creature.cpp` | Licence: GPL-2.0-or-later (creature.cpp header: "either version 2 ... or (at your option) any later version"; `LICENSE` is the GPL v2 text; `data/` media files are separately licensed and not used here) | C++ | symbol `Creature::updateCombatExperience`

Checked: The list hint (creature.cpp) was the right file for this topic, but the mechanism spans three files, and I grepped for `experience`, `levelUp`, `attacker` and `kill` to find them. Read in full: `Creature::updateCombatExperience` (creature.cpp 1250-1269), `getCombatExperience` and `getCombatExperienceCap` (1210-1241), `getRawAttr` (1200-1208), `getBestAttackWithExp` (2183-2196), the peak update in `Creature::tick` (1397), `onKilledOrCaptured` (1279-1290, read to the kill-list line), `getsCreditForKills` (1271-1277), the kill path in `dieWithAttacker` (2030-2080, the credit and kill lines), `Collective::updateTeamExperience` (collective.cpp 497-512), `Collective::updateMinionPromotions` (collective.cpp 608-614), `getMaxPromotionLevel` and `getRequiredLuxury` (creature_experience_info.cpp 7-16). Callers: `updateCombatExperience` has one caller (creature.cpp 1281, inside `onKilledOrCaptured`). `onKilledOrCaptured` is called from the capture path (creature.cpp 1796-1798, read) and from `dieWithAttacker` (2075, read). `getCombatExperience` has many callers; I read the definition and three of them (1397, 2180, 1168). Not read: the body of `getAttrBonus` (called at creature.cpp 1174, so buffs and gear may enter the peak), the LEADERSHIP buff definition, the caller of `Collective::update` (collective.cpp 516 is the call inside it), the `Rectangle::centered` size semantics (`getsCreditForKills`, 1272), and the separate training system (`increaseExpLevel`, creature.cpp 2160-2178, read only as a level message). Camera scope: not applicable (progression). Confidence: high on the per-kill gain and the cap; medium on the team and leadership rule, because the buff's source was not read.

## 1. Mechanism

- Two numbers per creature. `combatExperience` is a double that grows with kills and is never reset. `highestAttackValueEver` is an int peak, refreshed every tick (creature.cpp 1397) as the maximum of the best attack value computed from the uncapped combat experience. The best attack value is the maximum over attack attributes of `getAttrWithExp` (2183-2196). Combat experience is added to an attribute's raw value only for attributes that qualify (1200-1208: attributes with a max experience level, DEFENSE, or a positive non-fixed raw value).
- Kill path. In `dieWithAttacker`, the credited creature is found first (2042: `getsCreditForKills`, which returns a nearby creature that holds the kill credit, otherwise the attacker itself, 1271-1277). Then the killer's `onKilledOrCaptured(victim)` runs (2075). The same method runs from the capture path (1796-1798).
- `onKilledOrCaptured` (1279-1290): farm animals and illusions skip the experience update (1280). Otherwise `updateCombatExperience` runs first (1281), the killer gains difficulty points (1284), and the kill is logged.
- `updateCombatExperience` (1250-1269), order of steps: (a) gate: the killer must have a brain and the victim's `grantsExperience` must be true (1251; default true, creature_attributes.h 142). (b) `attackDiff = victim.highestAttackValueEver - killer.highestAttackValueEver` (1252). (c) gain = clamp(0.02, 3.0, (3.0 - 0.5) x attackDiff / 10 + 0.5) (1253-1258). In other words the gain is 0.5 when the peaks are equal, rises by 0.25 per point of attack gap, is 3.0 at a gap of 10 or more, and is floored at 0.02. (d) `combatExperience += expIncrease` (1260). (e) If the integer part changed (1259-1262), the message, a personal event, a sound and an effect fire (1263-1267). These are presentation calls made inside the engine.
- The value used for attacks (1210-1221). With `respectMaxPromotion`, the own value is capped at `5 x maxPromotion` (1213, 1240). With `includeTeamExp`: if the creature has the leadership flag, the value is the team value (1215-1216); else if the team value is above 0, the value is the mean of team and own (1217-1218). Otherwise it is the own capped value.
- Team value (collective.cpp 497-512). For each active team, every member's team value is reset to 0 (499). The scan then runs over the members. A member with the LEADERSHIP buff sets the team value to its capped combat experience, sets the leadership flag, and stops the scan (504-506). Otherwise the team value is the max of the members' capped values (509). Every member is then given the team value and the flag (511). This runs at the start of `Collective::update` (516).
- Promotion cap (collective.cpp 608-614; creature_experience_info.cpp 7-9). If the collective config requires quarters, each minion's `maxPromotion` is `int(2 + round(10 x luxury) x 0.1 / 3)` where luxury is the quarters luxury looked up by the creature's unique id, -1 if it has none (613). If quarters are not required, the function returns early (609), and `maxPromotion` keeps its default 10000 (creature.h 453), so the cap does not bind.
- Timing. The gain happens at the kill (event-driven, 2075). The peak is per tick (1397). The team value is per collective update (516). No fixed-step accumulator is involved.

## 2. Key functions

- `Creature::updateCombatExperience`: `/mnt/frankendom-donors/miki151-keeperrl/creature.cpp` 1250-1269. The gain curve and the level-up event.
- `Creature::getCombatExperience` and `getCombatExperienceCap`: `/mnt/frankendom-donors/miki151-keeperrl/creature.cpp` 1210-1241. Cap, team blend, leadership override.
- `Creature::tick` (peak update): `/mnt/frankendom-donors/miki151-keeperrl/creature.cpp` 1397.
- `Creature::getBestAttackWithExp`: `/mnt/frankendom-donors/miki151-keeperrl/creature.cpp` 2183-2196.
- `Creature::onKilledOrCaptured`: `/mnt/frankendom-donors/miki151-keeperrl/creature.cpp` 1279-1290.
- `Creature::dieWithAttacker` (kill credit and kill call): `/mnt/frankendom-donors/miki151-keeperrl/creature.cpp` 2030-2080, credit at 2042, kill call at 2075.
- `Creature::getsCreditForKills`: `/mnt/frankendom-donors/miki151-keeperrl/creature.cpp` 1271-1277.
- `Collective::updateTeamExperience`: `/mnt/frankendom-donors/miki151-keeperrl/collective.cpp` 497-512.
- `Collective::updateMinionPromotions`: `/mnt/frankendom-donors/miki151-keeperrl/collective.cpp` 608-614.
- `getMaxPromotionLevel`: `/mnt/frankendom-donors/miki151-keeperrl/creature_experience_info.cpp` 7-9.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Gain per kill = clamp(floor, ceiling, linear in the attack gap between victim and killer) | Ceiling 3.0, floor 0.02, equal-peak gain 0.5, full-gain gap 10 attack points (creature.cpp 1253-1256) |
| Linear slope of the gain in the gap | (3.0 - 0.5) / 10 = 0.25 per attack point (derived from 1253-1256 and 1258) |
| Level-up event when the whole number changes | None (control, 1259-1262) |
| Cap on the value used for combat | 5 per promotion level (creature.cpp 1240) |
| Max promotion from luxury | int(2 + round(10 x luxury) x 0.1 / 3) (creature_experience_info.cpp 8) |
| Max promotion default | 10000 (creature.h 453), so no effective cap when quarters are not required |
| Team blend for non-leaders | Mean of own and team value (creature.cpp 1218) |
| Leadership override | Team value replaces own value (creature.cpp 1216) |
| Team value: best capped member, or the leader's value if a leader exists | None (control, collective.cpp 504-509) |
| Peak attack tracked per tick | None (creature.cpp 1397) |
| Presentation on level change | Message, sound and effect, all in the engine (1263-1267) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: gate, attack gap, clamped gain, add, level change flag. It also keeps the cap, the team scan (leader ends the scan, otherwise best capped member) and the blend used for attacks. It omits: the kill-credit redirection (`getsCreditForKills`), difficulty points and the kill log, the farm-animal and illusion exclusions (the caller passes `eligible`), the choice of which attributes get combat experience (1200-1208), the message, sound and effect calls (client work in Frankendom), the `int` peak (the caller passes a number), and the promotion-cap formula (the caller passes `maxPromotion`). It keeps the donor's double arithmetic; Frankendom must replace it with integer milli-XP.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch of the mechanism, not a translation of the donor lines.
// Gain constants are inputs (designer data) here; the donor's values are not copied into the rules object.
// clean-room
interface CombatXp {
  xp: number;            // stored combat experience (fractional)
  peakAttack: number;    // highest attack value seen so far (integer in the donor)
  maxPromotion: number;  // cap on the value used for attacks is 5 x maxPromotion
}

interface XpRules {
  maxGain: number;        // largest gain per kill
  minGain: number;        // smallest gain per kill (floor against farming weak enemies)
  equalGain: number;      // gain when victim and killer have the same peak attack
  gapForMaxGain: number;  // attack gap at which the largest gain is reached
}

// Gain is linear in the attack gap between victim and killer, clamped to [minGain, maxGain].
function killGain(killer: CombatXp, victimPeak: number, rules: XpRules): number {
  const gap = victimPeak - killer.peakAttack;
  const linear = (rules.maxGain - rules.equalGain) * gap / rules.gapForMaxGain + rules.equalGain;
  return Math.max(rules.minGain, Math.min(rules.maxGain, linear));
}

// Only eligible killers gain. Returns true when the whole-number level changed (the donor plays its level-up cue here).
function awardKill(killer: CombatXp, victimPeak: number, eligible: boolean, rules: XpRules): boolean {
  if (!eligible) return false;
  const before = Math.floor(killer.xp);
  killer.xp += killGain(killer, victimPeak, rules);
  return Math.floor(killer.xp) !== before;
}

// The value used for attacks is capped by the promotion cap (5 per promotion level).
function cappedXp(c: CombatXp): number {
  return Math.min(5 * c.maxPromotion, c.xp);
}

interface TeamMember {
  c: CombatXp;
  leader: boolean;       // carries the leadership buff
}

// Team value: the leader's capped value if a leader exists (and stops the scan); otherwise the best capped member.
function teamValue(members: readonly TeamMember[]): { value: number; leadership: boolean } {
  let value = 0;
  for (const m of members) {
    if (m.leader) return { value: cappedXp(m.c), leadership: true };
    value = Math.max(value, cappedXp(m.c));
  }
  return { value, leadership: false };
}

// A member's effective value for attacks: the team value under leadership, otherwise the mean of own and team value.
function effectiveXp(member: CombatXp, team: { value: number; leadership: boolean }): number {
  const own = cappedXp(member);
  if (team.leadership) return team.value;
  if (team.value > 0) return (team.value + own) / 2;
  return own;
}

// Peak attack is raised each tick from the uncapped value (the caller computes bestAttackUncapped).
function updatePeak(c: CombatXp, bestAttackUncapped: number): void {
  c.peakAttack = Math.max(c.peakAttack, bestAttackUncapped);
}
```

Typecheck: the block plus `export {}` passes `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (exit 0, file `/tmp/miki151-keeperrl-xp.ts`).

## 5. Lands in

- TARGET `src/fight/xp.ts` (proposed; the same module as the alexbatalov-fallout1-ce cell, since both are per-kill XP). Parity-checklist row 18 (loot roll and XP award).
- Kill credit and the peak attack are computed at the server-verified kill and the server tick (checklist row 18; post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget" for the per-tick peak update). The level event goes to the client as a presentation cue.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: addendum anti-strictness rules 1-6 (real code opened, no genre downgrade, honest licence); Frankendom rulings "one ledger", "kills are server-verified", "camera/HUD/sound are client-only"

## 6. Gaps and risks

- The peak is the highest value ever seen, and it is computed from `getAttrWithExp`, which goes through `getAttrBonus` (creature.cpp 1174, body not read). A buff or gear spike held for one tick can raise the peak for good. Frankendom should take the peak from the verified attack in the duel, and it must decide whether a buff-only spike counts.
- Many-on-one fights (MAX_ATTACKERS = 3). The donor credits one creature with the whole gain. There is no split and no assist. Frankendom needs a credit rule for three attackers before this curve can be used in a fight; the donor does not have one.
- Kill credit redirects to a nearby creature (1271-1277), by a proximity scan (`Rectangle::centered(10)`, size semantics not read). Frankendom's kills are server-verified and must not use a proximity rule to choose the credited hero.
- Combat experience is a double summed over kills, and the level is its floor. Frankendom's server must store integer milli-XP so a replay (checklist row 19) is exact.
- The level-up message, personal event, sound and effect are called from inside the creature update (1263-1267). Frankendom's camera, HUD and sound are client-only, so the engine should emit a level event and the client should play it.
- The cap depends on quarters luxury (creature_experience_info.cpp 8), which is a Keeper building rule. If the rule is off, the default 10000 means no cap (creature.h 453). Frankendom should set any cap as zone data with an explicit value, not a default that disables it.
- The leadership override (1216, collective.cpp 504-506) makes every member of a team use the leader's value. The source of the LEADERSHIP buff was not read. Only adopt this if Frankendom wants a leader-carry rule; it sits against one-character one-ledger.
- Not read: `getAttrBonus`, the LEADERSHIP buff, the caller of `Collective::update`, and the training system (`increaseExpLevel`, a separate per-attribute system).

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only)
Brief rule served: addendum rules 1-6; Frankendom rulings "one ledger", "kills are server-verified", "client-only camera/HUD/sound"; parity row 18

Best transferable idea: Scale XP per kill by how far the victim's peak attack sits above the killer's, clamped between a small floor and a ceiling, so farming weak enemies earns almost nothing and a strong upset earns the most.
Decision (proposed): adapt - the gap-scaled gain with a floor is the piece Frankendom lacks (its XP is per-monster and flat); Frankendom must use the verified duel attack for the peak (not a buff spike), integer milli-XP, a credit rule for MAX_ATTACKERS = 3, and no proximity credit or leader-carry rule.
Acceptance: a server test: a victim whose peak attack is 10 or more above the killer's gives the ceiling gain (3.0, i.e. 3000 milli-XP if stored as integers); equal peaks give 0.5; a victim 2 or more points weaker gives the 0.02 floor; the level event fires once when the whole-number part changes.
