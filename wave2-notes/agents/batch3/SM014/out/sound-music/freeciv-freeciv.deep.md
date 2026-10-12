# freeciv-freeciv (sound-music, cell 1)

Donor: `/mnt/frankendom-donors/freeciv-freeciv/client/music.c` (with `client/audio.c`, `client/audio_sdl.c`, `server/mood.c`) | Licence: GPL-2.0-or-later (client/music.c header: "either version 2, or (at your option) any later version"; COPYING is GPL version 2, June 1991) | C | symbol `start_style_music`

Checked: Read in full: `start_style_music` (client/music.c 44-88), `stop_style_music`, `start_menu_music`, `play_single_track` (music.c 116-124), `audio_play_tag` (client/audio.c 428-511), `music_finished_callback` (audio.c 388-420), `audio_play_sound` and `audio_play_music` and `audio_play_track` and `audio_stop_usage` (audio.c 531-637), `player_mood` (server/mood.c, whole file). Read the repeat and stop branches of `sdl_audio_play` and `sdl_audio_stop` (audio_sdl.c 113-150 and 293-305); the SDL2 and SDL3 `#ifdef` branches are both read for those lines, the rest of audio_sdl.c is not. Searched client/*.c and client/*.h for ambience, crossfade, biome and layering music: no code found (grep, confidence high). Confidence in the mood, shuffle and stinger mechanism: high. Confidence in the "fade is cancelled" finding: high for the code path, not run (no audio test). Not read: the server packet send for mood beyond server/plrhand.c 1482-1484 (grep only), the GUI settings dialogs, the stock style files beyond the two example tags. Sketch typechecked on the VPS: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/SM014-freeciv-sketch.ts` exit 0.

Best transferable idea: Keep one track group per game mood, pick a random alternative that is not the one just played, and let a one-shot cue hold the loop and resume it at the current mood.
Decision (proposed): adapt - take the mood-keyed groups, the no-repeat pick and the stinger hold-and-resume; the donor's stop fade never happens (defect, fixed in the sketch), and a voice priority cap is added because the donor has none.
Acceptance: A player who engages a creature hears the combat loop come in over 2 s while the peaceful loop goes out, and a second fight never restarts the loop track it just ended on (client director test: `pickAlternative` never returns the last index when two or more tracks exist, and `crossfadeGains` sums to 1 at each sample).

## 1. Mechanism

- Music is picked per player from a style (`music_style`) and a mood (peaceful or combat). The server sets the mood each turn: `player_mood` returns COMBAT only when the player's last war action is within `WAR_MOOD_LASTS` turns and some diplomatic state is war or has a reason to cancel; otherwise it returns PEACEFUL (server/mood.c 31-46; receipts 31, 41, 46; window 10 turns, server/mood.h 17).
- The mood reaches the client in the player-info packet. When `music_style` or `client.mood` changes for the local player, the client calls `start_style_music` (client/packhand.c 2565-2576, receipts 2569 and 2575).
- `start_style_music` (client/music.c 44-88) does nothing unless the game is running and the style music option is on. It stops the current loop (`stop_style_music`, receipt 60), reads the style's `music_peaceful` or `music_combat` tag for the mood (receipts 72, 75), and starts it with `audio_play_music(tag, nullptr, MU_INGAME)` (receipt 81).
- Alternatives: a tag is either one file (`files.<tag>`) or a list `files.<tag>_0` to `_24` (`MAX_ALT_AUDIO_FILES` 25, client/audio.h 26). `audio_play_tag` (audio.c 428-511) builds the candidate list and picks one with `fc_rand(j)` (receipt 471).
- No-repeat: when a loop ends, `music_finished_callback` calls `audio_play_tag` again with `exclude = current_track` (audio.c 419, receipt), and the candidate loop skips that index (receipt 463). If the pick lands past the excluded index the index is re-added (receipt 474). With only one candidate the excluded track is used again (audio.c 465-478, not quoted).
- Stinger: `play_single_track` (music.c 116-124, receipt 123) is driven by a server packet (`handle_play_music`, client/packhand.c 5728, receipt). `audio_play_track` (audio.c 592-602) sets `let_single_track_play` (receipt 597), stops the loop (receipt 599 comment, `audio_stop` at 600) and plays the cue. While the flag is set the loop's end callback is swallowed (audio.c 400-404, receipts 400 and 404 region), so the style loop does not restart early. When the cue ends its callback restarts the saved style tag (`mfcb`), so the loop resumes with the current mood.
- Fade-out on stop: the SDL2 branch fades the music out over 2000 ms (`Mix_FadeOutMusic(2000)`, client/audio_sdl.c 304, receipt); the SDL3 branch stops each track with a 2000 ms fade (audio_sdl.c 299-301, receipt 301).
- The fade is cancelled in practice. `start_style_music` calls stop and then starts the new loop at once (music.c 60 then 81). The new repeat play goes through `sdl_audio_play` (audio_sdl.c 113), whose repeat branch (141) halts the current track immediately: SDL3 `MIX_StopTrack(tracks[channel], 0)` (144) and SDL2 `Mix_HaltMusic()` (147). So a peace-to-combat switch is a hard cut, not a fade.
- Voices (sound effects): `MIX_CHANNELS` is 8 (audio_sdl.c 61), channel 0 is music on the SDL3 path. SDL3 picks effect channels round-robin (`channel_turn`, wraps at 135) and reuses the next one even if it is still playing. SDL2 takes the first free channel with `Mix_PlayChannel(-1, wave, 0)` (234) and drops the sound if none is free. There is no priority on either path.
- Fight sounds: each combat packet plays `sound_fight` (and `sound_fight_alt`) for both unit types (client/packhand.c 603-607, receipts 604 and 605). `audio_play_sound` (audio.c 531-555) tries the primary tag, then the two alternates, and logs if none is found.
- Layering: none. One music usage is active at a time (`current_usage`, MU_MENU or MU_INGAME, audio.c 59, 584). Ambience beds: none. No biome or terrain input reaches music.c or audio.c (grep, see Checked). The stock musicset (data/stdmusic.musicspec) ships only the menu track; every style track is commented out.

## 2. Key functions

- `start_style_music`: `/mnt/frankendom-donors/freeciv-freeciv/client/music.c` 44-88 (mood to tag, stop then play).
- `audio_play_tag`: `/mnt/frankendom-donors/freeciv-freeciv/client/audio.c` 428-511 (candidate list, `fc_rand` pick, exclusion, callback wiring).
- `music_finished_callback`: `/mnt/frankendom-donors/freeciv-freeciv/client/audio.c` 388-420 (stinger swallow, loop restart with exclusion).
- `audio_play_track` and `play_single_track` (stinger): `/mnt/frankendom-donors/freeciv-freeciv/client/audio.c` 592-602 and `/mnt/frankendom-donors/freeciv-freeciv/client/music.c` 116-124.
- `player_mood`: `/mnt/frankendom-donors/freeciv-freeciv/server/mood.c` 31-46 (war window and mood values).
- `sdl_audio_play` repeat branch and `sdl_audio_stop`: `/mnt/frankendom-donors/freeciv-freeciv/client/audio_sdl.c` 113-150 and 293-305 (halt versus fade, channel pick).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Mood selects one track group; mood flips restart the loop | Two groups, peaceful and combat (theirs, music.c 72, 75) |
| Random alternative, never the one just played | Up to 25 alternatives per tag (theirs, audio.h 26) |
| Mood from a recent-war window | `WAR_MOOD_LASTS` 10 turns (theirs, server/mood.h 17) |
| Stop with a fade | 2000 ms (theirs, audio_sdl.c 304 and 301); not effective on a switch, see defects |
| Voice pool with a fixed size | `MIX_CHANNELS` 8 (theirs, audio_sdl.c 61) |
| Fight sound with fallback tags | Primary tag then two alternates (theirs, audio.c 531-555; packhand.c 604-605) |

Defects (keep the idea, fix the defect):
1. Fade never runs on a mood switch: the 2000 ms fade is cancelled by the immediate halt in the repeat branch (audio_sdl.c 144 or 147). fix: `crossfadeGains` in the sketch ramps the old loop out and the new one in over the same window, so the two gains sum to 1.
2. No priority on voices and round-robin reuse on SDL3 (audio_sdl.c 135): a busy channel can be taken. fix: `takeVoice` in the sketch gives up only the lowest-priority voice, and only to a higher priority sound.
3. Possible stinger problem, not tested: the code assumes the old loop's end callback fires when it is stopped for a stinger (audio.c 400-404 swallow it). If SDL does not fire that callback on stop, `let_single_track_play` stays set and the cue's own end could be swallowed, so the loop would not resume. fix: in Frankendom the director resumes on a timer, not on a callback (sketch `tick`).

## 4. TypeScript sketch

simplified: The sketch models mood-keyed track groups with a no-repeat pick, a loop restart on a mood change, a one-shot cue that holds the loop and resumes it at the current mood, a crossfade window in which both gains sum to 1 (this repairs the donor's cancelled fade), and a voice cap with priority (not in the donor). It omits the donor's loop-end callback and the `let_single_track_play` flag, the menu-versus-in-game usage switch, the SDL channel and mixer calls, the saved-tag resume (the sketch resumes at the current mood, which is what the donor's saved style tag also gives when the mood has not changed), the server mood packet and the 10-turn war window (the sketch takes a time hold instead), and the menu track. The single-alternative case returns index 0 instead of the donor's re-add loop.

```ts
// Licence: GPL-2.0 (donor, freeciv client/music.c and client/audio.c). Clean-room sketch from the described mechanism, not a translation.
// clean-room
type Mood = "peaceful" | "combat";

interface Loop {
  mood: Mood;
  index: number; // index of the alternative now playing
}

interface Director {
  peacefulTracks: string[];
  combatTracks: string[];
  mood: Mood;
  loop: Loop | null;
  fadeMs: number;                              // crossfade length (donor: 2000)
  fadeStartMs: number;                         // when the current crossfade began
  fading: boolean;                             // true while the old loop fades out
  stingerEndMs: number;                        // 0 when no stinger is playing
}

// Random alternative, never the one just played (when there is a choice).
function pickAlternative(count: number, exclude: number): number {
  if (count <= 0) return -1;
  if (count === 1) return 0;
  const candidates = count - (exclude >= 0 ? 1 : 0);
  let r = Math.floor(Math.random() * candidates);
  if (exclude >= 0 && r >= exclude) r += 1;
  return r;
}

function startLoop(d: Director, mood: Mood, nowMs: number): void {
  const group = mood === "combat" ? d.combatTracks : d.peacefulTracks;
  const prev = d.loop;
  const exclude = prev !== null && prev.mood === mood ? prev.index : -1;
  d.loop = { mood, index: pickAlternative(group.length, exclude) };
  if (prev !== null) {            // crossfade: old loop fades out while the new one fades in
    d.fading = true;
    d.fadeStartMs = nowMs;
  }
}

// Mood flips (peace <-> combat) change the group at once; no restart when the mood is unchanged.
function setMood(d: Director, mood: Mood, nowMs: number): void {
  if (mood === d.mood) return;
  d.mood = mood;
  if (d.stingerEndMs > nowMs) return; // the stinger is playing: the loop resumes at the current mood
  startLoop(d, mood, nowMs);
}

// One-shot cue (victory, ambush). The loop is not discarded: it resumes at the current mood when the cue ends.
function playStinger(d: Director, durationMs: number, nowMs: number): void {
  d.stingerEndMs = nowMs + durationMs;
  d.loop = null;
}

function tick(d: Director, nowMs: number): void {
  if (d.stingerEndMs > 0 && nowMs >= d.stingerEndMs) {
    d.stingerEndMs = 0;
    startLoop(d, d.mood, nowMs);
  }
}

// Gains for the old and new loop at time nowMs. Both ramps use the same window, so the sum stays 1.
function crossfadeGains(d: Director, nowMs: number): { fromGain: number; toGain: number } {
  if (!d.fading) return { fromGain: 0, toGain: 1 };
  const t = Math.min(1, Math.max(0, (nowMs - d.fadeStartMs) / d.fadeMs));
  if (t >= 1) {
    d.fading = false;
    return { fromGain: 0, toGain: 1 };
  }
  return { fromGain: 1 - t, toGain: t };
}

interface Voice { id: number; priority: number; endMs: number; }

// Voice cap with priority (not in the donor). A full pool only gives up its lowest-priority voice
// to a strictly higher-priority sound; otherwise the new sound is dropped.
function takeVoice(pool: Voice[], cap: number, priority: number, endMs: number, nowMs: number, id: number): Voice | null {
  const live = pool.filter((v) => v.endMs > nowMs);
  pool.splice(0, pool.length, ...live);
  if (live.length < cap) {
    const v: Voice = { id, priority, endMs };
    pool.push(v);
    return v;
  }
  let lowest = live[0];
  for (const v of live) {
    if (v.priority < lowest.priority) lowest = v;
  }
  if (priority <= lowest.priority) return null;
  lowest.id = id;
  lowest.priority = priority;
  lowest.endMs = endMs;
  return lowest;
}

export {}
```

## 5. Lands in

- TARGET `src/fight/music-director.ts` (new client module; the engine sends the fight state, the director only picks tracks and gains). Parity-checklist row 12 (combat sound cues). Client-only: the engine never reads it.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine, sound is client-only); row 12 (combat sound cues)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no lines were translated.
- The donor's mood is turn-based and comes from diplomacy (server/mood.c 31): combat music can last up to 10 turns after the last war action. Frankendom's trigger must be the engine's engage state change (one engine, engage is a state change), and the hold time must be a data field in ms, not turns.
- The donor has no layering, no ambience bed and no biome input. For ambience per biome and border crossfades the search found nothing in this donor, so this cell gives no transferable code for those parts.
- The intended fade never runs on a mood switch (audio_sdl.c 144, 147). The donor cannot be cited as proof that a crossfade works.
- No priority on sound voices: a cue for a spell or a hit can be dropped (SDL2) or reused (SDL3). Frankendom needs priority so an ambience cue never takes a hit sound.
- Stinger resume depends on an end callback that is not verified on stop (see defect 3). Test it on the client before relying on the resume.
- Server side of the mood packet was grepped only (server/plrhand.c 1482-1484), so how often the mood is re-sent was not traced.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine; sound is client-only); row 12 (combat sound cues)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- All checked claims hold; no false claim found.
- Missed (confirmed in code): stop_style_music calls audio_stop_usage, which sets switching_usage = TRUE so the next music-finished callback is swallowed (audio.c 394-398, 633-637). That flag is what makes the stop-then-play hard cut not restart the old tag. Defect 3 (stinger resume callback may not fire on stop) should be checked against this flag: if SDL does not fire the callback on stop, switching_usage stays TRUE and swallows the next real end. The timer-driven resume in the sketch avoids both flags, so the fix stands.
