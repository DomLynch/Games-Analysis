# scummvm-scummvm (spawns-encounters, cell 3)

Donor: `/mnt/frankendom-donors/scummvm-scummvm/engines/hadesch/rooms/monster/typhoon.cpp` | Licence: GPL-3.0-or-later (`/mnt/frankendom-donors/scummvm-scummvm/COPYING` lines 1-2 are GPL version 3; the file header, typhoon.cpp lines 7-10, allows "version 3 of the License, or (at your option) any later version") | C++ | symbol `Typhoon::typhoonA`, `TyphoonHeadDieAnimFinishedEvent`, `TyphoonHeadRespawnEvent` (with `monster.cpp` `kHitReceived` and `projectile.cpp` `getNumOfProjectiles`)

Checked: `typhoon.cpp` (1-356) read in full. `rooms/monster.cpp` 36-150 and 200-402 read (150-200 not read). `monster/projectile.cpp` 24-92, 128-300 read (92-127 and 300-303 not read). `monster.h` 42-110 and 120 read. `monster/cyclops.cpp` 165-200 and `monster/illusion.cpp` 311-345 read. The hint file was right: this is the real implementation. Not read: the event chain that starts each monster (events 15383, 15390-15392 are triggered elsewhere), `g_vm->addTimer`, `getRnd`, `getCurrentTime`, the hotzone code. A grep of `typhoon.cpp` finds three `addTimer` calls (130, 195, 289) and no timer cancel, so a respawn timer is not cancelled when its fight ends. Confidence: high on the respawn, volley and leaves arithmetic (each has a receipt); medium on the whole encounter flow, since the event chain was not traced.

## 1. Mechanism

- A boss with 18 heads (`typhonHeadInfo`, typhoon.cpp 48-67; `_headIsAlive[18]`, monster.h 120). At fight start all heads are set alive (93-96). Only the strength power hits a head, and only while the fight runs (165-166).
- A hit on a live head (`hitTyphoonHead`, 304-333): it is marked dead at once (313), its hotzone is disabled (319), and its die animation starts. When the die animation ends, `TyphoonHeadDieAnimFinishedEvent` (267-291) schedules a respawn timer. The level used is the one read at the hit (317), not the level when the timer fires.
- Respawn window (270-287). The timer fires after a random draw in [min, max] (289-290), using these bands (table in section 3).
- `TyphoonHeadRespawnEvent` (237-255) does nothing if the head is already alive or the fight is killed (241). Otherwise it enables the hotzone (243), sets the head alive (244), plays a respawn sound once (245-248), and plays the respawn animation, after which the head shows normal (249-254).
- The fight ends only when every head is down at the same time: the loop at 321-324 finds none alive, then `_isKilled = true` (328), `stopFight` (329), and a finishing animation (332). A respawn is the only way a head comes back.
- Attack cycle (`typhoonA`, 176-191). Three in four: a plain animation (181-182). Otherwise a coin flip picks one of two volley animations, which launch from x 456 or x 220 (183-190; the side names are not given in the code). Each animation's completion callback calls `typhoonA` again (15153 at 100-102), so attacks chain back to back, paced by animation length and not by a timer.
- Volley: on the completion of a volley animation (15159 or 15160), `getNumOfProjectiles()` shots launch from x 220 or 456 at random y (112-114, 120-122). The count is (level - 1) / 10 + 1 (projectile.cpp 172-174).
- Each shot. At creation a miss roll is drawn (49). The miss chance is 1 / (hit chance + 1), and the hit chance is 2 to 6 by level band (154-164). Flight length is (41 - level) x 100 ms (83, 151), counted from creation (55, 258). A click within a radius of 40 percent of the shot's scale intercepts it (291-300). A shot that is not a miss and is not intercepted, when its flight ends, plays a hit animation (269-277). When that finishes it raises `kHitReceived` (64).
- Leaves: a hero budget of 9 (`_leavesRemaining = 9`: typhoon.cpp 156, monster.cpp 136, cyclops.cpp 180). Each `kHitReceived` costs one (monster.cpp 287). At zero the fight stops (290-291).
- Level: the level counter goes up by one at event 15383 (monster.cpp 217) before the cyclops re-enters with that level. The other two monsters always enter at level 1 (monster.cpp 275, 278, 281).

Best transferable idea: On each boss part's death, schedule its respawn at a random time drawn from a window that shrinks with the encounter level, and let the respawn do nothing if the part is up again or the fight is over; the fight ends only when every part is down together.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later: clean-room only)

## 2. Key functions

- `hitTyphoonHead`: `/mnt/frankendom-donors/scummvm-scummvm/engines/hadesch/rooms/monster/typhoon.cpp` 304-333. Head down, die animation, respawn timer, all-down check.
- `TyphoonHeadDieAnimFinishedEvent`: same file, 267-291. The respawn window by level and the timer.
- `TyphoonHeadRespawnEvent`: same file, 237-255. The respawn guard and the respawn.
- `typhoonA`: same file, 176-191. The attack cycle (idle or volley).
- `Battleground::getNumOfProjectiles`: `/mnt/frankendom-donors/scummvm-scummvm/engines/hadesch/rooms/monster/projectile.cpp` 172-174. The volley size.
- Shot creation and miss roll: `/mnt/frankendom-donors/scummvm-scummvm/engines/hadesch/rooms/monster/projectile.cpp` 30-59 (the miss roll at 49), with `getProjectileHitChance` 154-164 and `getProjectileFlightLength` 150-152.
- Leaves budget: `/mnt/frankendom-donors/scummvm-scummvm/engines/hadesch/rooms/monster.cpp` 286-296.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Downed part respawns after a random delay drawn from a window | Window by level (typhoon.cpp 273-287), below |
| Respawn does nothing if the part is up again or the fight is over | Guard at 241 |
| Fight ends when every part is down together | Loop at 321-324 |
| Shot count grows by level | (level - 1) / 10 + 1 (projectile.cpp 173): 1 shot to level 10, 2 to 20, 3 to 30, 4 to 40 |
| Miss chance falls by level band | Hit chance 2 below level 7, 3 from level 7, 4 from 12, 5 from 17, 6 from 26 (projectile.cpp 154-164), so P(miss) = 1/3, 1/4, 1/5, 1/6, 1/7 |
| Flight time falls by level | (41 - level) x 100 ms (projectile.cpp 83, 151): 4000 ms at level 1, 1500 ms at level 26 |
| Hit budget ends the fight | 9 leaves (typhoon.cpp 156; monster.cpp 136) |
| Heads and hits | 18 heads (monster.h 120; typhoon.cpp 48-67) |

Respawn window (ms), from typhoon.cpp 273-287 (derived by hand from the formulas):

| Level | Min | Max |
|---|---|---|
| 1 | 15000 | 20000 |
| 21 | 5000 | 10000 |
| 22 | 4600 | 9600 |
| 23 | 4200 | 9400 |
| 25 | 3800 | 9000 |
| 26 | 3700 | 8800 |
| 27 | 3600 | 8600 |

At level 45 the minimum formula reaches 0 (3600 - 200 x 18), and past it the formula goes negative. The donor does not clamp this.

## 4. TypeScript sketch

simplified: keeps the donor's rules: a head goes down on a hit, the respawn window is read at the hit, the respawn timer starts after the die animation, a respawn happens only if the head is still down and the fight is on, the fight ends when every head is down together, plus the leaves budget, volley size, miss roll and flight length. It omits the animations, sounds and hotzones; the strength-only hit rule (the caller checks it); the attack cycle's animation chaining (the caller calls `pickAttack` and `volleySize`; `pickAttack` names the volleys by their x positions, 220 and 456); the intercept radius; the cyclops and illusion monsters; the event chain and the start-of-fight reset. It adds a fight-id guard to `respawn` (the donor checks only the head and the killed flag, and does not cancel stale timers) and a floor of 0 on the respawn window (the donor has none). `respawn` also keeps the donor's early return order. The sketch typechecks on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020`, exit 0.

```ts
// Licence of donor: GPL-3.0-or-later. clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Rng { int(lo: number, hi: number): number; } // inclusive bounds
type Schedule = (atMs: number, run: () => void) => void;

interface Head { alive: boolean; }
interface Fight {
  id: number;
  level: number;
  leaves: number;     // hit budget; the fight ends when it reaches 0
  active: boolean;
  heads: Head[];
}

// Respawn window in ms for a downed head, by fight level (the donor's bands).
function respawnWindow(level: number): { min: number; max: number } {
  const min = level <= 21 ? 15000 - 500 * (level - 1)
    : level === 22 ? 4600
    : level <= 25 ? 4200 - 200 * (level - 23)
    : level === 26 ? 3700
    : 3600 - 200 * (level - 27);
  const max = level <= 21 ? 20000 - 500 * (level - 1) : 9600 - 200 * (level - 22);
  return { min: Math.max(0, min), max: Math.max(0, max) }; // the floor at 0 is added here
}

// A head is hit: it goes down at once. Its respawn is scheduled after the die animation,
// in a random time from the window of the level read at the hit.
// Returns true if this hit took the last head down, which ends the fight.
function hitHead(f: Fight, i: number, now: number, dieAnimMs: number, rng: Rng, schedule: Schedule): boolean {
  if (!f.active || !f.heads[i].alive) return false;
  f.heads[i].alive = false;
  const w = respawnWindow(f.level);
  schedule(now + dieAnimMs + rng.int(w.min, w.max), () => respawn(f, i, f.id));
  if (f.heads.every((h) => !h.alive)) {
    f.active = false;
    return true;
  }
  return false;
}

// A stale timer from an earlier fight does nothing (the sketch checks the fight id; the donor
// checks only the head and the fight-over flag).
function respawn(f: Fight, i: number, fightId: number): void {
  if (f.id !== fightId || !f.active || f.heads[i].alive) return;
  f.heads[i].alive = true;
}

// Each projectile that hits the hero costs one leaf; at zero the fight ends.
function projectileHit(f: Fight): void {
  f.leaves -= 1;
  if (f.leaves <= 0) f.active = false;
}

// Volley size grows by one every ten levels.
function volleySize(level: number): number {
  return Math.floor((level - 1) / 10) + 1;
}

// Attack cycle: 3 in 4 a plain animation; otherwise one of two volley animations, chosen by a coin flip.
// The volleys launch from x 456 or x 220 (typhoon.cpp 112-122).
function pickAttack(rng: Rng): "plain" | "volley-220" | "volley-456" {
  if (rng.int(0, 3) !== 0) return "plain";
  return rng.int(0, 1) === 1 ? "volley-456" : "volley-220";
}

function hitChanceFor(level: number): number {
  if (level >= 26) return 6;
  if (level >= 17) return 5;
  if (level >= 12) return 4;
  if (level >= 7) return 3;
  return 2;
}

// A value in [0, hc] is drawn and 0 means miss, so P(miss) = 1 / (hc + 1).
function rollMiss(level: number, rng: Rng): boolean {
  return rng.int(0, hitChanceFor(level)) === 0;
}

// Flight time in ms: (41 - level) * 100, floored at 0 (the donor has no floor).
function flightMs(level: number): number {
  return Math.max(0, (41 - level) * 100);
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population engine logic). Parity-checklist row 23 (zone population: respawn with a timer). The donor's respawn is a timer keyed to the encounter level, which maps to zone data: the window bands become zone fields (respawn s min and max by level band), not constants.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later: clean-room only)
- Brief rule served: zones as data (the respawn window and the volley size become zone fields); server-verified kills (the respawn and the fight-over check run on the server, with a fight-id guard)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the described mechanism, not translated.
- Stale timers: respawn timers are added (typhoon.cpp 130, 195, 289) and never cancelled, so a timer from an earlier fight can fire into a later one. The guard checks only the head and the killed flag (241). Frankendom must key each respawn to a fight id and cancel timers when the fight ends, on the server.
- Randomness on the client: the donor draws all the random values with the client's `getRnd` (typhoon.cpp 181-190, 289-290; projectile.cpp 49, 86-92). Frankendom's server must draw them and record the draws for server-verified kills.
- Pace: attacks are chained by animation callbacks, not by ticks (typhoon.cpp 100-102, 182). Frankendom's server tick needs an explicit cadence: fixed step, input intake, and a per-tick NPC budget (post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget", row 18 owner).
- Wall-clock time: flight length and timers use `getCurrentTime` in ms (projectile.cpp 55, 258). The server must count ticks, not milliseconds.
- Two counters: the leaves budget is a separate counter from health (monster.cpp 287). Frankendom has one ledger, so a leaves-style budget must be the same ledger or a zone rule, not a second counter.
- MAX_ATTACKERS = 3: the volley grows to four shots at level 31 (projectile.cpp 173) and the donor has no cap. The engine must cap simultaneous attackers.
- No clamp on the respawn window past level 45 (typhoon.cpp 282 and 285-287). The level range was not read.
- The growl timer (typhoon.cpp 106, 194-195) is a sound cue that speeds up as heads die. Do not port it as a combat timer.
- Not read: the event chain that starts each monster (events 15383, 15390-15392 are triggered elsewhere), `addTimer`, `getRnd`, `getCurrentTime`, projectile.cpp 92-127 and 300-303, monster.cpp 150-200.




## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** Section 6 says the growl timer 'speeds up as heads die' (typhoon.cpp 193-195): real interval is rand(1100-50*alive, 1200-50*alive), so it is shorter (faster) with MORE heads alive and slows as heads die. Respawn text says the head 'shows normal' after respawn anim; real code hideHead(idx) then plays the respawn anim (249-254). MAX_ATTACKERS=3 is a Frankendom constant, not donor (no such symbol in engines/hadesch) - the note frames it correctly. Respawn bands, hit chance bands, flight (41-level)*100, volley (level-1)/10+1, leaves 9, 18 heads, licence all verified.

**Missed:** Reset sets _isKilled/_playingTyphoonDieSound at enter (typhoon.cpp 158-159); sound-flag latches (_playingTyphoonRespawnSound) minor.
