# ryzom-ryzomcore (reputation-factions-crime-justice, cell 3)

Donor: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/ai_service/ai_profile_npc.cpp` (CGrpProfileGuard::beginProfile 901-915, updateProfile 923-1164), with `ai_grp_npc.cpp` 1150-1168, `ai_player.cpp` 454-465, `ai_aggro.cpp` 412-446, `ai_outpost.cpp` 44-48, `ai_variables.cpp` 51-52 | Licence: AGPL-3.0 (`/mnt/frankendom-donors/ryzom-ryzomcore/LICENSE` line 2 "Version 3, 19 November 2007"; ai_profile_npc.cpp header lines 4-7: GNU Affero General Public License, version 3) | C++ | symbol `CGrpProfileGuard::updateProfile`

Checked: Read in full: CGrpProfileGuard::beginProfile (901-915), updateProfile (923-1164: vision 933-943, faction and parameters 971-1003, fighting 1008-1052, bandits and predators 1054-1097, attack rule 1099-1127, assist rule 1129-1162). Read: CGroupNpc::setFactionAttackableBelow and isFactionAttackable (ai_grp_npc.cpp 1150-1168); CBotPlayer::getFameIndexed (ai_player.cpp 454-465); CSpawnGroup::setAggroMinimumFor (ai_grp.cpp 462-477); CBotAggroOwner::setAggroMinimumFor (ai_aggro.cpp 412-446, the group-transfer branch; the rest of the aggro table not read); OUTPOSTHELPERS::isAttackingFaction (ai_outpost.cpp 44-48); the guard variables (ai_variables.cpp 46-56); one example group line (nf_grp_npc.cpp 804). Callers: updateProfile is called by the profile scheduler (not read); the escorted guard wrapper calls it through `_GuardProfile` (3553-3558, read). Not read: CFameInterface (where standing is stored and changed, and what the `modulated` flag does), CStaticFames tables, the aggro table beyond the transfer branch, CAIVision internals, the group data files that set the `faction` profile parameter, and the class that encloses lines 1284-1300 (identified only by position). Searched and not found in ryzom/server/src: karma, outlaw, bounty, murder, jail, prison, criminal, crime. Confidence: high on the guard rules and on the dead-code defect at line 976 (read from C++ precedence, not run); medium on the aggro floor semantics (only the setter's transfer branch read). camera_scope: not a camera cell.

## 1. Mechanism

Each guard group runs one update per profile tick. For its own visible players and for its vision of the world, it decides which entities to set an aggro floor on. Standing is one number per player per faction: `fame`, read as `ep->getFameIndexed(factionIndex)` (1119).

Setup (901-1003). Range: a ring group uses its own aggro distance (909); otherwise the range is 25 (913). The group's faction index starts invalid (971). The attack bar starts at the global default `FameForGuardAttack` (972). The code is meant to let the first bot's sheet override the bar (976-983), but that block is dead (see Gaps). A group profile parameter `fame_for_guard_attack` does override it (1000-1002). A group profile parameter `faction` sets the faction (996-999). The help bar is the global `FameForGuardHelp` (1156). Both globals default to -450000 (ai_variables.cpp 51-52).

(a) Fighting guards (1008-1052): guards in stand-at-position mode resume their movement. The fight branch is commented out; the aggro system handles it.

(b) Ambient threats (1054-1097): a bandit NPC (1070) or a predator fauna (1083) within range of the group centre gets an aggro floor of 0.5 (1074, 1087).

(c) Attack rule (1099-1127). For each alive player in vision and within range of the centre (1111-1115): the group is willing if its player-attackable switch is on or the faction is attackable at this fame (1122; `isFactionAttackable` 1158-1168 is a per-group list of thresholds set by the group script, e.g. "attackable below 0" at nf_grp_npc.cpp 804). AND the player is either below the attack bar or an outpost attacker of this faction (1122; ai_outpost.cpp 44-47). If so, the player gets an aggro floor of 1.0 (1125) and the rule ends for that player (1126).

(d) Assist rule (1129-1161). Otherwise, the loop walks every entity targeting the player (1130, 1160):
- a player targeter is ignored (1135-1136);
- a guard-group NPC targeter is ignored (1139-1144);
- a same-faction NPC targeter draws the guards onto the player, floor 1.0 on the player (1146-1151);
- any other targeter is hit (floor 1.0 on the attacker) only if the player's fame is at or above the help bar and the player is not an outpost attacker (1156-1157).

Aggro floor (ai_grp.cpp 462-477; ai_aggro.cpp 412-446). The setter raises the bot's aggro for that entity to at least the floor. If the group has a primary group-aggro coefficient, the floor is also passed to linked groups scaled by that coefficient (441), and by a secondary coefficient to a second set (443). The aggro table's decay and its other branches were not read.

Standing fallback (ai_player.cpp 454-465). If a player has no stored standing for a faction, it is read from the static table between the player's race faction and the target faction (459-460). An unknown value becomes 0 unless the caller asks for the unknown value (462-463).

Tick: `updateProfile` is called once per profile update; the rate was not read.

## 2. Key functions

- `CGrpProfileGuard::updateProfile`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/ai_service/ai_profile_npc.cpp` 923-1164. The whole guard rule set.
- `CGrpProfileGuard::beginProfile`: same file, 901-915. Aggro range per group.
- Faction and parameters block: same file, 971-1003 (contains the dead block at 976).
- Attack rule: same file, 1099-1127.
- Assist rule: same file, 1129-1162.
- `CGroupNpc::isFactionAttackable`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/ai_service/ai_grp_npc.cpp` 1158-1168.
- `CBotPlayer::getFameIndexed`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/ai_service/ai_player.cpp` 454-465.
- `CBotAggroOwner::setAggroMinimumFor` (transfer branch): `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/ai_service/ai_aggro.cpp` 412-446.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two standing bars per faction: attack under the low bar, help at or above the high bar | Both globals -450000 (ai_variables.cpp 51-52); sheet and profile overrides (976-983 dead, 1000-1002 live) |
| A group-level switch as a second gate before any attack on fame | Group switch, plus per-faction thresholds set by script (ai_grp_npc.cpp 1158-1168; nf_grp_npc.cpp 804 example) |
| Retarget: whoever hits a protected player becomes the guard's target | Floor 1.0 (1125, 1157); same-faction NPC attacking a player draws guards onto the player (1146-1151) |
| Ambient floor for threats inside range | 0.5 for bandits (1074) and predators (1087) |
| Guard range | 25 (913); ring groups use their persistent aggro distance (909) |
| Unknown standing falls back to a race-to-faction table | Static table lookup (ai_player.cpp 459-460) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for each player: the attack rule first (group switch on, and fame under the bar or an outpost attacker) ends that player's processing; otherwise each targeter is checked in turn (players and guard NPCs skipped, a same-faction NPC draws the guards onto the player, other attackers are hit when standing is at or above the help bar). Ambient floors for bandits and predators are a separate pass. It takes the attack bar as an input, so it does not reproduce the donor's dead per-bot override (see Gaps). It omits the BOT_STAND_AT_POS resume, the vision and centre calculation (the caller passes distances), the `faction` profile parameter, the safe-zone test that the faction profile applies (not in the guard loop), the aggro table's decay, and any cap on attackers (MAX_ATTACKERS = 3 is our ruling, not the donor's).

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch of the shape only: fame-gated guard aggro, assist rule, aggro floors.
interface GuardGroup {
  aggroRange: number;                       // donor: 25 unless a ring group sets its own
  playerAttackable: boolean;                // donor: group-wide switch
  attackableAt: (fame: number) => boolean;  // donor: per-faction switch, a threshold per group script
  attackBelow: number;                      // donor: FameForGuardAttack (default -450000)
  helpAtOrAbove: number;                    // donor: FameForGuardHelp (default -450000)
}

type TargeterKind = "player" | "guardNpc" | "sameFactionNpc" | "otherNpc";

interface Targeter { id: number; kind: TargeterKind; }

interface VisiblePlayer {
  id: number;
  alive: boolean;
  distance: number;          // from the group centre
  fame: number;              // standing toward the guard faction
  outpostAttacker: boolean;  // donor: outpost faction test
  targeters: Targeter[];     // entities currently targeting this player
}

interface Floor { entityId: number; floor: number; }

const FLOOR_TARGET = 1.0;    // donor: aggro floor for the attacked player or for the attacker
const FLOOR_AMBIENT = 0.5;   // donor: floor for bandits and predators inside range

// One guard tick for one visible player. Donor order: attack rule first (and it ends the player), then assist.
function guardFloorsFor(g: GuardGroup, p: VisiblePlayer): Floor[] {
  if (!p.alive || p.distance > g.aggroRange) return [];

  const willing = g.playerAttackable || g.attackableAt(p.fame);
  if (willing && (p.fame < g.attackBelow || p.outpostAttacker)) {
    return [{ entityId: p.id, floor: FLOOR_TARGET }];
  }

  const out: Floor[] = [];
  for (const t of p.targeters) {
    if (t.kind === "player" || t.kind === "guardNpc") continue;
    if (t.kind === "sameFactionNpc") {
      out.push({ entityId: p.id, floor: FLOOR_TARGET });   // guards side with the player against their own kind
      continue;
    }
    if (p.fame >= g.helpAtOrAbove && !p.outpostAttacker) {
      out.push({ entityId: t.id, floor: FLOOR_TARGET });   // help: hit the attacker of a player in good standing
    }
  }
  return out;
}

// Bandits and predators within range get the ambient floor.
function ambientFloors(g: GuardGroup, ambient: { id: number; distance: number }[]): Floor[] {
  return ambient.filter((a) => a.distance <= g.aggroRange).map((a) => ({ entityId: a.id, floor: FLOOR_AMBIENT }));
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copy at /tmp/rf002-ryzom-guard-fame.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/guard-aggro.ts` (new): the zone guard's target choice: the two standing bars, the group switch, the assist retarget and the aggro floors. The engine applies the floors in its target selection.
- Parity-checklist row 2 (AI brain): guard target choice. Guard spawn counts and respawn are row 23 and are not in this note.
- Reuse tag: rewrite-from-idea (AGPL-3.0: clean-room only; the sketch is written from the described rules)
- Brief rule served: 1 (one engine: the guard target choice runs in the engine, not the client); rules 7-9 n/a

Best transferable idea: Give zone guards one standing number per faction with two bars: attack a player under the low bar (only where the zone's switch allows it), help a player at or above the high bar, and always retarget to whoever is hitting a protected player.
Decision (proposed): adapt — keep the two-bar standing, the group switch and the retarget-to-attacker rule; fix the dead per-bot bar override, make the bars zone data, and cap the pack at MAX_ATTACKERS = 3 in the engine.
Acceptance: in a zone with a guard pack, a player under the attack bar is attacked when in range; a non-guard mob that hits a player at or above the help bar draws the pack onto that mob within one tick; a player under the help bar gets no help; the pack never holds more than three targets at once.

## 6. Gaps and risks

- Defect (keep the idea, fix the code): line 976, `if (!bots.size() != 0 && bots.begin() != bots.end())`, can never be true. `!bots.size()` is a bool, and `!= 0` is true only when the bool is true, that is, when the set is empty; the second clause needs it non-empty. So the block at 977-991 never runs, and the faction read from the first bot (981) and the per-sheet attack bar (982-983) never apply. Consequence: unless the group sets the `faction` parameter (996-999), `factionIndex` stays invalid, so the bar test and the faction switch at 1122 are false (both need a valid index), and the sheet's own bar is never read. The outpost test at 1122 does not check the index. The group-wide switch still works. The help test at 1156 does not check the index, and the standing read at 1119 with an invalid index was not traced. fix: test `!bots.empty()`, state the precedence (sheet bar, then group parameter, then global), and add a test that a guard group with a sheet bar attacks at that bar.
- Risk: at defaults both bars are -450000 (ai_variables.cpp 51-52). Anyone above the attack bar is then help-eligible, and the two bars only differ when a sheet or group parameter sets one.
- Risk: the group switch is a second gate. A group with neither switch set never attacks a player, whatever the standing. The read code does not say whether that is intended; decide it in our rulings rather than port it by accident.
- Gap by design: in the assist loop a player who attacks another player is ignored (1135-1136). Guards do not step into player-on-player fights. Frankendom has to choose this for duels and PvP.
- Gap: the guard loop has no safe-zone test (read 1099-1163). The faction profile does (1287-1290). Whether guard vision already excludes safe zones was not read.
- Gap: the standing store and its update rules (CFameInterface, the `modulated` flag) were not read. So this note cannot say how a kill or a crime changes standing. No murder, bounty or jail system was found.
- Frankendom rulings: standing is one number per faction in the one ledger; both bars and the group switch are zone data; the pack's target count is capped by the engine (MAX_ATTACKERS = 3). The donor has no cap.
- Units: the 25 range (913) and the ring-group aggro distance (909) must be mapped to our units before use.
