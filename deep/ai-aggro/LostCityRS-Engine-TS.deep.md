# LostCityRS-Engine-TS (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Npc.ts` | Licence: MIT | TypeScript | symbol `Npc.huntAll / consumeHuntTarget` at 258 (verified: `huntAll` opens at 258; `consumeHuntTarget` at 962; the per-NPC turn at 109; `huntPlayers` at 996).

## 1. Mechanism

- Each NPC's `turn()` (109-192) runs once per world tick. Hunting runs before regen, timers and the queue. If the NPC has a hunt mode, and the hunt is not paused by "nobody near" (unless observers are present, or the hunt targets players), it calls `huntAll(hunt)` for non-player hunts only (`Npc.ts` 159-169, call at 164) and increments `huntClock`. Player hunts are skipped in `turn()` and driven from the world tick loop (`World.ts` 587), for NPCs with observers.
- `huntAll` (258-286): clears the old target. Throttle: returns if `huntClock < hunt.rate - 1`. Returns if the hunt is off or `huntrange < 1`. Gathers candidates by hunt type (players, NPCs, objects, locations) and picks one uniformly at random.
- Player candidates (`huntPlayers`, 996-1050) are filtered in order: not busy; not AFK; not too strong for a non-wilderness hunt (combat level above twice the NPC's vis level); skip if the player's own combat variable, or the NPC's own combat variable, is within 8 ticks of now (lines 1017-1024; these two checks are bypassed in a multi-combat zone or when the NPC's current target is already that player); variable checks; inventory counts (by object, by param, or by category).
- `consumeHuntTarget` (962-994): needs a target and a live hunt mode. If the find-new mode is a queue, it runs that queue script. Otherwise it sets the NPC's interaction to script on the target with the find-new mode. Then it clears the target and `huntClock`. If the hunt does not keep hunting, `huntMode` is set to -1 (one hunt, then done).
- Inputs: NPC position, hunt type record, world tick. Outputs: an interaction or a queued script. Tick: once per world tick, with `huntClock` as the throttle.

## 2. Key functions

- `Npc.turn`: `Npc.ts` 109-192. Hunt call ordering inside the NPC tick.
- `Npc.huntAll`: `Npc.ts` 258-286. Throttle, type dispatch, random pick.
- `Npc.consumeHuntTarget`: `Npc.ts` 962-994. Hand-off to an interaction or a queue script; one-shot clear.
- `Npc.huntPlayers`: `Npc.ts` 996-1050. Candidate filters in order.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hunt throttle by a per-NPC clock against a rate | `rate` per hunt type (theirs, data) |
| Pick one candidate uniformly at random from the filtered set | Uniform pick (the rule, not a constant) |
| Re-engage cooldown: skip a target that was in combat within a window | 8 ticks (theirs) |
| Too-strong gate outside the wilderness: level above twice the vis level | Factor 2 (theirs) |
| One-shot hunt: clear the mode after a find, unless the hunt keeps going | Keep-hunting flag (theirs, data) |

## 4. TypeScript sketch

simplified: the hunt-type dispatch (NPC, object and location hunts), the off / huntrange check, the nobody-near pause, the too-strong, variable and inventory filters, and the multi-combat and already-targeting bypass of the combat window are omitted; the combat window is reduced to one `now - combatTick >= cooldown` test; the hand-off is a return value instead of an interaction or queue script. The per-tick order (clear target, throttle, pick, clock++, consume) follows `turn()`. The donor picks with `Math.random`.
```ts
// Licence: MIT (donor). Sketch written from the described mechanism; lifting the real lines is permitted (Npc.ts 258-286, 962-994).
interface Candidate { id: number; busy: boolean; afk: boolean; combatTick: number; }
interface Hunt { rate: number; range: number; keepHunting: boolean; cooldownTicks: number; }
interface Hunter { clock: number; mode: Hunt | null; target: Candidate | null; }

// Throttle: a hunt runs only when the clock has reached its rate.
function huntDue(h: Hunter): boolean {
  return h.mode !== null && h.clock >= h.mode.rate - 1;
}

// Filter candidates in order, then pick one uniformly at random.
function pickTarget(list: Candidate[], now: number, cooldown: number, rnd: () => number): Candidate | null {
  const ok = list.filter((c) => !c.busy && !c.afk && now - c.combatTick >= cooldown);
  if (ok.length === 0) return null;
  return ok[Math.floor(rnd() * ok.length)];
}

// One hunt, one hand-off: hand off the target, then clear the target and clock, and drop the mode unless it keeps hunting.
function consume(h: Hunter): 'handoff' | 'none' {
  if (!h.target || !h.mode) return 'none';
  const keep = h.mode.keepHunting;
  h.target = null;
  h.clock = 0;
  if (!keep) h.mode = null;
  return 'handoff';
}

// Per-tick entry: a hunt runs only when the NPC is not paused by "nobody near".
function tickHunt(h: Hunter, list: Candidate[], now: number, rnd: () => number): void {
  h.target = null;
  if (h.mode && huntDue(h)) {
    h.target = pickTarget(list, now, h.mode.cooldownTicks, rnd);
  }
  h.clock += 1;
  consume(h);
}
```

## 5. Lands in

- TARGET `src/fight/world.ts` (exists today with `AGGRO_M` 9 m, `SIGHT_M` 14 m, `MAX_ATTACKERS` 3 and a per-creature threat list), checklist row 4 (fight loop: aggro, chase, leash; origins own copy until K2b/c). The throttle and the filter-then-pick are the shape of Zone 1 aggro; compare with the existing creature-chooses-by-threat step before adding anything.
- TARGET `src/fight/ai.ts` (today: `src/ai.ts`, moving), checklist row 2 (AI brain): the hand-off to one interaction, then done, is a pattern for an NPC's one-shot action choice.
- Reuse tag: adapt
- Brief rule served: 5 (many-on-one: hate list and target selection in the engine); rules 7-9 n/a

## 6. Gaps and risks

- MAX_ATTACKERS = 3: the donor's pick is one uniformly random target per hunt, with no limit on how many NPCs pick the same player. Frankendom's choice must keep the cap of three engaged on one player (a fourth holds at the ring) and prefer threat over a uniform random pick.
- Server-verified kills: the donor's pick uses `Math.random`. Frankendom's server must pick from the seeded stream, or it cannot replay and verify who attacked whom.
- Tick is 600 ms (`TICKRATE` in `World.ts` 120); Zone 1 runs at 1/60 s. Any throttle or the 8-tick combat window must be converted to Frankendom ticks, not copied as a number.
- One engine: the hunt picks from the world's own entity list. Frankendom's creatures are explicit fighters in `src/fight/world.ts`; do not add a second entity store.
- Zones as data: the multi-combat and wilderness checks are zone rules. They belong to zone data (origins/zones), not code, and the hunt rate / range belong in catalogue AI knobs (row 21).
- Interaction hand-off and queue scripts are a scripting layer with no Frankendom counterpart, so only the throttle and the filter shape transfer.
