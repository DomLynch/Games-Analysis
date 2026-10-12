# cmangos-mangos-classic (enemy-ai-behaviour, cell 2)

Donor: `/mnt/frankendom-donors/cmangos-mangos-classic/src/game/Combat/ThreatManager.cpp` (selection 331-424, sort 288-325) with `Combat/CombatManager.cpp` (leash and combat timer 47-200) and `Entities/Unit.cpp` 626-640 and 8691-8775 | Licence: GPL-2.0 (read: LICENSE, "GNU GENERAL PUBLIC LICENSE / Version 2, June 1991"; source headers say "version 2 of the License, or (at your option) any later version") | C++ | symbol `ThreatManager::getHostileTarget` (with `ThreatContainer::selectNextVictim`)

Checked: Read end to end: `ThreatManager.h` 58-249, `ThreatManager.cpp` 1-703 (threat calc, reference states, sort, selection, add, taunt, fixate, suppression, out-of-range drop), `HostileRefManager.cpp` 25-110 (threat assist split and fade clamp), `CombatManager.h` 30-60 and `CombatManager.cpp` 1-200 (leash, combat timer, evade timer), `Unit.cpp` 626-640 (evade expiry), 1205-1222 (damage threat), 7909-7982 (combat start position), 8017-8023 (engage), 8691-8775 (SelectHostileTarget), `UnitAI.cpp` 113-130 and 1084-1088, `CreatureAI.cpp` 66-71, `Creature.h` 100-122 and 837, `Unit.h` 1631, `Spells/SpellMgr.h` 2088-2095. Data: `sql/base/mangos.sql` 1255-1262 and 14023-14034, two migrations, `World.cpp` 703. Not read: the rooted (ranged-skip) branch beyond 377-389 in full, `CreatureLinkingMgr.cpp` (group linking; only grep hits), the 9000-line AI scripts. Confidence high on selection order and numbers; medium on the claim that every AI tick reaches `getHostileTarget` (read the call site 8728 and the caller 1088, not every AI subclass). Camera: n/a.

Best transferable idea: Keep the current target until a rival has more than 110 percent of its threat (130 percent if the rival is at range), with taunt and suppression applied first, and drop an unreachable target after 10 seconds so the next hater takes over or the NPC goes home.
Decision (proposed): adapt — Frankendom needs the hate list and target pick inside the engine for many-on-one, and the 110/130 hold is a cheap anti flip-flop rule that fits the three-attacker cap; GPL-2.0 means clean-room only, and the null dereference in getThreat and the dead Timeout column are fixed in the rewrite.
Acceptance: Server test: a melee rival at 115 percent of the current victim takes over, a ranged rival at 115 percent does not (needs 130), a taunted hater takes over at any threat, and an NPC whose only hater is unreachable for 10 s goes home while one with two haters drops the first and attacks the second.

## 1. Mechanism

- Each NPC keeps a threat table: one `HostileReference` per attacker, holding stored threat (float), hostile state (normal or suppressed), taunt state, fade reduction, the attacker's guid, online and accessible flags (ThreatManager.h 58-141). Two lists: online (`iThreatContainer`) and offline (`iThreatOfflineContainer`, for unreachable attackers) (ThreatManager.h 242-245).
- Threat in: a damaging spell or melee hit adds `damage * spell threat multiplier` (Unit.cpp 1213-1214). The multiplier comes from a data row (`spell_threat`, section 7). Non-DOT, non-shield damage also sets both units in combat and starts the combat timer (1215-1219; the DOT test is at 1215). Adding threat runs through `CalcThreat` (ThreatManager.cpp 465) and then creates a reference if none exists (477-481). A pet's attack also adds a zero-threat entry for the pet owner (486).
- Heals and buffs: `threatAssist` sends 0.5 x heal x multiplier in total, split evenly across the healed unit's valid haters (Spell.cpp 1249; HostileRefManager.cpp 39-68, split at 60-61). Crowd-controlled haters are skipped (55). Each receiving hater also gets a combat timer refresh (66).
- Sort (`ThreatContainer::update`, ThreatManager.cpp 288-325), run only when the list is dirty, forced or player-owned (290): taunt state descending (310-311; fixate above taunt above none), then, when the sort is forced (rooted owner), targets in melee reach first (312-318), then normal before suppressed (319-320), then threat descending (321). Player-owned lists first put players ahead, and then attackable targets (293-309).
- Taunt state has three values: none, taunted, and fixated (the top value, UINT32_MAX; ThreatManager.h 50-55). Fixate sorts above taunt in the same comparison (310-311), and the taunt override in the pick (365) uses the same ordering.
- Pick (`selectNextVictim`, 331-424), walking the sorted list against the current victim:
  1. The current victim is found: keep it (354-363).
  2. A taunted rival beats a non-taunted current (365-369).
  3. A player rival beats a non-player current (371-375).
  4. Rooted attackers skip ranged rivals (377-389).
  5. A normal rival beats a suppressed current (391-395).
  6. A rival at or under 110 percent of the current victim's threat: keep the current (398-403).
  7. A rival above 130 percent, or above 110 percent when it can reach in melee: switch (405-411).
  Anything that is not found returns nothing (420-421).
- Each AI tick: `UnitAI::UpdateAI` calls `SelectHostileTarget` (UnitAI.cpp 1088). That calls `getHostileTarget` (Unit.cpp 8727-8728), which sorts and picks, and then makes the NPC face and attack the target (8745-8754).
- Combat timer and leash (`CombatManager::Update`, CombatManager.cpp 47-142): the check runs every 1200 ms (25, 77). The combat timer is set to the creature's Pursuit value, or 5000 ms for player-versus-player (192), and the position at refresh is saved (193). A refresh happens on each damaging hit (Unit.cpp 1219) and on engage (8023). When the timer runs out and the victim is more than the configured leash radius (default 30) from the last refresh position, the creature leaves combat (110, then `HandleExitCombat`). When no scripted leash check is set (124-130), a creature with a Leash value also leaves when it is farther than Leash from its combat start position (131-136). The combat start position is set on entering combat (Unit.cpp 7981-7982, inside `SetInCombatState`).
- Evade timer: when the target cannot be reached, the NPC starts a 10 s evade timer (Unit.cpp 8762-8773; CombatManager.h 46). On expiry (CombatManager.cpp 53-56): if the threat table has one entry, the NPC evades home (Unit.cpp 633-636); otherwise the current victim is suppressed (639), so the next-best hater becomes the target (the suppressed reference sorts last).
- Evade home (`UnitAI::EnterEvadeMode`, UnitAI.cpp 113-130): clear combat-only roots, remove auras, stop combat with pets, move to home (123), then the creature resets its timers and state (CreatureAI.cpp 68-70).
- Drop distance: while the creature is immobilised outside dungeons, references more than 60 yards away are removed (CombatManager.cpp 84-86; ThreatManager.cpp 668-682, check at 672).
- Fade: a threat reduction is clamped so the stored threat cannot go below zero (HostileRefManager.cpp 82-99; clamp at 91; `addThreat` clamp at ThreatManager.cpp 110-111).

## 2. Key functions

- `ThreatContainer::selectNextVictim`: `/mnt/frankendom-donors/cmangos-mangos-classic/src/game/Combat/ThreatManager.cpp` 331-424. The pick with 110 and 130 percent rules.
- `ThreatContainer::update`: same file 288-325. Sort key.
- `ThreatManager::getHostileTarget`: same file 511-517. Calls the pick and stores the victim.
- `CombatManager::Update`: `/mnt/frankendom-donors/cmangos-mangos-classic/src/game/Combat/CombatManager.cpp` 47-142. Combat timer, leash by refresh position and by Leash value, out-of-range drop.
- `Unit::EvadeTimerExpired`: `/mnt/frankendom-donors/cmangos-mangos-classic/src/game/Entities/Unit.cpp` 626-640. One hater goes home, else suppress the victim.
- `Unit::SelectHostileTarget`: same file 8691-8775. Per-tick entry and the unreachable-target evade timer.
- `HostileRefManager::threatAssist`: `/mnt/frankendom-donors/cmangos-mangos-classic/src/game/Combat/HostileRefManager.cpp` 39-68. Heal and buff threat split across haters.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and values |
|---|---|
| Keep the current target until a rival is clearly ahead (anti flip-flop) | 110 percent keep (theirs, ThreatManager.cpp 398) |
| Ranged rivals need more lead than melee rivals | 130 percent for ranged (theirs, 405); 110 percent when in melee (theirs, 406) |
| Taunt and player priority ahead of threat | Taunt overrides (365); player over non-player (371) |
| Suppressed targets fall to the back of the list | Sort after normal (319-320); evade timer suppresses the victim (Unit.cpp 639) |
| Evade timer for an unreachable target | 10000 ms (theirs, CombatManager.h 46) |
| Combat timer for a fight | Pursuit ms: default 15000 (theirs, Unit.h 1631; migration z2815 line 3 sets 15000 where it was 0); 5000 ms for PvP (theirs, CombatManager.cpp 192) |
| Leash from the last hit position | LeashRadius default 30.f (theirs, World.cpp 703); check tick 1200 ms (theirs, CombatManager.cpp 25) |
| Leash from the combat start position | Leash column, default 0 = off (theirs, mangos.sql 1260) |
| Drop far attackers while immobilised | 60 yards (theirs, ThreatManager.cpp 672) |
| Heal threat | 0.5 x heal x spell multiplier, split across haters (theirs, Spell.cpp 1249; HostileRefManager.cpp 61) |

## 4. TypeScript sketch

simplified: keeps the donor's sort (taunt first, normal before suppressed, threat descending) and its check order for the current victim, taunt, player, suppressed, 110 percent keep, 130 or 110-in-melee switch; the evade timer is a separate one-line rule. The sketch keeps the three-state taunt (`taunt: 0|1|2`) and, with no current victim, returns the first list entry as the donor does (even if suppressed); it also omits the forced-sort melee-reach step (312-318). It omits the rooted ranged-skip branch (ThreatManager.cpp 377-389), the player-first sort for player-owned lists (293-309), the online and offline lists, the threat assist split, the fade reduction and the out-of-range drop. Its `null` return mirrors the donor's "not found" return; the caller decides what to do then.

```ts
// Licence of donor: GPL-2.0 (or later per source headers). Clean-room sketch written from the described mechanism (sort order, keep/switch ratios), not a translation of the donor lines.
// clean-room

export interface Hater {
  id: string;
  threat: number;       // stored threat, engine units
  taunt: 0 | 1 | 2;     // taunt state: 0 none, 1 taunted, 2 fixated (donor compares the state with >)
  suppressed: boolean;  // unreachable or dropped by evade timer
  inMelee: boolean;     // can reach this hater with a melee attack now
  isPlayer: boolean;
}

// Engine constants (donor values). Row fields would only change the evade timer and drop range.
export const KEEP_RATIO = 1.1;          // hold the current victim while no rival is above 110 percent
export const SWITCH_RATIO_RANGED = 1.3; // a rival at range must exceed 130 percent to take over
export const SWITCH_RATIO_MELEE = 1.1;  // a rival in melee reach needs only 110 percent
export const EVADE_TIMER_MS = 10000;    // unreachable target: act after 10 s

// Sort as the donor does: taunted first, normal before suppressed, then threat descending.
function sortHaters(list: Hater[]): Hater[] {
  return [...list].sort((a, b) =>
    (b.taunt - a.taunt) ||
    (Number(a.suppressed) - Number(b.suppressed)) ||
    (b.threat - a.threat));
}

// Walk the sorted list against the current victim, in the donor's order of checks.
export function selectVictim(list: Hater[], current: Hater | null): Hater | null {
  const sorted = sortHaters(list);
  // Donor with no current victim returns the first list entry even if suppressed (only ranged-skip filters it); mirrored here.
  if (!current) return sorted[0] ?? null;

  for (const rival of sorted) {
    if (rival.id === current.id) return current;                         // current is still the best
    if (rival.taunt > current.taunt) return rival;                       // taunt overrides
    if (rival.isPlayer && !current.isPlayer) return rival;               // player over non-player
    if (!rival.suppressed && current.suppressed) return rival;           // normal over suppressed
    if (rival.threat <= KEEP_RATIO * current.threat) return current;     // within 110 percent: keep
    if (rival.threat > SWITCH_RATIO_RANGED * current.threat ||
        (rival.threat > SWITCH_RATIO_MELEE * current.threat && rival.inMelee)) {
      return rival;                                                      // clearly ahead: switch
    }
  }
  return null;
}

// Evade timer expiry: a lone hater means go home, otherwise suppress the current victim.
export function onEvadeTimerExpired(list: Hater[]): 'evade-home' | 'suppress-current' {
  return list.length === 1 ? 'evade-home' : 'suppress-current';
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 ai003-cmangos-threat.ts` on the VPS, exit 0 (local copy in the AI003 work folder as `cmangos-threat.ts`).

## 5. Lands in

- TARGET `src/fight/ai.ts` (the threat table is the target list of the engine's brain: one hater list per creature, with `selectVictim` run each server tick before the attack step).
- Parity-checklist row 2 (AI brain). The unreachable-target evade timer and the Pursuit/Leash breaks feed row 4 (fight loop: aggro, chase, leash); this note cites row 2 only.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 1 (one engine: the threat table and its pick run in the server fight step; the client never picks a victim); MAX_ATTACKERS = 3 is not enforced by this mechanism (see section 6).

## 6. Gaps and risks

- Extra unreachable-target rules beyond the 10 s timer (Unit.cpp 8730-8769): a lone non-ranged hater that is flying and out of vertical reach gets `modifyThreatPercent(-101)` and an immediate evade with no timer (8764-8769); and when `getHostileTarget` returns nothing and the creature ignores ranged targets, it keeps the old target only if in melee reach, otherwise drops the attack (8730-8743). Keep both ideas: a vertical-reach test and a keep-only-if-reachable fallback.

- GPL-2.0: clean-room only. Shape and constants are described, not translated.
- Defect 1, null dereference (ThreatManager.cpp 530): `getThreat(victim, true)` looks in the offline list at 525-526, and if the victim is in neither list it calls `getReferenceByTarget(victim)->getThreat()` on a null pointer. Reasoned from the code, not run. Fix: return 0 when neither list has the victim.
- Defect 2, comment and code disagree on range (CombatManager.cpp 41 says "After 90yd"; the code uses 60 yards for out-of-range drops at 672 and the configured leash radius, default 30, at 110). Fix: one named constant per rule, in the row or the zone data, with the comment matching it.
- Defect 3, dead data column: `Timeout` is in the creature row struct (Creature.h 119) and described as "time for refreshing leashing before evade" (mangos.sql 1261), but grep for `->Timeout` found no reader in `src/game`. Fix: wire it into the evade timer or drop the column. Not verified beyond the grep.
- Defect 4, two defaults for Detection: base schema says 18 (mangos.sql 1257), the 2713 migration adds it with 20 (z2713 line 3). A fresh install and an upgraded one would differ. Fix: one default in the row schema.
- Gap against the rulings: the threat table is per creature, but the rulings say the many-on-one hate list lives in the engine with MAX_ATTACKERS = 3. The donor has no cap on how many haters can hit one NPC; the cap has to be added in the engine.
- Gap against the rulings: threat assist splits a heal across all haters (HostileRefManager.cpp 61). A healer on a three-attacker fight gives each attacker a third; that matches Frankendom's cap idea, but the healing row must set the total (see ruling 2).
- Gap against the rulings: rooted ranged skipping (377-389) is a hook for fight geometry; Frankendom's Pit is a fixed arena and does not need it, but a zone with a root effect would.
- The combat start position (Unit.cpp 7981-7982) is set once on entering combat; a creature that is reset and re-engaged gets a new one. Frankendom should store the anchor as a per-spawn field, not derive it at engage time.

## 7. As-data shape (PASS2)

- Data tables: `spell_threat` (`sql/base/mangos.sql` 14023-14034) and `creature_template` (`sql/base/mangos.sql` 1255-1262 plus migrations `sql/updates/mangos/z2713_01_mangos_creature_template_leashing.sql` and `z2815_01_mangos_pursuit.sql`). The threat table itself is runtime state, not a table.
- `spell_threat` row fields: `entry` (mediumint unsigned, key), `Threat` (smallint, read not checked), `multiplier` (float, default 1, "threat multiplier for damage/healing", line 14030), `ap_bonus` (float, default 0, line 14031), `InverseEffectMask` (int unsigned, default 0). Lookup falls back to 1.0 when no row exists (SpellMgr.h 2088-2095).
- `creature_template` threat/leash row fields used by this mechanism: `Detection` (uint32, aggro sight range; base default 18, migration default 20), `CallForHelp` (uint32, range), `Pursuit` (uint32, ms; default 15000), `Leash` (uint32, range from combat start; default 0 = off), `Timeout` (uint32, not read by any code found). Source: Creature.h 115-119; mangos.sql 1257-1261.
- Per-hater runtime fields (not a table): threat float, hostile state, taunt state, fade reduction, guid, online, accessible (ThreatManager.h 133-140).
- A new creature is one row: yes for Detection, Pursuit, Leash (the row says the number, the engine reads it; no code change). A new spell's threat weight is one row in `spell_threat`: yes. A new threat rule (say, a new taunt type) is code: no.
- Provenance per claim: all from `cmangos-mangos-classic` (GPL-2.0), file and line in sections 1-3 and the receipts file. Shape only.

## 8. What they patched later

- ChangeLog.md 382 (MaNGOS 0.7 section, line 373 onward): "Added: a threat based aggro system along with threat bonuses from spells." The origin of the threat table.
- ChangeLog.md 339 (MaNGOS 0.8 section, line 328 onward): "Added: a new threat manager was introduced." Rewrite of the threat code.
- ChangeLog.md 107 (MaNGOS 0.12.2 section, line 35 onward): "Evade distance is now based on the distance from the position that the creature was at when it entered combat." The current Leash check reads the combat start position (Unit.cpp 7981-7982).
- ChangeLog.md 95 (same section): "Added: Support for configurable assistance aggro delaying." Threat assist and aggro delay.
- The migrations `z2713` (creature_template leash columns) and `z2815` (Pursuit default 0 becomes 15000) are the later data fixes; the second sets Pursuit to 15000 wherever it was 0 (line 3).
- No git history in the box (no `.git` directory). ChangeLog.md and migrations are the only history; the 0.12.2 entry is the only one for leash.

## 9. Rulings for Dom

1. Should a target switch need a clear lead (the donor's 110 percent keep, 130 percent for ranged, 110 for melee), or should any rival with more threat take over? Recommendation: keep the 110/130 rule, because without it a three-attacker fight flips target every tick.
2. Should a heal's threat be split across all attackers (donor) or copied to each? Recommendation: split, so one healer cannot give three attackers full threat each.
3. Should the 10-second unreachable-target timer be a row field or one engine constant? Recommendation: engine constant for now; add a row field only when a boss needs a different value.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: 1 (one engine; the pick runs in the server fight step); rules 7-9 n/a

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Sort description omitted the `force` (rooted owner) melee-reach step at ThreatManager.cpp 312-318 (fixed).
- Sketch selectVictim with no current victim returned null when all haters were suppressed; donor returns the first list entry (fixed, sketch and header).
- Sketch collapsed the 3-state taunt (none/taunted/fixated) into a boolean; donor compares state with `>` (fixed: taunt is 0|1|2).
- Missed: Unit.cpp 8764-8769 flying-out-of-reach lone hater gets -101 threat and immediate evade; 8730-8743 keep-old-target-only-if-in-melee fallback (added to section 6).
Fixed 2026-10-12: sort description, sketch (taunt state, no-current return), sketch header, added the two unreachable-target rules; work/cmangos-threat.ts updated to match.
