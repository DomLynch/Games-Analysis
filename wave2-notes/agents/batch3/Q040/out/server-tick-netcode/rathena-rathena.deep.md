# rathena-rathena (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/rathena-rathena/src/common/timer.cpp` (`do_timer`, 357-412) with `src/common/core.cpp` (`Core::start` loop, 388-392), `src/common/socket.cpp` (`do_sockets`, 892-923) and `src/map/mob.cpp` (NPC AI timers, 2332-2476) | Licence: GNU GPL v3 (LICENSE file: "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"; core.cpp line 1: "Licensed under GNU GPL"). Copyleft: clean-room, shape only, no line-by-line translation | C++ | symbol `do_timer`

Checked: `do_timer` (timer.cpp 357-412) read in full. The main loop in `Core::start` (core.cpp 384-392) and `Core::handle_main` (429-434) read. `do_sockets` read from 892 to the select call at 923 (the epoll branch at 934 onward was not read). Timer constants at timer.cpp 20-26. NPC AI: timer registration (mob.cpp 7355-7364), `mob_ai_hard` and `mob_ai_sub_foreachclient` (2348-2354, 2468-2476), `mob_ai_sub_hard_timer` (2332-2343), `mob_ai_sub_lazy` (2359-2455, read in full). `mob_ai_sub_hard` (1841): read the entry guards 1841-1870 only; the AI body from about 1870 to 2240 was NOT read, so what an NPC does on a think is not described. Its callers (grep: 2245, 2301, 2338, 2373, 2384, 2394) were each read in context, not in full. Config values from battle.cpp (8553, 8580, 8622), conf/battle/monster.conf (89-90), conf/battle/client.conf (39). Confidence: high for the scheduler and the cadence; medium for the AI-selection rule, which depends on the unread body. Not a camera cell.

## 1. Mechanism

- The tick is variable-step and timer-driven. There is no fixed step. `Core::start` runs `next = do_timer(gettick_nocache())` and then `handle_main(next)` in a loop while the core is RUNNING (core.cpp 388-391).
- `do_timer(tick)` (timer.cpp 357-412):
  (a) Timers sit in a min-heap ordered by due tick (the comment at timer.cpp 364 says "top element in heap (smallest tick)"; the heap helper macros were not read).
  (b) While the top timer is due (`diff <= 0`, 366-368), it is popped (371). If it is more than 1000 ms late (`diff < -1000`, 376), its callback receives the current tick instead of its scheduled tick (376-380).
  (c) One-shot timers are recycled (391-399). Interval timers re-arm: if more than 1000 ms late they restart from now (401-402), otherwise they advance by the interval from the scheduled tick (404-405), and are pushed back on the heap (405).
  (d) The return value is the time until the next timer, clamped to [20, 1000] ms (411; constants 24-25). An empty heap returns the maximum, 1000 ms (359).
- `handle_main(next)` calls `do_sockets(next)` (core.cpp 432). `do_sockets` first sends pending write buffers (the loop at 905-912; the `SEND_SHORTLIST` variant at 902-903 was not read), then calls `select` with a timeout equal to `next` (919-923). So the process blocks until the next timer or socket activity. The timeout is never longer than 1000 ms and never shorter than 20 ms, but a socket event can wake it earlier.
- NPC AI cadence: at map start, two interval timers are added (mob.cpp 7363-7364): `mob_ai_hard` every `MIN_MOBTHINKTIME` = 100 ms, and `mob_ai_lazy` every `MIN_MOBTHINKTIME*10` = 1000 ms.
- `mob_ai_hard` (2468-2476): if `battle_config.mob_ai & 0x20` is set, it runs `mob_ai_sub_lazy` over every mob (2470-2471). Otherwise it runs `mob_ai_sub_foreachclient` for each player (2473).
- `mob_ai_sub_foreachclient` (2348-2354): for each player, every mob inside `AREA_SIZE + ACTIVE_AI_RANGE` (14 + 4) gets `mob_ai_sub_hard_timer` (2351).
- `mob_ai_sub_hard_timer` (2332-2343): records the mob as spotted by that character (2337), runs `mob_ai_sub_hard(md, tick)` (2338), and if the hard AI ran it sets `last_pcneartime = tick` (2340).
- `mob_ai_sub_hard` (1841): returns if the mob has no map or is dead (1847-1848), or is force-walked (1851-1852), or if `tick < next_thinktime` (1854-1855). Otherwise it sets `next_thinktime = tick` (1858) and continues into the AI body (not read).
- `mob_ai_sub_lazy` (2359-2455), run for every mob by the 1 s timer:
  (a) With the `0x20` bit and users on the map, it calls the hard AI (2372-2373).
  (b) If `mob_active_time` is non-zero and the mob was last near a player (`last_pcneartime`), and it did not think at this exact tick, it calls the hard AI while `tick - last_pcneartime < mob_active_time` (2378-2384). Otherwise it clears `last_pcneartime` (2385). The boss equivalent follows at 2388-2396.
  (c) It cleans the spotted log (2399).
  (d) If the mob's hard AI ran within `MIN_MOBTHINKTIME*2` = 200 ms, it returns (2403-2404).
  (e) Three more early returns follow before the rolls: a skill-check guard (`last_skillcheck` within `MOB_SKILL_INTERVAL` = 1000 ms, 2407-2408; mob.hpp 42), a warp-chase check when a target exists (2411-2415), and the whole slave branch (a mob with a master runs `mob_ai_sub_hard_slavemob` and returns, or returns at once when neither it nor its master was spotted and `slave_active_with_master` is 0; 2417-2429). Only then does it unlock the target, roll a random walk with `mob_nopc_move_rate` (2435-2442) or an idle skill with `mob_nopc_idleskill_rate` (2444-2451); bosses and status-immune mobs use a separate rate for each (2440-2441, 2449-2450). The rates' values were not read.
- Net effect: a mob within 18 squares of a player (client.conf 38 describes `area_size` as "how many squares away from a player"; the range shape of `map_foreachinallrange` was not read) is offered the hard AI every 100 ms, once per player that has it in range (the donor has no dedupe across players that I could see). A mob outside that range is offered it once per second, and only while the active window (if enabled) keeps it hot.

## 2. Key functions

- `do_timer`: `/mnt/frankendom-donors/rathena-rathena/src/common/timer.cpp` 357-412. Min-heap timers, late-timer rules, clamped return.
- `Core::start` loop: `/mnt/frankendom-donors/rathena-rathena/src/common/core.cpp` 384-392 (inside `Core::start`, 333). Loop: timers, then sockets.
- `do_sockets`: `/mnt/frankendom-donors/rathena-rathena/src/common/socket.cpp` 892-923. Select with timeout = next tick.
- NPC AI timers: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` 7363-7364 (registration), 2468-2476 (`mob_ai_hard`), 2348-2354 (per player), 2332-2343 (per mob in range).
- `mob_ai_sub_hard` entry: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` 1841-1870 (guards only).
- `mob_ai_sub_lazy`: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` 2359-2455. Active-window branch, 200 ms guard, distant-mob rolls.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Timer clamp: sleep until the next due timer, bounded | min 20 ms, max 1000 ms (timer.cpp 24-25); empty heap returns 1000 ms (359) |
| Late timer: run once at now, do not replay the backlog | late threshold 1000 ms (376, 401) |
| Hot AI cadence for NPCs near a player | 100 ms (`MIN_MOBTHINKTIME`, mob.hpp 35) |
| Cold AI cadence for everything else | 1000 ms (`MIN_MOBTHINKTIME*10`, mob.cpp 7364) |
| Recent-think guard on the cold path | 200 ms (`MIN_MOBTHINKTIME*2`, mob.cpp 2403) |
| Hot radius | `AREA_SIZE` + `ACTIVE_AI_RANGE` = area_size 14 (battle.cpp 8553; client.conf 39; the squares unit is stated at client.conf 38) + 4 (mob.cpp 46) |
| Active window after last near a player | `mob_active_time`: code default 5000 ms (battle.cpp 8622); shipped monster.conf sets 0 (line 89), which turns the window OFF |
| Boss active window | `boss_active_time` shipped 0 (monster.conf 90); code default 5000 (battle.cpp 8623) |
| AI mode bit | `mob_ai` default 0x0000 (battle.cpp 8580), so the 0x20 path is off by default |

## 4. TypeScript sketch

simplified: the sketch keeps the 100 ms hot pass for NPCs within 14 + 4 cells of a player, the 1000 ms cold pass, the active window checked before the 200 ms guard (the donor's order in lazy), and the window expiry. It differs from the donor in three places: the hot pass runs each near NPC once per pass (the donor can run it once per player in range), the distance is a square (the donor's range shape was not read), and the random walk and idle-skill rolls for distant mobs are omitted. It also omits the skill-interval guard, warp-chase and slave branch of the lazy pass (2407-2429), the spotted log, the slave and boss branches, the `mob_ai & 0x20` mode, and the timer heap itself.

```ts
// Licence: GPL-3.0 (donor, rAthena). Clean-room: shape only, no line-by-line translation. Hot AI for NPCs near a player every 100 ms, cold pass every 1000 ms, with an active-time window after a player was last near.
export interface Npc { id: number; x: number; y: number; lastThinkMs: number; lastNearMs: number | null; }
export interface Player { x: number; y: number; }
type Think = (n: Npc, now: number) => void;

const AREA_CELLS = 14;          // view area (donor default area_size 14)
const ACTIVE_RANGE_CELLS = 4;   // extra range for hot AI (donor ACTIVE_AI_RANGE)
const HOT_MS = 100;             // hot pass interval (donor MIN_MOBTHINKTIME)
const COLD_MS = 1000;           // cold pass interval (donor MIN_MOBTHINKTIME * 10)
const RECENT_GUARD_MS = 2 * HOT_MS; // skip cold NPCs that thought recently (donor 2x guard)
const ACTIVE_WINDOW_MS = 5000;  // stays active after a player was near (donor code default; shipped config is 0 = off)

function near(n: Npc, p: Player, r: number): boolean {
  // simplified: square distance. The donor's range shape (map_foreachinallrange) was not read.
  return Math.max(Math.abs(n.x - p.x), Math.abs(n.y - p.y)) <= r;
}

// Every HOT_MS. Each NPC near any player thinks once per pass (donor runs once per player, no dedupe).
export function hotPass(npcs: Npc[], players: Player[], now: number, think: Think): number {
  let runs = 0;
  const radius = AREA_CELLS + ACTIVE_RANGE_CELLS;
  for (const n of npcs) {
    if (!players.some((p) => near(n, p, radius))) continue;
    n.lastNearMs = now;
    think(n, now);
    n.lastThinkMs = now;
    runs++;
  }
  return runs;
}

// Every COLD_MS. Window check comes first, then the 2x guard, as in the donor's lazy pass.
export function coldPass(npcs: Npc[], now: number, think: Think): number {
  let runs = 0;
  for (const n of npcs) {
    const active = n.lastNearMs !== null && now - n.lastNearMs < ACTIVE_WINDOW_MS;
    if (active && now > n.lastThinkMs) {
      think(n, now);
      n.lastThinkMs = now;
      runs++;
      continue;
    }
    if (n.lastNearMs !== null && !active) n.lastNearMs = null; // window expired
    if (now - n.lastThinkMs < RECENT_GUARD_MS) continue;
    // simplified: the donor's random walk and idle-skill rolls for distant mobs are omitted
  }
  return runs;
}
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (the server fight loop's NPC pass). Parity row 18, sub-line "per-tick NPC budget": the hot radius and the cold cadence bound how many NPCs think per tick. The fixed step itself is not from this donor (see the colyseus note).
- today: (Frankendom repo not read in this pass).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
- Brief rule served: 1 (one engine: AI cost follows players inside one runtime); rule 6 (tick topic: the driving loop and its variable step are described above)
- Best transferable idea: think NPCs near a player often and far NPCs rarely, and keep a recently-near NPC on the slow schedule for a short window so it does not drop out at the first step.
- Decision (proposed): adapt. Take the hot and cold cadence and the active window; make the radius and the window zone data. Reject the variable-step timer heap as our fight clock, because the fixed step must own the fight.
- Acceptance: a zone test with 40 NPCs and one player walking through them: each NPC thinks at most 11 times per second; NPCs more than 18 cells away think only at 1 Hz; an NPC that was near stays on the 1 Hz schedule for up to the window after the player leaves, then stops; the test asserts the think counter, not wall time.

## 6. Gaps and risks

- GPL-3.0 copyleft: clean-room only. The sketch is written from the cadence shape, not translated.
- The AI body of `mob_ai_sub_hard` (about 1870-2240) was not read. What an NPC does on a think (target choice, chase, skills) is unknown here. The fight AI rows (row 4) are not covered by this note.
- Double think: the timer calls the hard AI once per player who has the mob in range. The guard at 1854 blocks only `tick < next_thinktime`, so a second call with the same tick is not blocked by the code I read. The unread body may block it. Our hot pass dedupes; the test above must catch any double count.
- The shipped `monster.conf` sets `mob_active_time` to 0 (line 89), so the active window is OFF in the shipped config, while the code default is 5000 (battle.cpp 8622). Frankendom must pick the value per zone as data and not inherit either default silently.
- No explicit per-tick NPC budget was found. `grep` for budget, limit and per-tick terms in mob.cpp and map.cpp found nothing. The bound comes only from the radius and the cadence, so a zone with many NPCs in range has no cap. Frankendom needs an explicit cap if zones can hold large crowds.
- The timer heap is variable-step: a late timer runs once at now (376-380, 401-402). A fight clock must not run on it.
- After an attack or a finished cast, `mob_delay_event` sets `next_thinktime = max(tick + amotion, next_thinktime)` unless `mob_ai & 0x2000` is set (mob.cpp 4546-4548). An attacking mob therefore thinks on its attack-motion cadence, not every 100 ms; this is a more important timing rule than the active window, and the unread AI body may add more. The sketch does not model it.
- Spawn, respawn and despawn (parity row 23) are not covered by this note.
- The spotted log (`mob_add_spotted`, `mob_clean_spotted`) controls which NPCs count as active, and its bodies were not read.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Order of operations in mob_ai_sub_lazy is incomplete: between the 200 ms guard (2403-2404) and the random-walk/idle-skill roll the donor has more early returns the note skips - MOB_SKILL_INTERVAL=1000 ms guard (2407-2408, mob.hpp:42), warp-chase (2411-2415), and the whole slave/master branch (2417-2429, with slave_active_with_master). Note says '(e) Otherwise it unlocks the target...' as if directly after (d). Also boss_active_time code default 5000 is at battle.cpp:8623 (note says 'code default not read'), and the boss/MD_STATUSIMMUNE split for nopc move/idleskill rates (2440-2441, 2449-2450) is not mentioned. Verified OK: do_timer 357-412 incl. diff<-1000 (376, 401), return clamp 20..1000 (24-25, 411), empty heap 1000 (359), core.cpp 388-391/429-434, do_sockets 905-912/919-923, timers 7363-7364, MIN_MOBTHINKTIME=100 (mob.hpp:35), ACTIVE_AI_RANGE 4 (mob.cpp:46), area_size 14 (battle.cpp 8553), mob_active_time 5000 default (8622) and 0 in monster.conf (89), monster_ai default 0 (8580), hard 2468-2476, foreachclient 2348-2354, hard_timer 2332-2343, hard guards 1847-1858, lazy active window 2378-2396, GPL v3. 'No dedupe' reading is correct (next_thinktime=tick at 1858 passes an equal tick).

**Missed:** mob.cpp:4548 sets next_thinktime = max(tick+amotion, ...) after an attack, so attacking mobs think on their attack-motion cadence, not 100 ms - a more important timing rule than the active-time window and not covered (AI body unread).
