# rathena-rathena (world-events, cell WE004)

Donor: `/mnt/frankendom-donors/rathena-rathena` (VPS, read only) | Licence: GNU GPL v3 for the code (`LICENSE` line 1; `README.md` line 81), GPL v3 header on `db/re/mob_db.yml` (per AU044). The event scripts carry author headers but no content licence. Category: C++ map server, NPC script, conf and data pack.

Verdict: STRONG (order of operations and numbers read in the code and the scripts). Decision: adapt (idea), no defect fixes needed beyond the minor doc mismatch in section 7.

Checked: read `src/map/npc.cpp` 1365-1425 (clock dispatch), `src/map/guild.cpp` 2530-2556 (WoE start and end), `src/map/script.cpp` 298-301 and 13895-13915 (label names, command hooks), `npc/custom/woe_controller.txt` (headers, castle rows, schedule array, OnAgitStart, OnMinute00, session editor, lines 1-60, 95-210, 490-600), `npc/events/bossnia.txt` (entry NPC, ticket branch, spawn rows), `src/map/mob.cpp` 150-232 (MVP tomb), 1040-1095 (respawn), 2898-2930 (MVP pick), 3438-3475 (reward order), `conf/battle/monster.conf` 155-157 and 276-282, `conf/battle/drops.conf` 27 and 96, `npc/other/poring_war.txt` 400-470. Candidate files opened: 14. Confidence high on the respawn, MVP, clock and WoE order. Medium on the bossnia spawn coordinate convention (the spawn loader was not read). Counts were made with awk on `npc/events/bossnia.txt` (method below), not receipted.

Half read: server (C++ map code) and data/script pack (npc/, conf/, the spawn rows). The client half is not in the box. No paired client donor in this batch.

## 1. What the player sees and feels

On a 375-wide phone a war starts with a server-wide line of text, then a short hold, then the castle NPCs light up with their own effect, and a spell pulse repeats every 425 ms on the war-information NPC for as long as the siege runs. Ending a siege uses the same two beats in reverse: a line of text, a one-second hold, then the castles close and any monsters inside are cleared. A ticketed Bossnia-style gauntlet is a warp NPC with a dialogue choice of four courses; each course is a grid of boss spawn rows, most on a timer of about 30 minutes, 1 hour or 2 hours. When a boss falls, the server waits nine seconds and then shows a stone tomb that names the killer and the time of death, and the top-damage player gets a visible award effect before the items. The Poring War recruit room is a 60-second countdown where chat lines land at fixed offsets (1 s, 4 s, 8 s "one minute left", 13 s, 20 s, 30 s, 40 s, 50 s, 55 s "cancelling", 55.1 s doors shut, 58 s reset).

## 2. Why it works, or is striking

- Readable beat at 375 wide: the start order is announce, hold one second, switch on the server state, then open the zones. The one-second hold is the cue, and it reads on a small screen.
- One signature behaviour: the boss tomb that says who killed it and when, after a fixed nine-second pause.
- One signature sound or effect: the 425 ms spell pulse on the war-information NPC while the siege runs.
- Could be ours at 20 to 30 percent resemblance: a scheduled siege with a day and hour window and a zone list, a boss tomb with the killer name, and a countdown with timed lines. None of these copies the donor's names or text.

## 3. The rule behind it

Order of operations, as the code runs:

1. Clock. A one-second timer (`src/map/npc.cpp` 1424) runs `npc_event_do_clock` (1368). It fires a label when the minute changes (`timer_minute_event_name`, 1381), when the clock changes to a given hour and minute (1384), once for the weekday, when the hour changes, and once when the day changes. The labels come from `script_config` (`src/map/script.cpp` 298-301). Events are edge-triggered on change, not run every tick.
2. Session table. The WoE schedule is a script array `$WOE_CONTROL`, sized at load (`npc/custom/woe_controller.txt` 154). Each row is `(weekday, start hour, end hour, castle bitmask)` (526). A session is live when the weekday matches and the hour is at least the start and less than the end (194). The `OnMinute00` tick ends a session at the top of its end hour (174).
3. Start order (lines 194-207). Announce "has begun" (198), wait 1000 ms (199), call the three start labels once for the whole war (200), then for each castle: if it is in the session, nothing more; if not, run its end label (206) and kill its monsters (207). The server flag itself is set in C++ (`src/map/guild.cpp` 2537) and the NPC start labels run from 2539. The C++ side has no timer of its own; the start is reached from the script command (`src/map/script.cpp` 13901).
4. End order (174-178). Announce "is over" (176), wait 1000 ms, run the end labels, pay rewards, clear the active bits.
5. Presentation while live. The `OnAgitStart` label loops while any war flag is set: sleep 425 ms, then a spell effect on the attached NPC (`npc/custom/woe_controller.txt` 32-35).
6. Respawn. Spawn time is `delay1` plus `rnd() % delay2` (`src/map/mob.cpp` 1071, 1073), scaled by class: boss, plant or ordinary, each at 100 percent by default (`conf/battle/monster.conf` 155-157), and floored at 1000 ms (1092).
7. MVP pick. Only MVP-type bosses (2900). The winner is the player with the largest damage plus tanked damage among those online, on the same map and alive. A tie keeps the earlier entry (2920-2924). Loot priority is off by default (`conf/battle/drops.conf` 27).
8. MVP reward and tomb. Effect first (`src/map/mob.cpp` 3442), then experience, then items, with a config switch for random item order (3473; `conf/battle/drops.conf` 96). The tomb is created with the killer name and the death time (`src/map/mob.cpp` 186) and appears after `mvp_tomb_delay`, default 9000 ms (154; `conf/battle/monster.conf` 280).
9. Countdown track. The recruit block of Poring War has 11 `OnTimerNNNN` labels from 1000 to 58000 ms (`npc/other/poring_war.txt` 421-468). Each label is one chat line, and the 55 s label is also the cancel point.

Data fields (designer-tunable; donor values are not copied because the code is GPL and the data source is not stated):

| name | unit | donor_value_or_null |
|---|---|---|
| respawn.base_ms | ms | null |
| respawn.variance_ms | ms | null |
| respawn.scale_pct | percent | null (donor default 100) |
| respawn.floor_ms | ms | null |
| siege.weekday | 0 to 6 | null |
| siege.start_hour, siege.end_hour | hour (end exclusive) | null |
| siege.zone_ids | list of zone ids | null |
| countdown.lines | list of (at_ms, line) | null |
| mvp.tomb_delay_ms | ms | null |
| mvp.loot_priority | bool | null (donor default off) |
| boss.count, boss.respawn_tier | count, tier name | null |

Bossnia spawn counts (counted with awk on `npc/events/bossnia.txt`, column 4, not receipted): 160 monster rows across four courses, 40 per course. Of these 136 carry a respawn base and 24 do not (6 per course, including the fixed-point rows at `npc/events/bossnia.txt` 181). Across the 136: 40 rows on the shortest tier, 32 on the middle tier and 64 on the longest (three tiers, about 30 minutes, 1 hour and 2 hours). Counts per row run from 1 up to 10. The entry costs one Reset Stone for five entries in the VIP branch (97-98; the entry line is 67), or 5,000 zeny in the other branch (104).

## 4. For Frankendom

- 700 zones as data: each zone row holds a list of spawn rows (character id, count, respawn tier, variance). A siege or event row holds a zone id list. At 700 zones a bitmask is the wrong shape, so the donor's castle bitmask becomes a list.
- 100 Pit characters reused across zones: a spawn row names a character id, so the same characters appear in many zones with different counts and timers. This is the same reuse the Pit already needs.
- Many-vs-one: the MVP pick is a damage ledger. Keep it in the engine (parity row 18, loot roll and XP award), not in the NPC layer. Ties keep the earlier entry, which is a fair rule to copy.
- Server-verified events: the server holds the siege flag and the zone spawn state, and the schedule is checked once a minute on the server. The client only plays the pulse, the hold, the tomb and the countdown lines.
- Keep: one-second hold between announce and open; start and end in one fixed order; the tomb with the killer name and time; respawn as base plus variance; the countdown as a list of timed lines.
- Change: sessions are zone data, not script globals; the schedule runs on the server tick, not a minute NPC; no per-castle NPC labels; the tomb delay and the pulse rate are client presentation values only.

## 5. A five-minute look test, and where it lands

Lands in: `origins/server/world-spawns.ts`, parity row 23 (zone population: spawn cap, respawn timer with variance, despawn). Secondary for the MVP pick: `src/fight/` loot and XP award, parity row 18, not built here.

Look test for Dom on his phone: build one 20-second clip of a boss death in three versions. (A) tomb after nine seconds with the killer name and time; (B) tomb at once; (C) a siege start with a one-second hold before the zones light, against no hold. Compare which beat reads on a 375-wide screen, and whether the nine-second tomb feels like a pause or a delay.

Reuse tag: rewrite-from-idea (GPL v3 code: clean-room shape only; no values copied).
Brief rule served: one engine with zones as data; kills and events server-verified; client shows presentation only.

Sketch (typechecked on the VPS with `tsc --strict`, file `/tmp/we004_rathena_world.ts`):

simplified: the sketch keeps the donor order (announce, one-second hold, server flag, then zones) and the respawn formula (base plus variance, scaled, floored at one second). It omits the NPC layer, the per-castle end labels, the reward payout, the kill of monsters in inactive castles, and the countdown timer. Weekday and hour come from the caller, not from a clock.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Numbers are designer-tunable data fields (base_ms, variance_ms, scale_pct).

export {};

export interface RespawnRule {
  base_ms: number;      // data field, unit ms (donor delay1)
  variance_ms: number;  // data field, unit ms, 0 = none (donor delay2)
  scale_pct: number;    // data field, unit percent, 100 = no change (donor boss_spawn_delay / mob_spawn_delay)
}

// Respawn time: base plus a uniform offset in [0, variance), scaled, then floored at one second.
export function respawnMs(rule: RespawnRule, roll: number): number {
  const offset = rule.variance_ms > 0 ? Math.floor(roll * rule.variance_ms) : 0;
  const raw = rule.base_ms + offset;
  const scaled = Math.floor((raw / 100) * rule.scale_pct); // divide first, as the donor does
  return Math.max(1000, scaled);
}

export interface SiegeSession {
  weekday: number;      // 0 = Sunday
  start_hour: number;   // inclusive
  end_hour: number;     // exclusive
  zone_ids: string[];   // a list of zone ids, not a bitmask, at 700 zones
}

export interface Clock { weekday: number; hour: number; minute: number; }

// Sessions live right now. The server checks this once per minute and flips its flag on change.
export function liveSessions(sessions: SiegeSession[], now: Clock): SiegeSession[] {
  return sessions.filter(s => s.weekday === now.weekday && now.hour >= s.start_hour && now.hour < s.end_hour);
}

// Ordered start: announce, wait 1 s, mark the server flag, then open the zones.
export function startOrder(s: SiegeSession): Array<{ at_ms: number; step: string }> {
  return [
    { at_ms: 0, step: "announce:begun" },
    { at_ms: 1000, step: "flag:on" },
    { at_ms: 1000, step: "zones:open:" + s.zone_ids.join(",") },
  ];
}
```

## 6. Licence and content status

- Code: GPL v3 (`LICENSE` line 1, `README.md` line 81). Clean-room shape only. No code or constant is copied; the sketch above is written from the described order.
- Data: `db/re/mob_db.yml` has a GPL v3 header (per AU044). The event scripts have author headers (Bossnia and the WoE controller) but the files state no content licence. The monster names and event concepts come from a commercial online game; the files do not say who holds that content. Inspiration stays category-level: "a ticketed four-course boss gauntlet", "a weekday siege window with a zone list", "a tomb that names the killer". No names, rows or values are reproduced.
- No legal conclusion is drawn.

## 7. Gaps

- Not read: `src/map/instance.cpp`, `src/map/battleground.cpp`, `npc/events/gdevent_sch.txt`, the spawn loader (so the coordinate convention `0,0` used by the monster rows is not confirmed), the default respawn for the 24 rows without a delay field, the weekday label names, `agitcheck` internals, the castle end and breach handlers, `Killed` and the `clif_mvp_*` packet functions.
- Minor mismatch (documentation only): the comment at `src/map/npc.cpp` 1366 lists `OnDDHHMM`, but `npc_event_do_clock` does not fire it. Fix: leave it out of the design; the minute, hour, clock and day labels are enough.
- Half read: server and script/conf only. No client half in the box.
- Frankendom has no castle concept; the siege becomes a zone-list session and needs a design call from Lead.
- Best transferable idea: a world event is a small table of (weekday, hour window, zone ids) that the server checks once a minute and opens with a one-second announce-hold-open order.

## Receipts

Receipts are in `/private/tmp/p2/wave2-haiku/batch3/WE004/receipts.tsv` under note `rathena`. The verifier reports 89 of 89 ok.
