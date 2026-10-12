# veloren-veloren (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/audio/music.rs` (with `voxygen/src/audio/mod.rs`, `voxygen/src/audio/channel.rs`, data `assets/voxygen/audio/music_transition_manifest.ron` and `assets/voxygen/audio/soundtrack.ron`) | Licence: GPL-3.0-or-later (root `Cargo.toml` line 34: `license = "GPL-3.0-or-later"`; `LICENSE` is the GPL v3 text; `music.rs` has no file header) | Rust | symbol `MusicMgr::maintain`

Checked: Cell 15 = category_no from the cells file. Read in full: `music.rs` 1-776 (types, manifest, state, `maintain`, `play_random_track`, `generate_silence_between_tracks`, soundtrack loading); `channel.rs` 56-200 (`MusicChannel` play, stop, fade_out, is_done); `mod.rs` 545-590 (`play_music`). Data read: `music_transition_manifest.ron` (whole file) and the three soundtrack files (counted by grep: 77, 27 and 40 `title:` entries; zero uncommented `Combat` lines in each). Not read: the segment loader (the `Asset` impl at 776-822), the `audio.music_spacing` setter, the calendar code, and what kira does with a dropped stopped handle. Candidates opened: the four files above, plus the calendar soundtrack files. Confidence: high on the order of operations in `maintain`, the threat weights and the thresholds; medium on the crossfade when two channels are active (read only, not run). camera_scope: n/a (sound cell).

Best transferable idea: Weigh each nearby enemy by ceil(max HP / factor), sum the weights inside a radius to pick a combat intensity, and let an intensity change execute only when the last executed change is older than a delay, so fights do not flip the music every frame.
Decision (proposed): adapt - the threat weighting and the change gate fit a many-on-one fight (a patrol of several small enemies and one large one count differently), but the donor's fallback ignores the music state and its shipped data has no combat tracks, so both must be fixed before the idea is used.
Acceptance: With the high threshold set to 3, three hostile creatures with 70 HP each, all within 25 m, switch the client to the high battle track within 5 s of the first change; a test asserts that `threatCount([70,70,70])` is 3 with factor 70 and that one 140-HP creature counts 2.

## 1. Mechanism

- Entry point: `MusicMgr::maintain` (music.rs 233), called as the per-frame music update. Early exit if music is off or there is no audio clock (234-240).
- Step 1, intensity (242-287). Starts at Explore. If combat music is enabled (253) and the player has a position, sum over every other entity in group ENEMY whose squared distance is below radius squared (265): each counts `ceil(maximum health / health factor)` (267). At or above the high threshold (274) the intensity is High; otherwise at or above the low threshold (276) it is Low. A dead player is forced to Explore (281-285).
- Step 2, state (287-332). The previous activity is kept as `last_activity`. If the new intensity differs, the state becomes `Transition(prev, new)`; otherwise `Activity(new)`. A site change (317) that is not during High combat forces `Transition(Explore, Explore)` (323).
- Step 3, interrupt gate (332-337). `interrupt` is true only for a Transition, and then only if it is `Transition(Explore, Explore)` (a site change) or more than `interrupt_delay` (5 s) has passed since `last_interrupt_attempt` (337). A Transition that is not allowed yet is not dropped: `last_activity` is unchanged, so the next frame sees the same Transition and retries (the state only changes when `play_random_track` succeeds).
- Step 4, High to Explore (339-345). A Transition from High to Explore is turned into `Activity(Explore)` as the target. The gate of step 3 still applies to it.
- Step 5, act (351-438). If music is on, tracks exist, and either the track has ended or `interrupt` is true: on interrupt, record the attempt time (366, whether or not the play then succeeds, so a failed play still restarts the 5 s gate) and play a random track for the state (370-385). A hack at 410-417 treats `Transition(Explore, Combat(High))` as `Activity(Explore)` when the gap time is up, so a combat request during a gap keeps the explore music. Otherwise, for an Explore track: when it ends, insert a silence gap (`generate_silence_between_tracks`), then play the next track when the gap runs out. For High combat: re-anchor the start each frame (430-431), so the track's end never fires and it loops until an interrupt.
- Step 6, track choice (`play_random_track`, 460-625). Filter by timing (day or night), weather, site, biome and the music state (480-497; the last filter keeps only tracks whose `music_state` equals the requested state, 497). If that leaves nothing, fall back to the site's default track (Settlement Default or Dungeon Cultist) and ignore everything else (500-523). Then avoid repeating the last track (for High combat, prefer it, since it loops) (`last_track` and `last_combat_track`). Then pick with weight 1 / biome weight (568); a track with no biome list has weight 1. The tag is Exploration for an Explore state and Combat otherwise (598-600). The channel gets the file (603). Return the track's `activity_override` state when it has one, otherwise the requested state (615-619). The shipped (commented) combat tracks use this as the intro-to-loop handoff: a start track is `Transition(Explore, Combat(High))` with `activity_override` = `Combat(High)`, and the loop track is `Activity(Combat(High))` (soundtrack.ron 8, 1043-1055).
- Step 7, gaps (`generate_silence_between_tracks`, 625-686). Only for Explore states: Settlement 120-180 s x spacing (644), Dungeon 10-20 (654), Cave 20-40, wild 120-240 (673). Combat and any Transition: 0 (676-678). Spacing is `audio.music_spacing` (default 1.0; `mod.rs` 470).
- Step 8, channels (`mod.rs` 545-590, `channel.rs` 56-200). The first music channel that is not done is faded out with the table value for (its tag, new tag), default out 1.0 s (551-557). The new tag's channel is stopped with its own out fade (580), and `channel.play` is called with the in fade and, as its fourth argument, a start delay equal to the out fade (584; `channel.rs` 122-139 turns it into `start_time(now + delay)`). So the new file starts `fade_out` seconds late and then fades in: the pair table gives a fade-out followed by a delayed start, not an overlapping crossfade (Exploration to Exploration: 4.0 s out, 0 in, so a 4 s gap). Each channel holds one sound handle (`channel.rs` 59); a new play replaces it (142).
- Data: `music_transition_manifest.ron` sets the radius, health factor, two thresholds, the fade table (per tag pair: out seconds, in seconds) and the interrupt delay. Code defaults are 40 m, factor 100, high 3, low 1, delay 5 s (music.rs 198-203).

## 2. Key functions

- `MusicMgr::maintain`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/audio/music.rs` 233-459. Intensity, state, interrupt gate, track or gap, combat loop.
- `MusicMgr::play_random_track`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/audio/music.rs` 460-624. Filter, fallback, no-repeat, weighted pick, channel play.
- `MusicMgr::generate_silence_between_tracks`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/audio/music.rs` 625-685. Gap per site and state.
- `AudioFrontend::play_music`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/audio/mod.rs` 545-590. Crossfade by the table.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Threat weight of one enemy = ceil(max HP / factor) | Factor 70 in the shipped manifest (theirs, `assets/voxygen/audio/music_transition_manifest.ron` line 3); code default 100 (music.rs 199) |
| Radius of the threat count | 25 m in the manifest (line 2); code default 40 (music.rs 198); compared as squared distance (265) |
| High and Low thresholds | 4 and 4 in the manifest (lines 4-5), so Low can never be chosen; code default 3 and 1 (music.rs 200-201) |
| Interrupt gate between executed changes | 5 s in the manifest (line 16) and code default (music.rs 203) |
| Explore gaps between tracks | 120-180 s settlement, 10-20 s dungeon, 20-40 s cave, 120-240 s wild, times the spacing (644, 654, 664, 673) |
| Combat gap | 0 (676-678) |
| Crossfade pair (Exploration, Exploration) | out 4.0 s, in 0.0 s (manifest line 11); the new track also starts 4.0 s late (delay = out), a gap, not an overlap |
| Crossfade pair (Exploration, Combat) | out 1.0 s, in 0.5 s (manifest line 12); new track starts 1.0 s late, then fades in over 0.5 s |
| Missing crossfade pair | out 1.0 s (mod.rs 556), in 0.1 s (mod.rs 578) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the parts that transfer: the threat weights and the radius test, the thresholds, the dead override, and the interrupt gate with its site-change exception (a site change forces a pick except during high combat). A change that is not allowed yet stays pending and is retried on the next tick, as in the donor. It omits track picking, the silence gaps, the combat loop, the Transition labels, the crossfade table and the channel handles. It uses plain distance instead of the squared compare. It adds one fix: `validate` rejects a configuration where the low threshold is not below the high threshold, because the shipped manifest sets both to 4 and so makes Low unreachable (the function is not called from `tick`; the caller must run it at load).

```ts
// Licence: GPL-3.0 (repo Cargo.toml: GPL-3.0-or-later). Clean-room sketch written from the described mechanism, not a translation.
interface NearbyEnemy {
  distance: number;   // metres from the player
  maxHealth: number;  // hit points
}

interface DirectorConfig {
  radius: number;          // metres (manifest 25, code default 40)
  healthFactor: number;    // hit points per extra enemy (manifest 70, code default 100)
  highThresh: number;      // threat count for high (manifest 4, code default 3)
  lowThresh: number;       // threat count for low (manifest 4, code default 1)
  interruptDelayS: number; // seconds between executed changes (manifest and code default 5)
}

type Intensity = 'explore' | 'low' | 'high';

// Each enemy inside the radius weighs ceil(maxHealth / healthFactor); the weights are summed.
function threatCount(enemies: NearbyEnemy[], cfg: DirectorConfig): number {
  let sum = 0;
  for (const e of enemies) {
    if (e.distance < cfg.radius) {
      sum += Math.ceil(e.maxHealth / cfg.healthFactor);
    }
  }
  return sum;
}

function intensityFor(enemies: NearbyEnemy[], cfg: DirectorConfig, playerDead: boolean): Intensity {
  if (playerDead) {
    return 'explore';
  }
  const n = threatCount(enemies, cfg);
  if (n >= cfg.highThresh) {
    return 'high';
  }
  if (n >= cfg.lowThresh) {
    return 'low';
  }
  return 'explore';
}

interface Director {
  current: Intensity;
  lastChangeS: number; // time of the last executed change
}

// Returns the intensity to play now, or null if nothing changes this tick.
// A different target waits until interruptDelayS has passed since the last executed change.
// A site change forces a new pick, except during high combat (as in the donor).
function tick(d: Director, target: Intensity, nowS: number, siteChanged: boolean, cfg: DirectorConfig): Intensity | null {
  const forced = siteChanged && d.current !== 'high';
  if (target === d.current && !forced) {
    return null;
  }
  if (!forced && nowS - d.lastChangeS <= cfg.interruptDelayS) {
    return null; // the change stays pending and is retried next tick
  }
  d.current = target;
  d.lastChangeS = nowS;
  return target;
}

// Fix for a data defect: with low >= high, the low tier can never be chosen.
function validate(cfg: DirectorConfig): void {
  if (cfg.lowThresh >= cfg.highThresh) {
    throw new Error('lowThresh must be below highThresh, or Low is unreachable');
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/music-director.ts` (new client-only module; it reads fight state and chooses music, and never writes engine state). Parity-checklist row 12 (combat sound cues).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine; the client is a view); addendum sound-music fold-ins (stingers and the combat bed); the enemy weighting is also a many-on-one input (MAX_ATTACKERS = 3 stays the engine's rule; this only chooses the music)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism.
- Shipped data has no combat tracks. Every `Combat` line in the three soundtrack files is commented out (zero uncommented matches; the Halloween and Christmas files too). In the shipped build, a High request finds no track in the wild and `play_random_track` returns an error, so nothing plays. Fix for Frankendom: a combat track must exist before the director is enabled, and load must fail if a state has no track.
- Fallback ignores the music state (music.rs 500-523): in a settlement or a cultist dungeon, a High combat request gets the site's default track, which is an explore track; the tag is set to Combat (598-600) and the state recorded is the requested one (618). Fix: the fallback must keep the state filter, or return an error as the wild does.
- Low threshold equals High in the shipped manifest (lines 4-5), so Low is unreachable. Fix: `validate` (the sketch) at load.
- A track whose `sites` list is empty can never be chosen (music.rs 493: `any` over an empty list is false). Fix: reject such a track at load.
- A biome weight of 0 gives 1 / 0 = infinity (music.rs 568). Whether the weighted picker rejects it was not checked. Fix: reject weights below 1 at load.
- The gap table gives 2-4 minutes of silence between explore tracks in the wild at spacing 1.0 (673). That is a product choice, not a bug; keep it as data.
- The 30-60 s branch at music.rs 679-680 is unreachable: `MusicState` has only Activity and Transition, and both are matched by earlier branches.
- The interrupt gate (5 s) also delays the start of a fight: a fight that starts 1 s after an explore change waits up to 5 s for music. Frankendom should let a fight sting bypass the gate on its own slot (see the ryzom note's event slot).
- Crossfade with two active channels (read, not run): `play_music` fades only the first channel that is not done (mod.rs 551). If an old track is still fading out while a new change comes, the other channel may keep playing at full volume. Not confirmed by a run.
- The sketch and any port must model the delayed start. A true crossfade needs the new track to start at the moment the old one begins to fade (delay 0). Fix: pass a delay of 0 (or a separate overlap value) for the new file.
- Same-tag fade (Exploration, Exploration): the channel keeps one handle (`channel.rs` 59, 142), so the 4 s out-fade of the old track depends on kira continuing to play a stopped handle after it is replaced. Not checked.
- The calendar loader (music.rs 749-751) loads the default soundtrack once for each unknown calendar event, so two unknown events add the default tracks twice and raise their weight. Fix: de-duplicate the list.
- Not verified: no runtime test. The sketch typecheck passed on the VPS (`tsc --noEmit --strict --target es2020`, exit 0).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Step 8 said the new file 'starts with the in and out fades': the fourth argument of channel.play is a START DELAY (channel.rs 122-139) and play_music passes fade_out there (mod.rs 584), so the pair table is a fade-out then a delayed start, not an overlapping crossfade. Confirmed; Step 8, the two table rows and the gaps fixed.
- Step 6 'return the requested state' wrong when the track has activity_override (615-619). Confirmed, fixed.
- Track filter list omitted the music_state filter at :497. Confirmed, fixed.
- Missed: activity_override is the combat intro-to-loop handoff for shipped (commented) tracks (soundtrack.ron 8, 1043-1055); the 410-417 hack keeps explore music during a gap; the interrupt gate time is recorded at 366 even if play fails. Confirmed, added.

Fixed 2026-10-12: delayed-start crossfade claim, return-state rule, state filter, override handoff, 410-417 hack, gate timing. Sketch unchanged (it omits track picking, crossfade and channels).
