# ioquake-ioq3 (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/ioquake-ioq3/code/client/snd_dma.c` (`S_Base_StartSoundEx` 527-656, `S_SpatializeOrigin` 424-474, `S_AddLoopSounds` 871-942, `S_Base_Respatialize` 1122-1162, `S_UpdateBackgroundTrack` 1431-1498, `S_FreeOldestSound` 1507-1535) | Licence: GNU GPL version 2 "or (at your option) any later version" per the file header (`code/client/snd_dma.c:8-10`; `COPYING.txt` is GPL v2, June 1991); copyleft, clean-room shape only | C | symbol `S_Base_StartSoundEx`

Checked: `S_Base_StartSoundEx` read in full (527-656); channel pool `S_ChannelFree`/`S_ChannelMalloc` (183-198) read; `S_SpatializeOrigin` (424-474) read in full; `S_Base_AddLoopingSound`, `S_Base_AddRealLoopingSound`, `S_Base_ClearLoopingSounds` (738-870) read; `S_AddLoopSounds` (871-942) read in full; `S_Base_Respatialize` (1122-1162) and `S_Base_Update` (1207-1237) read; `S_StartBackgroundTrack` and `S_UpdateBackgroundTrack` (1380-1498) read; `S_FreeOldestSound` (1507-1535) read. Hint file `code/q3_ui/ui_sound.c` read: it is the sound options menu (`UI_SoundOptionsMenu_*`, 101-450), not the mechanism. Confidence: high on the start path, the steal order and the loop merge; high on spatialize; medium on what calls `S_ClearLoopingSounds` each frame (the cgame syscall is at `code/client/cl_cgame.c:509`, but the per-frame call site in the cgame VM was not read). Not read: the mixer `S_Update_` body (1293-1366) beyond its call site, `S_GetSoundtime`, the stream codec, `S_Base_RawSamples` body (979-1106), and the value of `MAX_CHANNELS` beyond `snd_local.h:191`. Constants `SOUND_FULLVOLUME` 80 and `SOUND_ATTENUATE` 0.0008 are cited from `snd_dma.c:50` and `:52`; their defines are tab-separated, so no receipt could be written for the values.

Best transferable idea: a fixed channel pool with a per-source cap, a 50 ms double-start guard, and a steal order that takes the oldest channel of the same source first and never the player's own channel; loops are declared each frame and merged per sound.
Decision (proposed): adapt - keep the cap, the double-start guard, the steal order and the per-frame loop merge for hit and spell cues and crowd loops; fix the donor's listener fallback so the player's own cue is never stolen; keep the linear pan only as a starting point.
Acceptance: a client unit test on `ChannelPool`: ten goblin hit cues in one second never put more than 4 copies of the same clip on one source at once; a repeat inside 50 ms is refused; a new cue refused rather than stealing the player's own channel.

## 1. Mechanism

- Channel pool: a fixed array of `MAX_CHANNELS` (96, `snd_local.h:191`), with a free list (`S_ChannelFree` 183, `S_ChannelMalloc` 189-198). `S_ChannelMalloc` returns NULL when the free list is empty; it does not wait or prioritise.
- Start path, in order (`S_Base_StartSoundEx`, 527):
  1. Refuse if the sound system is off (534) or the handle is out of range (542). Load the sample if it is not in memory (549-551).
  2. Per-source cap: `allowed` = 4, or 8 when the source is the listener (562-565). Count the channels already playing the same sound from the same entity (574-584).
  3. Double-start guard: if one of those channels started less than 50 ms ago (`time - ch->allocTime < 50`, 576), the whole call returns (580). This is checked before the cap.
  4. If the count is over the cap, return (586-587). Only now stamp `sfx->lastTimeUsed = time` (590).
  5. Take a free channel (592). If none, steal, in three stages: (a) the oldest channel of the same entity, not the listener's and not `CHAN_ANNOUNCER` (596-603); (b) the oldest channel of any entity with the same two exclusions (604-611); (c) only if channel 0 belongs to the listener (614), the oldest of all channels (613-621). If still nothing, drop the sound (622-625).
  6. Fill the channel: origin (fixed or entity), master 127, entchannel, `fullVolume` when the sound is heard through the entity (632-647).
- Spatialize (`S_SpatializeOrigin`, 424): distance is measured from the listener, minus a full-volume radius (435-440), times `SOUND_ATTENUATE` (441). The source vector is rotated into listener axes (443) and the side term is `dot = -vec[1]` (445). Right gain is `0.5 * (1 + dot)` (454) and left gain `0.5 * (1 - dot)` (455), both clamped at 0. Each volume is `master * (1 - dist) * gain` clamped at 0 (465-473). Mono output skips the pan (447-451).
- Loops: `S_Base_AddLoopingSound` (768-821) stores the origin and sets `kill = qtrue` (793) and `framenum = cls.framecount` (820). So a 3D loop is live only in the frame it was declared. `S_Base_AddRealLoopingSound` (from 831) sets `kill = qfalse`, so it lives until `S_Base_StopLoopingSound` (738). `S_Base_ClearLoopingSounds` (750-765) stops loops with `kill` set or with length 0.
- Loop pass (`S_AddLoopSounds`, 871): every entity with an active loop is spatialized with master 127 when `kill` is set and 90 otherwise (891-894). All other active loops with the same sound (non-doppler) are spatialized and their volumes added (898-914). The group takes one loop channel (920-937), clamped to 255 per side (922-927). Silent groups are skipped (915-917). The pass ends at `MAX_CHANNELS` loop channels (938-940). This runs from the listener update (`S_Base_Respatialize` calls `S_AddLoopSounds` at 1159).
- Listener update (`S_Base_Respatialize`, 1122): it stores the listener's number, origin and axes (1131-1135), re-spatializes every dynamic channel (1139-1154; full-volume channels are set to master, 1144-1146), then rebuilds the loop channels (1159).
- Mix update (`S_Base_Update`, 1207): background track first (1234), then the mixer (1237).
- Background music (`S_Base_StartBackgroundTrack`, 1406): the intro file is opened (1423); the loop name is stored (1421). `S_UpdateBackgroundTrack` (1431) reads the stream into the same raw timeline as effects (1478-1479). When the stream returns no data, it reopens the loop file (1486) and does not reset `s_rawend` (the comment at 1381 says so). Music volume 0 skips reading (1443-1444).
- Sample memory: `S_FreeOldestSound` (1507) frees the in-memory sample with the oldest `lastTimeUsed` (1517-1519).

## 2. Key functions

- `S_Base_StartSoundEx`: `/mnt/frankendom-donors/ioquake-ioq3/code/client/snd_dma.c` 527-656. Refuse, cap, steal, fill.
- `S_SpatializeOrigin`: `/mnt/frankendom-donors/ioquake-ioq3/code/client/snd_dma.c` 424-474. Attenuation and linear pan.
- `S_AddLoopSounds`: `/mnt/frankendom-donors/ioquake-ioq3/code/client/snd_dma.c` 871-942. Per-sound merge.
- `S_Base_AddLoopingSound` and `S_Base_AddRealLoopingSound`: `/mnt/frankendom-donors/ioquake-ioq3/code/client/snd_dma.c` 768-858. Per-frame and persistent loops.
- `S_Base_Respatialize` and `S_Base_Update`: `/mnt/frankendom-donors/ioquake-ioq3/code/client/snd_dma.c` 1122-1162 and 1207-1237. Per-update re-pan and merge.
- `S_UpdateBackgroundTrack`: `/mnt/frankendom-donors/ioquake-ioq3/code/client/snd_dma.c` 1431-1498. Intro-to-loop switch on one timeline.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed channel pool with a free list | `MAX_CHANNELS` 96 (`snd_local.h:191`) |
| Per-source cap on copies of one sound | 4 per source, 8 for the listener (`snd_dma.c:562-565`) |
| Double-start guard | 50 ms (`snd_dma.c:576`) |
| Steal the oldest of the same source first, never the listener's or the announcer's | Stage order (`snd_dma.c:596-621`) |
| Attenuation after a full-volume radius | `SOUND_FULLVOLUME` 80 (`snd_dma.c:50`), `SOUND_ATTENUATE` 0.0008 (`:52`) |
| Linear left and right gains from the side term | Gain `0.5 * (1 +/- dot)` (`snd_dma.c:454-455`) |
| Loop masters | 127 for 3D loops, 90 for sphere loops (`snd_dma.c:891-893`) |
| Loop merge clamp | 255 per side (`snd_dma.c:922-927`) |
| Doppler scale cap | `MAX_DOPPLER_SCALE` 50 (`snd_local.h:78`) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's start order (double-start guard, then cap, then free channel, then steal in the donor's order, then refuse), the per-source cap of 4 (the caller passes 8 for the listener), the attenuation and the linear gains, and the per-frame loop merge with the clamp of 255. It changes the steal: the sketch never takes the listener's or the announcer's channel, and it refuses the sound when nothing else can be taken, where the donor's last fallback (`snd_dma.c:613-621`) can take the listener's channel when channel 0 is the listener's. It omits the sample loading, the stamp of `lastTimeUsed`, the `fullVolume` path, the doppler scale, the entity-origin lookup (the caller passes the origin), the mono branch and the donor's separate per-sound merge bookkeeping. The side-axis sign is this sketch's own convention (the donor uses `-vec[1]` in listener axes, `snd_dma.c:445`, which was not re-derived).

```ts
// Donor licence: GPL-2.0-or-later (per snd_dma.c header: "either version 2 of the License, or (at your option) any later version"). Clean-room sketch of the shape of the mechanism, not a translation of the donor lines.
// clean-room
export interface Vec2 { x: number; y: number; }
export interface Listener { id: number; pos: Vec2; facing: number; } // facing in radians

export interface Channel {
  sound: string | null;   // null = free
  entity: number;
  allocMs: number;
  announcer: boolean;
}

export class ChannelPool {
  readonly ch: Channel[];

  constructor(size: number, private readonly listenerId: number) {
    this.ch = Array.from({ length: size }, () => ({ sound: null, entity: -1, allocMs: 0, announcer: false }));
  }

  // Returns the channel index, or -1 when the sound is refused.
  // capPerSource: how many copies of one sound one source may have in play (donor: 4, or 8 for the listener).
  start(sound: string, entity: number, now: number, capPerSource: number, announcer = false): number {
    let inPlay = 0;
    for (const c of this.ch) {
      if (c.sound === sound && c.entity === entity) {
        if (now - c.allocMs < 50) return -1; // double start of the same sound from the same source
        inPlay++;
      }
    }
    if (inPlay > capPerSource) return -1;

    let idx = this.ch.findIndex((c) => c.sound === null);
    if (idx < 0) {
      idx = this.steal(entity, now);
      if (idx < 0) return -1;
    }
    this.ch[idx] = { sound, entity, allocMs: now, announcer };
    return idx;
  }

  // Donor order: the oldest channel of the same source first, then the oldest of any source.
  // Fix: the player's own channels and announcer channels are never stolen. The donor's last
  // fallback can take the listener's channel, gated on channel 0 belonging to the listener.
  private steal(entity: number, now: number): number {
    let best = -1;
    let oldest = now;
    for (let i = 0; i < this.ch.length; i++) {
      const c = this.ch[i];
      if (c.entity === this.listenerId || c.announcer) continue;
      if (c.entity === entity && c.allocMs < oldest) {
        oldest = c.allocMs;
        best = i;
      }
    }
    if (best >= 0) return best;

    oldest = now;
    for (let i = 0; i < this.ch.length; i++) {
      const c = this.ch[i];
      if (c.entity === this.listenerId || c.announcer) continue;
      if (c.allocMs < oldest) {
        oldest = c.allocMs;
        best = i;
      }
    }
    return best; // -1: refuse the sound
  }
}

// Left and right gains from the side term; attenuation starts after a full-volume radius.
// simplified: the donor's left and right gain formulas are reproduced in shape; the sign of the side axis is this sketch's convention.
export function spatialize(origin: Vec2, l: Listener, master: number, fullRadius = 80, attenuate = 0.0008): { left: number; right: number } {
  const dx = origin.x - l.pos.x;
  const dy = origin.y - l.pos.y;
  const dist = Math.hypot(dx, dy);
  const falloff = Math.max(0, dist - fullRadius) * attenuate;

  const right = dx * Math.sin(l.facing) - dy * Math.cos(l.facing);
  const side = dist > 0 ? right / dist : 0;
  const rGain = Math.max(0, 0.5 * (1 + side));
  const lGain = Math.max(0, 0.5 * (1 - side));
  const scale = Math.max(0, 1 - falloff);

  return { left: Math.round(master * scale * lGain), right: Math.round(master * scale * rGain) };
}

export interface Loop {
  sound: string;
  origin: Vec2;
  kill: boolean;   // true: re-declared each frame (3D loop); false: stays until stopped
  frame: number;   // frame it was last declared
}

// Loops declared this frame are summed per sound into one voice, clamped at 255.
export function mergeLoops(loops: Loop[], l: Listener, frame: number): Map<string, { left: number; right: number }> {
  const out = new Map<string, { left: number; right: number }>();
  for (const loop of loops) {
    if (loop.frame !== frame) continue;
    const master = loop.kill ? 127 : 90;
    const g = spatialize(loop.origin, l, master);
    const cur = out.get(loop.sound) ?? { left: 0, right: 0 };
    cur.left = Math.min(255, cur.left + g.left);
    cur.right = Math.min(255, cur.right + g.right);
    out.set(loop.sound, cur);
  }
  for (const [sound, v] of out) {
    if (v.left === 0 && v.right === 0) out.delete(sound);
  }
  return out;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/sm016-ioq3-channels.ts`) exits 0.

## 5. Lands in

- TARGET `src/fight/cues.ts` for the channel pool, the per-source cap, the double-start guard and the steal order (hit and spell cues). The loop merge and the pan are client audio, so they live in a client module, not named here.
- Parity-checklist row 12 (combat sound cues). The list hint pointed at `ui_sound.c`, which is the options menu, so the mechanism was found in `client/snd_dma.c` instead. No row covers music or ambience beds.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine decides which cues exist; the client chooses and mixes the sound); rules 7-9 n/a

## 6. Gaps and risks

- Copyleft (GPL-2.0-or-later): clean-room only. The sketch has no donor line.
- Defect D1, listener fallback: the last steal stage (`snd_dma.c:613-621`) takes the oldest channel of any source, including the listener's, but is gated only on channel 0 belonging to the listener (614). So the player's own hit cue can be stolen by a remote sound. Fix: refuse instead of stealing the player's own channel (the sketch does).
- Defect D2, linear sum in loop merge: loops of one sound add linearly and clamp at 255 (`snd_dma.c:912`, 922-927), so a crowd of one sound saturates and loses its dynamic range. Fix (adapt): sum powers and take the square root, or take the maximum, then clamp. Not in the sketch.
- Defect D3, linear pan: the gains are linear in the side term (454-455), so the centre is loud and the sides are quieter by a fixed rule. The donor shows no listening test. Fix (adapt): equal-power gains. Not in the sketch.
- Frankendom rule: channels, caps and loop merge are client-only. The engine decides which cues exist; no channel count or steal decides a hit or a kill. With MAX_ATTACKERS = 3 the cap of 4 can only bind if one source has more than four copies of one sound in play; how often that happens in play was not measured.
- Loop lifecycle: a 3D loop lives only while it is re-declared each frame (`kill`, 793; `framenum`, 820). A real loop lives until stopped (56, 738). The cgame call site that clears loops each frame was not read, so the per-frame timing is an assumption.
- Music: intro-to-loop is seamless because the raw timeline is shared (1449 and 1381), but there is no crossfade and no fade-out. Adapt: a gain ramp over a zone-data time.
- Not read: the mixer body (`S_Update_`), the codec streams, `S_Base_RawSamples` (979-1106), and the cgame per-frame loop call. Claims about them are cut.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine; clients choose the sound); rules 7-9 n/a
