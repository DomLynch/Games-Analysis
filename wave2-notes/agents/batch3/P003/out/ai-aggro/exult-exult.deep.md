# exult-exult (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/exult-exult/combat.cc` | Licence: GPL-2.0-or-later (`combat.cc` header: "either version 2 of the License, or (at your option) any later version"; repo `COPYING` is GPL version 2) | C++ | symbol `Combat_schedule::find_foe` (with `find_opponents`, `approach_foe`, `now_what`)

Checked: Opened `combat.cc` 1-30 (licence header), 64-80 (constants), 371-481 (`is_enemy`, `find_opponents`), 482-687 (weakest, strongest, nearest, random, flank, protected finders, read in full), 688-785 (`find_foe`, read in full through the mode switch and erase), 862-957 (`approach_foe`, read to the path and retry logic; `back_off` 804-861 not read), 1064-1082 and 1160-1189 (`start_strike`, range check and dexterity spend), 1402-1430 (`run_away`), 1520-1532 (`Need_new_opponent`), 1554-1640 (`now_what`, approach and flee branches). Also `exult_constants.h` 31, `actors.h` 68 (single oppressor field), and a grep of `actors.cc` (2669, 3563, 5188: the hint file was a wrong starting point; the mechanism lives in `combat.cc`). Not read: the time queue that calls `now_what` (`Actor::start`, `get_std_delay`), `Duel_schedule` (only the grep hits at 1768-1893 and the header line), `back_off`, the rest of `start_strike` (1082-1160), the `fire` state. Confidence: high on target selection and the strike gate; medium on the chase retry path, which I read but did not trace through `Monster_pathfinder_client`.

Best transferable idea: Each attacker picks a foe from a shared pool by mode (weakest, strongest, or distance with penalties for foes already held or fleeing), removes it from the pool, and strikes only when a dexterity-fed timer reaches 30 points, with out-of-range pursuit not spending the points.

## 1. Mechanism

- Pool build (`find_opponents`, 396-481). Gathers the nearby NPCs (the donor's comment says the 9 surrounding chunks) and the avatar. Skips the dead, and the invisible unless the NPC can see invisible. An actor is an opponent if `is_enemy` (378-390) says so: good vs evil or chaotic, evil vs good or chaotic, chaotic vs evil or good, neutral never. Sleeping enemies go to a separate list. Awake enemies join the pool. Party members also count an actor that attacks a party member, or is attacked by one (in-party branch). Fallbacks: if the pool is still empty and the NPC is in the party with the avatar's alignment, the avatar's target joins (4); sleeping enemies are pushed to the front only when the pool is empty (466-468).
- Pick (`find_foe(mode)`, from 688). (a) Drop dead foes, and for the avatar drop sleeping ones. (b) If the pool is empty, rescan; if still empty, return nothing. (c) Dispatch on the NPC's attack mode (switch at 722): `weakest` = least strength (initial value 100); `strongest` = most strength (initial -100); `nearest` = least of distance + 16 if another NPC already holds that foe (545-547) + 32 if the foe flees or cannot act (549-551), and only foes closer than 4 * 16 = 64 tiles count (536); `random` = draw an index three times with `rand() % size`, keep the last draw not held by another NPC, fall back to `find_weakest_opponent` (570-587; the comment at 584 says "nearest", the code calls weakest at 585); `flank` = attacked-ally finder (the same +16 / +32 shape with a different ally test, 597-639); `protect` = the closest attacker of a party member who is combat-protected (641-686), else the first in the list; `berserk` = a coin flip between `random` and `nearest` (745); `defend` = nearest when strength <= 2 * effective health, else weakest (the code names the first value `max_hp` but reads strength); default = first in the list (775). (d) The chosen foe is erased from the pool (782), so each call hands out the next foe.
- Chase (`approach_foe`, from 862). If the NPC has no target it calls `find_foe`; on failure it counts a failure and calls `start(200, 400)` (874; the comment there says 2/5 sec). It sets the target, then runs away instead if the mode is flee, or if the monster is not immortal (`cant_die`), is not berserk, has the MOVE_ALL type flag, is not the avatar, and has health below 3. Teleport with a 1 in 4 chance when possible. Otherwise it builds an A* path to the foe with a range (1 for a projectile, the weapon range, or 3 with no weapon). If the path fails it tries the nearest foe once; if that also fails it steps toward the foe by 1 to 4 tiles in each axis and counts a failure. On success it clears the failure count and starts the approach action with the path.
- Strike gate (`now_what`, approach state, 1595-1606). If `dex_points >= 30`: with the intelligence check it may cast invisibility (`rand() % 300 < effint`, 1597) or summon (`rand() % 600 < effint`, 1600), spending 30 points on success; otherwise `start_strike`. If below 30: add the dexterity property to `dex_points` and wait one standard step (1606). `start_strike` checks range first: if the foe is out of range it goes back to the chase without spending points; in range it strikes and spends 30 (1175).
- Target dropping (`Need_new_opponent`, 1520-1532, checked at 1586). Returns true if there is no target, the target is dead, or the target is invisible and the NPC cannot see invisible with a 1 in 4 roll (`rand() % 4 == 0`, 1527). Otherwise it returns true when the target is off-screen and the NPC is on-screen (1531). On true the target is cleared and the state goes back to approach.
- Flee (`now_what` 1572-1584, `run_away` from 1402). In flee mode: a monster that cannot die switches to `nearest`; a party NPC that has fled more than twice, outside combat, switches to follow the avatar; otherwise `run_away` walks to a point 8 to 15 tiles away in a random quadrant (1406-1413) and, on the first flee, yells with a 2 in 3 chance (the `rand() % 3` test, 1414).
- Dormancy (`now_what` 1559): only on the first step (the `initial` state), an NPC more than 50 tiles from the camera actor goes dormant instead of starting.
- Tick: each NPC is its own state machine. `now_what` runs when the previous action finishes (the time queue, not read). Delays are passed to `npc->start(...)` (for example `start(200, 200)` on the first approach step, 1564). There is no fixed global step in this code.

## 2. Key functions

- `find_opponents`: `/mnt/frankendom-donors/exult-exult/combat.cc` 396-481 (pool build and fallbacks). Alignment table `is_enemy`: 378-390.
- `find_foe`: `/mnt/frankendom-donors/exult-exult/combat.cc` 688-785 (pool clean-up 700-715, rescan 718, mode switch 722-781, erase 782). The finders: `find_weakest_opponent` 482, `find_strongest_opponent` 508, `find_nearest_opponent` 535, `find_random_opponent` 567, `find_attacked_opponent` 597, `find_protected_attacker` 641.
- `approach_foe`: `/mnt/frankendom-donors/exult-exult/combat.cc` 862 onward (read to the retry path).
- `start_strike`: `/mnt/frankendom-donors/exult-exult/combat.cc` 1064 onward (range check; dex spend at 1175).
- `run_away`: `/mnt/frankendom-donors/exult-exult/combat.cc` 1402 onward.
- `Need_new_opponent`: `/mnt/frankendom-donors/exult-exult/combat.cc` 1520-1532.
- `now_what`: `/mnt/frankendom-donors/exult-exult/combat.cc` 1554 onward (dormancy 1559, flee 1572, target check 1586, approach and strike gate 1595-1606).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Opponent pool from nearby enemies by alignment table | Alignment table (theirs, combat.cc 378-390); neutral never an enemy |
| Pick by weakest, strongest, nearest with penalties, random of three draws, first | Penalty +16 for a foe already held by another NPC (theirs, nearest 547; flank 614, 620); +32 for flee or cannot act (theirs, 551, 625) |
| Search radius | 4 chunks = 64 tiles (theirs, 536; chunk 16 tiles, exult_constants.h 31) |
| Strike timer: points gain per step, strike spends points | Threshold 30 (theirs, combat.cc 75); gain = dexterity property (theirs, 1606) |
| Casts from intelligence rolls | `rand() % 300` invisibility, `rand() % 600` summon (theirs, 1597, 1600) |
| Lose target with a random roll on invisibility | 1 in 4 per check (theirs, 1527) |
| Go dormant when far from camera | 50 tiles (theirs, 1559) |
| Flee point | 8 to 15 tiles away, random quadrant (theirs, 1406-1413) |

## 4. TypeScript sketch

simplified: the sketch keeps the pool, the picks (weakest, strongest, nearest with penalties, random of three draws with the last valid wins, flank, default) and the strike timer. It drops the `berserk` and `defend` and `protect` modes (listed in the note, not sketched), the avatar and sleeping-foe fallbacks, the teleport and summon and invisibility casts (which also spend 30 points), the chase path and retry, the flee and dormancy branches, the yell lines and the time queue. The donor's `random` fallback calls the weakest picker (585), not the nearest one its comment names; the sketch follows the code. The flank test in the donor has three parts; the sketch collapses them into one `attackedByAlly` flag.

```ts
// Licence: GPL-2.0-or-later (donor, combat.cc header). Clean-room: written from the described mechanism, not translated.
const CHUNK_TILES = 16;      // donor: c_tiles_per_chunk (exult_constants.h 31)
const DEX_TO_ATTACK = 30;    // donor: dex_to_attack (combat.cc 75)

type Mode = "weakest" | "strongest" | "nearest" | "random" | "flank" | "default";

interface Foe {
  id: string;
  strength: number;
  dist: number;               // tiles from the NPC
  attackedBy: string | null;  // who is hitting this foe, if anyone
  fleeing: boolean;
  canAct: boolean;
  attackedByAlly: boolean;
}

// Nearest: distance plus penalties (+16 if someone else already hits it, +32 if it flees or cannot act).
// Only foes closer than 4 chunks are considered.
function nearestScore(f: Foe, selfId: string): number {
  let d = f.dist;
  if (f.attackedBy !== null && f.attackedBy !== selfId) d += 16;
  if (f.fleeing || !f.canAct) d += 32;
  return d;
}

// Picks one foe from the pool and removes it (donor: find_foe erases the chosen opponent).
// Returns null when the pool is empty; the caller then rescans.
function pickFoe(pool: Foe[], mode: Mode, selfId: string, rnd: () => number): Foe | null {
  if (pool.length === 0) return null;
  let idx = -1;
  const weakest = (): number => {
    let best = -1; let bestStr = 100;
    pool.forEach((f, i) => { if (f.strength < bestStr) { bestStr = f.strength; best = i; } });
    return best;
  };
  switch (mode) {
    case "weakest":
      idx = weakest(); break;
    case "strongest": {
      let bestStr = -100;
      pool.forEach((f, i) => { if (f.strength > bestStr) { bestStr = f.strength; idx = i; } });
      break;
    }
    case "nearest": {
      let best = 4 * CHUNK_TILES;
      pool.forEach((f, i) => { const s = nearestScore(f, selfId); if (s < best) { best = s; idx = i; } });
      break;
    }
    case "random": {
      // Three draws; the last draw that is not already hit by another attacker wins; else weakest.
      for (let t = 0; t < 3; t++) {
        const i = Math.floor(rnd() * pool.length);
        const f = pool[i];
        if (f.attackedBy !== null && f.attackedBy !== selfId) continue;
        idx = i;
      }
      if (idx < 0) idx = weakest();
      break;
    }
    case "flank": {
      let best = 4 * CHUNK_TILES;
      pool.forEach((f, i) => {
        const d = f.dist + (f.attackedByAlly ? 0 : 16) + ((f.fleeing || !f.canAct) ? 32 : 0);
        if (d < best) { best = d; idx = i; }
      });
      break;
    }
    default:
      idx = 0;
  }
  if (idx < 0) return null;
  const [chosen] = pool.splice(idx, 1);
  return chosen;
}

// Strike timer: dexterity points accumulate on each approach step; a strike costs DEX_TO_ATTACK points.
class Striker {
  dexPoints = 0;
  step(dexterity: number, inRange: boolean): "wait" | "chase" | "strike" {
    if (this.dexPoints < DEX_TO_ATTACK) {
      this.dexPoints += dexterity;
      return "wait";
    }
    if (!inRange) return "chase";    // out of range: pursue; the points are not spent
    this.dexPoints -= DEX_TO_ATTACK;
    return "strike";
  }
}
export {};
```

## 5. Lands in

- TARGET `src/fight/targeting.ts` (new, proposed; not checked against the Frankendom repo): the engine's foe pick and the strike gate. The one-engine rule puts both in the engine, and the client only shows the result.
- Parity row: 4 (fight loop: aggro, chase, leash). The brain as a whole is row 2; the sketch is the target pick and the strike timer inside row 4.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine, the engine owns many-on-one target choice); the attacker cap is a ruling, not a donor rule (section 6)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, and the note does not copy the code.
- One oppressor per actor. `actors.h` 68 stores a single `short oppressor` (-1 for none) and the finders test that one value (`combat.cc` 439, 544, 577). The donor cannot express MAX_ATTACKERS = 3. Frankendom needs an attacker list with a hard cap of 3; the donor's +16 is a soft penalty, and only the random finder skips a held foe outright.
- No threat or hate value. The donor's choice uses distance, strength, the single oppressor and state (flee, cannot act). There is no accumulated threat. Frankendom's hate list (the ruling that many-on-one logic lives in the engine) is not in this donor; do not read this as a hate model.
- The viewport leaks into AI. `Off_screen` uses the window rectangle (`combat.cc` 374), and `Need_new_opponent` drops a target that is off-screen (1531). The camera is client-only in Frankendom, so this test cannot be ported as written. The engine needs a world-distance or zone-bound rule instead.
- The dormancy rule uses the camera actor (1559). Same problem: a server must not read the camera. Use zone or player proximity instead.
- The strike timer runs per NPC on its own action clock (`now_what` on the time queue, not read), not on a fixed server tick. Frankendom's server tick is a fixed step (row 18 / post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget"). The 30-point rule must move to that step.
- Randomness: the donor uses `std::rand()` in the pick, the cast rolls and the dropping roll (570, 1527, 1597, 1600). Frankendom's picks and rolls need the server's seeded RNG and must land in the fight record (row 19).
- The donor's `random` fallback comment says nearest and the code calls weakest (584-585). Do not copy the comment; test the code path.
- The donor's `defend` mode names strength as `max_hp` (the mode's comparison uses strength against twice the health). This is a naming trap, not a rule to port; not sketched.
- Chase retry: when the path fails, the donor steps toward the foe by a random 1 to 4 tiles (approach_foe, the `rand() % 4` step). That is a client-visible walk; Frankendom's engine should use the zone path rule or give up after a fixed number of failures.
- Not read: the time queue and `get_std_delay`, the rest of `start_strike` (1082-1160, the attack call), `back_off` (804-861), `Duel_schedule`, the `fire` state, `Monster_pathfinder_client`.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** none found; is_enemy table, nearest +16/+32 and 4*16 radius, random 3 draws with weakest fallback (585), berserk coin flip, defend condition, erase on pick (782), dex_to_attack 30, rand()%300 / %600, Need_new_opponent 1 in 4, dormancy 50, run_away 8..15, 2 in 3 yell all match

**Missed:** find_foe clears pool on alignment change (694-698) and returns practice_target after rescan (713-715) - neither mentioned; sleeping NPC wait start(200,1000) at 1567
