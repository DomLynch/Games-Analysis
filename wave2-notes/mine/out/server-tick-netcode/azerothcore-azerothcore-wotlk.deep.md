# azerothcore-azerothcore-wotlk (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/apps/worldserver/Main.cpp` | Licence: GPL-2.0 (LICENSE header: "GNU GENERAL PUBLIC LICENSE Version 2, June 1991") | C++ | symbol `WorldUpdateLoop`

Checked: `WorldUpdateLoop` starts at 584 (read to 619); `World::Update` at `game/World/World.cpp` 1131 (read 1131-1175, 1222-1230, 1250-1256); `MapMgr::Update` at `game/Maps/MapMgr.cpp` 251 (read 251-300).

## 1. Mechanism

- One thread runs a loop until the world is stopped. Each pass reads the clock and computes `diff`, the milliseconds since the last real update (607). If `diff` is below the minimum (config `MinWorldUpdateTime`, default 1 ms, 586) the loop sleeps the shortfall and goes round again without updating (608-615). Otherwise it calls `sWorld->Update(diff)` and stores the new previous time (618-619). So the tick is variable: there is no fixed step, every system gets the real elapsed time.
- `World::Update(diff)` advances its timers by `diff` (1150), runs periodic jobs when their timer has passed, then updates all player sessions (1227, packets in, state out), then the maps (1254). Sessions run before maps.
- `MapMgr::Update(diff)` (251) advances four timers (253), schedules a map update per map and waits for them if a thread pool is active (280). Maps are updated in three staggered steps: normal world maps first, battlegrounds/arenas second, dungeons third (272-292). On each step only that group gets the accumulated `i_timer[step]` time as a "full" update; other maps get 0. After the step a `DelayedUpdate` pass runs for that group (288), the step timer is reset (291) and the step counter advances (292). After step 3 the cycle restarts when `i_timer[3]` has passed (295).
- Effect: heavy groups (dungeons, battlegrounds) are not all updated on the same pass, which spreads cost across ticks while every map still sees the correct elapsed time. Network packet decode happens elsewhere (not read).

## 2. Key functions

- `WorldUpdateLoop`: `src/server/apps/worldserver/Main.cpp` 584-619+. The variable-step loop and sleep floor.
- `World::Update`: `src/server/game/World/World.cpp` 1131. Timer fan-out, sessions (1227), maps (1254).
- `MapMgr::Update`: `src/server/game/Maps/MapMgr.cpp` 251-300. Staggered three-step map update and the delayed pass.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Variable-step loop: elapsed ms in, sleep if under the floor | `MinWorldUpdateTime` default 1 ms (theirs, Main.cpp 586) |
| Sessions before maps in one tick | None |
| Round-robin map groups across ticks, each with a time accumulator | 4 timers, 3 steps (theirs, MapMgr.cpp 253, 295); step interval value comes from `SetMapUpdateInterval` at World.cpp 205 (not read further) |

## 4. TypeScript sketch

simplified: single-threaded; omits the thread pool and `m_updater.wait`, the LFG pre-update, the service-status and stuck-time handling, the delayed-update pass is reduced to a hook, and the step interval is a plain constant.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Group = "world" | "pit" | "dungeon";
interface Zone { group: Group; update(fullMs: number, diffMs: number): void; delayed(fullMs: number): void; }

const MIN_DIFF_MS = 1;
const STEP_MS = 50;
const ORDER: Group[] = ["world", "pit", "dungeon"];

export class Tick {
  private prev = Date.now();
  private step = 0;
  private acc = 0;
  constructor(private zones: Zone[], private sessions: (diffMs: number) => void) {}

  pass(now: number): boolean {
    const diff = now - this.prev;
    if (diff < MIN_DIFF_MS) return false;
    this.prev = now;
    this.sessions(diff);
    this.zonesUpdate(diff);
    return true;
  }

  private zonesUpdate(diff: number): void {
    this.acc += diff;
    const g = ORDER[this.step];
    const full = this.step < ORDER.length ? this.acc : 0;
    for (const z of this.zones) z.update(z.group === g ? full : 0, diff);
    if (this.step < ORDER.length) {
      for (const z of this.zones) if (z.group === g) z.delayed(full);
      this.acc = 0;
      this.step++;
    }
    if (this.step === ORDER.length) this.step = 0;
  }
}
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (new module, server tick: sessions then zones): checklist row 18 / post-K item 3 (net-tick). Zones as data run through one runtime. today: no equivalent module read.
- Ruling (Lead Dev, 2026-10-10): no new row for the server tick. It stays under row 18 / post-K item 3 as the named sub-line "server tick: fixed step, input intake, per-tick NPC budget". Acceptance is many-on-one (Proof 3: N NPC brains inside the tick budget).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 4 (zones are data on one runtime), 10 (zone copies, soft cap); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the described mechanism.
- Variable step means damage and cooldown math must take `diff`; Frankendom duels likely want a fixed step for server-verified kills and replay (row 19). Decide before copying the variable step.
- Staggered groups assume many heavy maps; Frankendom zones are data on one runtime, so the grouping is by zone weight, not by type. Whether staggering is needed at the expected load is unproven.
- Packet intake, sync, lag handling and anti-cheat are not in these functions (not read).
- Session-before-map order is what makes input apply before the world moves; Frankendom must keep that order for the one ledger.
