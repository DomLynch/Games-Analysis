# id-Software-Quake-2 (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/id-Software-Quake-2/client/snd_dma.c` (with `snd_mix.c`, `snd_loc.h`, `sound.h`, `cd_audio`-calls in `cl_parse.c` and `cl_view.c`, `server/sv_send.c`, `game/q_shared.h`) | Licence: GPL-2.0-or-later. `client/sound.h` lines 5-7 say "modify it under the terms of the GNU General Public License ... either version 2 of the License, or (at your option) any later version"; the top-level `gnu.txt` is the GPL text. Copyleft: clean-room, shape only. | C | symbol `S_StartSound`, `S_IssuePlaysound`, `S_PaintChannels`

Checked: Read in full: `client/snd_dma.c` S_PickChannel (375-~418), S_SpatializeOrigin (425-~470), S_Spatialize (477-~500), playsound pool and issue (505-~580), S_StartSound (655-~736), S_AddLoopSounds (820-~909), S_Update (1009-~1061), S_RegisterSexedSound (587-~640). `client/snd_mix.c` issue loop (225-262, the loop head and the block stop). `server/sv_send.c` timeofs check (288-296) and flag (318-326). `client/cl_parse.c` offset read (600-610) and call (637). `client/cl_view.c` and `cl_parse.c` CD track start (355, 533-537). Confidence: high for the scheduling order and the numbers; high that the silent-cue defect is in the code as read; medium on what the drift term is for (its purpose is not stated in the code). Nothing was run. Not read: the mixing body of `S_PaintChannels` beyond the issue loop, `GetSoundtime`, the source of `cl.frame.servertime`, the decoding of the server frame clock, and `CDAudio` itself (the CD driver). Callers: S_StartSound is called from `cl_parse.c` 637 (server sounds) and `cl_fx.c` (local effects, grep only). The claims apply to every caller that passes an entity, channel, sound and offset.

Best transferable idea: Start a cue on the server's clock plus the server's own sub-frame offset, split the mix block exactly at the start sample, and drop the cue when the queue is full.
Decision (proposed): adapt - the server-timed start and the exact-sample split are the mechanism to keep for hit and spell cues; the silent-cue kill, the unexplained -10 drift and the start-order rule for equal times are defects to fix in the sketch.
Acceptance: A client test with a fake mix clock: a hit cue sent with a 40 ms offset starts on the sample for server time plus 40 ms (within one paint block); a cue that arrives late starts now; a cue more than 0.3 s early starts 0.1 s ahead; a silent cue (out of range) does not cut a live voice.

## 1. Mechanism

Cues are timed on the server clock (not on arrival):
- The server sends a cue with an offset of 0 to 0.255 s (`sv_send.c` 292-293) and sets a flag only for a non-zero offset (324). The client reads the offset as one byte in thousandths of a second (`cl_parse.c` 606) and passes it to S_StartSound (637).
- S_StartSound (655-~736) first resolves a name that starts with `*` as a per-model variant (668; S_RegisterSexedSound, see below). It loads the sound, takes a playsound entry from a pool of 128 (`snd_dma.c` 68; if the pool is empty it returns and the cue is dropped, 511), records origin, entity, channel, attenuation and volume (`fvol x 255`), then computes the start in mix samples: `start = servertime_ms x 0.001 x speed + s_beginofs` (698). If that is before the mix clock it starts now and re-anchors `s_beginofs` (699-703). If it is more than 0.3 s ahead it is pulled in to 0.1 s ahead and re-anchored (704-709). Otherwise `s_beginofs` drops by 10 (711; the code gives no reason). A cue with no offset starts at the mix clock (715). A cue with an offset begins at `start + offset x speed` (717).
- The pending list is kept sorted by begin time with an insertion scan (720-723). A new cue goes in before any cue with the same begin time (LIFO among equal times).

The mix clock issues cues exactly on time:
- In S_PaintChannels (snd_mix.c 225-262), before painting a block, the loop takes the head of the pending list: if its begin is at or before the mix clock it is issued (249-251); otherwise the block end is cut to that begin (255-256) so the next cue starts on its exact sample. The block is then painted and the loop repeats.
- S_IssuePlaysound (550-~580) picks a channel (558) and sets distance, volume and origin; a channel is then spatialised (577). If no channel is free the cue is dropped.

Voices and attenuation:
- 32 channels in total (`snd_loc.h` 126-127). S_PickChannel (375-~418): the same entity and entchannel is overridden at once (390-393; channel 0 never overrides); a channel owned by the player is not taken for another entity (398); otherwise the channel with the least life left is taken (402). The picked channel is wiped at once (413, memset), before any audibility test.
- Spatialisation (S_SpatializeOrigin 425-~470): distance minus a full-volume radius of 80 (442) times `dist_mult` (445); pan sides are `0.5 x (1 + dot)` and `0.5 x (1 - dot)` (456-457), so the pan never overshoots master. The view entity is always full volume (481). `dist_mult` for an issued cue is `attenuation x 0.001` for ATTN_STATIC (566-567) and `attenuation x 0.0005` otherwise (569). ATTN_STATIC is "diminish very rapidly with distance" (`q_shared.h` 989).

Ambient loops (S_AddLoopSounds 820-~909, run last in each S_Update at 1059):
- Each entity in the frame with a loop sound is grouped with every other entity that has the same sound. The contributions are summed with the loop factor 0.003 (38) and a master of 255 (863, 874), then clamped at 255 (per side). If both sides are 0 it is skipped. One channel per distinct sound is taken with entnum 0 and entchannel 0 (884); if none is free the loop pass stops for this frame (`return`, 885-886).
- The channel is marked to be removed next frame (894) and its position is the global mix clock modulo the sample length (896), so the loop stays in phase across frames. S_Update clears autosound channels each frame (1045-1047).

Per-model variants, S_RegisterSexedSound (587-~640): a name starting with `*` is looked up as `#players/<model>/<name>`, where the model comes from the player's skin configstring (599; default `male`, 613-614). The cache is checked first (617-618). If there is no such file it aliases the male sound (634). Resolution happens once per name.

Music: the level's CD track (config string CS_CDTRACK) is started looped on map load (cl_view.c 355) and when the config string changes (cl_parse.c 537). `CDAudio_Play` is not read; no fade or layering exists in these files.

## 2. Key functions

- `S_StartSound`: `/mnt/frankendom-donors/id-Software-Quake-2/client/snd_dma.c` 655-~736. Pool (698-717), start clamp (698-709), offset and sort (715-723).
- `S_PaintChannels` issue loop (function starts at snd_mix.c 224): `/mnt/frankendom-donors/id-Software-Quake-2/client/snd_mix.c` 225-262 (issue 249-251, block stop 255-256).
- `S_PickChannel`: `/mnt/frankendom-donors/id-Software-Quake-2/client/snd_dma.c` 375-~418. Override (390-393), player protection (398), least-life steal (402), wipe (413).
- `S_SpatializeOrigin`: `/mnt/frankendom-donors/id-Software-Quake-2/client/snd_dma.c` 425-~470. Full-volume radius (442), pan (456-457).
- `S_AddLoopSounds`: `/mnt/frankendom-donors/id-Software-Quake-2/client/snd_dma.c` 820-~909. Sum (863-874), channel (884-896).
- `S_RegisterSexedSound`: `/mnt/frankendom-donors/id-Software-Quake-2/client/snd_dma.c` 587-~640. Model (599), male default (613-614), cache (617-618), alias (634).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Server-timed cue: a sub-frame offset from the server, 0 to 0.255 s | Offset byte in thousandths of a second (cl_parse.c 606); server limit 0.255 s (sv_send.c 292) |
| Late cue plays now; far-early cue is pulled in | Early window 0.3 s (snd_dma.c 704); pulled-in lead 0.1 s (706) |
| Drift term (purpose not stated) | minus 10 samples per cue in the normal window (711) |
| Pool of pending cues, sorted, dropped when full | 128 entries (snd_dma.c 68); full: drop (511) |
| Exact-sample split of the mix block at the next cue | Block end cut to the next begin (snd_mix.c 255-256) |
| Voice pool of 32 with least-life steal and player protection | 32 channels (snd_loc.h 126); steal by least life (402); player protection (398) |
| Full-volume radius and falloff | Full volume within 80 units (36, 442); attenuation factor 0.001 for static and 0.0005 otherwise (567, 569) |
| Pan that stays in range | 0.5 x (1 plus or minus dot) (456-457) |
| Loop sum per sound, phase-locked to the mix clock | Loop factor 0.003 (38); master 255 (863); phase = paint clock modulo length (896) |

## 4. TypeScript sketch

simplified: keeps the donor's order (clamp the start to the mix clock, a sorted pending list, due cues issued and the block cut at the next start, drop when the pool is full). It omits the donor's drift term (`s_beginofs -= 10`, 711), because its purpose is not stated in the code and the sketch uses the measured offset only; it also omits the channel pick, the voice steal and the playsound object pool, and the mixer. It orders equal begin times by arrival (FIFO), where the donor inserts before equals (LIFO). `due()` returns the block end so the caller can paint up to that sample.

```ts
// Licence: GPL-2.0-or-later (client/sound.h header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Cue {
  sfx: string;
  begin: number;   // mix-clock sample at which the cue starts
}

class CueScheduler {
  private pending: Cue[] = [];  // kept sorted by begin
  private offset = 0;           // samples: maps the server clock onto the mix clock

  constructor(private readonly rate: number, private readonly maxPending: number) {}

  // serverMs: server time of the frame. painted: mix clock in samples. timeofsSec: 0 to 0.255 from the server.
  // Returns false when the queue is full; the cue is dropped.
  schedule(sfx: string, serverMs: number, painted: number, timeofsSec: number): boolean {
    if (this.pending.length >= this.maxPending) return false;

    const serverSamples = serverMs * 0.001 * this.rate;
    let start = Math.trunc(serverSamples + this.offset);
    if (start < painted) {
      start = painted;                          // late: start now and re-anchor the mapping
      this.offset = start - serverSamples;
    } else if (start > painted + 0.3 * this.rate) {
      start = painted + Math.trunc(0.1 * this.rate);  // too far ahead: pull in to 100 ms
      this.offset = start - serverSamples;
    }

    const begin = timeofsSec > 0 ? start + Math.trunc(timeofsSec * this.rate) : painted;

    let i = this.pending.length;
    while (i > 0 && this.pending[i - 1].begin > begin) i--;  // equal begins keep arrival order
    this.pending.splice(i, 0, { sfx, begin });
    return true;
  }

  // Takes the cues that are due and returns the sample where the current mix block must stop
  // so the next cue starts on its exact sample.
  due(painted: number, blockEnd: number): { start: Cue[]; end: number } {
    const start: Cue[] = [];
    while (this.pending.length > 0 && this.pending[0].begin <= painted) {
      start.push(this.pending.shift()!);
    }
    const next = this.pending.length > 0 ? this.pending[0].begin : Infinity;
    return { start, end: Math.min(blockEnd, next) };
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/sfx-cues.ts` (new, client-side only: the engine sends the hit or spell event with its server tick, the client schedules the cue; the cue never changes a kill). Parity-checklist row 12 (combat sound cues). The timestamp comes from the server tick, which is the row 18 sub-line "server tick: fixed step, input intake, per-tick NPC budget"; this note cites row 12 only.
- Today: no Frankendom code path is mapped here; the target is new.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: rule 1 (one engine, two clients; the engine sends the cue, the client voices it); rule 8 (named target and parity row)

## 6. Gaps and risks

- Silent cue kills a live voice. S_PickChannel wipes the chosen channel at once (413), S_IssuePlaysound spatialises the new cue with no audibility test (558, 577), and a silent cue is only cleared on the next S_Update (1045-1053). A cue that is out of range cuts a live voice and then plays nothing. Fix: test audibility first, then pick a channel only for an audible cue (the same defect as in the Quake files).
- Unexplained drift. `s_beginofs -= 10` (711) moves the mapping 10 samples earlier on each cue in the normal window. The code gives no reason, and the clamps reset it only when a cue is late or far ahead. Fix: measure the server-to-mix clock error and correct it once per frame, not once per cue; the sketch drops the term.
- Equal times are LIFO in the donor (720-723). Two cues at the same sample play in reverse order of arrival. Minor. Fix: FIFO, as the sketch does, if order matters for a hit then a block.
- Loops lose to cues. S_AddLoopSounds runs last in each S_Update (1059), so when the 32 channels are full the loop pass returns early (885-886) and the remaining loops are dropped for that frame, in entity order. Fix: reserve channels for loops, or give loops a priority rule.
- A 0.3 s early window is wide. A cue more than 0.3 s early is pulled to 0.1 s ahead (704-706), so a late-arriving server clock can still shift a hit cue by up to 0.2 s. Fix: keep the clamp, but log it so a shifted cue can be seen in tests.
- The pool is silent when full: S_AllocPlaysound returns NULL (511) and the cue is dropped with no count. Fix: count drops per frame so the HUD and tests can see them.
- Not in these files: layered music (one CD track per level, cl_parse.c 537; no mixing of two tracks), crossfades between tracks, stingers, and ambience beds per biome (the loops are per entity, not per zone). The Quake 1 ambience-bed note covers the zone-level bed.
- Not read: the mix body, the server frame clock source, the decoding of `cl.frame.servertime`, and the CD driver.
- The 32-channel value is on snd_loc.h line 126; that line has tabs, so it is not quoted (the name is quoted on line 127).

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: rule 1 (one engine, two clients); rule 8 (named target and parity row)
