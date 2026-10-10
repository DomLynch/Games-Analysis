# crawl-crawl (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-behv.cc` | Licence: GPL-2.0-or-later (LICENSE lines 6-8: "either version 2 of the License, or (at your option) any later version") | C++ | symbols `set_nearest_monster_foe`, `handle_behaviour`, `behaviour_event`, `shake_off_monsters`, `_pre_monster_move` (mon-act.cc)

Checked: Opened mon-behv.cc 60-90, 288-560 (foe handling; the Lua/leash/friendly branches only partly), 554-740 (BEH_SEEK, memory chase), 741-840 (wander, not read in full), 853-900 (flee and cornered, first half), 975-1062, 1063-1200 (behaviour_event, ME_WHACK and fear paths; the ME_DISTURB/ME_ANNOY tail not read), 1484-1505; mon-act.cc 1850-1870 and 2818-2840; attack.cc 88-90; teleport.cc 262-273; files.cc 2518-2526; coordit.h 139-160 and coordit.cc 356-374 (distance_iterator constructor only). Licence read in LICENSE. Confidence: high on nearest-foe pick, retaliation, memory chase and decay; medium on the flee/cornered branches (only the entry and the exit read). Not read: try_pathfind, target_is_unreachable, _guess_invis_foe_pos, _decide_monster_firing_position, the within-ring order of distance_iterator, monster_los_is_valid body, mons_aligned, Killed(). Camera: not applicable (ai-aggro cell). Scope: not camera.

## 1. Mechanism

- Turn-based clock. Each player action advances time by `you.time_taken`. `handle_monsters` (mon-act.cc 2827) first runs `_pre_monster_move` for every monster (2831), which counts down the monster's chase memory (1864-1865), then queues monsters that have action energy and runs them. No fixed-step accumulator was found on this path (not fully read).
- Per monster action, `handle_behaviour` (mon-behv.cc 288) runs in this order for a hostile monster:
  (a) drop the foe if it is no longer valid: alive, in LOS, and not aligned unless frenzied (`_mon_check_foe_invalid` 84-88, `_is_valid_foe` 65-82);
  (b) if there is still no foe, the monster is not pacified or asleep, and either the player is in view or a 1-in-3 roll passes, pick the nearest visible hostile (431-434);
  (c) an unfriendly monster that is fighting another monster switches to the player two times in three, if the player is in view and the monster is not berserk or dazed (469-476);
  (d) re-validate the foe, then run the behaviour state machine (`while (changed)`, 515).
- Being hit: `behaviour_event` with the whack event (ME_WHACK) sets `foe` to the attacker (1153). If the attacker is unreachable the monster switches to RETREAT (1158-1162). If it is feared, the fear is broken and the SEEK change is skipped (fear branch, 1176-1181). Otherwise it switches to SEEK (1184). A non-threatening monster ignores the event (1143-1144). attack.cc 89-90 sends ME_WHACK when the attacker is the player; actor.cc 967 and 989 and god-abil.cc 1184 also send it (not read).
- Chase, seek state (554-740). With no foe: wander if the player is not in view (and the monster is not friendly), otherwise seek the player (556-570). With a foe in view: the memory timer is refilled by intelligence (human 450-1000, animal 250-550, brainless 100-300; lines 719-735). With the foe out of view: if the foe is marked or haunting, walk to its current cell. Otherwise walk to the last seen cell (`mon->target`). On reaching it, a player foe is re-found with chance 50 / stealth (672), or under Ashenzari penance on a coin flip (674). If not re-found, the memory is cleared (679). A monster foe is re-found on a coin flip (683-686). When memory is 0 or below, the monster switches to WANDER (691-694).
- Flee. Fear from a scare sends the monster to BEH_FLEE with its target at the source (1343-1345). In BEH_FLEE (853) the monster returns to SEEK once it is no longer scared (855-856). If it cannot move, BEH_CORNERED (876) resumes flee when it moves again, and reverts to wander or the player when the foe is out of LOS.
- Forgetting. `shake_off_monsters(target)` (1484-1505) finds every monster whose foe is the target and whose memory is above 0, and caps the memory at 50. It is called when a monster teleports (teleport.cc 272) and when the player enters a level at a different spot from where they left (files.cc 2523-2524). It returns early when the target is the player under Ashenzari penance (1486-1489).
- Ties. The comment at 1003 says ties are chosen randomly. The loop does not randomise: it takes the first visible hostile the ring iterator yields (1024-1035). Within a ring the order is set by `distance_iterator` with fair=true (coordit.h 139-160, coordit.cc 356); the within-ring order was not read, so I cannot say which of two equal-distance foes wins.

## 2. Key functions

- `set_nearest_monster_foe`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-behv.cc` 1004-1040. Walks outward by distance over cells the monster can see and sets `foe` to the first hostile that passes `_mons_check_foe` (1030). The player cell sets `MHITYOU`. An optional second pass uses the player's vision (1043-1045).
- `_mons_check_foe`: mon-behv.cc 978-1002. Visible, not a projectile (992), LOS-valid (993), not in sanctuary, not wrong-wall-side; friendly/neutral checks.
- `handle_behaviour`: mon-behv.cc 288-560 (foe logic), 554-740 (BEH_SEEK), 741-840 (wander, not read in full), 853-900 (flee and cornered).
- `behaviour_event` (ME_WHACK / ME_ANNOY branch): mon-behv.cc 1063-1200.
- `shake_off_monsters`: mon-behv.cc 1484-1505.
- Decay: mon-act.cc 1864-1865, inside `_pre_monster_move` (1784), called from `handle_monsters` (2827-2831).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Nearest visible hostile is the foe; scan only when the enemy is in view or on a roll | Scan roll 1 in 3 (theirs, 431) |
| A monster fighting another monster turns on the player | Switch chance 2 in 3 (theirs, 474-476) |
| Being hit makes the attacker the foe; unreachable means retreat, feared breaks fear | None (mechanism, 1153-1184) |
| Chase a lost foe to its last seen cell on a memory timer, refilled while the foe is seen | Memory human 450-1000, animal 250-550, brainless 100-300 (theirs, 727-733; unit: `you.time_taken`, not read) |
| Re-find on arrival with a stealth-scaled roll; failed roll clears memory | Chance 50 / stealth (theirs, 672); coin flip under Ashenzari penance (674); coin flip for monster foes (683-686) |
| Memory decays by the time the player spent; frozen while the player has penance | Decay by `you.time_taken` (theirs, 1865); Ashenzari penance check (1864) |
| Memory capped when the foe is shaken off | Cap 50 (theirs, 1502) |
| Fear sends the monster away from the source and it returns to seek when not scared | None (mechanism, 1343; 855-856) |

## 4. TypeScript sketch

simplified: the sketch covers pick, retaliation, memory refill, arrival re-find, memory give-up and shake-off, in that order. It omits the sanctuary and wrong-wall-side rules, the frenzy and berserk branches, the leash and friendly branches, the pacified and patrol branches, the monster-vs-monster switch, the haunting and misdirected overrides, the invisible-foe guess, the firing position, the 'threatening' gate on ME_WHACK, the Ashenzari penance coin-flip re-find, and the coin flip for monster foes. It also reorders nothing: the donor's order is pick, then retaliation, then memory; the sketch clears the foe on give-up, which the donor does not (it only sets WANDER). Distance is Chebyshev and the sketch takes the first hostile on a tie, not the donor's ring order.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Mind = "brainless" | "animal" | "human";
type Beh = "seek" | "wander" | "retreat";

interface Mob {
  id: number;
  x: number;
  y: number;
  mind: Mind;
  foe: number | null;                       // id of the current foe
  target: { x: number; y: number } | null;  // cell it walks to
  memory: number;                           // ticks left to chase a foe it cannot see
  feared: boolean;
  beh: Beh;
}

interface Unit { id: number; x: number; y: number; stealth: number; }

const MEMORY_RANGE: Record<Mind, [number, number]> = {
  human: [450, 1000],
  animal: [250, 550],
  brainless: [100, 300],
};
const SHAKE_OFF_CAP = 50;

const dist = (ax: number, ay: number, bx: number, by: number): number =>
  Math.max(Math.abs(ax - bx), Math.abs(ay - by));

// Nearest visible hostile. Ties go to the first in list order.
function pickFoe(m: Mob, hostiles: Unit[], visibleTo: (u: Unit) => boolean): number | null {
  let best: Unit | null = null;
  let bestD = Infinity;
  for (const u of hostiles) {
    if (!visibleTo(u)) continue;
    const d = dist(m.x, m.y, u.x, u.y);
    if (d < bestD) { best = u; bestD = d; }
  }
  return best ? best.id : null;
}

// Scan for a foe only when the player is in view, or on a 1-in-3 roll.
function needsScan(m: Mob, playerInView: boolean, rand01: () => number): boolean {
  return m.foe === null && (playerInView || rand01() < 1 / 3);
}

// A monster fighting another monster turns on the player 2 times in 3.
function maybeSwitchToPlayer(m: Mob, playerId: number, playerInView: boolean, rand01: () => number): void {
  if (playerInView && m.foe !== null && m.foe !== playerId && rand01() >= 1 / 3) m.foe = playerId;
}

// Being hit: the attacker becomes the foe. Unreachable means retreat; a feared monster breaks fear first.
function onHit(m: Mob, attackerId: number, reachable: boolean): void {
  m.foe = attackerId;
  if (!reachable) { m.beh = "retreat"; return; }
  if (m.feared) { m.feared = false; return; }
  m.beh = "seek";
}

// Seeing the foe refreshes the memory timer, by how smart the monster is.
function onSeeFoe(m: Mob, rand: (lo: number, hi: number) => number): void {
  const [lo, hi] = MEMORY_RANGE[m.mind];
  m.memory = rand(lo, hi);
}

// Memory counts down by the player's action time, once per monster move.
function decayMemory(m: Mob, actionTicks: number): void {
  if (m.memory > 0) m.memory -= actionTicks;
}

// On reaching the last seen cell, a player is re-found with chance 50 / stealth; otherwise memory is cleared.
function onArrive(m: Mob, player: Unit, rand01: () => number): void {
  if (m.memory <= 0) return;
  if (rand01() < Math.min(1, 50 / player.stealth)) m.target = { x: player.x, y: player.y };
  else m.memory = 0;
}

// Memory used up: give up the chase and wander.
function tickSeek(m: Mob): void {
  if (m.memory <= 0) { m.foe = null; m.beh = "wander"; }
}

// Foe lost on purpose (teleport, level change): remembered position is kept but the timer is capped.
function shakeOff(mobs: Mob[], lostFoeId: number): void {
  for (const m of mobs) {
    if (m.foe === lostFoeId && m.memory > 0) m.memory = Math.min(m.memory, SHAKE_OFF_CAP);
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (new module, engine AI brain): target choice, retaliation, the chase memory timer and the give-up rule. Parity-checklist row 2 (AI brain). The fight loop's aggro and leash are row 4; not claimed here.
- today: no AI module in src/fight/ (not checked against the current tree).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the engine owns targeting, the client only shows it); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- Clock. The donor's memory counts down by the player's action time in a turn-based game. Frankendom runs a fixed-step server tick. The timer must be in server ticks, or the same fight will fade at different speeds for players who act at different rates. Row 18 / post-K item 3 sub-line: server tick: fixed step, input intake, per-tick NPC budget.
- Target choice. The donor picks the nearest visible hostile per monster, with no cap on how many monsters pick the same hero. Frankendom's rulings give the engine the hate list and MAX_ATTACKERS = 3. The nearest-visible rule must become the engine's hate-list choice, and the cap must hold for the whole group, not per monster.
- Ties. The donor's comment says random ties, the code does not randomise. Frankendom must state its tie rule in code and test it, and the re-find roll must come from the seeded fight RNG so replays (row 19) match.
- Re-find roll on arrival. A stealth roll on the last seen cell is a server decision. The client must not decide whether the hero is re-found.
- Monster-vs-monster switch to the player (2 in 3). Frankendom has no monster-vs-monster fights in the duel model; drop it unless a zone brings a second faction.
- Flee and cornered branches were read in part only. The note does not claim their numbers. Do not port flee from this file without reading the wander and cornered branches fully.
- Teleport and level-change shake-off are the donor's answer to a foe that leaves. Frankendom's zones are one runtime, so the shake-off rule should be one function in the engine, not per zone.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine: targeting and chase live in the engine); rules 7-9 n/a

Best transferable idea: A lost foe is chased to its last seen cell on a memory timer that is refilled while the foe is seen, and the chaser re-finds the target there with a stealth-scaled roll, so pursuit fades in a readable way.
Decision (proposed): adapt — the engine owns targeting and the hate list (MAX_ATTACKERS = 3), so keep the memory timer and last-seen walk but count it in server ticks and roll re-finds from the seeded fight RNG; the nearest-visible rule does not fit a group cap.
Acceptance: A player sees a creature walk to the cell the hero last stood in and then wander when its memory runs out; a server test asserts memory is set in the species range on sight, drops by one per server tick out of sight, and is capped at 50 when the foe teleports away.
