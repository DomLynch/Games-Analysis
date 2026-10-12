# lichess-org-lila (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/lichess-org-lila/ui/site/src/sound.ts` | Licence: GNU AGPL v3 (read from `LICENSE`, "GNU AFFERO GENERAL PUBLIC LICENSE, Version 3"; `COPYING.md` says lila is AGPL v3) | TypeScript | symbol `move` (the default-exported sound object, class at line 11), with `throttle` from `ui/lib/src/async.ts`

Checked: The list's hint file, `ui/lib/src/nvui/sound.ts` (9 lines), is only a wrapper that throttles `site.sound.play` for three accessibility cues; the real sound module is `ui/site/src/sound.ts`. I read that file end to end (293 lines), `throttle` (`ui/lib/src/async.ts` 97-105) and `throttlePromiseWithResult` (8-53, with the pending slot at 33-35 and the dropped-call reject at 49), the `SoundMoveOpts` type (`ui/@types/lichess/index.d.ts` 88-96), and both callers in `ui/round/src/ctrl.ts` (179-185, 272-280). Also opened for the candidate check: `ui/lib/src/nvui/sound.ts`, `ui/site/src/sound.ts`, `ui/lib/src/async.ts`. Confidence: high on the move chooser, the throttle and the countdown (read in full, order of operations traced). Medium on the cross-tab once-lock (read in full, not exercised). Not read: `bits/src/bits.soundMove.ts` (the music-theme mover, grep only), `racer/src/countdown.ts` (grep only: it calls `playOnce` for a race countdown), the `playOnce` callers beyond `challenge/src/ctrl.ts` (grep only), the speech code path beyond `sayLazy` (read, not tested). Camera scope: not applicable.

## 1. Mechanism

- One shared, latest-wins throttle drives every board sound. `throttled = throttle(100, ...)` (site/src/sound.ts 86) wraps `play`. Mechanics of the donor throttle (lib/src/async.ts): the first call runs at once (`wrapped.apply`, line 102) and opens a window of 100 ms (line 103). A call made while the window is open replaces the single waiting call; the replaced call is rejected and swallowed (line 35 `pending?.reject()`, line 49). When the window closes, the waiting call runs and opens another window (line 33 `if (!current) return runCurrent();`). Net effect: at most one board sound per 100 ms, and the last call in a burst is the one that plays after the window.
- Move chooser (`move`, 88-105). Order of steps: (a) if the call is not music-filtered and the theme is not 'music', then, unless an explicit `name` is given (91), queue `capture` when the SAN contains `x` (93), otherwise `move` (94); (b) if the SAN contains `#` queue `checkmate` (96), else if it contains `+` queue `check` (97-98). Each queued name goes through the same 100 ms throttle, so a capture-with-check move plays capture at once and check about 100 ms later. The chooser never queues both check and checkmate for one move (it uses an else-if), so a checkmate never replaces a check from the same move. (c) If the call is game-filtered (`filter: 'game'`) or the theme is 'music', return before the music path (102); the music path loads a separate module (`bits.soundMove`, not read).
- Callers (round/src/ctrl.ts 179-185): `onMove` sends `{ name: 'capture', filter: 'game' }` for a capture or en passant and `{ name: 'move', filter: 'game' }` otherwise. Atomic chess plays a separate explosion sound (`site.sound.play('explosion')`, line 182). Forward steps from the server call `site.sound.move(s)` with the SAN (277). A new piece dropped from hand calls `site.sound.move()` with no arguments (`onNewPiece`, 207), which has no SAN and so plays the plain move.
- Speech mode (resolvePath, 66-74): when speech is on or the theme is 'music', the four board names (move, capture, check, checkmate) resolve to no file (70), so the click is silent and the speech narrates the move instead. Other names resolve to the 'standard' folder (71). The sound file name is the cue name with its first letter capitalised (73).
- Mate result (`playAndDelayMateResultIfNecessary`, 107-110): on the standard set the result sound plays at once; on any other set it plays 600 ms later (109), so it lands after the move sound.
- Countdown (`countdown`, 112-125): for each beat, the loop waits for both a 500 ms timer and the beat's clip to finish (116, 119), so the beat length is the longer of the two. The next beat's clip is loaded while the current one plays (118). When the count reaches zero, `genericNotify` plays once (121). The loop is wrapped in try/catch (122-124).
- Once-lock across tabs (`playOnce`, 127-137): a `localStorage` stamp blocks a second play of the same cue within 2 s (131-133). If the tab does not have focus, the play is delayed by a random 10 to 510 ms (136) so that one of several open tabs wins the lock.
- Volume and enable (80-84, 141-145, 176): the stored volume (default 0.7, line 144) times the call's volume (83) is the gain of one one-shot. Sound is off when the theme is 'silent' or the volume is 0 (176). Each one-shot gets its own `AudioBufferSourceNode` and a per-play gain (267), and the promise resolves on `onended`.
- Context recovery and autoplay (226-252): if the audio context is not running, it is closed and rebuilt, and every loaded sound is rewired to the new context (231-234). If the context stays suspended for 400 ms, the autoplay warning shows (242).

## 2. Key functions

- `move` (site/src/sound.ts 88-105): the chooser and the throttle calls.
- `throttle` (ui/lib/src/async.ts 97-105) and `throttlePromiseWithResult` (lines 8-53; the pending slot at 33-35, the dropped-call reject at 49).
- `countdown` (site/src/sound.ts 112-125): beat pacing.
- `resolvePath` (66-74): theme and speech mapping.
- `playOnce` (127-137): cross-tab lock and focus delay.
- `Sound.play` (266-278): one-shot buffer source with gain.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Latest-wins throttle: first call plays, one waiting slot, window closes then plays the waiting call | 100 ms window (site/src/sound.ts 86; nvui/sound.ts 5 uses the same 100 ms window per cue) |
| Pick the cue from the event text (capture if SAN has x; check or checkmate from the suffix) | Suffix characters x, +, # (93, 95-98) |
| Beat pacing: wait for the timer and the clip, whichever is longer | 500 ms default interval (112) |
| Delayed follow-up sound so it lands after the first | 600 ms on non-standard sets (109) |
| Cross-tab once-lock | 2000 ms window (131); 10 to 510 ms random delay when unfocused (136) |
| Default volume when none stored | 0.7 (144) |

## 4. TypeScript sketch

simplified: keeps the donor's shape (a latest-wins throttle with one waiting slot, the SAN-suffix move chooser, and the countdown that waits for both the interval and the clip). Fixes a defect the donor shape would have in a fight: the donor shares one throttle between all board sounds, so a routine move or check in the same window replaces a waiting checkmate. The sketch gives priority cues their own lane (`combatCueLanes`). Omits: the `Sound` buffers and the audio context, the rejected-promise return values (the sketch returns void), the speech and music paths, the cross-tab once-lock, the context recovery, the mate-result delay, and the try/catch around the countdown. The countdown reorders nothing: it loads the next beat while the current one plays, as the donor does.

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch of the shape only, written from the described mechanism.
// clean-room
type Play = (name: string, volume: number) => Promise<void>;

// Latest-wins throttle: the first call in a window runs at once; while the
// window is open a newer call replaces the single waiting call; the waiting
// call runs when the window closes.
export function latestWinsThrottle(delayMs: number, play: Play): (name: string, volume: number) => void {
  let busy = false;
  let waiting: { name: string; volume: number } | undefined;
  const run = (name: string, volume: number): void => {
    busy = true;
    void play(name, volume);
    setTimeout(() => {
      busy = false;
      const next = waiting;
      waiting = undefined;
      if (next) run(next.name, next.volume);
    }, delayMs);
  };
  return (name, volume) => {
    if (!busy) run(name, volume);
    else waiting = { name, volume }; // an older waiting call is dropped
  };
}

// Fix for the donor's shape: one shared slot lets a routine hit replace a
// waiting kill or death sting. Priority cues get their own lane.
export function combatCueLanes(play: Play): {
  hit: (name: string, volume: number) => void;
  priority: (name: string, volume: number) => void;
} {
  return {
    hit: latestWinsThrottle(100, play),
    priority: latestWinsThrottle(100, play),
  };
}

// Which cues a move plays. An explicit name wins; otherwise capture or move,
// then check or checkmate from the notation suffix (# before +).
export function moveCues(san: string | undefined, name?: string): string[] {
  if (name) return [name];
  const cues = [san?.includes('x') ? 'capture' : 'move'];
  if (san?.includes('#')) cues.push('checkmate');
  else if (san?.includes('+')) cues.push('check');
  return cues;
}

// Countdown: each beat lasts at least the interval and at least the clip.
// The next beat is loaded while the current one plays; a closing stinger follows.
export async function countdown(
  count: number,
  beat: (n: number) => Promise<void>,
  preload: (n: number) => Promise<void>,
  stinger: () => Promise<void>,
  intervalMs = 500,
): Promise<void> {
  let n = count;
  while (n > 0) {
    const waits: Promise<void>[] = [new Promise<void>((resolve) => setTimeout(resolve, intervalMs)), beat(n)];
    n -= 1;
    if (n > 0) waits.push(preload(n));
    await Promise.all(waits);
  }
  await stinger();
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/sm018-lila-cue-throttle.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/cues.ts` (new): the engine emits hit, kill, death and cast events; the client plays them through a throttle with a separate priority lane. Parity-checklist row 12 (combat sound cues).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room, shape only; no line-by-line translation)
- Brief rule served: addendum rules 2, 4 and 6 (judged the idea; licence stated exactly)

## 6. Gaps and risks

- The brief hint named the nvui wrapper, which is a thin accessibility wrapper and not the mechanism. The real module is `site/src/sound.ts`.
- Defect for a fight: one shared latest-wins slot. A waiting call is replaced by any later call in the same window, so if the shape is reused for combat, a kill or death sting can be silently replaced by a routine hit. The sketch fixes this with a priority lane. The donor has no kill or death cue in this path, so it never hits the case; the defect appears only when the shape is reused for combat.
- Latest-wins means a burst of many hits (many-on-one, up to MAX_ATTACKERS = 3) plays at most one sound per 100 ms; the rest are dropped without a count. Frankendom should log dropped hits for tests, not play them.
- The move chooser has no priority: `capture` and `check` are both queued and the second waits about 100 ms. For combat this means a double-hit sting lands late by one window. Accept it, or give the finisher its own lane (done in the sketch).
- Countdown beat length depends on clip length: a clip longer than 500 ms stretches the beat. Frankendom's duel start (a 3-2-1 call) needs fixed beats, so pin the clip length or pace with a timer only.
- No layered music, ambience beds, stingers beyond the countdown's closing sound and the mate-result delay, or voice limits (no maximum count of concurrent one-shots appears in the read code). Those parts of the topic are absent from this donor.
- The cross-tab once-lock uses `localStorage` and a 2 s window (131). Frankendom runs a single game client per tab, so this is not needed now. Reject for now; revisit only if several tabs can play one cue.
- Speech mode silences the board clicks on purpose (70): the speech narrates the move. Frankendom has no narration; do not copy this rule.
- Not read: `bits/src/bits.soundMove.ts` (music mover), `racer/src/countdown.ts`, the other `playOnce` callers, and the speech test path.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room, shape only)
Brief rule served: addendum rules 2, 4 and 6

Best transferable idea: Route every hit and move sound through a latest-wins throttle (one sound per window, the last waiting call wins), but give kill and death cues their own lane so a routine hit can never replace them.

Decision (proposed): adapt - take the 100 ms latest-wins window and the separate priority lane for kill and death, which keeps dense many-on-one fights readable; reject the donor's speech and cross-tab rules, which do not fit Frankendom.
Acceptance: In a three-on-one fight, one hit sound plays per 100 ms at most, and a kill or death sting plays within one window even while hits are landing; a client test drives twenty hits and one kill inside a single window and asserts the kill sting is among the played cues.
