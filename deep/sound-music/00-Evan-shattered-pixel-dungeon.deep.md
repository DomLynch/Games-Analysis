# 00-Evan-shattered-pixel-dungeon (sound-music, cell 15)

Donor: /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/noosa/audio/Music.java | Licence: GPL-3 | Java | symbol Music.playTracks / fadeOut / update

## 1. Mechanism
- A background music player with a track list, per-track chances and a fade. Runs per frame from update() and on track-end callbacks. No sound effects here.
- playTracks(tracks, chances, shuffle): if the list is empty or the lengths differ, stop. On iOS, .ogg names are swapped for .mp3. If the new list is the same as the current one (identical, or a rotation of it, with the same chances), it only refreshes volume and calls `play()` if nothing is currently playing (lines 100-123; it needs a live player, a stored list and equal lengths): this stops a title theme from restarting when a victory theme is equivalent. Otherwise it resets, creates every player up front (cached), and adds each track to a queue with probability equal to its chance. It starts the first queued track (the queue is not shuffled at this point; shuffle applies only when `playNextTrack` rebuilds an empty queue). If creating a player throws, it resets and clears the queue (141-146). It returns without playing if music is disabled or the queue is empty.
- Track end: a looper callback (186-194) advances to the next track unless a fade is running (`fadeTotal == -1`). `playNextTrack` (196-217) returns if there is no list, the finishing player is not the current one, or the player loops; otherwise it stops, rebuilds the queue from the chances when empty, shuffles if asked, and plays the next one. The private `play(track, listener)` (219-236) sets `fadeTime = fadeTotal = -1`, so starting any track cancels a running fade.
- fadeOut(duration, callback): sets the fade total, or when a fade is already running rescales its clock to the new duration (`fadeTime = fadeTime / fadeTotal * duration`). update() advances the fade clock by `Game.elapsed` unless paused, sets volume to the base volume times the remaining fraction, and calls the callback when the fade ends.
- Inputs: track names, chances, shuffle flag, frame time, fade request. Outputs: playing track, volume, callback. Runs per frame.

## 2. Key functions
- Music.playTracks (Evan) | /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/noosa/audio/Music.java | 86-156 | same-list check, reset, chance-based queue, start.
- Music.fadeOut (Evan) | /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/noosa/audio/Music.java | 158-167 | sets or rescales the fade and stores the completion callback.
- Music.update (Evan) | /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/noosa/audio/Music.java | 169-184 | per-frame fade clock, volume, completion callback.
- Music.volumeWithFade (Evan) | /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/noosa/audio/Music.java | 300-306 | base volume times the remaining fade fraction, floored at 0.
- Music.playNextTrack (Evan) | /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/noosa/audio/Music.java | 196-217 | rebuilds the queue by chance when empty, shuffles, plays the next. (The private `play(track, listener)` is at 219-236.)

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Chance-based playlist: each track enters the queue with its own probability | Per-track chances (theirs, data) |
| Same-list check that accepts a rotation, so equivalent playlists do not restart | The rotation rule and the iOS .ogg to .mp3 swap (theirs) |
| Linear fade: volume times remaining fraction, callback at end | Fade durations (theirs, per call) |
| Do not advance to the next track during a fade | Fade check in the track-end callback (theirs) |

## 4. TypeScript sketch
simplified: no `playNextTrack` (queue rebuild by chance and shuffle on track end), no pause flag in `updateMusic`, no enable flag, and `playTracks` returns on a same list without refreshing the volume or resuming playback; starting a track does not cancel a running fade in the sketch (the donor does, line 221).

```ts
// Licence: GPL-3 (00-Evan-shattered-pixel-dungeon). CLEAN-ROOM: from the mechanism only.
interface Playlist { tracks: string[]; chances: number[]; }
interface Music { queue: string[]; list: Playlist | null; volume: number; fadeTotal: number; fadeTime: number; onFadeEnd?: () => void; }

function sameList(a: Playlist, b: Playlist): boolean {
  const n = a.tracks.length;
  if (n !== b.tracks.length) return false;
  for (let ofs = 0; ofs < n; ofs++) {
    let ok = true;
    for (let j = 0; j < n && ok; j++) {
      const i = (j + ofs) % n;
      ok = a.tracks[i] === b.tracks[j] && a.chances[i] === b.chances[j];
    }
    if (ok) return true;
  }
  return false;
}

function buildQueue(p: Playlist, rnd: () => number): string[] {
  return p.tracks.filter((_, i) => rnd() < p.chances[i]);
}

function playTracks(m: Music, p: Playlist, rnd: () => number, play: (t: string) => void): void {
  if (p.tracks.length === 0 || p.tracks.length !== p.chances.length) return;
  if (m.list && sameList(m.list, p)) return;
  m.list = p;
  m.queue = buildQueue(p, rnd);
  if (m.queue.length > 0) play(m.queue.shift()!);
}

function fadeOut(m: Music, duration: number, onEnd: () => void): void {
  if (m.fadeTotal === -1) { m.fadeTotal = duration; m.fadeTime = 0; }
  else { m.fadeTime = (m.fadeTime / m.fadeTotal) * duration; m.fadeTotal = duration; }
  m.onFadeEnd = onEnd;
}

function updateMusic(m: Music, dt: number, setVolume: (v: number) => void): void {
  if (m.fadeTotal <= 0) return;
  m.fadeTime += dt;
  setVolume(Math.max(0, m.volume * ((m.fadeTotal - m.fadeTime) / m.fadeTotal)));
  if (m.fadeTime >= m.fadeTotal) { m.fadeTotal = -1; m.onFadeEnd?.(); }
}
```

## 5. Lands in
- Frankendom file(s): TARGET `src/fight/sound.ts` (playlist and fade state next to the cue layer). Music is not a checklist row; it rides on row 12 (combat sound cues).
- Parity-checklist row: 12 (combat sound cues), the nearest row for the audio module.
- Reuse tag: rewrite-from-idea (GPL-3; the chance playlist and linear fade are the idea)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- Track choice uses the donor's global `Random.Float()` (lines 137, 205; the generator was not read). Under the one-engine ruling, music randomness must not share the fight RNG and must not touch the fight record (row 19).
- Playlists would be zone data (zones as data) with a default for every zone: the donor's lists and chances are code arguments, not data.
- The same-list rotation rule is the donor's design choice (lines 102-115); decide whether Frankendom wants it.
- Donor is GPL-3, so only the mechanism is described here.
