# electronicarts-CnC_Remastered_Collection (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TEAM.CPP` (with `TIBERIANDAWN/TEAMTYPE.H`, `TEAM.H`, `FOOT.CPP`, `TECHNO.CPP`, `DEFINES.H`) | Licence: GNU GPL v3 with Electronic Arts additional terms under GPL section 7 (repo `LICENSE.md`; the file header says "GNU General Public License ... permitted additional restrictions under Section 7") | C++ | symbol `TeamClass::AI`

Checked: This is AI squad logic, not player parties. The hint file (TEAM.CPP) is the right file: it is the whole `TeamClass` (1515 lines). Read end to end: `TeamClass::AI` (280-626), `Add` (650-741), `Remove` (764-850), `Recruit` (872-940), `Calc_Center` (1018-1050), `Took_Damage` (1073-1102), `Coordinate_Attack` (1120-1153), `Coordinate_Regroup` (1172-1216), `Coordinate_Move` (1234-1301), `Lagging_Units` (1314-1362), `Suspend_Teams` (1497-1515). Not read: `Coordinate_Conscript` (1436-1471), `Is_A_Member` (1471), `Coordinate_Unload` (1379), `Assign_Mission_Target` (210-280), the constructor (169), `Safety_Point`, `Cell_Threat` and `Greatest_Threat` (called, not read), `Distance` on units (not read; the donor's cell distance is at `FUNCTION.H` 928, not read in full), and `ICON_LEPTON_W` (not found in the donor). Callers: `Took_Damage` is called from `FootClass::Take_Damage` (FOOT.CPP 1159); `Suspend_Teams(20)` is called from `TechnoClass::Base_Is_Attacked` (TECHNO.CPP 3779), the only caller found by grep. Confidence: high on the team state machine and the order of operations; medium on the distance units, because the donor's distance function was not read. Camera: not applicable (cell is parties-guilds-chat). Other candidates in this donor: none written up.

## 1. Mechanism

A `TeamClass` is a group of AI units of one or more types. Each team has a type (`TeamTypeClass`) with a desired headcount per unit type (`DesiredNum`), a `RecruitPriority` (documented as scale 0-15, TEAMTYPE.H 200-203, higher means it can take members from other teams), and a reinforcable flag (TEAMTYPE.H 191). The team is driven by `TeamClass::AI`, once per tick through the owning house (the caller that drives `AI` each tick was not read).

- Pass over the team state (AI 292-297). A suspended team does nothing until its suspend timer expires; then it resumes.
- Strength is recomputed only when membership changed (`IsAltered`, AI 303). A human-owned team is set not under strength (318). A reinforcable AI team is under strength only at or below one third of its desired headcount, with integer division (326). Any other AI team is under strength only before it has started its mission once (335). An empty team becomes under strength; if its house is human or the team has already been at strength, the empty team is deleted (350-352).
- Regroup. If the team is moving and under strength (368), it stops, clears its mission index (370), sets the centre to the average of arrived members (372; see `Calc_Center` below), and picks a retreat cell. It scans its own non-armed structures (387), scores each by `Cell_Distance(cell, Center) * (Cell_Threat(cell, House) + 1)` (389), halves the score for repair structures (391-392), and keeps the lowest score that has a safety point (394-399). Then it sets its target to that cell and runs the move step (405-407).
- Full strength starts the mission (417-442). When the team is full strength, or forced, it starts moving, sets "has been at strength", plays a gesture on infantry members, and sets the mission index to start.
- Recruit (456-462). The recruit loop runs for a non-moving team, or for a reinforcable non-human team that is not full. For each type below its quota it calls `Recruit`.
- Mission step (478-515). Advances the mission index, sets a timeout of `Argument * (TICKS_PER_MINUTE/10)` ticks (484), and assigns the target from the mission entry. Deletes the team when the list is done (511-514).
- Mission execution (520-625). While moving, not reforming and not under strength: resets the target to the mission target when the current target is no longer legal (526-528) and runs the step for the mission type: attack types re-pick the greatest threat and call `Coordinate_Attack` (537-568), defend and move call `Coordinate_Move`, guard calls `Coordinate_Regroup`, and loop jumps back. Timed-out attack, defend, unload, retreat and guard missions advance when `TimeOut` expires (604-617). Otherwise: if the team is still moving (reforming or under strength), it calls `Coordinate_Regroup` and sets `IsReforming` from the result (621); if it is not moving, it calls `Coordinate_Move` (623).
- Membership, `Add` (650-741). A unit joins only if it has strength, is owned by this house, is not in radio contact, is not in limbo outside scenario setup, and is not on a blocking mission (sticky, sleep, guard area, hunt, harvest; 678), and either unassigned or in a team with strictly lower `RecruitPriority` (687-691). The per-type quota must have room (710). If the unit is in another team, it is removed from that team first (718-720). The first member added becomes initiated, which makes it the captain (726).
- Membership, `Remove` (764-850). Removes the unit, decrements the per-type count, and if no initiated member is left, makes the first remaining member initiated and clears the centre so it is recalculated around the new captain (839-842).
- Recruit (872-940). Scans the global unit or infantry list for owned units of the wanted type and calls `Add` until the quota is met (880-903). A transport's passengers are added with it (916-924).
- Centre, `Calc_Center` (1018-1050). Averages the cells of members that are initiated and not in limbo (1032-1043) using integer division (1045-1046). The objective centre is the cell of the member nearest the target (1034-1036).
- Hit reaction, `Took_Damage` (1073-1102), called from `FootClass::Take_Damage` for team members when the hit has a result and the source is not an ally, or the game is not a normal game (FOOT.CPP 1156-1159). Only a moving team reacts (1077). It retargets to the attacker when the attacker is not a member, the team has members, and the first member is not an aircraft (1081-1097). It keeps its current target instead when that target can fire and is in range of the team centre (1088-1095).
- Attack, `Coordinate_Attack` (1120-1153). If the target is not legal it falls back to the mission target, and if that is also illegal it advances the mission (1123-1128). Otherwise every member is conscripted (1135) and each initiated member is ordered to attack and given the target (1137-1147).
- Regroup, `Coordinate_Regroup` (1172-1216). A member farther than `STRAY_DISTANCE` (2, TEAM.H 47) from the centre is sent to the centre (1187-1191), and the function reports "not done" (1192). A member within that distance becomes initiated (1200) and is told to guard (1205-1208). The function returns whether all members are within the distance (1215).
- Move, `Coordinate_Move` (1234-1301). If `Lagging_Units` did not handle anything (1246), each initiated member that is farther than `STRAY_DISTANCE` from the centre makes the team lag (1255-1257), and each member that is far from the target gets a move order (1260-1277). The team advances when everyone is close (1298-1300).
- Laggards, `Lagging_Units` (1314-1362). Only runs when the team is lagging (1324). A member too far from the objective centre is sent to it; the others are set to guard, so the pack waits (1338-1351). The lagging flag is recomputed (1360).
- Suspension, `Suspend_Teams(priority)` (1497-1515). Every team whose `RecruitPriority` is below the given value is emptied of members (1506-1510), marked altered (1511), given a suspend timer of `TICKS_PER_MINUTE*2` (1512), and marked suspended (1513). Its members are then free to be recruited elsewhere. The only caller found passes 20 (TECHNO.CPP 3779), inside `Base_Is_Attacked`.

## 2. Key functions

- `TeamClass::AI`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TEAM.CPP` 280-626. The whole team state machine: suspend, strength, regroup, start, recruit, mission advance, mission run.
- `TeamClass::Add` and `TeamClass::Remove`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TEAM.CPP` 650-741 and 764-850. Membership with priority-gated transfer and captain choice.
- `TeamClass::Recruit`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TEAM.CPP` 872-940.
- `TeamClass::Calc_Center`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TEAM.CPP` 1018-1050. Centre from arrived members only.
- `TeamClass::Took_Damage`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TEAM.CPP` 1073-1102. Retarget with a hold rule.
- `TeamClass::Coordinate_Regroup`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TEAM.CPP` 1172-1216.
- `TeamClass::Lagging_Units` and `Coordinate_Move`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TEAM.CPP` 1234-1362.
- `TeamClass::Suspend_Teams`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TEAM.CPP` 1497-1515.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Group is under strength at or below one third of its desired count; reinforcable groups snap back out of that | `desired / 3`, integer division (TEAM.CPP 326) |
| Non-reinforcable group is under strength only before it has started | `!IsHasBeen` (TEAM.CPP 335) |
| Retreat cell: distance times (threat + 1), halved for repair structures | `+ 1` (389); `>>= 1` for repair (392) |
| Group centre from arrived members only | average of members with `IsInitiated` (1032-1046) |
| Gather radius | `STRAY_DISTANCE` 2 (TEAM.H 47); units of the donor's distance not verified |
| Priority-gated transfer of members | strict comparison `>=` on `RecruitPriority` (TEAM.CPP 689); scale 0-15 by comment (TEAMTYPE.H 202) |
| Mission timeout | `Argument * (TICKS_PER_MINUTE/10)` = `Argument * 90` ticks, at `TICKS_PER_SECOND` 15 (TEAM.CPP 484; DEFINES.H 2146-2147), so 6 s per argument unit |
| Suspension of low-priority groups | `Suspend_Teams(20)` (TECHNO.CPP 3779); `TICKS_PER_MINUTE*2` = 1800 ticks, 2 minutes (TEAM.CPP 1512) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for the parts that transfer: the arrived-only centre, the under-strength rule with its one-third snap-back, the priority-gated join, the captain on removal, the regroup that marks arrivals and holds them, and the retarget-with-hold on hit. It omits the mission list and its timeouts, the lagging-unit rule, the retreat-cell scan, the suspension, the per-type quotas (one type only), the aircraft and transport rules, the human-team branches, and the recruit precedence question in section 6. Distance is Chebyshev in the sketch; it is a stand-in, not the donor's distance function.

```ts
// Licence: GPL-3.0 with Electronic Arts additional terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const STRAY = 2;                                   // cells; the donor's STRAY_DISTANCE (TIBERIANDAWN/TEAM.H 47)

interface Unit { id: number; x: number; y: number; initiated: boolean; alive: boolean; mission: "move" | "guard" | "attack"; }

interface Group {
  priority: number;                                // RecruitPriority: higher may take members from lower groups
  desired: number;                                 // wanted headcount for this single unit type
  reinforcable: boolean;
  hasBeen: boolean;                                // reached full strength once
  members: Unit[];
  moving: boolean;
  target: number | null;
}

// The centre is the average of arrived (initiated) members only.
function centreOf(g: Group): { x: number; y: number } | null {
  const arrived = g.members.filter(u => u.initiated && u.alive);
  if (arrived.length === 0) return null;
  let sx = 0;
  let sy = 0;
  for (const u of arrived) { sx += u.x; sy += u.y; }
  return { x: Math.floor(sx / arrived.length), y: Math.floor(sy / arrived.length) };
}

// A reinforcable group counts as under strength only at or below a third of its desired headcount.
function underStrength(g: Group): boolean {
  if (g.reinforcable) return g.members.length <= Math.floor(g.desired / 3);
  return !g.hasBeen;
}

// A unit can leave its current group only if this group has the higher priority.
function addMember(g: Group, u: Unit, from: Group | null): boolean {
  if (from && from.priority >= g.priority) return false;
  if (g.members.length >= g.desired) return false;
  u.initiated = g.members.length === 0;            // the first member is the captain
  g.members.push(u);
  return true;
}

// If no arrived member is left, the first remaining member becomes the captain.
function removeMember(g: Group, id: number): void {
  g.members = g.members.filter(u => u.id !== id);
  if (g.members.length > 0 && !g.members.some(u => u.initiated)) g.members[0].initiated = true;
}

// Regroup: far members walk to the centre; members that arrive are marked and hold.
// Returns true when every living member is within STRAY of the centre.
function regroupStep(g: Group, cx: number, cy: number): boolean {
  let allHere = true;
  for (const u of g.members) {
    if (!u.alive) continue;
    const d = Math.max(Math.abs(u.x - cx), Math.abs(u.y - cy));   // Chebyshev, a stand-in for the donor's distance
    if (d > STRAY) { u.mission = "move"; allHere = false; }
    else { u.initiated = true; u.mission = "guard"; }
  }
  return allHere;
}

// A hit on a member retargets a moving group, unless the current target is armed and in range of the centre.
function tookDamage(g: Group, attacker: number, attackerIsMember: boolean,
                    targetArmedInRange: (t: number) => boolean): void {
  if (!g.moving || attackerIsMember) return;
  if (g.target !== null && g.target !== attacker && targetArmedInRange(g.target)) return;
  g.target = attacker;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/pg009-cnc-check.ts` (sketch plus `export {}`), exit 0. The Edit hook reported tsc as unavailable on the Mac; the VPS check is the one that ran.

## 5. Lands in

- TARGET `src/fight/group-brain.ts` (new module, proposed; the Frankendom repo was not opened in this pass): the pack logic for mob groups in the fight engine. Parity row 2 (AI brain). This is the closest row, and it is a fit for mob packs and not for player parties. None of rows 1-23 covers player party formation, guild ranks or chat; those topics have no row in the addendum.
- today: no equivalent read in this pass.
- Reuse tag: rewrite-from-idea (GPL-3.0 with EA additional terms: clean-room, shape only)
- Brief rule served: one engine (the pack logic lives in the engine, not in a client); MAX_ATTACKERS = 3 must be imposed by us, because the donor has no attacker cap in the team logic (not found in the code read).

## 6. Gaps and risks

- Copyleft licence with additional terms: clean-room only. Shape, not lines.
- The donor is AI squad logic. It has no player party, no guild roster, no chat and no friend list. Do not read it as a party design.
- No attacker cap: the team coordinates all members on one target (`Coordinate_Attack`, 1137-1147). Our rule is MAX_ATTACKERS = 3, so the pack's attack step must take at most three attackers from the pack and leave the rest to wait. The donor does not show this.
- Priority gap: the comment says the scale is 0-15 (TEAMTYPE.H 202), but the only caller passes 20 (TECHNO.CPP 3779). By that comment every team has a priority below 20 and would be suspended. The scenario data was not read, so whether any team exceeds 15 is not known. Do not copy a threshold without checking the data it is compared with.
- Recruit precedence reads oddly. The condition at TEAM.CPP 456 is `!IsMoving || (...) && !House->IsHuman`, because `&&` binds tighter than `||`. So a non-moving team recruits even when its house is human, while the comment at 454 says the opposite. Not run, so this is a reading, not a confirmed bug.
- Suspension empties the team's members (1508-1510) and frees them for reassignment. That is a player-visible rule if it reaches player units; we would need a test before using it in any shared mode.
- The regroup point uses the house's own non-armed structures (387-399). We have no repair buildings in the zone model; the retreat point would be a zone data field, not a scan.
- Numbers to make data fields with defaults, not constants: the one-third reinforce fraction, the gather radius (2), the mission timeout unit (6 s per argument unit) and the suspension (2 minutes). The team priority is a per-type scenario value.
- Not read: `Coordinate_Conscript` and `Is_A_Member` (the conscript step runs for every member in attack and regroup), `Assign_Mission_Target`, the team constructor, and the distance function.

Best transferable idea: a pack gathers before it advances, centred only on members that have already arrived, and holds the arrived ones while the laggards catch up; a hit from outside the pack changes its target only when the current target cannot hit back from range.

Decision (proposed): adapt - take the arrive-then-advance rule (centre from arrived members, hold while laggards catch up), the one-third under-strength regroup, and the hold-on-retarget rule for mob packs; do not take the priority-gated transfer or the suspend-and-disband for anything a player owns.
Acceptance: a server test with a pack of 3 mobs (desired 3, reinforcable): when one member is left the pack stops advancing and walks to its retreat point; a hit from a non-member while the current target is armed and within range of the pack centre leaves the target id unchanged; with three attackers in range the pack never has more than MAX_ATTACKERS = 3 mobs on the player at once.

Reuse tag: rewrite-from-idea (GPL-3.0 with EA additional terms: clean-room, shape only)
Brief rule served: one engine (pack logic in the engine); MAX_ATTACKERS = 3 imposed by us, not taken from the donor.
