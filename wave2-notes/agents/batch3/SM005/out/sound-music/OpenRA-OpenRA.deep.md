# OpenRA-OpenRA (sound-music, cell 3)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Sound/Sound.cs` (voice policy, world and UI sound, music) with `OpenRA.Game/GameRules/SoundInfo.cs` (pool policy and shuffle bag) and `OpenRA.Mods.Common/Traits/World/MusicPlaylist.cs` (playlist, background and stingers) | Licence: GPL-3.0-or-later (file headers: "GNU General Public License ... version 3 ... or (at your option) any later version"; root COPYING is GPL version 3) | C# | symbols `Sound.PlayPredefined`, `SoundPool.GetNext`, `Sound.PlayMusicThen`, `MusicPlaylist.GetSong`, `MusicPlaylist.Stop`, `MusicPlaylist.GameOver`

Checked: The list's hint file `OpenRA.Game/Sound/Sound.cs` was read in full (481 lines). Its real voice policy is in `PlayPredefined` (lines 360-459). I also read `OpenRA.Game/GameRules/SoundInfo.cs` in full (97 lines: pool, policy enum, shuffle bag) and `OpenRA.Mods.Common/Traits/World/MusicPlaylist.cs` in full (256 lines). Callers checked by grep: `Armament.cs` 352-387 (weapon report and burst sounds), `Warheads/CreateEffectWarhead.cs` 135 (impact sound), `Projectiles/Bullet.cs` 306, `Scripting/Global/MediaGlobal.cs` 55. Data read: `mods/ra/audio/notifications.yaml` (146 lines: a `Speech` block at lines 1-116 with no interrupt field, a `Sounds` block at lines 117-146 with 8 `InterruptType` lines), `mods/ts/audio/sounds-generic.yaml` (44 lines, 6 interrupt lines, grep only), `OpenRA.Game/Settings.cs` 293 (`Shuffle` default false). Confidence: high on the voice policy, the shuffle bag, the stable variant and the playlist (read end to end). Not read: the audio engine behind `ISoundEngine` (`SoundDevice.cs`, the backend that might cap simultaneous sources; "(not read)"), the ruleset loader that connects `notifications.yaml` to `SoundInfo` (the wrapping key), and any Lua media script beyond the grep. camera_scope: not applicable (sound topic).

## 1. Mechanism

- Two sound types: `SoundType.World` (positioned, switched off by `DisableWorldSounds`) and `SoundType.UI` (sound.cs 36, 116).
- Named sounds come from pools. A pool is a list of clips with a volume modifier and an interrupt type `DoNotPlay | Interrupt | Overlap` (SoundInfo.cs 66-80). The default is `DoNotPlay` (SoundInfo.cs 69), and it is used for voice pools (37) and for any notification entry with no interrupt node (53-56).
- Clip choice (`SoundPool.GetNext`, SoundInfo.cs 82-95): a shuffle bag. When the live list is empty it is refilled from the full clip list (84-85). A clip is picked at random with `Game.CosmeticRandom` (91) and removed (93), so no clip repeats until the bag is empty.
- Variant choice for voices (`PlayPredefined`, Sound.cs 400-408): the suffix and prefix variants are picked by the actor id modulo the number of variants (403, 405). So the same unit always gets the same accent or variant. That is stable, not random.
- Voice slot (Sound.cs 409): the slot key is the actor id, except that a selected actor uses slot 0. So all selected units share one slot and their acknowledgements never stack.
- Policy, in order (Sound.cs 419-455):
  1. `Overlap`: play now; the slot is not updated (419-423).
  2. Otherwise look up the slot (442). If a sound is still playing in that slot: `Interrupt` stops it and plays the new one (444-445); `DoNotPlay` returns without playing (446-447).
  3. Play, store the new handle in the slot (450-454).
- Notifications (no actor, the `Speech` and `Sounds` blocks of the data) use the same policy but the slot is keyed by clip name (426-438), not by actor. So one speech line of each name plays at a time.
- World sounds with a list of names (171, 176) pick a random name with `world.LocalRandom`, which is the synced random (so a replay plays the same choice). Notifications use `CosmeticRandom` in the shuffle bag (not synced).
- Volume (415): internal volume times the call's modifier times the pool's modifier.
- Music (Sound.cs 217-268, 231-246): a track is played with `MusicVolume * track.VolumeModifier` (257). `PlayMusicThen(m, then)` stores the callback (236). If the same track is already the current one it resumes (238-242) and does not reload. Otherwise the new track is started (245). `Tick` (217-224) checks `music.Complete` each tick, stops the music and calls the stored callback (220-223). A new track stops the current one first, with no fade (253, 289).
- Playlist (`MusicPlaylist.cs`): the playlist is the installed tracks that are not hidden (74-77). A shuffled copy is made once at construction (79) and not reshuffled. `GetSong` (220-225) uses the shuffled copy when the `Shuffle` setting is on (Settings.cs 293, default false), and otherwise the plain list; it returns the track after the current one and wraps to the first (225). On completion, `PlayNextSong` advances the playlist (165-171).
- Background bed (`BackgroundMusic`, MusicPlaylist.cs 33-35, 83-87): it plays when nothing else is chosen and cannot be paused; `Stop()` returns to it (233-246), and the player can mute it only if the trait allows that (37-38, 162).
- Stingers (`GameOver`, 138-158): a victory track or a defeat track is set as the background and playback is stopped so the background takes over (144, 154). The stinger then loops as the background.
- Per-map switch (`DisableWorldSounds`, MusicPlaylist.cs 40-41, 104): the playlist trait turns off all world sounds (for example combat) when the map says so.
- Frame order for one voice cue: an order or fire event calls `Game.Sound.PlayToPlayer` or `Play` (Armament.cs 352 fires the weapon's report); `PlayPredefined` checks the global switches (365), resolves the pool (383-396), takes the next clip from the shuffle bag (396), picks the variant (400-408), checks the slot policy (419-455), then plays with volume (415-416).

## 2. Key functions

- `Sound.PlayPredefined`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Sound/Sound.cs` 360-459. Pool, clip, variant, slot policy, play.
- `Sound.PlayMusicThen` and `Sound.Tick`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Sound/Sound.cs` 217-246.
- `SoundPool.GetNext` and the policy enum: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/GameRules/SoundInfo.cs` 66-95.
- `MusicPlaylist` constructor, `GetSong`, `Stop`, `GameOver`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/World/MusicPlaylist.cs` 65-99, 205-246, 138-158.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-source voice slot with a policy: do not play, interrupt, or overlap | Policy per pool; default `DoNotPlay` (SoundInfo.cs 69) |
| Selected sources share one slot | Slot 0 (Sound.cs 409) |
| Stable variant per source (id modulo variant count) | Modulo on the variant list (Sound.cs 403, 405) |
| Shuffle bag: no repeat until all clips used | Refill when empty (SoundInfo.cs 84-85); pick with `CosmeticRandom` (91) |
| Layered volume | Internal volume x call modifier x pool modifier (Sound.cs 415); music volume x track modifier (257) |
| Playlist that wraps and can shuffle once | Shuffle is on or off by setting (Settings.cs 293, default false); shuffled copy made once (MusicPlaylist.cs 79) |
| Background bed with stinger override | Victory and defeat tracks are optional (MusicPlaylist.cs 142-156) |
| Global switch for all world sounds | Per-map trait field (MusicPlaylist.cs 40-41) |
| Voice cap | None in this code (the audio backend is not read) |
| Crossfade between tracks | None: `StopMusic` then start (Sound.cs 253, 289) |

Data table (cited, not inventoried): `mods/ra/audio/notifications.yaml` lines 1-116 (`Speech`, no interrupt field, so `DoNotPlay`), lines 117-146 (`Sounds`, with `InterruptType: Overlap` at 123 and `InterruptType: Interrupt` at 131). The grammar is one `Name: clip` line per entry, with an optional indented `InterruptType:` line under the entry. The wrapping key that connects this file to `SoundInfo` was not read.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's policy order (overlap first, then the slot check with do-not-play or interrupt, then play and store), the stable per-source variant, the shuffle bag, and the playlist with background and game-over override. It changes one thing on purpose: `prune()` removes finished voices from the slot map, which the donor does not do (it keeps stale handles until they are overwritten, Sound.cs 454). It omits: the name-keyed notification slots (the sketch keys on a number only), the `Game.Settings` checks (mute, shuffle, background mute), the `PlayMusicThen` resume path and the Tick-based completion callback (the sketch takes a track as a string), the 3D position and attenuation, the synced random for world sounds, and the audio backend. The sketch has no global voice cap, because the donor has none; that gap is listed in section 6.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Policy = "doNotPlay" | "interrupt" | "overlap";

export interface Voice { done: boolean; stop(): void; }

// Per-pool voice policy. Slots are keyed by actor; selected actors share slot 0.
export class VoiceSlots {
  private slots = new Map<number, Voice>();

  // Returns true if the clip started. play() starts the clip and returns its voice, or null on failure.
  admit(slotKey: number, policy: Policy, play: () => Voice | null): boolean {
    if (policy === "overlap") return play() !== null;

    const cur = this.slots.get(slotKey);
    if (cur && !cur.done) {
      if (policy === "doNotPlay") return false;
      cur.stop(); // interrupt
    }

    const v = play();
    if (v === null) return false;
    this.slots.set(slotKey, v);
    return true;
  }

  // Not in the donor: drop finished voices so the map does not keep old handles.
  prune(): void {
    for (const [k, v] of this.slots) if (v.done) this.slots.delete(k);
  }
}

export function slotKeyFor(actorId: number, selected: boolean): number {
  return selected ? 0 : actorId;
}

// Stable variant per actor: the same unit always gets the same accent.
export function variantFor(actorId: number, variants: readonly string[]): string {
  return variants[actorId % variants.length];
}

// Shuffle bag: each clip plays once before any repeats; refills when empty.
export class ShuffleBag<T> {
  private live: T[] = [];
  constructor(private readonly clips: readonly T[], private readonly rnd: () => number) {}

  next(): T | null {
    if (this.live.length === 0) this.live = [...this.clips];
    if (this.live.length === 0) return null;
    const i = Math.floor(this.rnd() * this.live.length);
    const [picked] = this.live.splice(i, 1);
    return picked;
  }
}

// Playlist state. background plays when nothing else is chosen; a stinger can replace it.
export interface PlaylistState { current: string | null; background: string | null; isBackground: boolean; }

// Next track after the current one in the list, wrapping to the first after the last.
export function nextTrack(list: readonly string[], current: string | null): string | null {
  if (list.length === 0) return null;
  const i = current === null ? -1 : list.indexOf(current);
  return list[(i + 1) % list.length];
}

// Game over: the victory or defeat track becomes the background and replaces the current track.
export function onGameOver(st: PlaylistState, won: boolean, victory: string | null, defeat: string | null): void {
  const t = won ? victory : defeat;
  if (t !== null) {
    st.background = t;
    st.current = null;
    st.isBackground = true;
  }
}

// Stop: fall back to the background track when one is set.
export function stopTrack(st: PlaylistState): void {
  st.current = st.background;
  st.isBackground = st.background !== null;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/sm005-ora-voices-playlist.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/cues.ts` (new, client-side; the same cue module as the OpenDiablo2 cell). Parity-checklist row 12 (combat sound cues). The per-source slot is keyed by the attacker, so the many-on-one case (MAX_ATTACKERS = 3) gets three independent slots.
- The playlist and stinger part belongs in the client music layer (the same module as the OpenGothic cell, `src/fight/music-state.ts`), with the defeat and victory tracks as zone or encounter data (not read in the Frankendom tree). Row 12 again.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only, shape only)
- Brief rule served: sound is client-only (the engine only emits the event with the source id); one ledger for the cue (the event is the server-verified hit or kill); MAX_ATTACKERS = 3.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the described mechanism.
- No global voice cap in the donor. The audio backend may cap sources, but that is not read. Frankendom needs a cap on the total cues (not only per source): fix in the sketch is a cap check to add before `admit` (not written, a one-line change in the caller).
- The slot map keeps stale handles until they are overwritten (Sound.cs 454). Fix: `prune()`.
- Selected units share slot 0 (Sound.cs 409). That is a player-side convenience. Frankendom's equivalent is the player's own cue slot, not a shared slot for all selected creatures; do not copy the sharing for enemies.
- Music switches are hard cuts (Sound.cs 253, 289). Frankendom needs a fill or a short fade for the stinger (see the OpenGothic cell), not a stop-and-start.
- The stinger loops as background because it is set as the background track (MusicPlaylist.cs 144, 154, 241). Frankendom should play a victory or defeat stinger once and then return to the zone's background, not loop it.
- Death and respawn: the donor's defeat stinger is a music event on game over only. It does not cover a player's death inside a fight, which matters for Frankendom's respawn presentation (checklist row 17). It is an open question for Frankendom.
- The shuffled playlist order is fixed for the session (MusicPlaylist.cs 79). That is fine for a menu; for a zone it would repeat the same order each visit.
- What the donor gives, that Frankendom lacks: a per-source voice slot with an explicit policy, a shuffle bag for clip variety without immediate repeats, and a per-source stable variant. These are the three pieces the many-on-one hit cue needs.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; shape only)
Brief rule served: sound stays client-only and is driven by server-verified events (rule 1 and the sound ruling); MAX_ATTACKERS = 3 for the per-source slots; zones as data for the music tracks.
Best transferable idea: give each source (attacker, unit) its own voice slot with an explicit do-not-play, interrupt or overlap policy, and pick clips from a shuffle bag, so many-on-one fights do not stack the same sound.
Decision (proposed): adapt - take the per-source slot with policy and the shuffle bag, add the global cap and the prune that the donor lacks, and do not copy the shared slot for enemies or the looping stinger.
Acceptance: with three attackers hitting the player, each attacker has its own cue slot; a second hit from the same attacker while its cue is still playing is skipped (do-not-play), and the total of cues sounding at once never exceeds the cap; a defeat stinger plays once and then the zone background resumes.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- All cited lines and behaviours verified.
- Missed (minor): PlayPredefined plays only when player is null or the local player (Sound.cs 411), a per-team audio filter; PlayMusicThen starts looping when Settings.Sound.Repeat is set. Confirmed (411); neither is in the note.
