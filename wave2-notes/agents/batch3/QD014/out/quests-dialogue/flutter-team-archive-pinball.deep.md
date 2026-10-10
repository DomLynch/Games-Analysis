# flutter-team-archive-pinball (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/bloc/game_bloc.dart` | Licence: MIT (LICENSE file: "MIT License", Copyright (c) 2021 Very Good Ventures) | Dart (Flutter, Flame, flame_bloc) | symbol `GameBloc`

Checked: Read in full: `lib/game/bloc/game_bloc.dart`, `game_state.dart`, `game_event.dart`; the objective and reward behaviours for the Google word, the flutter forest dash bumpers and signpost, the bonus ball spawn, the android acres spaceship ramp (cubit, state, progress, shot, bonus, multiplier, reset), `game_bloc_status_listener.dart`, `ball_spawning_behavior.dart`, `draining_behavior.dart`, `chrome_dino_bonus_behavior.dart`, `sparky_computer_bonus_behavior.dart`. Every send site of the ledger events was found with grep (Scored, BonusActivated, MultiplierIncreased, RoundLost, GameStarted). Not read: flame_bloc's listener scheduling (so the order the ramp listeners fire in is not claimed), Flame's `removeFromParent` timing, the sprite listeners that draw each state, the `DashBumperId` enum (the count of three bumpers comes from the doc comment at `signpost.dart:12`). Dialogue and quests: grep over `lib` and `packages/*/lib` for quest, objective, mission, dialogue, tutorial, cutscene, scripted found no game-logic hits (the only "dialog" files are how-to-play and more-information UI). Confidence: high on the ledger, the ladders and the numbers; medium on the claim that the ramp's fully-lit arrow state is almost never visible (it depends on the unread sprite listener). camera_scope: not applicable.

Best transferable idea: Make every reward a single event into one owner (score, multiplier, bonus history), and make each objective a small stage ladder that reports completion, clears only on the events it names, and pays out a delayed, announced reward.
Decision (proposed): adapt - the one-ledger event shape and the ladder with named resets fit the one-ledger and zones-as-data rulings, but the donor's client bloc is the authority, which Frankendom rules forbid; the server must own the ledger write and dedupe each completion, and the two cosmetic-only bonuses (dino, sparky) are not copied.
Acceptance: In a zone, hitting each of three marked targets once completes a sweep; the third sweep shows a reward banner and a loot drop appears 5 s later; a server test asserts that after three completed sweeps exactly one ledger row is written, that replaying the same target-hit event adds no second row, and that a death clears only the ladders whose reset policy names it.

## 1. Mechanism

- One ledger. `GameBloc` is the only writer of score, round score, multiplier, rounds and bonus history. Everything else sends one of six events (`game_bloc.dart:11-16`). The send sites are: `ScoringBehavior` (`scoring_behavior.dart:45`), the five `BonusActivated` senders (`google_word_bonus_behavior.dart:19`, `flutter_forest_bonus_behavior.dart:22`, `chrome_dino_bonus_behavior.dart:17`, `sparky_computer_bonus_behavior.dart:18`, `android_spaceship_bonus_behavior.dart:17`), `RampMultiplierBehavior` (`ramp_multiplier_behavior.dart:25`), `DrainingBehavior` (`draining_behavior.dart:22`) and the start listener.
- Round-end banking (`game_bloc.dart:29-45`). Points accrue into `roundScore` during play (`_onScored`, `game_bloc.dart:47-55`, clamped at `_maxScore`). The multiplier is applied only when a round is lost: `totalScore + roundScore x multiplier`, clamped, then `roundScore` is zeroed, `multiplier` resets to 1 and `rounds` drops by one (floored at 0; 0 means game over).
- Bonus is a history entry, not points. `_onBonusActivated` (`game_bloc.dart:67-73`) only appends to `bonusHistory`. A bonus pays out through whatever the component adds next (a ball spawn, a HUD animation, a sound).
- Objective 1, Google word (`google_word_cubit.dart`, `google_word_bonus_behavior.dart`). Six letters. Each ball contact on a rollover lights the next letter (`onRolloverContacted`, `_lastLitLetter` counter, `google_word_cubit.dart:14-24`). When the listener sees all letters lit (`google_word_bonus_behavior.dart:15-16`): it posts `BonusActivated(googleWord)`, resets the word, adds a `BonusBallSpawningBehavior` and a blink behaviour. The blink toggles even and odd letters 14 times at 0.35 s, then on the 15th tick resets the word and removes itself (`google_word_animating_behavior.dart:7-23`).
- Objective 2, flutter forest (`dash_bumper`, `signpost`, `flutter_forest_bonus_behavior.dart`). Three dash bumpers. Each ball contact sets that bumper active (`dash_bumpers_cubit.dart:11-19`). When all three are active (`isFullyActivated`, `dash_bumpers_state.dart:16-17`) the signpost progresses one state and the bumpers reset (`signpost.dart:31-36`). Signpost states go inactive, active1, active2, active3 and wrap by modulo four (`signpost_cubit.dart:8-13`). When the signpost reaches active3 the forest behaviour posts `BonusActivated(dashNest)`, progresses the signpost (back to inactive), resets the bumpers and adds a bonus ball (`flutter_forest_bonus_behavior.dart:19-25`). So the reward needs three full sweeps, each sweep being every bumper hit at least once since the last reset.
- Reward delivery. `BonusBallSpawningBehavior` is a one-shot timer of 5 (`bonus_ball_spawning_behavior.dart:14-15`). On fire it adds a ball at `Vector2(29.2, -24.5)` with an impulse of `Vector2(-40, 0)` (lines 25-26). The reward is delayed and visible, not instant.
- Objective 3, spaceship ramp (`spaceship_ramp_cubit.dart`, `android_acres/behaviors/ramp_*.dart`). Each ball going up into the ramp (`linearVelocity.y < 0`, `ramp_ball_ascending_contact_behavior.dart:18-20`) increments `hits` (`spaceship_ramp_cubit.dart:9`). Per hit: 5,000 points (`android_acres.dart:21`). Every 5th hit: `MultiplierIncreased`, unless at max (`ramp_multiplier_behavior.dart:16-25`). Every 10th hit: `Points.oneMillion` (`ramp_bonus_behavior.dart:25`, `android_acres.dart:22`). The arrow advances one of five lit steps per hit (`ramp_progress_behavior.dart:23-31`). On the 5th hit (not at max) it advances to active5 and, in the same handler, advances again to inactive (`ramp_progress_behavior.dart:30-31`). At max multiplier with the arrow lit, the arrow stays at active5 (`ramp_progress_behavior.dart:23-24`).
- Reset policy, per objective, differs (this is the important rule). `_resetBonuses` clears the Google word, the dash bumpers and the signpost only when the game enters `playing` (`game_bloc_status_listener.dart:22-24, 56-75`). So they keep their progress across a lost round. The ramp resets whenever `rounds` changes (`ramp_reset_behavior.dart:12, 17`), so it resets on every lost round.
- Ball supply follows the ledger, not the drain. `BallSpawningBehavior` spawns a ball when the game starts or when `rounds` drops while playing (`ball_spawning_behavior.dart:16-21`). A round is lost only when the last ball drains (`draining_behavior.dart:16-22`).
- Two bonuses are presentation only. The dino chomp and sparky computer post `BonusActivated` and nothing else (`chrome_dino_bonus_behavior.dart:17`, `sparky_computer_bonus_behavior.dart:18`). They change `bonusHistory` and the HUD, not score, multiplier or balls.
- Tick and timing: event driven, not a fixed step. Each contact calls into a cubit. Timers are the flame `TimerComponent`s (blink, bonus ball). Their unit (seconds) is per Flame's convention, not read.

## 2. Key functions

- `GameBloc` event handlers, `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/bloc/game_bloc.dart` 9-74. The single ledger.
- `_onRoundLost`, same file 29-45. Banking, multiplier reset, round decrement, game-over.
- `_onBonusActivated`, same file 67-73. History only.
- `GoogleWordCubit.onRolloverContacted`, `/mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_components/lib/src/components/google_word/cubit/google_word_cubit.dart` 14-24.
- Google word completion listener, `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/components/google_gallery/behaviors/google_word_bonus_behavior.dart` 13-25.
- `DashBumpersCubit.onBallContacted`, `/mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_components/lib/src/components/dash_bumper/cubit/dash_bumpers_cubit.dart` 11-19.
- Signpost progress listener, `/mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_components/lib/src/components/signpost/signpost.dart` 31-36; `SignpostCubit.onProgressed`, `.../signpost/cubit/signpost_cubit.dart` 8-13.
- Forest bonus, `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/components/flutter_forest/behaviors/flutter_forest_bonus_behavior.dart` 13-29.
- `BonusBallSpawningBehavior`, `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/behaviors/bonus_ball_spawning_behavior.dart` 10-29.
- `RampProgressBehavior.onNewState`, `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/components/android_acres/behaviors/ramp_progress_behavior.dart` 18-33.
- `RampMultiplierBehavior`, `.../ramp_multiplier_behavior.dart` 11-26; `RampBonusBehavior`, `.../ramp_bonus_behavior.dart` 19-39; `RampResetBehavior`, `.../ramp_reset_behavior.dart` 10-18.
- `DrainingBehavior.beginContact`, `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/components/drain/behaviors/draining_behavior.dart` 11-24.
- `BallSpawningBehavior.listenWhen`, `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/behaviors/ball_spawning_behavior.dart` 13-21.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ledger: every reward is one event into one owner; score banked once at round end as round score x multiplier, then clamped | Score cap 9999999999 (theirs, game_bloc.dart:19); multiplier cap 6 (theirs, game_bloc.dart:61 and game_state.dart:86); rounds 3 (theirs, game_state.dart:55) |
| Objective sweep: a sweep completes when every target has been touched at least once; the touched set is cleared on completion | 3 dash bumpers (theirs; the count is from the doc comment at signpost.dart:12, the enum not read) |
| Stage ladder: a completed sweep advances the stage; the final stage pays out and wraps | 3 sweeps to the reward (theirs, flutter_forest_bonus_behavior.dart:19; states in signpost_state.dart:3-14) |
| Counted letters: one per contact, reset when full | 6 letters (theirs, google_word_cubit.dart:10) |
| Delayed reward: fire once after a fixed delay, then spawn | 5 (theirs, bonus_ball_spawning_behavior.dart:14; flame timer unit seconds, not read) |
| Milestones on a hit counter: every 5 hits a multiplier step (not past cap); every 10 hits a large award; a fixed award per hit | 5 hits, 10 hits, 5,000 points per hit (theirs, ramp_multiplier_behavior.dart:17, ramp_bonus_behavior.dart:25, android_acres.dart:21) |
| Round loss on the last drained ball, not on every drain | The check is `ballsLeft - 1 == 0` (theirs, draining_behavior.dart:17); see gaps for the fragility |
| Reset policy per objective (game start vs round loss) | Google word, bumpers, signpost reset on game start (theirs, game_bloc_status_listener.dart:56-75); ramp resets on any rounds change (theirs, ramp_reset_behavior.dart:12) |

## 4. TypeScript sketch

simplified: The sketch keeps the ledger reducer, the sweep ladder with its named resets, and the delayed reward queue. It omits the playing-status gate (score only counts while playing), the GOOGLE letter lighting and blink, the ramp arrow and its milestone rules, the bonus ball's physics impulse, and the HUD and sound. It collapses the donor's one-tick active3 state into the wrap on the final sweep, and resets the touched set once where the donor resets the bumpers twice (once in the signpost listener, once in the forest bonus). The ladder's reset policy is a field here; in the donor it is per cubit and set by which listener resets it.

```ts
// Licence: MIT (donor LICENSE, Copyright (c) 2021 Very Good Ventures). Clean-room shape written from the mechanism, not a translation of the Dart.
type LedgerEvent =
  | { kind: "scored"; points: number }
  | { kind: "multiplier" }
  | { kind: "bonus"; bonus: string }
  | { kind: "roundLost" };

interface Ledger {
  totalScore: number;
  roundScore: number;
  multiplier: number;
  rounds: number;
  bonusHistory: string[];
}

const MAX_SCORE = 9999999999;
const MAX_MULTIPLIER = 6;

// The only writer of the ledger. Every reward goes through here as an event.
function apply(s: Ledger, e: LedgerEvent): Ledger {
  switch (e.kind) {
    case "scored": {
      const combined = Math.min(s.totalScore + s.roundScore + e.points, MAX_SCORE);
      return { ...s, roundScore: combined - s.totalScore };
    }
    case "multiplier":
      return { ...s, multiplier: Math.min(s.multiplier + 1, MAX_MULTIPLIER) };
    case "bonus":
      return { ...s, bonusHistory: [...s.bonusHistory, e.bonus] };
    case "roundLost": {
      const banked = Math.min(s.totalScore + s.roundScore * s.multiplier, MAX_SCORE);
      return { ...s, totalScore: banked, roundScore: 0, multiplier: 1, rounds: Math.max(s.rounds - 1, 0) };
    }
  }
}

// Objective ladder: a sweep completes when every target has been hit at least once.
// The final sweep is the reward and the ladder wraps to 0.
interface Ladder {
  targets: string[];
  touched: Set<string>;
  stage: number;
  stages: number;
  resetOn: "roundLost" | "gameStart"; // data: which ledger event clears this ladder
}

// Returns true when this hit completed the final sweep (reward due).
function hit(l: Ladder, target: string): boolean {
  if (!l.targets.includes(target)) return false;
  l.touched.add(target);
  if (l.touched.size < l.targets.length) return false;
  l.touched.clear();
  l.stage += 1;
  if (l.stage < l.stages) return false;
  l.stage = 0;
  return true;
}

// Progress is cleared only by the events the ladder names, not by every event.
function onLedgerEvent(ladders: Ladder[], kind: "roundLost" | "gameStart"): void {
  for (const l of ladders) {
    if (l.resetOn === kind) {
      l.touched.clear();
      l.stage = 0;
    }
  }
}

// Delayed reward: the item appears after a fixed delay, not at the moment of completion.
interface PendingReward {
  dueAt: number;
  bonus: string;
}

function scheduleReward(queue: PendingReward[], now: number, bonus: string, delayMs: number): void {
  queue.push({ dueAt: now + delayMs, bonus });
}

function drainDue(queue: PendingReward[], now: number): PendingReward[] {
  const due: PendingReward[] = [];
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].dueAt <= now) {
      due.unshift(queue[i]);
      queue.splice(i, 1);
    }
  }
  return due;
}

// Example wiring: three targets, three sweeps, a 5000 ms reward delay.
const ladder: Ladder = {
  targets: ["bumperA", "bumperB", "bumperC"],
  touched: new Set<string>(),
  stage: 0,
  stages: 3,
  resetOn: "gameStart",
};
let ledger: Ledger = { totalScore: 0, roundScore: 0, multiplier: 1, rounds: 3, bonusHistory: [] };
const pending: PendingReward[] = [];

for (const t of ["bumperA", "bumperB", "bumperC", "bumperA", "bumperB", "bumperC", "bumperA", "bumperB", "bumperC"]) {
  if (hit(ladder, t)) {
    ledger = apply(ledger, { kind: "bonus", bonus: "dashNest" });
    scheduleReward(pending, 0, "bonusBall", 5000);
  }
}
ledger = apply(ledger, { kind: "scored", points: 5000 });
onLedgerEvent([ladder], "roundLost");
const ready = drainDue(pending, 5000);

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file `/tmp/QD014-flutter-team-archive-pinball-ladder.ts`) exited 0.

## 5. Lands in

- TARGET `src/fight/objective.ts` (new): the stage ladder with named resets, and the one place that writes an objective completion into the ledger (one ledger, server-owned). The delayed reward queue lives beside it and is drained by the server tick (sub-line: server tick, per-tick budget).
- Parity-checklist row 18 (loot roll and XP award). The reward kinds are loot and XP. The delayed reward is the loot-drop ceremony on the server side.
- Reuse tag: rewrite-from-idea (MIT, so the code may be adapted; this note's sketch is clean-room).
- Brief rule served: one ledger (every reward is an event into one owner); zones as data (the ladder and reward numbers are zone fields).

## 6. Gaps and risks

- The donor's ledger is client authority. Frankendom kills and rewards are server-verified, so the server must be the only writer, and the client may only send "target hit". The sketch shows the shape, not the authority.
- Duplicate rewards. The donor is one client with no network replay, so it has no dedupe. In Frankendom a retried or duplicated "target hit" message must not pay a sweep twice. Needs a dedupe key per (zone, ladder, completion number) on the ledger write.
- Reset policy must be declared per objective, as data. The donor mixes two rules (game start for the word, bumpers and signpost; any round loss for the ramp). Frankendom's death and respawn (row 17) must say which ladders survive a death.
- Defect (keep the idea, fix the defect): `FlutterForestBonusBehavior`'s doc says all bumpers must be hit "at least once three times" (flutter_forest_bonus_behavior.dart:10), but the code needs three full sweeps, each sweep being every bumper hit once since the last reset. fix: the sketch and the zone data state "3 sweeps of all targets"; the doc is wrong.
- Defect: the signpost and the forest bonus both reset the bumpers on the same completion (signpost.dart:35, flutter_forest_bonus_behavior.dart:24). fix: one reset in the sketch.
- Defect: the GOOGLE word keeps progress in `_lastLitLetter` outside the state (google_word_cubit.dart:12). Contacts during the 5 s blink may light a letter that the blink then overwrites (reasoned from the code, not run). fix: derive the count from the state, and ignore contacts while the completion animation runs.
- Defect: the ramp's fully-lit arrow is emitted and then immediately overwritten on the 5th hit (ramp_progress_behavior.dart:30-31), so the player may never see it (depends on the unread sprite listener). fix: hold active5 on a timer, or drop the second advance and let the reset be the timer's job.
- Defect: `ChromeDinoBonusBehavior` and `SparkyComputerBonusBehavior` subscribe to a stream in `onMount` and never cancel (chrome_dino_bonus_behavior.dart:13, sparky_computer_bonus_behavior.dart:14). fix: keep the subscription and cancel it in `onRemove`.
- Design gap: the dino and sparky bonuses change no score, multiplier or ball supply, only history and HUD (game_bloc.dart:67-73). Frankendom should decide per bonus whether it pays (as data) rather than copy the presentation-only case.
- Fragility: the round-loss test (`ballsLeft - 1 == 0`, draining_behavior.dart:17) assumes the drained ball is still counted after `removeFromParent()`. Flame's timing was not read. fix: exclude the drained ball by identity instead of subtracting one.
- Not transferable as is: the bonus ball's physics impulse and the blink (client presentation only; Frankendom's client shows the reward, the server grants it).

Reuse tag: rewrite-from-idea (MIT; code may be adapted, clean-room sketch used)
Brief rule served: one ledger; zones as data; server-verified rewards (Frankendom rulings)
