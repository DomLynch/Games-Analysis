# openmw (encounter-templates, cell EN008)

Donor: `/mnt/frankendom-donors/openmw/` | Licence: code GPLv3 (`README.md` line 9; `LICENSE` is the GPL v3 text). Clean-room: shape and mechanism only, no code copied. Morrowind data is not in the box (AU039). | Half read: engine AI code (`apps/openmw/mwmechanics/`: AI packages, actor dispatch, combat aggression). This is client-side engine code; OpenMW has no separate server. The data half (Morrowind ESM records that hold every placement, package duration and game-setting number) is not in the box.

Checked: `aiwander.cpp` (1018 lines; read the reaction timer, wander start, destination pick, idle roll, stationary and pathgrid rules), `aiwander.hpp` (`isStationary`), `aitimer.hpp` (reaction timer), `aiescort.cpp` (161 lines; read in full) and `aiescort.hpp` (default radius), `aitravel.cpp` (execute and give-up rule), `actors.cpp` (actor-pair dispatch: processing range, ally cascade, guard alarm, awareness call), `combat.cpp` (fight term, distance and disposition biases, `isAggressive`, aggro distance). Not read: `aifollow.cpp`, `aipursue.cpp`, `aisequence.cpp`, the awareness check itself (`mechanicsmanagerimp.cpp`), `files/data/scripts/omw/ai.lua`. Confidence high on the math in the functions read. The Morrowind game-setting values (distance base, multipliers, idle multiplier) are read as names only; their numbers are not in the box, so none are given.

Verdict: STRONG (adapt the idea; see Decision).

Best transferable idea: proximity aggro as a score. Distance and disposition add to a fight rating, combat starts only when the rating reaches 100, and then only if line of sight and an awareness roll both pass.

## 1. What the player sees and feels (375 wide)

- **Camp.** A group of creatures or people mills around its spawn point. A wander package sets a radius, and each walk goes to a random point between 20% and 100% of that radius from the spawn. Between walks the actor idles. Idle clips come from eight named idle groups (`aiwander.cpp` lines 34-43: idle2 to idle9, names only). In open ground most decision ticks lead to idling, so walks are rare and short.
- **Ambush (proximity aggro).** A stationary guard or creature stays still until you come close enough that the fight score reaches the threshold. Combat then starts only if the actor can see you and an awareness roll passes. Guards also join a fight within an alarm radius when the creature they see is already in combat and is an aggressive creature or a werewolf (`actors.cpp` line 751 and the checks just after it). The score applies to player targets and player allies (`actors.cpp` line 740); creature-on-creature fights start through the ally cascade instead.
- **Patrol.** Travel packages walk an actor from point to point. The travel gives up once the actor has stayed within a tolerance of its target for a timer (`aitravel.cpp` line 108 sets the tolerance floor at 64 units). The route itself is ESM data, not in the box.
- **Escort.** The escorted actor walks with you until you are more than an outer radius away, then it stops and plays the `idle3` animation (`aiescort.cpp` lines 127-130). It starts again only when you are back inside a smaller inner radius. It waits; it does not run off and it does not snap to you.
- **Lair.** A wander package with distance 0 is stationary (`aiwander.hpp` line 117). The actor idles on the spot, and the aggro score decides when it notices you.

Walk density (what appears every ~20 s of walking): not measured. Placements and package data are in the Morrowind ESM, which is not in the box.

## 2. Why it works, or is striking

- Readable at 375 wide: the escort's stop and resume is a clear "waiting for you" beat. Not viewed; the idle3 clip was not opened.
- One signature behaviour: an engage that ramps up with distance and disposition, instead of a fixed radius. The enemy seems to decide, not to trip.
- One signature sound or telegraph: none in the box (no audio read).
- Could be made ours at 20-30% resemblance: yes. The score shape and the two-radius hysteresis are general design. Our own numbers and names.

## 3. The rule behind it

Per actor pair (`actors.cpp`):

1. Skip the pair if the two actors are farther apart than the processing range (line 631, squared-distance test).
2. Ally cascade: if an ally of the actor was hit by the target, or an ally is already fighting the target, combat starts. If the target is fighting the actor and one of the target's allies is also fighting the actor, combat starts with that group.
3. Guard alarm: a guard joins combat when the creature it sees is in combat within the alarm radius (line 751) and that creature is an aggressive creature (fight term at 100 or more) or a werewolf, unless it has allies on its side. Calm spells and immobile targets block it.
4. Aggression score (only for player targets and player allies, `actors.cpp` line 740 and `combat.cpp` `isAggressive`):
   - fight term = the actor's Fight AI setting + distance bias + disposition bias (`combat.cpp` line 633).
   - distance bias = base − multiplier × distance (line 595). Distance ignores height for ground actors (`getAggroDistance`).
   - disposition bias = (50 − disposition) × multiplier (line 574).
   - aggressive when the fight term reaches 100 (line 646). A calm effect or an immobile actor cannot be aggressive.
5. Awareness gate: if the actor is aggressive, combat starts only if it has line of sight and `awarenessCheck` passes (line 795).

Wander and idle (`aiwander.cpp`):

- Each reaction tick is 0.25 s with a random deviation of 0.1 s (`aitimer.hpp` lines 9 and 14).
- With a path grid: 8% chance per tick (roll 92 or more, line 311) to start a walk, if not already walking.
- Without a path grid: 4% chance (roll 96 or more, line 323) to walk; otherwise the actor goes to idle now.
- Walk destination: random radius between 0.2 and 1.0 times the package distance (line 402), with a 64-unit overcrowding tolerance (line 51) and a minimum walk of 128 units (line 54).
- Idle roll: a game-setting multiplier gates whether an idle plays (line 752). Then an idle group is picked by eight per-package weights.
- Distance 0 means stationary; the path grid is not used at all (lines 117 and 886).

Escort (`aiescort.cpp`):

- Hysteresis, one mutable radius: while in range and walking, the radius is the half-extent plus 450 (line 123). When the leader is out of range, the actor stops, plays idle3, and the radius drops to the half-extent plus 250 (line 130). Resume is tested against that same radius (line 102). Default radius before the first check: 450 (`aiescort.hpp` line 58).
- Duration: the package runs down a timer in game time and completes at zero (execute, top of the function).

Data fields (designer-tunable; donor values are null because the code is GPL and the game-setting numbers are not in the box):

| name | unit | donor_value_or_null |
|---|---|---|
| aggro_threshold | fight-term points | null |
| aggro_dist_base | points | null (game setting, not in box) |
| aggro_dist_mult | points per unit | null (game setting, not in box) |
| aggro_disp_mult | points per disposition point | null (game setting, not in box) |
| fight_setting | points, per NPC | null (creature stat, not in box) |
| reaction_time_s | s | null |
| reaction_deviation_s | s | null |
| wander_start_pct_pathgrid | % per tick | null |
| wander_start_pct_open | % per tick | null |
| wander_radius_min_frac, wander_radius_max_frac | fraction of distance | null |
| destination_tolerance_units | units | null |
| escort_outer_radius_units | units beyond half-extent | null |
| escort_inner_radius_units | units beyond half-extent | null |
| travel_min_tolerance_units | units | null |

## 4. For Frankendom

- 700 zones as data: each camp, patrol, lair and escort is a zone-data record. It names the NPC refs (from the 100 Pit characters), the anchor, the wander distance (0 = stationary), the aggro profile and the escort radii. The engine reads the record.
- Many-vs-one: the aggro score is per NPC against the player. The ally cascade is the risk: in OpenMW one hit can pull a whole group. Our MAX_ATTACKERS = 3 caps the cascade, so extra allies queue.
- Server-verified: the score, the awareness roll and the escort radius run on the server tick. The client plays the idle3 or the alarm beat only when the server emits the state change.
- Keep: the score shape (distance and disposition add up, one threshold); the line-of-sight gate before combat starts; the escort's two-radius hysteresis (stop far, resume near); the stationary lair as distance 0; the idle roll before any walk.
- Change: our own constants and names; a seeded RNG for the awareness roll; faction standing as the disposition input; the cascade limited by the 3-attacker cap.
- Row mapping: aggro score, awareness gate, alarm radius and escort leash are row 4 (aggro, chase, leash). The processing-range gate is row 23 (zone population: cull far NPCs). The per-tick budget sits on the server-tick sub-line of post-K item 3 (server tick: per-tick NPC budget).

## 5. A 5-minute look test Dom can judge on his phone

Target file: `src/fight/aggro.ts` (proposed), row 4.

Build a style flag on the existing scene: one guard standing still by a path, one escorted NPC. Three aggro variants on the guard:

- A: a fixed radius (engage at 6 tiles).
- B: the score ramp (engage chance rises with distance and disposition, no line-of-sight gate).
- C: the score ramp plus a line-of-sight gate (a wall between you and the guard blocks the start).

Dom walks past each on a phone at 375 wide and says which one reads as "it noticed me" and at what distance. Then the escort: stop at 4.5 tiles and resume at 2.5 tiles versus an escort that never stops. Compare how it reads as waiting for you.

## 6. Licence and IP

- Code: GPLv3. Clean-room: the aggro score, the awareness gate, the two-radius escort and the stationary wander are described here as shapes. No code is copied, and our implementation is written from the shape alone.
- Morrowind data and game-setting numbers: not in the box and not used. Our data fields are our own.
- Fonts, textures and MyGUI layouts (AU039): not relevant to this topic; not used.
- Donor notes treated as data: the `TODO` in `aiescort.cpp` line 22 (cross-cell escort not handled) is a donor gap, not a defect of the idea.

## Defects (keep the idea, fix the defect)

- None verified in the code read. The escort's cross-cell case is a donor TODO (`aiescort.cpp` lines 21-22); we keep the escort and build the cell check ourselves (zone-level, server-side).

Decision: adapt (idea). Keep the score shape, the awareness gate, the escort hysteresis and the stationary wander. No defect to fix in the idea itself; the constants are our own data fields.

simplified: the sketch omits the Morrowind game-setting lookups (the numbers are data fields here, not copied), the awareness roll, the line-of-sight test, the ally cascade and the escort's package timer and idle animation; it keeps the score sum, the threshold, and the two-radius escort hysteresis as the donor orders them.

Sketch (typechecked with `tsc --noEmit --strict --target es2020`, local run):

```ts
export {};

// Proximity aggro score and escort hysteresis. Constants are our own data fields, not the donor's game-setting values.
export type AggroParams = { distBase: number; distMult: number; dispMult: number; threshold: number };

export function aggroStarts(fightSetting: number, dist: number, disposition: number, p: AggroParams): boolean {
    const distanceBias = p.distBase - p.distMult * dist;      // closer target = higher score
    const dispositionBias = (50 - disposition) * p.dispMult;  // less friendly = higher score
    return fightSetting + distanceBias + dispositionBias >= p.threshold;
}

export type EscortStep = "move" | "pause" | "done";

// Stop when the leader is beyond the outer radius; resume only inside the inner radius.
export class EscortGate {
    private maxDist: number;
    constructor(private readonly halfExtent: number, private readonly outer: number = 450, private readonly inner: number = 250) {
        this.maxDist = outer;
    }
    step(leaderDist: number, pathDone: boolean): EscortStep {
        if (leaderDist <= this.maxDist) {
            if (pathDone) {
                return "done";
            }
            this.maxDist = this.halfExtent + this.outer;
            return "move";
        }
        this.maxDist = this.halfExtent + this.inner;
        return "pause";
    }
}
```

## Reuse tag

check-first. The 2004Scape hunt gate (`2004Scape-Server.encounter-templates.md`) is a state-gated engage with a random pick; this note is a distance-weighted score with an awareness gate. They can share one module with two engage policies. Compare before building either.

## Brief rule served

Row 4 (aggro score, awareness gate, alarm radius, escort leash); row 23 for the processing-range cull (cite as data); the feel brief's encounter shapes (camp, ambush, patrol, lair, escort) and the look test in section 5.

## Gaps

- Walk density not measured: placements are in the Morrowind ESM, not in the box.
- Morrowind data half absent: no creature, cell, package or game-setting values.
- Not read: `aifollow.cpp`, `aipursue.cpp`, `aisequence.cpp`; the awareness roll in `mechanicsmanagerimp.cpp`; `files/data/scripts/omw/ai.lua`; the Morrowind-specific clip names beyond `idle3`.
- Idle and ambient clips: only the eight group names and idle3 read; no clip content.
- Death and respawn presentation: not read (the combat death path is in `combat.cpp` and the actor death code, not opened).
- Readability at 375 wide: not viewed; no audio read.
- The Fight, disposition and distance numbers are game settings from the box's absent ESM; they can be set only by Dom's tuning, not from the donor.
