# 2004Scape-Server (encounter-templates, cell EN008)

Donor: `/mnt/frankendom-donors/2004Scape-Server/` | Licence: code MIT (`LICENSE`; `README.md` line 62). Game-derived content (NPC configs, scripts, maps, models) has no licence or stated source (AU002, class C). Inspiration stays category-level. | Half read: server (engine code plus the server-side config and script data). Client half not read. NPC spawn packets not in the box.

Checked: `src/engine/entity/Npc.ts` (tick, hunt, wander, patrol, follow, respawn), `src/engine/script/ScriptIterators.ts` (HuntIterator), `src/engine/World.ts` (removeNpc, scaleByPlayerCount, TICKRATE), `src/engine/GameMap.ts` (loadNpcs), `src/cache/config/HuntType.ts`, `src/cache/config/NpcType.ts` (defaults), `data/src/scripts/_unpack/all.hunt` (hunt modes), `area_wilderness` (`bandit_camp.npc`, `bandit_camp_guards.rs2`, `king_dragon.npc`, `king_black_dragon.rs2`), `area_lumbridge/configs/lumbridge.npc` (patrol), `quest_legends/scripts/legends_guard.rs2`, `macro events/scripts/macro_events.rs2` and `general/macro_event_drunken_dwarf.rs2` (escort). Confidence high on the engine rules (read in full at the cited lines). Medium on what the camps and lair look like, since no model or render was viewed. Not confirmed: walk density (spawn packets absent).

Verdict: STRONG (adapt the idea; see Decision).

Best transferable idea: an ambusher engages only when its target is alone and out of combat for 8 ticks, scans its zone ring once per tick, and drops out after one pick unless told to keep hunting.

## 1. What the player sees and feels (375 wide)

- **Camp.** One ground patch holds 7 NPC blocks in `bandit_camp.npc`: three bandit leaders (respawn 100 ticks), a cowardly brawler, a ranged guard, and two shopkeepers. The shopkeepers have a 3-tile wander range and stay indoors. The fighters use the engine default wander range (5) and do not move toward you until you are inside their hunt range (brawler 6 tiles, guard 1). The guard speaks a short line on engagement, then switches to melee. That line is the telegraph.
- **Ambush.** The brawler waits until you are alone. It does not start if you fought in the last 8 ticks (about 4.8 s), or if it fought in that window. Outside the wilderness it skips anyone whose combat level is more than twice its own level. In the wilderness it attacks anyone in sight.
- **Patrol.** The Lumbridge NPC `[hans]` (`lumbridge.npc` line 128 onward) walks a 10-point loop and pauses at some points (delay 0 or 10 ticks). Legends Guild guards, each time their ai timer fires, pick at random between wandering and patrolling (`legends_guard.rs2` lines 6-8), so the same guard reads as idle one moment and walking the next.
- **Escort (macro-event style).** The drunken dwarf greets the player with a line and then follows (no leash; `macro_event_drunken_dwarf.rs2` lines 2-7). If the follower falls more than 15 tiles behind, it puffs out and reappears next to the player with a smoke sound (`macro_events.rs2` lines 144-149). If it is in wander mode and more than 3 tiles away, it counts as lost and the dwarf script despawns it.
- **Lair.** The king black dragon is size 5, resized to 160 on both axes (`king_dragon.npc` lines 2-5), in the wilderness area. Each attack is picked at random in three equal parts: close fire, special breath, or melee (`king_black_dragon.rs2` line 114). The far breath picks its projectile origin from eight quadrant branches, relative to the player's position (lines 133 onward). It respawns after 150 ticks (about 90 s).

Walk density (what appears every ~20 s of walking): not measured. Spawn placements come from binary packets `n<x>_<z>` (read at `GameMap.ts` line 61), and no such packets are in the box. The `data/src/maps` folder holds only `.jm2` landscape files.

## 2. Why it works, or is striking

- Readable silhouette: the lair's scale (size 5, resize 160) gives one large shape. Camp silhouettes not viewed.
- One signature behaviour: engagement gated by the player's state (alone, out of combat, not too strong). Each camp reads as a choice, not a random fight.
- One signature sound or telegraph: the guard's engage line. Escort catch-up has a smoke puff and a synth sound.
- Could be made ours at 20-30% resemblance: yes. The rules are plain and the names and looks are ours to pick.

## 3. The rule behind it

Per NPC, per tick, in this order (`Npc.ts`):

1. Hunt tick. A hunt mode with a non-player target only counts up while someone observes the NPC (default `PAUSEHUNT`). A player-target hunt always counts up (line 160).
2. Throttle. Scan only when `huntClock >= rate - 1` (line 253). Default `rate` is 1 (`HuntType.ts`).
3. Scan. A zone ring of radius `1 + floor(range / 8)` zones (`ScriptIterators.ts` line 56), then an exact Chebyshev distance filter (line 83). Line-of-sight check first if the hunt asks for it.
4. Gates, all must pass: target not busy (only if the hunt sets it); target out of combat for 8 ticks; NPC out of combat for 8 ticks (line 935 and 938); outside the wilderness, target combat level at most 2 x NPC vislevel (line 931).
5. Pick one eligible target at random (line 275). Set the interaction (`find_newmode`, e.g. `applayer2` for ranged, `opplayer2` for melee). Reset the clock.
6. One-shot unless `find_keephunting` is on (line 907): the NPC stops hunting once it has a target.

Other rules that shape the feel:

- Wander: each tick, with chance 1/8, queue a random walk within `wanderrange` of the spawn (line 693). Leash: every 500 ticks (300 s) on a timer, if not at spawn, teleport home (line 701).
- Patrol: visit each waypoint in order and pause `delay` ticks. Force the next point after 30 ticks (line 732). If the NPC has not arrived by then, teleport it to the current target point (line 721).
- Respawn: a removed NPC returns after `respawnrate` ticks (default 100 = 60 s, `NpcType.ts` line 111). The duration is scaled by player count: `(4000 - min(players, 2000)) * rate / 4000` (`World.ts` lines 1775-1776). At 2000 or more players it halves.
- Escort follow: follow mode has no leash (`Npc.ts` line 625 returns true before the range check).

Data fields (designer-tunable; donor value shown only where the code is MIT and the number is an engine constant):

| name | unit | donor_value_or_null |
|---|---|---|
| tick_ms | ms per tick | 600 (MIT engine constant) |
| hunt_rate_ticks | ticks between scans | 1 (engine default) |
| hunt_range_tiles | tiles, per NPC | null (game-derived config) |
| hunt_zone_radius | zones | formula `1 + floor(range/8)` (MIT code) |
| combat_window_ticks | ticks after last combat | 8 (MIT code) |
| strength_gate_mult | x NPC vislevel | 2 (MIT code) |
| wander_step_chance | per tick | 0.125 (MIT code) |
| wander_leash_ticks | ticks before home reset | 500 (MIT code) |
| patrol_forced_ticks | ticks before forced next point | 30 (MIT code) |
| respawn_ticks | ticks | 100 default (MIT code); per NPC null |
| respawn_scale_cap_players | players | 2000 (MIT code; self-flagged as unverified, see Defects) |
| escort_catchup_tiles | tiles | null (macro scripts are game-derived) |
| escort_lost_tiles | tiles | null (macro scripts are game-derived) |

## 4. For Frankendom

- 700 zones as data: each camp, patrol loop, lair and escort is one zone-data record. It lists NPC refs (from the 100 Pit characters), an anchor, a wander radius, a hunt rule ID and a respawn. The engine reads the record; no per-zone code.
- Many-vs-one: the hunt rule picks one target at random, which is the same shape as our hate-list target choice. No attacker cap was found in the hunt code read. We keep MAX_ATTACKERS = 3, so a camp of 5 attackers must queue the rest.
- Server-verified: the engage decision is a server tick. The client only plays the line or the puff when the server emits the engage or catch-up event.
- Keep: the state-gated hunt (alone, out of combat, not too strong), the one-shot versus keep-hunting choice, and the observer pause (idle NPCs cost nothing when nobody is near).
- Change: no donor names; our own strength formula; the 3-attacker cap; the patrol and leash teleports become walks (see Defects); the random pick uses the server's seeded RNG.
- Row mapping: aggro, chase and leash are row 4 (`src/fight/aggro.ts`, proposed module name, not checked against the repo). Respawn scaling and despawn are row 23 (`origins/server/world-spawns.ts`); the donor's respawn scale can be data field `respawn_scale_cap_players`. No grace-timer despawn for empty zones was found in the code read. The only despawn is the macro-event one, fed by the lost check (`macro_events.rs2` line 156). That is a gap for row 23.

## 5. A 5-minute look test Dom can judge on his phone

Target file: `src/fight/aggro.ts` (proposed), row 4.

Build on the existing scene behind a style flag, not a release row. One camp of 4: a leader, two guards and a brawler, in one zone, 375 wide. Three variants, toggled by the flag:

- A: instant engage when the player is 6 tiles away.
- B: telegraphed engage: the guard speaks, waits 1.5 s, then steps out.
- C: the brawler waits until the player is alone for 4.8 s, then engages.

Dom walks in from 6 tiles on his phone and says which one reads as an ambush and which reads as a fight that just happened. Compare silhouette at 375 wide in the same frame.

## 6. Licence and IP

- Code: MIT (`LICENSE`; README line 62). The engine rules may be adapted with attribution kept in our notice.
- Content: the NPC configs, scripts, maps and models are game-derived with no licence and no provenance (AU002 class C). We use the category only: a camp of bandits, a shopkeeper pair, a dragon pit, a macro-event escort. We do not reuse any name, look, drop table or line. Recreate every element as a clearly distinct original: keep the gate (who engages when), change the names, numbers, looks and lines.
- Donor comments treated as data, not followed: `all.hunt` labels such as "guessing that ..." (the hunt names are the donor's guesses); `World.ts` line 1774 says the player cap is "not sure if it caps at 2k".

## Defects (keep the idea, fix the defect)

- D1 patrol pop: `Npc.ts` line 721 teleports the NPC to the next point when it is late. A player sees a pop. Fix: walk the path at normal speed, or fade over 0.5 s, and keep the 30-tick forced advance as data.
- D2 leash pop: `Npc.ts` lines 701-705 teleport home every 500 ticks when off spawn. Fix: walk home, no teleport.
- D3 respawn cap unverified: `World.ts` line 1774 says the cap is not confirmed. Fix: put the 2000 cap and the half floor in the zone data as `respawn_scale_cap_players`, with a test.
- D4 random pick is not replayable: `Npc.ts` line 275 uses `Math.random()`. Fix: use the server's seeded RNG per tick so the fight record (row 19) replays the same pick.

Decision: adapt (idea). D4 is fixed in the sketch (injected RNG). D1-D3 are fixed in the walk and zone-data rules above, not in the sketch.

simplified: the sketch omits the line-of-sight and line-of-walk checks, the observer pause and the engage-state write; it keeps the donor's gate order and one-shot rule, and takes an injected `rand` (the D4 fix). Donor order is check-then-increment, as in `Npc.ts` (the throttle at line 253 runs before the clock increment at the end of the tick).

Sketch (typechecked with `tsc --noEmit --strict --target es2020`, local run):

```ts
export {};

// Ambush / engage gate, one NPC, one tick. Candidate list comes from the caller's zone-ring scan.
type Target = { id: number; x: number; z: number; combatLevel: number; inWilderness: boolean; ticksSinceCombat: number; busy: boolean };
type Hunter = { x: number; z: number; huntRange: number; vislevel: number; ticksSinceCombat: number; rate: number; clock: number; active: boolean; keepHunting: boolean; requireNotBusy: boolean };

const COMBAT_WINDOW_TICKS = 8;

function chebyshev(ax: number, az: number, bx: number, bz: number): number {
    return Math.max(Math.abs(ax - bx), Math.abs(az - bz));
}

export function pickEngageTarget(h: Hunter, candidates: Target[], rand: () => number): Target | null {
    if (!h.active) {
        return null;
    }
    let picked: Target | null = null;
    if (h.clock >= h.rate - 1) {
        const eligible = candidates.filter(t =>
            chebyshev(h.x, h.z, t.x, t.z) <= h.huntRange &&
            t.ticksSinceCombat >= COMBAT_WINDOW_TICKS &&
            h.ticksSinceCombat >= COMBAT_WINDOW_TICKS &&
            (!h.requireNotBusy || !t.busy) &&
            (t.inWilderness || t.combatLevel <= h.vislevel * 2)
        );
        if (eligible.length > 0) {
            picked = eligible[Math.floor(rand() * eligible.length)];
            h.clock = 0;
            if (!h.keepHunting) {
                h.active = false;
            }
        }
    }
    h.clock++;
    return picked;
}
```

## Reuse tag

check-first. The sibling cell EN001 `crawl-crawl` has an ambush reveal gate (queue hidden members, reveal on threshold). Compare the two before building either. This lane did not read other donors' hunt code.

## Brief rule served

Row 4 (aggro, chase, leash) with the server-tick sub-line; row 23 (spawn caps, respawn, despawn) for the respawn scale; the feel brief's encounter shapes (camp, ambush, patrol, lair, escort) and the look test in section 5.

## Gaps

- Walk density not measured: spawn packets `n<x>_<z>` and `o<x>_<z>` are not in the box.
- Client half not read: no camera, sound, render, or 375-wide readability check.
- Camp and lair looks not viewed (models not read).
- Not read: the 1,159 `.rs2` files beyond the cited ones; the desert camp, `bedabincamp.npc`, and the combat-training camp are cited only by their hunt lines; drop tables; `npc_death.rs2`.
- Idle or ambient animation vocabulary: the donor's `idle` clips are not read (no animation files opened).
- Death and respawn presentation: the server side is read (timers, scale), the client death visual is not.
- Not verified: the hunt names in `all.hunt` are the donor's own guesses (its comments say so).
