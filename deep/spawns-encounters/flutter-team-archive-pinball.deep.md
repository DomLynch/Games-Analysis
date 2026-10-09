# flutter-team-archive-pinball (spawns-encounters, cell 4)

Donor: /mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/behaviors/ball_spawning_behavior.dart | Licence: MIT per LICENSE | Dart | symbol BallSpawningBehavior (opened: whole file; listenWhen 13-21, onNewState 24-39; pinball_game.dart 85-125)

## 1. Mechanism

- A component listens to the game state bloc (the mixin `FlameBlocListenable`, a library not read, calls `listenWhen` and `onNewState`). `listenWhen(previous, new)` (13-21) returns false unless the new state is playing, and then fires on one of two edges: the game just started (previous status was waiting or game over, or there was no previous state), or a round was lost (previous rounds greater than new rounds; with no previous state the test is also true).
- `onNewState` (24-39) finds the single `Plunger` and the single `ZCanvasComponent` in the scene (`.single` throws if there is not exactly one of each), reads the selected character theme's ball asset key from `CharacterThemeCubit`, and creates a `Ball` whose initial position is the plunger body's position moved up by the ball's height, on the launcher layer with the `ballOnLaunchRamp` z-index. It adds the ball to the canvas.
- Nothing in this file checks whether a ball already exists; the class comment says it spawns when all balls are lost, but the code tests only the status and rounds edge. What lowers `rounds` is elsewhere (not read). A different class, `BonusBallSpawningBehavior` (bonus_ball_spawning_behavior.dart, a 5-second `TimerComponent` that adds a bonus ball; opened lines 1-25 only), is added by the Google word and Flutter forest bonus behaviours; it is not this class and is not used in the sketch.
- Attachment: `BallSpawningBehavior()` is one child in the provider tree built in `PinballGame.onLoad` (`pinball_game.dart` line 104, beside `BonusNoiseBehavior`, `GameBlocStatusListener`, `CharacterSelectionBehavior`).
- Inputs: a state transition. Outputs: one new ball entity.
- Tick: on the state transition, not per frame.

## 2. Key functions

- `BallSpawningBehavior.listenWhen`: `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/behaviors/ball_spawning_behavior.dart` lines 13-21. The edge test: game started, or a round lost.
- `BallSpawningBehavior.onNewState`: `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/behaviors/ball_spawning_behavior.dart` lines 24-39. Places one ball at the launch point.
- `PinballGame` attachment: `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/pinball_game.dart` line 104 (inside `onLoad`, which starts at line 81). Adds the behaviour to the game component's list.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Spawn on a state edge, not on a poll: start of a run, or loss of a life | rounds count (theirs; the initial value 3 is at game_state.dart line 55, not this file) |
| Spawn at a fixed anchor relative to a launcher object | ball height offset above the plunger (theirs, line 33) |
| Asset chosen from the selected theme at spawn time | theme keys (theirs) |

## 4. TypeScript sketch

Licence: MIT. The mechanism is restated in its own names; the donor path is cited above.

simplified: the plunger and canvas lookups (and their throw when not exactly one), the character theme asset, the launcher layer and z-index, and the entity itself are omitted (the caller adds it); the anchor is passed in; there is no guard against an existing ball (the donor has none either).

```ts
// Licence: MIT (donor flutter-team-archive-pinball ball_spawning_behavior.dart). Restated mechanism, not a copy.
type Status = 'waiting' | 'playing' | 'gameOver';
interface GameState { status: Status; rounds: number; }

// Fire only on an edge: a run has just started, or a round was lost while playing.
function shouldSpawn(prev: GameState | null, next: GameState): boolean {
  if (next.status !== 'playing') return false;
  const started = prev === null || prev.status === 'waiting' || prev.status === 'gameOver';
  const lostRound = prev === null || prev.rounds > next.rounds;
  return started || lostRound;
}

// Spawn at the anchor above the launcher; the caller adds the entity to the scene.
function spawnPoint(anchor: { x: number; y: number }, ballHeight: number): { x: number; y: number } {
  return { x: anchor.x, y: anchor.y - ballHeight };
}

// Runs once per state change, never per frame.
function onStateChange(prev: GameState | null, next: GameState, anchor: { x: number; y: number }, ballHeight: number, add: (p: { x: number; y: number }) => void): void {
  if (shouldSpawn(prev, next)) add(spawnPoint(anchor, ballHeight));
}
```

## 5. Lands in

- TARGET src/fight/world-combat.ts (its `onKill(spec)` hook, "loot, toast, respawn timer", line 19, is the existing state-edge for a creature) with the server's spawn state in origins/server/world-spawns.ts. The only idea taken is the edge test (previous state vs new state decides a spawn), for the hero's re-entry at the zone entry after a death or a zone change; nothing else in this donor applies. Checklist row 17 (death / respawn / fight end: open-world respawn by design) and row 4 (fight loop).
- Parity-checklist row: 17.
- Reuse tag: adapt
- Brief rule served: (category default, not per-cell) 4 (zones are data); rules 7-9 n/a

## 6. Gaps and risks

- Very small donor, and not about combat. The value is the edge test on a state pair, a clean pattern for "spawn on the transition".
- The edge test treats a missing previous state as a start. Frankendom needs the same rule for a zone's first tick after a copy is made, with the previous state coming from the server's record, not client memory.
- The donor does not check whether a ball already exists; a second emission on the same edge would add a second ball. Frankendom must guard it (server-verified kills: one live instance per spawn id, as origins/server/world-spawns.ts does with its alive state).
- The spawn point is a fixed anchor read from a scene object; in Frankendom the entry anchor is zone data (`layout.entry` in the zone Params), not a scene lookup.
- MAX_ATTACKERS = 3 is not touched: this spawns one entity and says nothing about engagement.
