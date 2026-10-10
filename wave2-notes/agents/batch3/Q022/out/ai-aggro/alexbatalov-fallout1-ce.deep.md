# alexbatalov-fallout1-ce (ai-aggro, cell 1)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/combatai.cc` | Licence: Sustainable Use License 1.0 (`LICENSE.md` line 1; restricted, not OSI: use limited to internal business or non-commercial/personal use, distribution only free of charge and non-commercial; clean-room, shape only) | C++ | symbol `combat_ai`, `ai_danger_source`

Checked: `combat_ai` (combatai.cc 1191-1240) read in full. Also read in full: `ai_danger_source` (592-623), `ai_find_attackers` (526-589), `ai_find_nearest_team` (487-523), the sort helpers (449-484), `ai_run_away` (400-448), `ai_try_attack` (1009-1165), `ai_move_closer` (883-906), `combatai_rating` and `combatai_check_retaliation` (1529-1576), `is_within_perception` (1577-1623), `combatai_want_to_join` and `combatai_want_to_stop` (1252-1331), `combatai_notify_onlookers` (1682-1693), `ai_cap` (311-326). Callers: `combat_ai` has one caller, `combat_turn` in combat.cc (2299); `ai_danger_source` is called from `combat_ai`, `combatai_want_to_join` and `combatai_want_to_stop`. Read from combat.cc: 2299, 2403, 2408, 3498-3524. Not read: `ai_pick_hit_mode`, `ai_switch_weapons`, `ai_check_drugs`, `ai_called_shot`, the body of `can_see`, `make_path`, and `data/ai.txt` (the numbers; the file is not in the donor tree, so every per-packet value is unknown here). Confidence: high on the order of target choice, the retaliation switch and the flee gate; no numbers are claimed for the packets. Turn-based (AP) combat, not real time. camera_scope: not applicable.

## 1. Mechanism

- Entry. Each AI critter's turn calls `combat_ai(critter, target)` (combat.cc 2299, the only caller). The `target` is `gcsd->defender`, the defender of the attack that opened the combat sequence: `gcsd = attack` is set at combat.cc 2408 in the branch that calls `combat_sequence_init(attack->attacker, attack->defender)` (2403). The code clears `gcsd` after a turn (2426, read; too short to quote as a receipt), so the passed target reaches the first actor only.
- Order inside `combat_ai` (1191-1240):
  - (a) Flee gate (1199-1202). If the critter is already fleeing, or its results match `ai->hurt_too_much` (the blind/crippled flags from the packet), or its current HP is below `ai->min_hp`, it calls `ai_run_away` and returns the target unchanged.
  - (b) No passed target (1207-1212). If `ai_check_drugs` says so, run away. Otherwise `target = ai_danger_source(critter)`, and if that is non-null, `ai_try_attack` on it.
  - (c) Passed target (1215-1216). `ai_try_attack` on the passed target directly.
  - (d) If a target is still set, it is alive, the critter has AP left, and the distance is above `max_dist`, the critter gets the DISENGAGING bit (1223).
  - (e) No target at all. If a non-party critter's `whoHitMe` is alive and the critter was damaged last turn, it runs away (1233).
- Who to fight: `ai_danger_source` (592-623), in this order.
  - A living who-hit-me is returned at once (602-603). No perception test is applied to it.
  - A dead who-hit-me on another team gives slot 0: the nearest living critter on that dead attacker's team (607). A dead who-hit-me on the same team leaves slot 0 empty.
  - `ai_find_attackers` (526-589) fills slots 1-3. Slot a2 is a living unit whose who-hit-me is this critter. Slot a3 is a living enemy that hit one of this critter's allies. Slot a4 is a living enemy whose who-hit-me is one of this critter's allies. The list is sorted by distance first (545). One count of three is shared across all three slots (550): the search stops after three finds in total.
  - The four slots are sorted by distance (614; empty slots sort last). The first slot that passes `is_within_perception` (617) is returned. So the nearest qualifying candidate wins, and the living attacker wins before any fallback.
- Who-hit-me bookkeeping. `ai_try_attack` sets `whoHitMe` to its target once, at the start of the call (1023). When an attack lands:
  - if the defender is dead or knocked out, `whoHitMe` is set to the attacker (combat.cc 3498);
  - otherwise the retaliation switch runs only when the defender is the attack's `oops` target or the attacker is on another team (3499-3500).
  - The switch (`combatai_check_retaliation`, 1564-1575) replaces `whoHitMe` only when the new attacker's rating is strictly greater than the current one's (1571).
  - Rating (1529-1560): 0 if not a critter, or dead or knocked out (1544-1545). Otherwise the melee damage stat, raised to the max damage of a weapon in either hand if that is higher (1552, 1557), plus armour class (1560). A current `whoHitMe` that is NULL rates 0.
- Perception (`is_within_perception`, 1577-1623). If the critter can see the other: range = perception x 5 (1586). Glass halves it (1588). If the other is the player and the player is sneaking, the range is quartered (1592-1593). If not visible: range = perception x 2 when the level is in combat, else perception x 1 (1602, 1604); the player's sneak quarter applies again. The test is `distance <= max_distance` (1597, 1613).
- Attack loop (`ai_try_attack`, 1009-1165). Up to ten attempts per turn (1040). A shot that is OK is taken when the to-hit chance is at least `min_to_hit` (1049). Otherwise the no-range to-hit is checked: below `min_to_hit` the critter runs away (1059-1060), else it moves closer. Out of range: the same no-range check (1133), then move closer. `ai_move_closer` (883-906) does nothing when the target is at distance 1 or less (885), and otherwise walks toward the target with all remaining AP (895).
- Flee and disengage (`ai_run_away`, 400-448). Only if the critter is closer to the player than `max_dist` (408) does it take the FLEEING bit (413). It then tries a tile directly away from the player, then the two neighbouring directions, shrinking the step from the AP value down to one (416 onward). If no path works, nothing happens. Outside `max_dist` it takes DISENGAGING instead (442).
- Group engagement. When a defender is hit, `combatai_notify_onlookers` (1682-1693) gives ENGAGING to every combatant in the current list that is within perception of the victim (1688). `combatai_want_to_join` (1252-1296), in order: false if hidden, on another elevation, or dead or knocked out; true if damaged last turn; it then runs the critter's combat script hook (1275); true if ENGAGING; false if DISENGAGING or FLEEING; otherwise true only if `ai_danger_source` is non-null (1290). `combatai_want_to_stop` (1298-1331) returns true if DISENGAGING, dead or knocked out, fleeing, there is no danger source, the danger is outside perception (1321), or the AP is full.
- Tick. Turn-based. The whole decision runs once per critter turn inside `combat_turn`. There is no per-frame loop in this code.

## 2. Key functions

- `combat_ai`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/combatai.cc` 1191-1240. Flee gate, then danger source or passed target, then disengage check.
- `ai_danger_source`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/combatai.cc` 592-623. Living attacker first, dead attacker's team as slot 0, three-slot attacker search, distance sort, perception filter.
- `ai_find_attackers`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/combatai.cc` 526-589. Three slots from one shared count of three.
- `ai_run_away`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/combatai.cc` 400-448. Flee inside `max_dist`, otherwise disengage.
- `ai_try_attack`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/combatai.cc` 1009-1165. Ten-attempt loop; shoot, run, or move closer.
- `is_within_perception`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/combatai.cc` 1577-1623. Visible range x5, hidden x2 in combat, x1 otherwise, sneak and glass modifiers.
- `combatai_check_retaliation` and `combatai_rating`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/combatai.cc` 1529-1576. Strictly-greater switch on a threat rating of melee damage plus armour class.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Living attacker is the target, before any perception test | None (rule order, 602-603) |
| Dead attacker: nearest living teammate of that attacker is the fallback slot | None (rule, 607) |
| Attacker search capped at three finds in total | 3 (theirs, combatai.cc 550) |
| Four slots sorted nearest first; first in perception wins | None (rule, 614-617) |
| Retaliation switch only on strictly higher threat | Rating = melee damage (or best weapon max damage) + armour class (theirs, 1544-1560); 0 when dead or knocked out (1544-1545) |
| Perception range as a multiple of the perception stat | x5 visible (theirs, 1586); x2 hidden in combat (1602); x1 hidden otherwise (1604); glass /2 (1588); sneak /4 for the player (1593) |
| Flee when hurt or low HP; flee only near the player, disengage when far | `min_hp`, `max_dist`, hurt flags come from `data/ai.txt` (read at 171; values not in donor) |
| Attempts per turn | 10 (theirs, 1040) |
| Adjacency stop | Distance 1 (theirs, 885) |
| To-hit threshold | `min_to_hit` from `data/ai.txt` (value not in donor; compared at 1049) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's decision order: the flee gate first, then the passed target or the danger source; inside the danger source, the living-attacker shortcut, the teammate fallback slot, the three-slot attacker search with the shared cap (which lets one enemy fill two slots, as the donor does), the distance sort and the perception filter. It also keeps the strictly-greater retaliation switch and the flee-or-disengage distance test. It omits: the drugs check and the who-hit-me run-away at the end of `combat_ai`; the glass and sneak range changes and the visible/hidden test detail (the sketch uses one `visible` flag); the knocked-out term in the rating; the AP, ammo and weapon logic; the to-hit attempt loop, the chase walk and the adjacency stop; the onlooker engagement and the join/stop helpers; the qsort tie order of the donor. Numbers are passed in; the packet values are not in the donor.

```ts
// Licence: Sustainable Use License 1.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Unit {
  id: number;
  team: number;
  alive: boolean;
  x: number;
  y: number;
  threat: number;            // donor combatai_rating: melee damage + armour class
  whoHitMe: Unit | null;
  fleeing: boolean;
  hurtFlags: number;         // blind / crippled bits
  hp: number;
}

interface Packet {           // per-AI packet; the donor reads these numbers from data/ai.txt
  maxDist: number;
  minHp: number;
  hurtTooMuch: number;
}

const ATTACKER_CAP = 3;       // donor combatai.cc 550: one shared count across the three attacker slots
const VISIBLE_MULT = 5;       // donor combatai.cc 1586
const HIDDEN_COMBAT_MULT = 2; // donor combatai.cc 1602

const dist = (a: Unit, b: Unit): number => Math.hypot(a.x - b.x, a.y - b.y);

function sortedByDistance(me: Unit, all: Unit[]): Unit[] {
  return all.filter((u) => u !== me).sort((p, q) => dist(me, p) - dist(me, q));
}

// Retaliation: the victim switches to the attacker only when the attacker rates strictly higher (donor 1571).
function maybeRetaliate(victim: Unit, attacker: Unit): void {
  const cur = victim.whoHitMe;
  const curRating = cur !== null && cur.alive ? cur.threat : 0;
  if (attacker.threat > curRating) victim.whoHitMe = attacker;
}

// Perception range: visible = perception x 5; hidden = perception x 2 in combat, else perception (donor 1585-1613).
function perceives(me: Unit, other: Unit, visible: boolean, inCombat: boolean, perception: number): boolean {
  const range = visible ? perception * VISIBLE_MULT : perception * (inCombat ? HIDDEN_COMBAT_MULT : 1);
  return dist(me, other) <= range;
}

// Donor ai_find_attackers (526-589): a2 = living unit hitting me, a3 = enemy hitting an ally,
// a4 = living enemy whose target is an ally. One count of three across all slots.
function findAttackers(me: Unit, sorted: Unit[]): [Unit | null, Unit | null, Unit | null] {
  let a2: Unit | null = null;
  let a3: Unit | null = null;
  let a4: Unit | null = null;
  let found = 0;
  for (let i = 0; found < ATTACKER_CAP && i < sorted.length; i++) {
    const c = sorted[i];
    if (a2 === null && c.alive && c.whoHitMe === me) { a2 = c; found++; }
    if (a3 === null && c.team === me.team) {
      const w = c.whoHitMe;
      if (w !== null && w !== me && w.team !== me.team && w.alive) { a3 = w; found++; }
    }
    if (a4 === null && c.team !== me.team && c.alive) {
      const w = c.whoHitMe;
      if (w !== null && w.team === me.team) { a4 = c; found++; }
    }
  }
  return [a2, a3, a4];
}

// Donor ai_danger_source (592-623): living attacker wins outright; else four slots, nearest first, first one in perception.
export function dangerSource(me: Unit, all: Unit[], perc: (o: Unit) => boolean): Unit | null {
  const hit = me.whoHitMe;
  let slot0: Unit | null = null;
  if (hit !== null && hit !== me) {
    if (hit.alive) return hit;
    if (hit.team !== me.team) {
      slot0 = sortedByDistance(me, all).find((u) => u.alive && u.team === hit.team) ?? null;
    }
  }
  const [a2, a3, a4] = findAttackers(me, sortedByDistance(me, all));
  const slots = [slot0, a2, a3, a4].filter((u): u is Unit => u !== null);
  slots.sort((p, q) => dist(me, p) - dist(me, q));
  for (const s of slots) if (perc(s)) return s;
  return null;
}

export type Act = { kind: "run" } | { kind: "attack"; target: Unit } | { kind: "idle" };

// Donor combat_ai (1191-1240), decision part: flee gate first, then the passed target or the danger source.
export function decide(me: Unit, pk: Packet, passedTarget: Unit | null, all: Unit[], perc: (o: Unit) => boolean): Act {
  if (me.fleeing || (me.hurtFlags & pk.hurtTooMuch) !== 0 || me.hp < pk.minHp) return { kind: "run" };
  const target = passedTarget ?? dangerSource(me, all, perc);
  if (target === null) return { kind: "idle" };
  return { kind: "attack", target };
}

// Donor ai_run_away (400-448): flee only when the player is inside max_dist; otherwise disengage.
export function fleeOrDisengage(distToPlayer: number, pk: Packet): "flee" | "disengage" {
  return distToPlayer < pk.maxDist ? "flee" : "disengage";
}

export {};
```

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new): the engine's per-unit target choice (danger source, retaliation switch, the three-attacker cap). Parity-checklist row 2 (AI brain). The flee and disengage gate also belongs in this module; it is the same decision, not a second row.
- today: no equivalent module; target choice for the fight is not yet written as one function.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0, restricted; clean-room, shape only)
- Brief rule served: one engine (the many-on-one target logic is in the engine, not the client); MAX_ATTACKERS = 3

## 6. Gaps and risks

- Licence: Sustainable Use License 1.0 is not an open-source licence. It limits use to internal or non-commercial purposes and forbids free-of-charge distribution outside non-commercial use. Shape only; nothing copied.
- The shared cap double counts. `ai_find_attackers` counts slots, so one enemy that is hitting me (a2) and is also hitting an ally (a4) fills two of the three counts. Frankendom's MAX_ATTACKERS = 3 must count distinct units, not slots. The sketch copies the donor here to show the behaviour; Frankendom should not copy it.
- The threat rating is melee damage plus armour class, not damage dealt or threat accumulated over time. Frankendom's rules would need an explicit hate value per enemy if they want damage-based aggro. The strictly-greater switch is the reusable part.
- The donor's who-hit-me is a plain pointer with no expiry. A dead attacker is replaced only through the teammate fallback slot. Frankendom's server must define when a target is dropped (leash), otherwise a stale pointer can hold a fighter on a dead target. Leash logic is parity row 4, not this one.
- The donor is turn-based: ai_try_attack counts AP, and flee depends on AP. Frankendom is real time. The flee rule must use Frankendom's own stamina or time budget, not AP.
- Every number here (`min_hp`, `max_dist`, hurt flags, `min_to_hit`, perception multipliers as data) is either an engine constant (the x5, x2, /4 and cap 3) or data that lives in `data/ai.txt`, which is not in the donor. The packet values are unknown here. Frankendom would set its own.
- `is_within_perception` tests distance against a perception stat, not line of sight; `can_see` is not read. The visibility input is the donor's own test.
- Not read: `ai_pick_hit_mode`, `ai_switch_weapons`, `ai_check_drugs`, `make_path`, `can_see`. Claims about their behaviour are not made.
- Reuse check: the Frankendom side has no shared aggro function yet, so no prior lane implementation was found to reuse for this shape (not verified against other lanes; Frankendom tree not read from this pass).

Best transferable idea: A fighter keeps its current target unless the new enemy's threat is strictly higher, and a living attacker outranks every fallback.
Decision (proposed): adapt — keep the strictly-higher threat switch and the living-attacker-first order; count distinct enemies toward MAX_ATTACKERS = 3 instead of slots (the donor double counts); use Frankendom's stamina or time for the flee gate, not AP; reject the AP and turn-based parts.
Acceptance: In a three-on-one server test a fighter keeps its target until a new enemy's threat is strictly higher, and a second assertion shows no fighter counts more than three distinct attackers, even when one enemy both hits it and hits its ally.
