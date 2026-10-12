# 00-Evan-shattered-pixel-dungeon (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/noosa/audio/Music.java` | Licence: GPL-3.0 (LICENSE.txt is GNU GPL v3; Music.java header says "either version 3 of the License, or (at your option) any later version") | Java | symbol `Music` (single-track manager; playlist path is `playTracks`)

Checked: Read end to end: `Music.java` (330 lines), `Sample.java` (187 lines). Read the call sites: `SewerLevel.java` 70-85, `Level.java` 362-368, `GameScene.java` 226-234, `Char.java` 324-326 and 376-386 and 494-506, `Hero.java` 430-441 and 1692-1712, `DwarfKing.java` 527-534, `SuperNovaTracker.java` 99-101, `Game.java` 279-280. Grep-only (lines seen, not read): other `fadeOut` durations and other `playLevelMusic` overrides. Negative claims (no ambience beds, no crossfade, no voice cap, no priority) rest on reading both audio classes end to end plus a grep over `core/src/main/java` and `SPD-classes/src/main/java` for voice caps, polyphony, priority caps, ambience and crossfade terms (no hits); confidence high. Not read: `Random.Float` distribution, `GameMath.gate` body, libGDX `Sound`/`Music` internals, `Game` loop timing beyond the two update calls. Confidence in the mechanism descriptions: high. Camera scope: not applicable (sound topic).

Best transferable idea: Each zone holds a playlist of tracks with a per-track chance; each pass keeps a random subset and plays it in order, and a quest or boss cue fades the zone track to silence over a set time before the cue track starts at full volume.
Decision (proposed): adapt - the chance playlist and fade-then-cue are cheap, data-driven, and fit zones as data; the donor's silent empty roll and no-overlap fade are fixed in the sketch, and combat audibility uses the duel's participants rather than the camera.
Acceptance: Walking from a sewer room into a city zone fades the old track to silence over 1 s while the new track starts; a unit test over 1000 seeded playlist rolls asserts that every roll queues at least one track.

## 1. Mechanism

- One music player at a time. There is no layering: `Music` holds one `player` and one `trackList` (fields 36-54). Ambience beds per biome and border crossfades do not exist in this donor (grep for `ambien` in `core/src/main/java` returned nothing).
- Zone playlist (`playTracks`, 86-156). The level passes a track list and a parallel list of chances. The first pass keeps each track when `Random.Float() < trackChances[i]` (133-140). If the queue is empty the function returns with nothing playing (151-153). The shuffle flag is only stored here (149); it is applied on refills, not on the first pass.
- Chain continuation (`playNextTrack`, 196-217). When a track finishes (the completion listener `trackLooper`, 186-194, fires only if no fade is running), the manager stops the player (201), refills the queue if empty by re-rolling every track's chance (203-208), shuffles only if the flag is set (209), and plays the next queued track (216). If the refill is empty, it returns at 212 with nothing playing; no later event restarts the chain (see gaps).
- Stinger / transition (`fadeOut`, 158-167; `update`, 169-184; `volumeWithFade`, 300-306). `fadeOut(duration, callback)` records a total and runs on frame time (`fadeTime += Game.elapsed`, 171). Volume is linear: `volume * (fadeTotal - fadeTime) / fadeTotal` (302). When the fade completes, `update` resets the fade, then calls the callback (177-181). `play()` clears any fade (221) and sets full volume (225), so the new track starts at full volume with no fade-in. The transition is a dip to silence, then start, not an overlap. Calling `fadeOut` while a fade is running rescales the elapsed fraction to the new duration (163; the sketch restarts instead). After a fade completes, `fadeTotal` is reset to -1 so `volumeWithFade` returns full volume again (300-306): the old track snaps back to full unless the callback replaces or stops it.
- Same-cue guard (`play(asset, looping)`, 56-84). If the same asset is already the `lastPlayed` and a player exists, it only re-sets volume and resumes if paused (63-69). Re-entering a zone with the same track does not restart it. Playlist equality (102-124) treats rotated lists as the same.
- Level hook. `Level.playLevelMusic()` does nothing by default (`Level.java` 365-366). `GameScene.java` 232 calls it when a scene starts. `SewerLevel.playLevelMusic` (75-84): if a quest is active or the amulet is taken, play one tense track (or the finale on depth 1); otherwise `playTracks` with the sewer list and chances (70-73, 83).
- Boss stinger example. `DwarfKing.java` 529-532: `fadeOut(0.5f, ...)` then, in the callback, `play(CITY_BOSS_FINALE, true)`. Other boss levels use 1 s and 5 s fades (grep lines only: `Ghost.java` 197, `Elemental.java` 423, `HallsBossLevel.java` 314, `CityBossLevel.java` 385, `VaultLevel.java` 664; not read).
- Sound effects (`Sample.java`). `play(id, l, r, pitch)` (108-116) hands straight to the engine sound with `pan = right - left` (110). There is no voice cap and no priority; every call plays. `playDelayed` (129-155) queues a sound and `update` (157-174) counts its delay down by frame time (167) and fires it at zero (168). Assets load one per update from a queue (158-161).
- Combat cues (`Char.java`). Each hit calls `hitSound` with a random pitch in 0.87-1.15 (502). A zero-damage hit still sounds unless the defender's `blockSound` returns true (501). The whole cue is gated by `visibleFight`, true if the hero's field of view covers either the attacker or the victim (376, 500). A hit on an invulnerable target (gate at 378) plays `HIT_PARRY` at pitch 0.96-1.05 (383), then the function returns false (386; too short to receipt, read directly).
- Hero hit sound (`Hero.java` 432-440). The hit uses the weapon's own sound and pitch (434). Unarmed with the Force ring deepens pitch by 2.5 percent per strength point, down to 75 percent (436-437). Plain unarmed multiplies by 1.1 (439).
- Low-health cue (`Hero.java` 1692-1708). On every damage event: `percentDMG = damage / preHP`, `percentHP = postHP / max`, `intensity = 0.25 * percentDMG^2 / percentHP` (1694-1697). Below 0.05 nothing plays (1699). Intensity is capped at one third (1700). At 1/6 or above the critical sample plays at volume `1/3 + 2*intensity` (1703-1704); below it the warning plays at `1/3 + 4*intensity` (1706). The cue is a one-shot per hit, not a loop; the hero is interrupted on serious damage (1708 comment, 1709 call).
- Layered echo (`SuperNovaTracker.java` 99-101). One blast now, then the same blast at +0.25 s and +0.5 s through `playDelayed`. This is the only stacked-sound pattern I read; the music itself is never layered (one player at a time).
- Update drivers. `Music.update()` and `Sample.update()` are called from `Game.java` 279-280; the enclosing function and loop timing were not read.

## 2. Key functions

- `playTracks`: `Music.java` 86-156. Per-track chance queue, first pass, shuffle flag stored.
- `playNextTrack`: `Music.java` 196-217. Chain continuation; refill re-rolls; empty refill ends the chain.
- `fadeOut` + `update` + `volumeWithFade`: `Music.java` 158-184 and 300-306. Linear fade on frame time, callback at zero.
- `play(asset, looping)`: `Music.java` 56-84. Same-cue guard.
- `Sample.play` / `playDelayed` / `update`: `Sample.java` 108-116, 129-155, 157-174. No cap, delayed queue.
- Combat sound gate and pitch: `Char.java` 376-386 and 494-506; hit call 324-326.
- Hero hit pitch and low-health cue: `Hero.java` 432-440 and 1692-1708.
- Zone playlist and tense swap: `SewerLevel.java` 70-85.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Keep each track with its own chance per pass | Sewer chances 1, 1, 0.5, 0.25, 1, 0.5 (`SewerLevel.java` 73); city uses the same values (`CityLevel.java` 81) |
| Linear fade on frame time, then callback | 0.5 s for the dwarf-king stinger (`DwarfKing.java` 529); 1 s and 5 s elsewhere (grep only) |
| Same cue does not restart | None (a guard, `Music.java` 63) |
| Per-hit pitch jitter, weapon pitch multiplies it | 0.87 to 1.15 (`Char.java` 502) |
| Invulnerable-target sound pitch jitter | 0.96 to 1.05 (`Char.java` 383) |
| Unarmed pitch depends on strength, floor 75 percent | Floor 0.75; 2.5 percent per point (`Hero.java` 436-437; the `gate` body was not read) |
| Low-health intensity from damage share and health left | Floor 0.05 to play; cap 1/3; critical at 1/6; volume gains 2 (critical) and 4 (warning) (`Hero.java` 1699-1706) |
| Repeated blast echo | +0.25 s and +0.5 s (`SuperNovaTracker.java` 100-101) |

## 4. TypeScript sketch

simplified: the sketch keeps the chance-per-track queue, the fade-then-callback with frame-time seconds, the hit pitch jitter, the in-view gate and the low-health thresholds. It omits the libGDX player objects and caching, the iOS ogg-to-mp3 swap, the same-list-shifted check, the same-cue no-restart guard, the delayed-sound queue, the unarmed pitch rule, the parry sound and the flash colour. It reorders on purpose in two places. First, the donor silently ends the chain when a refill comes out empty (`Music.java` 203-212); the sketch re-rolls up to 50 times and then picks the highest-chance track, so the chain cannot end silently while any track has a chance above zero. Second, the donor shuffles only refills (209), not the first pass (133-140); the sketch shuffles every pass. The sketch also uses `rand()` linearly for the pitch jitter; the donor's `Random.Float` distribution was not read.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Track = { asset: string; chance: number };

// One pass: keep each track with its own chance. May return an empty list.
export function rollPass(tracks: Track[], rand: () => number): string[] {
  const queue: string[] = [];
  for (const t of tracks) {
    if (rand() < t.chance) queue.push(t.asset);
  }
  return queue;
}

// Re-roll until at least one track is queued. If the rolls keep missing, fall back to the
// highest-chance track so the chain never ends silently. Returns [] only when no track can play.
export function nextQueue(tracks: Track[], rand: () => number, shuffle: boolean, maxRolls = 50): string[] {
  if (!tracks.some(t => t.chance > 0)) return [];
  let queue: string[] = [];
  for (let r = 0; r < maxRolls && queue.length === 0; r++) {
    queue = rollPass(tracks, rand);
  }
  if (queue.length === 0) {
    queue = [tracks.reduce((a, b) => (b.chance > a.chance ? b : a)).asset];
  }
  if (shuffle) {
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = queue[i];
      queue[i] = queue[j];
      queue[j] = tmp;
    }
  }
  return queue;
}

// Client music bed. The fade runs on frame time (seconds) and calls back when it reaches zero.
// The next track starts at full volume; there is no overlap (the donor's transition is a dip, not a crossfade).
export class MusicBed {
  private volume = 1;
  private fadeLeft = 0;
  private fadeTotal = 0;
  private onFadeDone: (() => void) | null = null;

  fadeOut(seconds: number, then: () => void): void {
    this.fadeTotal = Math.max(seconds, 1e-6);
    this.fadeLeft = this.fadeTotal;
    this.onFadeDone = then;
  }

  // dt is frame time in seconds; returns the gain to apply this frame.
  update(dt: number): number {
    if (this.fadeLeft > 0) {
      this.fadeLeft = Math.max(0, this.fadeLeft - dt);
      if (this.fadeLeft === 0) {
        const cb = this.onFadeDone;
        this.onFadeDone = null;
        if (cb) cb();
      }
    }
    return this.gain();
  }

  gain(): number {
    return this.fadeLeft > 0 ? this.volume * (this.fadeLeft / this.fadeTotal) : this.volume;
  }
}

// Per-hit pitch jitter over the donor's call-site range (0.87 to 1.15), scaled by the weapon's own pitch.
export function hitPitch(rand: () => number, weaponPitch = 1): number {
  const lo = 0.87;
  const hi = 1.15;
  return weaponPitch * (lo + rand() * (hi - lo));
}

// Combat cues play only when the fight is in view for either side.
export function combatCueAudible(attackerInView: boolean, victimInView: boolean): boolean {
  return attackerInView || victimInView;
}

// Low-health cue on one damage event: none, a warning, or a critical cue.
export type LowHealthCue = { kind: "none" | "warn" | "critical"; volume: number };

export function lowHealthCue(damage: number, healthBefore: number, healthAfter: number, maxHealth: number): LowHealthCue {
  if (healthAfter <= 0 || healthBefore <= 0 || maxHealth <= 0) return { kind: "none", volume: 0 };
  const shareOfCurrent = damage / healthBefore;
  const shareLeft = healthAfter / maxHealth;
  let intensity = (0.25 * shareOfCurrent * shareOfCurrent) / shareLeft;
  if (intensity < 0.05) return { kind: "none", volume: 0 };
  intensity = Math.min(1 / 3, intensity);
  if (intensity >= 1 / 6) return { kind: "critical", volume: 1 / 3 + intensity * 2 };
  return { kind: "warn", volume: 1 / 3 + intensity * 4 };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/sm-cell15-spd-music.ts`, exit 0.

## 5. Lands in

- TARGET `src/fight/cues.ts` (new, client-only cue layer; the engine emits hit, parry and damage events, the client decides which sound plays). Parity-checklist row 12 (combat sound cues). The sketch's `hitPitch`, `combatCueAudible` and `lowHealthCue` live here.
- The zone playlist (chance list per zone and the fade time) is zone data, consumed by the client music bed. It does not belong in the engine.
- Reuse tag: rewrite-from-idea (GPL-3.0: clean-room only)
- Brief rule served: ruling "camera/HUD/sound are client-only" (the engine never reads audio); ruling "zones are data" for the playlist; licence rule (clean-room).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; no donor line is reproduced.
- Latent defect (fixed in sketch, not reachable with the shipped data): an empty refill ends the chain silently (`Music.java` 203-212) and an empty first roll starts nothing (151-153). The shipped sewer and city chance arrays (1, 1, 0.5, 0.25, 1, 0.5) hold three chance-1 tracks, so a pass can never come out empty today; it only bites if a zone's data has no chance-1 track. Fix: re-roll, then fall back to the highest-chance track.
- Defect (fixed in sketch): the donor shuffles refills only. Fix: decide one rule (shuffle every pass) and test it.
- Gap: no true crossfade. The transition is fade to zero, then a full-volume start. Frankendom's zone-border crossfade needs two overlapping players; the donor does not show that, so it is not claimed from this donor.
- Gap: no ambience beds, no layered music, no voice cap, no priority. `Sample.play` (`Sample.java` 112) lets every hit call play. Frankendom's MAX_ATTACKERS = 3 caps the number of hits per exchange at the engine, but a per-frame cap on concurrent cues is still needed on the client; the donor does not provide one.
- Gap: the audibility gate uses the hero's field of view (`Char.java` 376). For Frankendom the gate must use the duel's participants (both fighters, visible to the player) rather than the camera, because the camera is client-only and changes with the over-the-shoulder view.
- Risk: `Music.play(asset)` calls `reset()` (`Music.java` 71, 272-281), which disposes all cached track players when a new single cue starts. Switching cues costs reloads. Not fixed in the sketch.
- Not read: `Random.Float`, `GameMath.gate`, libGDX audio classes, the body of each level's `playLevelMusic` other than those listed above.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Mechanism lines all hold (Music.java play 56-84, playTracks 86-156 with 133-140 roll, fadeOut 158-167, update 169-184, trackLooper 186-194, playNextTrack 196-217, volumeWithFade 300-306, reset 272-281; Sample 108-116, 129-155, 157-174; Char 376/383/500-502; Hero 432-440 and 1692-1708 formulas; SuperNova 99-101; DwarfKing 529; SewerLevel chances; CityLevel 81; Game 279-280; GPL-3). Only issue: the 'silent empty roll' defect is presented as a donor defect fixed by the sketch, but the shipped sewer/city chance arrays {1,1,.5,.25,1,.5} contain three chance-1 tracks so a pass can never come out empty - the defect is latent, not reachable with donor data (note does not say so).
Missed: fadeOut called while a fade is running rescales the elapsed fraction to the new duration (Music.java 163) - small rule not covered. After a fade completes with no new track, volumeWithFade returns full volume again (fadeTotal reset to -1), so the old track snaps back to full unless the callback replaces it - not mentioned.

Fixed 2026-10-12 (Sonnet fixer): the empty-roll defect is now marked latent (shipped chance arrays cannot roll empty); added the fadeOut-rescale rule (Music.java 163) and the post-fade snap-back to full volume (300-306), both verified. Sketch unchanged.
