# Gap check HF (hit-feedback stack: what a landed blow looks and sounds like, and in what order)
Date 2026-10-12. Frankendom repo read: frankendom-lead-catalogue at commit 517b32248 (read-only). Donor notes: 20 (HF001 to HF010, two donors each), grouped by theme below because this is a feel topic.

## Summary for Dom
1. Frankendom already has a worked, signed-off hit stack for a 1v1 duel. A landed blow adds hit-stop frames and a small camera knock (src/hit-impact.ts:15-18), parries are the longest beat and blocks the shortest (hit-impact.ts:13-14), a kick has its own 2-frame beat (24), the picture freeze is a presentation pause while every tick still runs (src/main.ts:797-812), the victim leans and gets nudged (src/armfeel.ts:19-26), sparks and tinted skill flashes exist (src/skill-impact.ts:4-8, src/clash-sparks.ts:4-8), damage numbers float (src/hud.ts:35), sound has seeded variant rotation and plus or minus 5 percent pitch (src/audio/cues.ts:111-117).
2. What is missing is everything that matters when up to 3 attackers hit one target. The duel is a two-fighter state (src/duel.ts:199 types it as a pair), so per-victim merge of simultaneous hits, a knock lock, a stagger immunity window and a cap on pop-ups do not exist yet. They are Origins work. Also missing: a keyed hit-sound table with family fallback, a hurt-state read for a nearly dead player, and a named pre-hit cue for mob specials.
3. Counts: REUSE 7, ADD 10, SKIP 3. Skips: full-body white flash (Dom removed it, src/armfeel-fx.ts:1), shake (camera "never shakes", camera-kick.ts:5-6, so the donors' shake tuning is not needed), and the Skyrim AI-window scalar (not feedback).
4. Top 3 additions: (a) G1 one merged presentation per victim per tick for many-on-one (one stop = the strongest, one summed and clamped shove, one burst, one pain voice, pops capped at 3, knock lock and stagger immunity); (b) G2 hit sound table keyed by family, with a default and a cooldown gate; (c) G4 a named pre-hit cue fired a fixed number of ticks before the server's damage tick, used by mob specials.
5. Licence note: MIT or BSD or Apache donors are Ikemen GO, OpenBOR, OpenGothic, Barony, Funkin, SCAR, CombatPathingRevolution, daggerfall-unity. The rest (DOOM, Quake, dhewm3, DevilutionX, xoreos, Warzone, OpenRA, Veloren, crawl, flare-engine, Mindustry, openmw) are copyleft or non-commercial: shape only. I use no donor numbers in this file. Our own numbers are Frankendom's (Dom-signed).

## What we have today (shared by all rows)
- Tiers and numbers: src/hit-impact.ts. full (heavy, charged, guard break, skill): 5 frames, 4 cm; half: 3 frames, 2 cm; parry: 11 frames with a push toward the attacker; block: 2 frames (15-18). Knock settles in 120 ms (19). Roll tumble (26). The stop of a frame is the maximum of its contacts, not a sum (39-43). Always on, reduced motion included (3-4).
- Base stop by event: src/main.ts:761-771 (Hit 50, Blocked 30, Parried 70, GuardBroken 90, PostureBroken 150, Killed 220 ms; heavy hit 90, heavy block 50). Online duels hold only what is drawn; the sim and network never pause (main.ts comment at 779-780 region, pvpHold at 783).
- Camera: src/camera-kick.ts:4-17 shoves per event type; "the screen never shakes".
- Victim lean and nudge, weapon hold floor (never past the full tier): src/armfeel.ts:19-26, header 1-4; effect burst pool in src/armfeel-fx.ts (white body flash removed, line 1).
- Knockback and ring-wall impact: src/duel.ts:402-413. Posture break stun: duel.ts:329-335. Poise on the opponent: duel.ts:40.
- Sparks and flashes: src/clash-sparks.ts:4-8 (blade on blade), src/skill-impact.ts:4-8 (tinted skill flash, one pool, no light). Blood: src/gore.ts:1-6.
- Sound: src/feedback.ts:1-14, 29-32 (mix: combat at 0.375 x 0.4, finish 1.5 x 0.4), cues.ts variant rotation and pitch (111-117). Creature voices bite and death only, default silent (src/audio/creature.ts:5-14).
- Pop-ups: src/hud.ts:13, 35 (white dealt, red taken, heavy bigger).
- Not opened: src/first-loss.ts, src/moves.ts, haptics code (if any), origins/preview/pit-duel.ts.

## Gap table (by theme)
| Theme / donor notes | Idea in 8 words | Frankendom TODAY | Gap | Call | Lands in |
|---|---|---|---|---|---|
| Freeze unit and strongest-wins: OpenBOR (HF001), Ikemen GO (HF001) | One unit; assign the freeze, never add | Frames at 60 Hz, max of contacts (hit-impact.ts:39-43) | None. Flash length from server event not needed (client only) | REUSE | src/hit-impact.ts |
| Hit order: sound first, then stagger: DevilutionX (HF002), openmw (HF009), Funkin popup (HF008) | Sound, visual, then stagger roll | Event-driven cues; stagger by poise/posture (duel.ts:40, 329-335); pop-ups rise and fade (hud.ts:35) | Covered for 1v1. Haptic adds with cap unverified | REUSE | src/feedback.ts, src/hud.ts |
| Recoil envelope, camera knock: Warzone (HF004) | Shake ramps in, holds, ramps out, capped | Shove with settle 0.12-0.22 s (camera-kick.ts:11-14); no shake by ruling | Nothing to add; later-end-wins rule only if shake is ever added | REUSE (shove) | src/camera-kick.ts |
| Telegraph before resolve, range recheck: xoreos (HF004) | Swing visible before damage lands | Attack phase has wind-up in sim (duel.ts:11); boss ring for rank 8-10 (boss-telegraph.ts:9-12) | Mobs (non-boss) have no cue | REUSE for duel; mob cue is G4 | src/boss-telegraph.ts pattern |
| Pain sound by health band with debounce, hit side blob: dhewm3 (HF002) | Pain voice by health band, debounced | No fighter pain voice found (creature voices: bite, death only, creature.ts:5) | Missing; drop the donor's double vision | ADD (G2) | src/audio/cues.ts, src/feedback.ts |
| Flinch roll, banded capped tint, voice split from flinch: DOOM (HF003) | Capped hurt tint; voice not tied to flinch | No hurt-state tint found; lean on victim (armfeel.ts:19-26) | A low-health read that is not a full-body flash | ADD (G3) | new small file beside src/hud.ts |
| Aggregate per victim per frame, voice gate: Quake (HF003) | Merge simultaneous hits into one presentation | stop = max (hit-impact.ts:39-43); duel is a pair (duel.ts:199) | Shove, burst, voice not merged; no many-on-one | ADD (G1) | src/hit-impact.ts (impactShove takes one event, line 52) |
| Immunity window after a stagger: Veloren (HF005) | After a stun, hits do not chain | Posture break stun exists (duel.ts:329-335); immunity window not seen | Needed once 3 attackers exist | ADD (G1) | src/duel.ts (sim) or world layer; Combat decides |
| Last-hit-wins flash replace, shake falloff: OpenRA (HF005) | Newest hit restarts the same blink | Body flash removed by Dom (armfeel-fx.ts:1) | Flash is out by ruling | SKIP | none |
| Keyed impact sound and puff, family fallback; stumble side: OpenGothic (HF006) | Impact sound keyed by material, family default | Foley variants by cue (cues.ts:111-117); stumble side from bearing is in impactShove (hit-impact.ts:58-60) | No key table with default per family | ADD (G2) | src/audio/cues.ts, src/audio/manifest.ts |
| Knock lock per victim, knock only on special state, pops capped at 3: Barony (HF006) | A victim cannot be knocked again for a beat | knock settles in 120 ms (hit-impact.ts:19); no lock | Needed for 3 attackers; pops cap at 3 on 375 wide | ADD (G1) | src/hit-impact.ts, src/hud.ts |
| Same-kind merge per tick, tier label, FIFO: crawl (HF007) | Merge same feedback in one tick; first hit first | One event list per frame; max rule for stop | FIFO order for 3 hits and merged pops not stated | ADD (G1) | src/main.ts stopFor, src/hud.ts |
| Cooldown-gated hit sound, crit-only jolt, label push-up: flare-engine (HF007) | Hit sound gated; floating labels pushed up | Pop-up rise (hud.ts:35); sound variants rotate | No cooldown gate on hit sound; crit-only jolt absent | ADD (G2) | src/feedback.ts |
| Max-merge shake with cap, rim flash: Mindustry (HF008) | Shake merges by max; flash on the rim | Camera never shakes; body flash removed | Out by ruling | SKIP | none |
| Named pre-hit event: SCAR (HF009) | A named cue fires before damage frame | Boss ring only (boss-telegraph.ts:9-12) | No named cue for mob specials; damage tick stays server-verified | ADD (G4) | src/mobkit.ts + new cue file |
| Closed-form knock from damage and weight, voice roll, one-shot hit frame: daggerfall-unity (HF010) | Knock distance from damage over weight, clamped | Knockback integer steps along away vector (duel.ts:402-411) | No weight field per family; player-side feedback thin | ADD (G5) | origins/preview/mob-looks.ts (weight field), duel.ts untouched |
| Style scalar over timing windows: CombatPathingRevolution (HF010) | One scalar stretches min and max windows | AI rows live elsewhere (src/moves.ts, not opened) | It is AI timing, not feedback | SKIP | none |
| Stagger as its own roll, one chain per hit: openmw (HF009) | Stagger separate from damage | Posture and poise are deterministic (duel.ts:40, 329-335) | Stacked stagger from 3 attackers not decided | REUSE (1v1); see G1 | src/duel.ts |

## Merged additions (one build each)
- G1 Many-on-one presentation merge (Quake, DOOM, Barony, crawl, Veloren, openmw, DevilutionX attacker cue). Rules to carry: one presentation per victim per fixed tick; stop = strongest contact (already true); shoves summed then clamped; one burst and one pain voice per tick; floating pops capped at 3 per victim and fired first-in first-out so the first hit of three lands first; a knock lock and a stagger immunity window per victim; each attacker gets a distinct side cue so the player can tell which of 3 is hitting. Server-verified: the engine emits the merged list; the client only plays it. Prerequisite: Origins many-vs-one exists (today the duel is a pair).
- G2 Hit sound table (OpenGothic, flare-engine, dhewm3, DOOM voice split, daggerfall voice roll). Rules: key by family and material, one family-level default so 100 Pit characters override only where they differ; hit sound fires on the contact tick, not tied to the flinch; per-victim gate of about half a second on pain voices; pain by health band; seeded variant rotation stays; all levels stay inside the current mix (feedback.ts:29-32).
- G3 Hurt-state read (DOOM, dhewm3). Rules: capped and banded, never a full-body flash and never a double-vision effect (both fight readability and Dom's armfeel ruling); honour reduced motion; look test first.
- G4 Named pre-hit cue (SCAR, xoreos). Rules: the cue is a client-only event fired a fixed number of ticks before the server's damage tick; the window is a data field on the fixed step; the damage tick stays server-verified; re-check range at the end of the window. Shares one build with CG G3 (swapped-ability telegraph).
- G5 Weight in the knock (daggerfall-unity). Rule: knock distance is damage over a family weight, clamped min and max; the weight is a catalogue field; the sim's integer knockback is not touched; the client scales presentation only.

## Could not verify
- Whether a fighter hurt or pain voice exists anywhere (searched creature.ts and noted cues only; cues.ts and manifest.ts bodies not fully read).
- Whether haptics are used (no code opened).
- Whether a stagger immunity window already sits in duel.ts beyond lines 329-335 and 402-413.
- Pre-hit wind-up detail in src/moves.ts and origins/preview/pit-duel.ts (not opened).
- src/first-loss.ts (may cover the donor min-HP floor idea; not opened).
- Donor numbers: none used.
