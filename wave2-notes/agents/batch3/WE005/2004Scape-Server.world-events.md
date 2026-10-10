# 2004Scape-Server (world-events, WE005)

Donor: `/mnt/frankendom-donors/2004Scape-Server` (VPS, read-only) | Licence: MIT for the code (`LICENSE:1` "MIT License"; `README.md:62`). Game-derived content (scripts, models, maps, songs) has no stated licence or provenance (AU002, class C). So content is category-level only: a visitor, a countdown, a hum of animals. Numbers below are donor evidence, not values to copy.

Checked: Read in full: `data/src/scripts/macro events/scripts/macro_events.rs2` (203 lines), `scripts/general/macro_event_swarm.rs2` (13), `scripts/areas/area_desert/scripts/desert_heat.rs2` (134), `general/scripts/flavour_text/sheep.rs2`, `ducks.rs2`, `cows.rs2` (short). Read by range: `scripts/general/macro_event_mysterious_old_man.rs2` (1-80 of 110), `prayer/macro_event_shade.rs2` (line 11), `configs/macro_events.constant` (36), `configs/macro_events.enum` (headers and counts), `login_logout/login.rs2` (line 19 and 14-19 via grep), `src/engine/World.ts` (line 120; 1292-1327 via grep), `src/engine/script/handlers/NpcOps.ts` (41-52), `src/engine/entity/Obj.ts` (lifecycle, 42-48). Candidate files opened: 14 or more. Confidence: high for the macro-event spawner and the desert heat (read whole); medium for the visitor escalation (its cadence is in engine code not read). Receipts: 38 rows in `receipts.tsv` for this donor; the verifier reported 100 of 100 passing across both donors.

Half read: data pack (`data/src/scripts/`), plus three engine files by range. The matching client half (`public/client/`, JS and wasm) is in the same repo and was not read.

## 1. What the player sees and feels

Chopping, mining or fishing for a while, a visitor may appear beside your character with a puff of smoke and a sound: a mysterious old man who bows and greets you by name, then waves, asks if you are there, gets crosser each time you ignore him, and on the fourth beat teleports you to a random place with another puff. Other visitors arrive the same way (a swarm that interrupts combat, a genie that follows you, a drunken dwarf). In the desert, a hidden countdown runs; when it reaches zero a water item evaporates or you drink, and with no water you take a few points of damage and a line says you are dying of thirst. Penned animals say a word every few seconds at random. On a 375-wide phone the read is one NPC beside your feet, one speech line per beat, a clear four-beat clock you can act on, and ambient animal sounds that make a field feel alive.

## 2. Why it works, or is striking

- Readable at 375 wide: one visitor, one speech bubble per beat, one emote per beat. The fail state is obvious.
- One signature behaviour: a four-beat escalation (wave, think, angry, fail). The player can read how long they have.
- One signature sound: a puff sound on appear and on leave; the swarm has its own appear sound.
- Could be made ours at 20-30 percent resemblance: a visitor who needs one reply, a fixed tether, and a small hidden countdown tied to gear.

## 3. The rule behind it

Macro-event spawner (`macro_events.rs2`):

1. A per-player timer runs every 500 ticks (`login.rs2:19`). One engine tick is 600 ms (`World.ts:120`), so the donor's timer is about 300 s.
2. Gates (`macro_events.rs2:4`, `:48`, `:57`, `:67`): no event if the player is in the duel arena, on the tutorial island or in the excluded minigame zones, or if an event is already running (lock `%macro_event` > 0).
3. Only if the player's skilling state is "afk" (`:7`): draw an event. Members draw from 5 entries, free-to-play from 4 (`macro_events.enum` lines 1-16; `:98`).
4. Spawn: a free square next to the player (`:30`, `:36`). Lifetime 1000, passed to the engine as a life-cycle counter in ticks (`NpcOps.ts:49`, `Obj.ts`). The donor marks the same 1000 as a "guess" in other event scripts (`macro_event_shade.rs2:11`).
5. Tether: if the visitor is on a different row from the player, or more than 15 tiles away, the visitor is teleported back next to the player (`:144-148`).
6. Login: if the event was flagged to follow on logout, it respawns at login (`:76-78`).
7. Visitor escalation (old man): beat 0 wave, beat 1 think, beat 2 angry (`macro_event_mysterious_old_man.rs2:23-31`); each AI tick the beat counter advances (`:43`). Beat 3 is the fail: the visitor leaves and the player is sent to a random place (`:33-38`). The beat cadence is the engine's default ai_timer (not read).
8. Success: a talk releases the lock (`:73`) and gives a reward and a goodbye (`:74-78`).
9. Fail teleport: one tick of delay, smoke, a random place from the fail-teleport list (`macro_events.rs2:109-125`), lock cleared (`:119`).
10. Lost path: if the visitor's target is gone, or the player leaves the event area, the visitor queues a despawn (`macro_event_mysterious_old_man.rs2:17-21`, `:46-50`) and the disappear proc only deletes the NPC (`macro_events.rs2:128-133`). Nothing in that path clears the lock (see D1).

Desert heat (`desert_heat.rs2`):

- The start proc arms a countdown of 150 ticks (`:12`), which is about 90 s at 600 ms per tick. The call site was not read.
- Gear changes the countdown each cycle, not in real time (`calculate_desertheat_timer` runs at start and at each reset, `:10`, `:56`): helmet -10 (`:21`), body armour -40 (`:28`), leg armour -30 (`:36`), shield -10 (`:49`), gloves -10 (`:53`); desert shirt +10 (`:26`), desert robe +20 (`:34`), desert boots +10 (`:42`). Heavier armour shortens the clock, desert clothing lengthens it.
- Each cycle (`[timer,desert_heat]`, `:66`): water in a jug, bowl or bucket evaporates one item (`:76-89`); otherwise a waterskin is drunk one step (`:92-111`, e.g. `:93`); with no water, a message and 1 to 10 damage (`:112-118`).
- Leaving: eleven listed zone-exit squares clear the timer (`:121-134`); a zone check inside the timer is the failsafe (`:67-71`).

Ambient idle (flavour_text): sheep say a word every 20 to 39 ticks (`sheep.rs2:5`, note on the measured range at `:2`). Ducks every 50 to 99 ticks (`ducks.rs2:6`; the donor measured 83 quacks with an average gap of 70.64 ticks, `:1-4`). Cows every 15 to 34 ticks (`cows.rs2:12`), and a word one time in four (`cows.rs2:13`).

Data fields (own names; donor values as evidence):

| name | unit | donor value | donor_value_or_null |
|---|---|---|---|
| tick_ms | ms | 600 | null |
| event_timer_ticks | ticks | 500 | null |
| event_lifetime_ticks | ticks | 1000 (donor "guess") | null |
| tether_tiles | tiles | 15 | null |
| beats_before_leave | count | 4 (beats 0-3) | null |
| members_event_count, free_event_count | count | 5, 4 | null |
| desert_countdown_base_ticks | ticks | 150 | null |
| desert_gear_modifiers | ticks | -10, -40, -30, -10, -10; +10, +20, +10 | null |
| thirst_damage_range | hp | 1-10 | null |
| idle_bleat_range (sheep, duck, cow) | ticks | 20-39, 50-99, 15-34 | null |
| cow_word_chance | 1 in N | 4 | null |

## 4. For Frankendom

- Zones as data: the desert is a zone list with an exit list; the visitor's fail places and the excluded minigame zones are lists. Keep them as zone data.
- Server-verified: the spawn, the lock, the beat counter, the tether and the countdown are server state. The client shows the speech line, emote, puff and sound. The server decides when a visitor leaves.
- Many-vs-one: the visitor is one NPC, one at a time, not an attacker. It does not touch the MAX_ATTACKERS = 3 cap. The swarm is the exception: it attacks, so it counts.
- Engage as state change: the swarm's appearance sets an "aggressive" interrupt on the player's current action (`macro_event_swarm.rs2:5`). That maps to "engage is a state change": one flag, one interrupt.
- Keep: one event at a time; area exclusions; a tether; a four-beat clock with one reply; a gear-modified countdown (the idea fits gear dressing, parity row 15, as data).
- Change: (a) the lock leak (D1); (b) the 1000-tick lifetime is marked "guess" by the donor, so set it as data and measure it on a phone; (c) the speech lines are the donor's, so write ours.

Defects (keep the idea, fix the defect):

- D1, lock leak on the lost path: the lock `%macro_event` is set when a visitor spawns (`macro_events.rs2:34`). It is cleared on talk (`macro_event_mysterious_old_man.rs2:73`), on fail (`:36`), on the fail teleport (`macro_events.rs2:119`), and at login (`:75`). The lost path (`:17-21`, `:46-50`) despawns the visitor with no release, and `macro_event_lost` returns true at its end (`macro_events.rs2:152`). `macro_event_allowed` then returns false while the lock is above 0 (`:67`). Read in code only; not run in game. Result as read: no random visitors for the rest of the session until the next login (`:75`). Fix: release the lock on every exit path (sketch: `endVisitor`).
- D2, lifetime unit: the 1000 is marked "guess" by the donor (`macro_event_shade.rs2:11`). Not a defect in logic, but a number to measure, not to trust.
- D3, fail is harsh by design: a single ignored visitor teleports the player after four beats. Keep the idea; consider a softer exit (leave without teleport) as a Dom call.
- Not a defect: the desert countdown uses the gear at cycle reset, so a gear swap takes up to one cycle to count (`:56`). Document it, do not fix it.

Target: `origins/server/world-spawns.ts` (parity row 23, zone population: spawn, lifetime, despawn, tether). Proposed fight-side hook for the swarm: `src/fight/<module>.ts` (not checked against the repo in this pass).

## 5. Look test (5 minutes, on Dom's phone)

Set the look-test flag on one test scene. Show a visitor beside the player: one speech line per beat, an emote per beat, a puff on leave. Run the four beats at the donor's pace and at a faster pace, then the fail teleport. Compare with a plain scene. Dom judges at 375 wide: (a) can he read which beat he is on without looking away from the field; (b) does the fail feel fair or cheap; (c) do the idle animal sounds make a field feel alive or noisy (try 20 s and 60 s gaps).

## 6. Licence and content

Code is MIT (`LICENSE:1`), so code may be adapted, with the MIT notice kept if any code is taken. The content is not clear: the scripts and models are game-derived with no licence line (AU002). So we take the shape only: a visitor with a four-beat clock, a gear-modified countdown, and an animal idle timer. We do not take the donor's speech lines, names, item names or the visitor's look. Keep the trait "one reply to a visitor, or the visitor leaves" and change the rest: our visitor, our lines, our desert, our gear rules. Video evidence cited in the donor's comments was not checked and is not relied on.

## 7. Gaps

- Not read: the client half (`public/client/`); the macro events drunken dwarf, genie and triffid scripts (beyond the grep hits); the poisonous-gas and watchman events; the engine's ai_timer and `macro_event_lost_hostile`; the call site that arms the desert countdown; the code that sets the skilling afk flag; the 1,159 rs2 scripts beyond the listed ones.
- No invasion or roaming-boss scheduler was found in the data half read (names and timer hooks grepped only). Not in the half I read: a world-scale timed invasion. The king-black-dragon roam and boss pattern are in DC002, not re-read here.
- Half read: data (plus engine lines). Client not read.
- Idle and ambient vocabulary: animal idle timers (above). Death and respawn presentation: not in the data read. Boss intro and finisher staging: not in the data read. Readability at 375 wide: not measured.
- Lost-path behaviour (D1) is a code reading; it has not been run.

Best transferable idea: a visitor that needs one reply, with a four-beat clock you can read, and a lock that is always released.

Decision: adapt (idea). D1 is fixed in the sketch; D2 is a measurement task; D3 is a Dom call.

Reuse tag: not checked against the Frankendom repo in this pass. Check for an existing per-player timer or random-event spawn before building one.

Brief rule served: keep the idea, fix the defect (Dom, 2026-10-10); a visitor is server-verified state with client presentation (row 23 for spawn and despawn).

simplified: the sketch keeps the afk gate, the area exclusion, one-at-a-time lock, the tether check and the four beats. It drops the NPC handle, the teleport, and the reward. It fixes D1 by releasing the lock on every exit path. The lifetime is a named constant that the donor itself marked as a guess.

```ts
export {};
export interface Player { id: number; inEventArea: boolean; afkState: boolean; eventLock: number; }
export const TETHER_TILES = 15;
export const LIFETIME_TICKS = 1000;
export const TICK_MS = 600;
export function eventAllowed(p: Player): boolean { return p.inEventArea && p.eventLock === 0; }
export function rollEvent(p: Player, memberCount: number, rand: (n: number) => number): number | null {
  if (!p.afkState || !eventAllowed(p)) return null;
  const id = rand(memberCount) + 1;
  p.eventLock = id;
  return id;
}
export type ExitReason = 'talked' | 'failed' | 'lost-area' | 'target-gone';
export function endVisitor(p: Player, _reason: ExitReason): void { p.eventLock = 0; }
export function tetherHolds(distanceTiles: number): boolean { return distanceTiles <= TETHER_TILES; }
export function beatName(beat: number): 'wave' | 'think' | 'angry' | 'fail' {
  const names = ['wave', 'think', 'angry', 'fail'] as const;
  return names[Math.min(Math.max(beat, 0), 3)];
}
```

Typecheck: `/tmp/we005/visitor_sketch.ts` on the VPS, `npx -p typescript tsc --noEmit --strict --target es2020`, exit 0.
