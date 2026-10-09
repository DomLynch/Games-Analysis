# ihhub-fheroes2 (sound-music, cell 15)

Donor: /mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/audio/audio_manager.cpp | Licence: GPL-2 | C++ | symbol PlayMusicImpl / playLoopSoundsImpl / PlaySound

## 1. Mechanism
- The audio manager plays two kinds of sound. One-shot effects go through PlaySound(m82), which validates the id, drops queued one-shots and plays now (or queues it asynchronously through PlaySoundAsync). Looping positional effects are kept per sound type, each with an angle and a distance.
- Music: PlayMusicImpl(track, source, mode) returns at once if the same track is already playing. Otherwise it tries the music database; for an external music file it uses that file; otherwise it converts the built-in track id to a MIDI from the XMI data (the expansion data is preferred when present) and plays it.
- Async (262-): an AsyncSoundManager runs slow MIDI starts off the game thread. pushMusic (265-274) keeps only the latest music request (an optional slot); pushLoopSound (287-296) keeps only the latest loop update; one-shots go on a deque (`_soundTasks`, 282). `PlaySound` (844-857) calls `removeSoundTasks` to drop queued one-shots and then plays directly; `PlaySoundAsync` (859-) is the queued variant.
- playLoopSoundsImpl(desired effects, is3D) reconciles the desired loop set with the channels already playing. If the 3D setting changed, all loop effects are cleared first. Channels that have stopped on their own are dropped. Then, per sound type (675-737): (1) a desired effect that is equal to a live channel's effect (angle and distance, equality operator not read) keeps that channel; (2) remaining desired effects are paired with the remaining live channels one at a time by findPairOfClosestSoundEffects, and the channel is moved with Mixer::setPosition; (3) channels left over are stopped; (4) effects left over start new looping channels with the sound type's WAV (750-775; an empty WAV or a failed play is skipped).
- findPairOfClosestSoundEffects picks the pair with the smallest angle difference, then the smallest distance difference. On a full tie the later pair wins.
- Inputs: desired effects (type, angle, distance), live channel state, 3D flag. Output: mixer start, stop and reposition calls. Runs once per loop update request, under the async manager's recursive mutex (648).
- Setup (781-801): 32 mixer channels (785), sound and music volume as `100 * setting / 10` (797, 799), music fade-in 900 ms (800).

## 2. Key functions
- PlayMusicImpl (fheroes2) | /mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/audio/audio_manager.cpp | 532-592 | music start: skip same track, database, external file, MIDI.
- findPairOfClosestSoundEffects (fheroes2) | /mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/audio/audio_manager.cpp | 594-629 | pairs desired and live effects by angle, then distance.
- playLoopSoundsImpl (fheroes2) | /mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/audio/audio_manager.cpp | 646-776 | reconciles loop sounds: keep exact matches, move the closest, stop leftovers, start new.
- PlaySound (fheroes2) | /mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/audio/audio_manager.cpp | 844-857 | one-shot entry: validate, drop queued one-shots, play.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Reconcile a desired set of looping sources against live channels, reusing channels | none (algorithm) |
| Exact match first, then closest pair by angle, then distance | angle and distance units (theirs) |
| Stop leftovers, start new ones | none (algorithm) |
| Keep only the latest request on an async queue | none (algorithm) |
| Preferred music source order: database, file, expansion MIDI, base MIDI | the expansion data check (`g_midiHeroes2xAGG.isGood()`, line 575); 32 channels (785); 900 ms music fade-in (800) (theirs) |

## 4. TypeScript sketch
simplified: the sketch handles one sound type (the donor loops over the types and keeps a separate list for each); the 3D-flag change that clears all loop effects, the mutex, the async manager and the WAV lookup are omitted; `Loop` equality is exact angle and distance.

```ts
// Licence: GPL-2 (ihhub-fheroes2). CLEAN-ROOM: written from the mechanism, no donor lines.
type Loop = { angle: number; dist: number; channel?: number };
type Mixer = {
  alive(ch: number): boolean;
  stop(ch: number): void;
  move(ch: number, angle: number, dist: number): void;
  start(angle: number, dist: number): number;
};

// Same sound type only, as the donor does. Smallest angle gap first, then distance; a full tie keeps the later pair.
function closestPair(want: Loop[], have: Loop[]): [number, number] {
  let best: [number, number] = [0, 0], bestA = Infinity, bestD = Infinity;
  want.forEach((w, i) => have.forEach((h, j) => {
    const a = Math.abs(w.angle - h.angle), d = Math.abs(w.dist - h.dist);
    if (a > bestA || (a === bestA && d > bestD)) return;
    bestA = a; bestD = d; best = [i, j];
  }));
  return best;
}

function reconcile(want: Loop[], have: Loop[], mixer: Mixer): Loop[] {
  let live = have.filter((h) => mixer.alive(h.channel!));          // drop channels that ended
  const out: Loop[] = [];
  let todo = want.slice();
  for (const h of live.slice()) {                                   // 1) exact matches keep their channel
    const k = todo.findIndex((w) => w.angle === h.angle && w.dist === h.dist);
    if (k >= 0) { out.push(h); todo.splice(k, 1); live = live.filter((x) => x !== h); }
  }
  while (todo.length > 0 && live.length > 0) {                      // 2) move the closest channel
    const [i, j] = closestPair(todo, live);
    const h = live[j];
    mixer.move(h.channel!, todo[i].angle, todo[i].dist);
    out.push({ angle: todo[i].angle, dist: todo[i].dist, channel: h.channel });
    todo.splice(i, 1); live.splice(j, 1);
  }
  for (const h of live) mixer.stop(h.channel!);                     // 3) stop leftovers
  for (const w of todo) out.push({ ...w, channel: mixer.start(w.angle, w.dist) });   // 4) start new
  return out;
}
```

## 5. Lands in
- Frankendom target: `src/fight/sound.ts` (reconcile of looping positional sources). In Frankendom, zone ambience loops come from zone data (zones as data).
- Parity row: 12 (combat sound cues).
- Reuse tag: rewrite-from-idea (GPL-2)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- Built for a 2D map with angle and distance per source. Frankendom's 3D positions need a mapping to those two numbers, or the reconcile must run on positions.
- Reconcile matches on exact angle and distance. Live sources move, so exact matches are rare in practice; the closest-pair step does the real work.
- Async worker with a mutex. Frankendom's web build needs the same single-owner rule, not the thread.
- The database and MIDI music path is donor-specific.
- Audio is a client consumer of the one fight state; ambience loops are driven by zone data and never by the fight record.
