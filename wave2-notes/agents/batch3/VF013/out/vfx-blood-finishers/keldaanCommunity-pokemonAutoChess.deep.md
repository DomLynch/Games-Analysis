# keldaanCommunity-pokemonAutoChess (vfx-blood-finishers, cell 3)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/pokemon-sprite.ts` (with `battle-manager.ts`, `utils/orientation.ts`, `config/game/pokemons.ts`, `core/pokemon-entity.ts`) | Licence: GNU GPL version 3 (LICENSE file header: "Version 3, 29 June 2007"; the or-later clause was not read) | TypeScript (Phaser client, Colyseus server) | symbol `deathAnimation`

Checked: The hint file `app/models/effects.ts` (52 lines) is the synergy and terrain effect table (Falinks Brass effect when fewer than 6 troopers); it has no death or blood code, so it is not this mechanism. The death presentation is in `pokemon-sprite.ts` 563-612, called from `battle-manager.ts` 177-185. Read in full: `deathAnimation` (563-612), the death call site (177-185), the orientation tables (`orientation.ts` 1-40), the enum (`types/enum/Game.ts` 45-54), and the cap table (`config/game/pokemons.ts` 358-362). Read in part: the trooper spawn (`battle-manager.ts` 1382-1432), `addFlinch` (`pokemon-sprite.ts` 1290-1296), the server `onDeath` (`pokemon-entity.ts` 1296-1316). Candidate files opened: `abilities-animations.ts` (shakeCamera maker 826-832, grep only), `game-scene.ts` (`shakeCamera` at 1014, grep only, not read). Confidence: high on the death tweens and the direction maths; medium on the server side (only the on-death effect calls were read). This is a client presentation; the server does not change the followers' state here, as far as I read.
Best transferable idea: When a leader dies, its living followers turn to one ring of eight directions and walk away from it together after a short beat, while the leader fades out, so the loss reads as a scatter rather than a silent removal.
Decision (proposed): adapt - keep the fade-then-scatter presentation for a boss death with adds (row 17), but drive it from a server death event and set the living adds to a flee state on the server, not only in the client. Do not destroy the sprites as if they died; their HP and state stay server-owned.
Acceptance: When a boss with adds dies, the boss fades to alpha 0 over 1.5 s; each living add turns to its facing and walks 1000 units along its own ring direction from 0.5 s after the death, and is removed from view at 5.5 s; a server test asserts the death event is sent once, each living add's state flips to flee on that tick, and no add's HP changes from the presentation.
Reuse tag: rewrite-from-idea (GPL-3.0, clean-room only)
Brief rule served: 1 (one engine decides death and flee; the scatter is client presentation) and server-verified kills (the presentation never changes a kill)

## 1. Mechanism

- Trigger: the battle event for a Pokemon's death. The caller (`battle-manager.ts` 170-186) first plays the HURT action (180-184), then calls `deathAnimation()` (185). A passive "inanimate" unit that belongs to a team (the thrown pillars) skips this: the sprite is destroyed after 500 ms (177-178).
- Order inside `deathAnimation` (`pokemon-sprite.ts` 563-612):
  1. The lifebar is set to 0 at once (564-566).
  2. The leader's alpha tweens from 1 to 0 over 1500 ms, no delay, linear (571-575). On completion the leader is destroyed (577-578).
  3. For each follower in `troopers` (the array built by `battle-manager.ts` 1382-1430, capped at `MaxTroopersPerPkm`, sliced at 1390), in index order `i`:
     - it gets a flinch icon at once (585, `addFlinch`, starting at 1290);
     - its facing is `OrientationArray[(i + 6) % 8]` (586);
     - its run direction is `OrientationVector[(i + 5) % 8]` (587), giving `dx, dy`;
     - its target is 1000 units along that direction from its current x and y (588-589);
     - a Phaser linear tween moves it to the target over 5000 ms with a 500 ms delay (596-597), the same delay for every follower;
     - at the tween start (after the delay) the walk animation starts and its animation lock is released (inside the `onStart` block between 597 and 607; exact lines not checked); on completion it is destroyed (607).
- Server (for context only): `onDeath` (`pokemon-entity.ts` 1296-1316) increments the board's death count (1304), applies the on-death effects (1306) and curses. The death presentation is not driven from here; the client sees it through the battle events.
- Numbers, put together: a leader alpha fade of 1.5 s; followers stand for 0.5 s, then walk for 5.0 s, so they are gone 5.5 s after the death; each walks 1000 units in a fixed direction.

## 2. Key functions

- `deathAnimation`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/pokemon-sprite.ts` 563-612.
- Death call site and pillar gate: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/battle-manager.ts` 170-186.
- Follower spawn (cap and placement): `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/battle-manager.ts` 1382-1432.
- Eight-direction tables: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/utils/orientation.ts` 3-11 (vectors), 25-34 (ring order); enum `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/types/enum/Game.ts` 45-54 (values "0" to "7" in ring order).
- Follower caps: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/config/game/pokemons.ts` 358-362.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Leader fades out on death | 1500 ms, linear, alpha 1 to 0 (theirs, pokemon-sprite.ts 571-575). |
| Followers wait, then leave together | Delay 500 ms (597) and run 5000 ms (596), the same for all. Target 1000 units along the direction (588-589). |
| Fan of directions from the follower index | Run index (i + 5) mod 8 and facing index (i + 6) mod 8 on the eight-step ring (586-587; ring order orientation.ts 25-34). With 8 followers all 8 directions are used once. With 4 (Avalugg cap, pokemons.ts 360) the run indices are 5, 6, 7, 0, so all four go left or down. |
| Follower caps | Falinks Brass 8 (theirs, pokemons.ts 359); Avalugg and Hisui Avalugg 4 (360-361). |

## 4. TypeScript sketch

simplified: the sketch turns the donor's tweens into a pure function of time (position at time t), so it has no tween or sprite objects. It keeps the fade (1500 ms), the 500 ms delay, the 5000 ms run, the 1000-unit target, and the same ring indices (run i+5, facing i+6). It omits: the lifebar, the HURT action before the death, the flinch icon, the walk animation switch, the pillar gate, the sprite destroy calls, and the server events. It assumes the donor's tween starts from the position at death (the donor reads the position when it builds the tween, at 588-589; Phaser's own start-value rule was not read). The one-step difference between facing and run is kept as in the donor; I could not confirm from the code that it is intended.

```ts
// clean-room sketch from the described mechanism (donor is GPL-3.0; not a translation)
// Times in ms, positions in world units.
const FADE_MS = 1500;        // donor: leader alpha tween duration (pokemon-sprite.ts 571)
const FOLLOW_DELAY_MS = 500; // donor: follower tween delay (597)
const RUN_MS = 5000;         // donor: follower tween duration (596)
const RUN_UNITS = 1000;      // donor: run distance along the direction (588-589)
const RING = 8;

// Direction vectors indexed by ring step (donor OrientationVector: 0 DOWN, 1 DOWNRIGHT, ... 7 DOWNLEFT).
const DIRS: [number, number][] = [
  [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1],
];

export interface Follower { id: number; x: number; y: number; }

export interface FollowerPlan {
  id: number;
  facing: number;   // ring step the follower turns to
  runDir: number;   // ring step it runs along
  startMs: number;
  endMs: number;    // removed at this time
  toX: number;
  toY: number;
  fromX: number;
  fromY: number;
}

// Leader alpha: 1 at death, 0 after FADE_MS, linear.
export function leaderAlpha(elapsedMs: number): number {
  if (elapsedMs <= 0) return 1;
  if (elapsedMs >= FADE_MS) return 0;
  return 1 - elapsedMs / FADE_MS;
}

// Plan the scatter. Followers are in the same order as the donor's troopers array.
// Facing and run use index offsets 6 and 5 on the same ring, as in the donor.
export function planScatter(deathMs: number, followers: Follower[]): FollowerPlan[] {
  return followers.map((f, i) => {
    const runDir = (i + 5) % RING;
    const facing = (i + 6) % RING;
    const [dx, dy] = DIRS[runDir];
    return {
      id: f.id,
      facing,
      runDir,
      startMs: deathMs + FOLLOW_DELAY_MS,
      endMs: deathMs + FOLLOW_DELAY_MS + RUN_MS,
      toX: f.x + RUN_UNITS * dx,
      toY: f.y + RUN_UNITS * dy,
      fromX: f.x,
      fromY: f.y,
    };
  });
}

// Position at nowMs: standing until startMs, linear walk to the target, null once removed.
export function followerPos(p: FollowerPlan, nowMs: number): { x: number; y: number } | null {
  if (nowMs >= p.endMs) return null;
  if (nowMs <= p.startMs) return { x: p.fromX, y: p.fromY };
  const t = (nowMs - p.startMs) / RUN_MS;
  return { x: p.fromX + (p.toX - p.fromX) * t, y: p.fromY + (p.toY - p.fromY) * t };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/death.ts` (new module): the server death event, the living adds' flee state, and the client presentation timing (fade, delay, run, removal). The client sprite removal is presentation only.
- Parity-checklist row 17 (death / respawn). Note: the list hint was row 10, but the mechanism here is the death presentation, so row 17 is the right row.
- Reuse tag: rewrite-from-idea (GPL-3.0, clean-room only; no code copied)
- Brief rule served: 1 (one engine; the flee state and the death are server-owned) and the server-verified kill rule (the presentation never removes or changes a fighter's state).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch was written from the described mechanism.
- Presentation is not state: the donor removes the follower sprites at 5.5 s (607) while the server state is not changed in the code I read. Frankendom must not copy "destroy the sprite to end the fighter". The flee state is a server state change; the presentation follows it.
- Fan coverage is fixed by index: runs start at ring step 5 (UPLEFT), so with 1 to 4 followers they all go to the left or down side (run indices 5, 6, 7, 0). If Frankendom uses a fan for adds, pick the ring start per fight (the boss facing), not a fixed one.
- Facing and run differ by one ring step (586 uses i + 6, 587 uses i + 5). I could not tell from the code whether that is intended. Treat as a design question, not a defect I can prove.
- No stagger: all followers share the 500 ms delay (597). A stagger by index would be a new choice, not a donor behaviour.
- Pillars (passive "inanimate" units) skip the presentation and are removed after 500 ms (177-178). Keep that as a gate for summoned objects that are not fighters.
- Not read: the HURT action (`animatePokemon`), `addFlinch` beyond its first lines, the walk-animation release at the tween start (exact lines), the server event that carries the death to the client, and the shake maker in `abilities-animations.ts` 826-832 with `game-scene.ts` 1014 (shake is a separate screen effect; not written up here).
- The Falinks Brass effect in the hint file (`effects.ts`, fewer than 6 troopers) and the cap of 8 (pokemons.ts 359) disagree in number. This is a synergy rule, not part of the death presentation; not analysed.
