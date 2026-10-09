# FunkinCrew-Funkin (sound-music, cell 15)

Donor: /mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/audio/VoicesGroup.hx | Licence: Apache-2.0 | Haxe | symbol VoicesGroup (player/opponent stems)

## 1. Mechanism
- VoicesGroup is the song's vocal group. It holds two sub-groups of voice stems: player voices and opponent voices. A stem is a FunkinSound. addPlayerVoice and addOpponentVoice add the stem to the parent group and to its sub-group, so it is in both.
- Volume (55-62, 113-120): playerVolume and opponentVolume write the volume to every live (`forEachAlive`) stem in their own sub-group only. The other group is untouched, and adding a stem does not apply the group's stored volume to it.
- Offset (84-102): playerVoicesOffset and opponentVoicesOffset re-time their sub-group. For each live stem, the old offset is added back and the new offset is subtracted, so the stem moves by the difference and keeps its place relative to the song clock.
- Song position: set_time(t) sets every member (both groups, since the stems are in the parent group) to t, then takes each sub-group's offset away from its stems. So a player stem plays at song time minus its player offset.
- Getters (132-164): waveform and length read the first stem of each sub-group; waveform returns null and length 0 when empty. Length is documented in milliseconds. `clear` and `destroy` cascade to both sub-groups (166-188). Two flags, `legacyVoiceSystem` and `legacyVoiceUsesPlayer` (12-14), select a legacy shared-vocals mode; their use is not in this file.
- Inputs: song time, per-group volume and offset, stems. Output: each stem's playback time and volume. Runs when a setter is called. The per-frame driver is not in this file and was not read.

## 2. Key functions
- VoicesGroup.addPlayerVoice (Funkin) | /mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/audio/VoicesGroup.hx | 49-53 | adds a stem to the parent and the player sub-group.
- VoicesGroup.set_playerVolume (Funkin) | /mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/audio/VoicesGroup.hx | 55-62 | writes volume to the player stems only.
- VoicesGroup.set_time (Funkin) | /mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/audio/VoicesGroup.hx | 64-82 | sets song time on all stems, then subtracts each group's offset.
- VoicesGroup.set_playerVoicesOffset (Funkin) | /mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/audio/VoicesGroup.hx | 84-92 | re-times player stems by the difference between the old and new offset.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| One song clock, per-stem offset subtracted on seek | offsets per song (theirs, in data) |
| Re-time by the difference when an offset changes | none (algorithm) |
| Per-group volume that does not touch the other group | default 1.0 (theirs) |

## 4. TypeScript sketch
simplified: no parent group (the sketch iterates both sub-groups, which is what the donor's parent-group pass does in `set_time`), no `forEachAlive` filter (dead stems are skipped in the donor), and the stored volume is not applied to new stems, as in the donor.

```ts
// Licence: Apache-2.0 (FunkinCrew-Funkin). Sketch written from the mechanism; donor path cited above.
type Group = "player" | "opponent";
type Stem = { time: number; volume: number };

class VoiceGroups {
  private stems: Record<Group, Stem[]> = { player: [], opponent: [] };
  private offset: Record<Group, number> = { player: 0, opponent: 0 };
  private vol: Record<Group, number> = { player: 1, opponent: 1 };

  add(g: Group, s: Stem): void {
    this.stems[g].push(s);                                // donor: no volume applied on add
  }

  setVolume(g: Group, v: number): void {
    this.vol[g] = v;
    for (const s of this.stems[g]) s.volume = v;          // only this group
  }

  setOffset(g: Group, next: number): void {
    for (const s of this.stems[g]) s.time += this.offset[g] - next;   // re-time by the difference
    this.offset[g] = next;
  }

  seek(songTime: number): void {
    for (const g of ["player", "opponent"] as Group[])
      for (const s of this.stems[g]) s.time = songTime - this.offset[g];
  }
}
```

## 5. Lands in
- Frankendom target: `src/fight/sound.ts` (per-group volume and a latency offset, only if needed). Stem sync is not a fight need.
- Parity row: 12 (combat sound cues), the nearest row; there is no music or stem row.
- Reuse tag: adapt (Apache-2.0)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- Rhythm-game stems. Frankendom's audio is cue-based, so the stem model is not needed for the fight.
- The base SoundGroup and the per-frame driver were not read. Do not assume the seek path covers all cases.
- Offsets are added to `FunkinSound.time` (type not read); the length getter's doc says milliseconds, but the offset unit is not stated in this file.
- Audio is a client consumer; it reads the fight clock and never feeds it (one engine in `src/fight/`).
