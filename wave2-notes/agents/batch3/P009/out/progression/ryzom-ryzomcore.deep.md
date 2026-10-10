# ryzom-ryzomcore (progression, cell 10)

Donor: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/progression/progression_pve.cpp` | Licence: AGPL-3.0 or later (file header lines 5-7: "GNU Affero General Public License as ... version 3 ... or (at your option) any later version"; root LICENSE is the AGPL v3 text) | C++ | symbol `CCharacterProgressionPVE::creatureDeath`

Checked: `creatureDeath` is at progression_pve.cpp 306-509 (read 306-470; 470-509 not read). Also read in full: `getProgressionFactor` 515-565 and `getXpGain` 571-574; `addDamage` 1345-1466; `enableXpGainForPlayer` 1471-1529; `CCharacterActions::addAction` 1851-1879 and `CSkillProgress::incNbAction` 2033-2050; `CCharacterActions::dispatchXpGain` 1936-2007; `CSkillProgress::applyXp` 2056-2140 (the tail 2141-2230 not read); `getMaxInflictedDamageTeamIndex` in progression_pve.h 273-288; `CStaticSuccessTable::getXPGain` in egs_sheets/egs_static_success_table.h 144-151 and 210-219; `CCharacter::addXpToSkillAndBuffer` in player_manager/character.cpp 20065-20068, which hands off to `addXpToSkillInternal` (not read). Not read: the numeric XP-per-delta table (loaded from sheets); the MIN/MAX/MIDDLE_DELTA_LVL constants (not located by grep); `addXpToSkillInternal` (XP to skill points and levels); the curative and simple-action paths 646-746 (only line 743 seen by grep); the caller of `enableXpGainForPlayer`; the body of `enableXP` in progression_pve.h. The hint file `egs_sheets/egs_sheets.cpp` is sheet loading, not progression. Confidence: high on the order of the kill-time award and its numbers; medium on the complete per-action XP path, and the note covers the award, not the level curve.

## 1. Mechanism

Two stages. Stage one (during combat) records who hurt the creature and what actions they took. Stage two (at death) pays XP to one group only.

Stage one, damage credit: `addDamage` (1345-1466) ignores player-on-player damage (1348). Damage from a player is credited to that player's team entry if the player is in a team (1413-1421), or to the solo player entry otherwise (1441-1450). Each entry keeps one running `TotalDamage` (1416, 1444). Creature-on-creature damage is kept separately and is not used for XP.

Stage one, action record: `offensiveActionReported` (580-619) calls `addAction` for a player acting on a creature (618). `addAction` (1851-1879) creates the per-creature record on the first action and always counts that first action (1868). Each further reported action with a skill adds one to that skill's count (1878; `incNbAction` 2033-2050, counts at 2041 and 2048). So XP is pooled per (player, creature), and the pool later splits by how many actions the player took in each skill.

Stage one, skill reference: `enableXpGainForPlayer` (1471-1529) raises the group's `MaxSkillValue` to the player's skill value (1496-1497 for solo players). For a team it calls `enableXP` on the team's entry (1524; the body is in progression_pve.h, not read). It only enables creatures within `MaxDistanceForXpGain` for team members (1513-1515).

Stage two, `creatureDeath` (306-509), in order:
1. If nobody has damaged the creature, the creature's own entity gets loot rights and the function returns (308-318). No XP.
2. Mission kill attribution (324).
3. Credit group: the entry with the largest `TotalDamage` (327; progression_pve.h 273-288). The comparison is strict and starts at 0, so a zero entry is never chosen. With no winner (index -1), no XP is paid (330).
4. Delta = `MaxSkillValue` of that group minus the creature's XP level (340-341).
5. Factor = success table `FightPhrase` XP value at that delta (343). The table lookup clips the delta to a min and max and reads one row (egs_static_success_table.h 147-150).
6. Team group (346-399): loot rights to the team (349). Divisor = `1 + (members - 1) * XPTeamMemberDivisorValue` (360). For each member with `GainXp`: the factor is kept, unless the member is farther than `MaxDistanceForXpGain` and not on the creature's aggro list, in which case the factor is set to 0 (370-376). Each member is dispatched with that divisor and factor (382).
7. Solo group (400-428): loot rights to the player (404); dispatched with divisor 1 and the factor (414).
8. Mission auto-quartering (430-470), random item gifts. Read, but not analysed in this note.

`dispatchXpGain` (1936-2007), for one player and one creature:
- Creature XP value = the form's `getXPGainOnCreature` (1955). The initial value 10 (1944) is overwritten when a form exists. If the creature or its form is missing, the function returns false with no XP (1960-1970).
- Per-player XP = `min(MaxXPGainPerPlayer, factor x creatureXP / divisor)` (1981). Default cap 30 (egs_variables.cpp 46).
- The player's record for this creature is applied (1983-1986). If XP was gained and the creature's faction is set, fame is lost on the killer (1989-2001). The record is then removed (2003-2004).

`CSkillProgress::applyXp` (2056-2140): total known-skill actions are summed, skipping unknown-skill actions (2062-2068). Each known skill gets `NbActions / total x xpGainPerOpponent` (2091). Skills with a share above 0 are passed to `addXpToSkillAndBuffer` (2111-2115), which hands off to `addXpToSkillInternal` (not read).

Newbie scaling (`getProgressionFactor`, 515-565) applies only when `scaleForNewbies` is set (517). For a player the skill value is the skill's base plus 10 (543), walking up the skill tree while the base is zero (539-542). For a creature it is the attack level plus 10 (553). Then `minimum = min(50, skillValue)` (556) and `delta *= 50 / minimum` with integer division (561). The kill-time award does not use this path: line 343 calls the success table directly.

Global multiplier: `SkillProgressionFactor` defaults to 1.0 (entities_game_service.cpp 1091) and multiplies every `getXpGain` result (progression_pve.cpp 573).

## 2. Key functions

- `creatureDeath`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/progression/progression_pve.cpp` 306-509. Kill-time credit group, delta, factor, team or solo dispatch.
- `dispatchXpGain`: same file, 1936-2007. Per-player cap and divisor.
- `applyXp`: same file, 2056-2140. Split of the pool across skills by action share.
- `addDamage`: same file, 1345-1466. Team or solo damage credit.
- `enableXpGainForPlayer`: same file, 1471-1529. Skill reference and distance gate for enabling.
- `getProgressionFactor` and `getXpGain`: same file, 515-574. Newbie scaling, global multiplier.
- Success table: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/egs_sheets/egs_static_success_table.h` 144-151, 210-219.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Pay the kill to the group with the largest damage total; strict comparison from 0 (327; h 273-288) | None |
| Delta = group's highest skill minus creature level (340-341) | None |
| Team divisor = 1 + (n - 1) x c (360) | c = 0.9 (theirs, egs_variables.cpp 45) |
| Per-player XP = min(cap, factor x creature XP / divisor) (1981) | cap 30 (theirs, egs_variables.cpp 46) |
| Distance gate: zero factor beyond range unless on the aggro list (371-375) | 50 m (theirs, egs_variables.cpp 44) |
| Pool split by action share per skill (2091) | None; unknown skills excluded (2066) |
| Newbie scale = delta x floor(50 / min(50, skill + 10)) (556-561) | 50 (theirs), +10 (theirs), minimum 10 when zero (theirs, 557-559) |
| Creature XP value from form (1955) | Default 10 in the initial value only (1944); missing form returns false (1960-1964) |
| Global multiplier (573) | Default 1.0 (theirs, entities_game_service.cpp 1091) |

## 4. TypeScript sketch

simplified: keeps the donor order at death: the credit group by largest damage total, the team divisor 1 + (n - 1) x 0.9, the per-player cap, and the distance-or-aggro gate. Also kept: the action-share pool split and the newbie scale with integer division. Two differences from the donor: `winningGroup` returns the first group with the largest total, so if every group has zero damage it returns a zero-total group, whereas the donor pays nothing in that case (the caller must drop zero-damage contributors first); and the sketch does not compute the delta or call the success table, it only carries the group's highest skill in the `skill` field for the caller. Omitted: `addDamage` bookkeeping (team and solo entries, player-on-player filter), `enableXpGainForPlayer`, the creature-on-creature damage path, the loot-rights and team membership changes, the `GainXp` flag, the fame loss on kill, the skill-tree walk for newbie scaling (the skill value is passed in), the mission auto-quartering, the XP messages and buffer, `addXpToSkillInternal` (XP to skill points and levels), and the success table values (passed in as a function, because they are loaded from sheets and were not read).

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface SkillCount { id: string; actions: number; }

// Share of one player's XP pool per skill: pool x (actions in that skill / all known actions). Unknown skills are skipped.
function splitPoolBySkill(pool: number, skills: SkillCount[]): Record<string, number> {
  const known = skills.filter((s) => s.id !== 'unknown');
  const total = known.reduce((a, s) => a + s.actions, 0);
  const out: Record<string, number> = {};
  if (total === 0) return out;
  for (const s of known) out[s.id] = (pool * s.actions) / total;
  return out;
}

// Newbie scaling of the level delta: multiply by floor(50 / min(50, skill + 10)), integer division, minimum 10 when zero.
function scaleDeltaForNewbies(delta: number, skillBase: number): number {
  const minimum = Math.min(50, skillBase + 10) || 10;
  return delta * Math.floor(50 / minimum);
}

// Per-player XP for one creature kill: the creature's XP value times the difficulty factor, divided by the team term,
// then capped per player. The team term is 1 + (members - 1) x 0.9 (a data constant in the donor).
function perPlayerXp(difficultyFactor: number, creatureXp: number, teamSize: number, cap: number): number {
  const divisor = 1 + (Math.max(1, teamSize) - 1) * 0.9;
  return Math.min(cap, (difficultyFactor * creatureXp) / divisor);
}

interface Contributor { team: string | null; player: string; damage: number; skill: number; }

// Winner takes the kill: the group (team, or a lone player) with the most total damage. Its highest skill sets the delta.
function winningGroup(contributors: Contributor[]): Contributor[] {
  const totals = new Map<string, { sum: number; members: Contributor[] }>();
  for (const c of contributors) {
    const key = c.team ?? c.player;
    const entry = totals.get(key) ?? { sum: 0, members: [] };
    entry.sum += c.damage;
    entry.members.push(c);
    totals.set(key, entry);
  }
  let best: { sum: number; members: Contributor[] } | undefined;
  for (const e of totals.values()) if (!best || e.sum > best.sum) best = e;
  return best ? best.members : [];
}

// Distance gate: a member farther than maxDist gets no XP unless it is on the creature's aggro list.
function gatedFactor(factor: number, dist: number, maxDist: number, onAggroList: boolean): number {
  return dist > maxDist && !onAggroList ? 0 : factor;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/xp.ts` (new engine step: the XP award at kill, one group, one divisor, one cap, one distance gate). Parity-checklist row 18 (loot roll and XP award).
- Best transferable idea: pay a kill to the single group with the most recorded damage, split the creature's XP by a fixed team divisor, cap each share, and give nothing to a member who is out of range and not on the hate list.
- Reuse tag: rewrite-from-idea (AGPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the award is a server-side step); rules 7-9 n/a

## 6. Gaps and risks

- AGPL-3.0 or later: clean-room only. The sketch is written from the mechanism; no donor lines are translated.
- Server-verified kills: the donor runs this award in the entities service (`ryzom/server/src/entities_game_service`), which is server-side. Its credit is based on damage the server recorded in `addDamage`. Frankendom should keep the credit to server-recorded hits and never to a client report.
- MAX_ATTACKERS = 3: `addDamage` has no cap. Every team or player that damages the creature gets an entry (1413-1450), and the largest entry wins. Frankendom must decide whether damage from a fourth attacker counts toward credit; the donor counts it.
- One ledger: the donor puts XP into the character through `addXpToSkillAndBuffer` with a buffered client message (progression_pve.cpp 2111-2115; character.cpp 20065-20067). Frankendom should write the award once to the ledger. The buffer is a client-message detail. The XP-to-level path (`addXpToSkillInternal`) was not read, so the level curve is not claimed.
- Hate list: the donor's distance gate reads the creature's aggro list (373-375). Frankendom's hate list lives in the engine, so the gate should read that list and not a separate set.
- Zones as data: the 50 m range, 0.9 team divisor, 30 XP cap, and the newbie base 50 are global cvars (egs_variables.cpp 44-46). Frankendom wants them as zone or catalogue fields.
- Integer division: newbie scaling uses integer division (progression_pve.cpp 561). Frankendom should define its rounding explicitly rather than inherit this.
- Warning, not a cap: `dispatchXpGain` warns when a computed XP is above 150 (1973-1978), but the only cap is `MaxXPGainPerPlayer` (1981). Frankendom needs one explicit cap.
- XP split by action share, not by damage (2091): a skill with many cheap actions takes more of the pool. This is a design choice Frankendom should make on purpose.
- Unread: the tail of `creatureDeath` (470-509), the tail of `applyXp` (2141-2230), the curative and simple-action paths (646-746), and `addXpToSkillInternal` (the XP-to-skill-points and level curve).
