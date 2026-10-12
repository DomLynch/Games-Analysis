# ValveSoftware-source-sdk-2013 (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/c_soundscape.cpp` (with `src/game/server/soundscape.cpp`, `src/game/server/soundscape_system.cpp`, `src/game/shared/interval.cpp`) | Licence: Valve Source 1 SDK LICENSE (`LICENSE` line 1; restricted, clean-room, shape only) | C++ | symbol `C_SoundscapeSystem::UpdateLoopingSounds` and `CEnvSoundscape::UpdateForPlayer`

Checked: Read end to end: client loop fade (c_soundscape.cpp 497-523), client Update (530-552), new-soundscape reset (581-617), loop add and reuse (1098-1195), one-shot scheduler and play (1246-1310), interval parse and random (interval.cpp 21-59), server zone pick (soundscape.cpp 245-300, soundscape_system.cpp 296-362). Not read: the engine's voice limits and priority (not in this SDK; the sound engine is closed code), `ProcessPlayLooping` position handling (722-770, partly), `StartSubSoundscape` dispatch (628-690, partly), the event-sound emit path in `SoundEmitterSystem.cpp` (partly; read at 855-880 only), the debug drawing after soundscape.cpp 300, and `RandomFloat`. camera_scope: n/a. Confidence high on the soundscape crossfade and zone pick (both read in full); medium on the event-sound path (partly read); the voice-limit question is unanswerable from this donor.

## 1. Mechanism

Two halves: the server decides which sound zone each player is in, and the client plays that zone's bed.

- **Zone pick (server).** Each zone is a sphere (`m_flRadius`; -1 means everywhere). A zone can attach to a player only if the player is inside the radius and a line trace from the zone's ear point to the player is clear (soundscape.cpp 266-274). The player's current zone is a holder: it stays set while the zone is enabled, even after the player leaves its radius. Only a disabled zone clears it (251). A challenger takes over only if it is in range, visible, and nearer than the holder (280-291); if the holder is out of range, any in-range visible zone takes over. Per server pass, the loop runs while `playerCount <= maxPlayers` and `traceCount <= maxTraces` (320), with maxPlayers = max clients / 2 (at least 1; 307-309) and maxTraces = 20 (310). Because the tests are `<=`, up to maxPlayers + 1 players and 21 or more traces can be handled, and the starting player rotates each pass (322). The budget is not checked inside a player's list of cluster zones (356), so one player can exceed it.
- **Layers (client).** A soundscape is a list of commands. Each `playlooping` adds one looping layer (722-770). Each `playrandom` adds one one-shot timer (904-950). `playsoundscape` nests another soundscape with its own volume multiplier (1024-1060). Nesting is capped at 8 levels (24, 1031). A nested volume is the parent master volume times a random value from its interval (1042), so volumes multiply down the nest.
- **Crossfade (client).** When the zone changes, every existing loop gets `volumeTarget = 0` (589) and the loop id increments (597). A new loop with the same wave name and pitch as an old one reuses that slot (1113) when it is ambient, so it fades from its current level rather than restarting; a positional loop reuses it only if the position matches within 0.1 (1128). Each frame, each loop's current volume moves toward its target by `frametime / soundscape_fadetime` (499-514), with a default fade time of 3.0 s (42). A loop whose target and current are both zero is stopped and removed (517-519). A positional loop whose position changed is stopped at once, with no fade (1141), which is a defect (section 6).
- **One-shots (client).** Each `playrandom` has a time interval and a list of waves. The first play is at half of a random interval (1240). After each play, the next play is now plus a random interval (1308). The wave is picked uniformly (1250). Volume and pitch are random per play (1276-1278).
- **Interval.** `ReadInterval` parses "min,max" into `start` and `range = max - min` (interval.cpp 38). `RandomInterval` returns `start + RandomFloat(0, range)` (55), so a single number gives a fixed value.
- **Tick.** Client `Update(frametime)` (530) fades loops with the frame time (550), then checks one-shots against `curtime` (551). The server pass `FrameUpdatePostEntityThink` (296) runs once per server frame (call site not read).

## 2. Key functions

- `C_SoundscapeSystem::Update`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/c_soundscape.cpp` 530-552.
- `C_SoundscapeSystem::UpdateLoopingSounds`: same file, 497-523 (the fade step at 503, the approach at 514, the removal at 519).
- `C_SoundscapeSystem::StartNewSoundscape`: same file, 581-617 (old loops to target 0 at 589, id bump at 597).
- `C_SoundscapeSystem::AddLoopingSound`: same file, 1098-1195 (reuse check at 1113, positional stop at 1141, target set at 1184).
- `C_SoundscapeSystem::UpdateRandomSounds` and `PlayRandomSound`: same file, 1246-1310 (first play at 1240, pick at 1250, next play at 1308).
- `ReadInterval` and `RandomInterval`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/shared/interval.cpp` 21-59.
- `CEnvSoundscape::UpdateForPlayer`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/soundscape.cpp` 245-300 (the rest of the function is debug drawing, not read).
- `CSoundscapeSystem::FrameUpdatePostEntityThink`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/soundscape_system.cpp` 296-362.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Zone is a sphere; in range when the distance is under the radius; negative radius means everywhere | Radius per zone (data); -1 = everywhere (theirs, soundscape.cpp 266) |
| A zone only attaches when visible (line trace clear) | Trace from ear point to player; masks are brush and water (theirs, soundscape.cpp 274). Frankendom has no trace; use the zone id from the server instead |
| Holder keeps its zone until a challenger is in range and strictly nearer | Rule, no number (theirs, soundscape.cpp 280) |
| Crossfade time for a bed change | 3.0 s default, a cheat-protected ConVar (theirs, c_soundscape.cpp 42) |
| Fade step is frame time over fade time (frame-rate independent) | Divisor is the fade time (theirs, c_soundscape.cpp 503) |
| An ambient loop reuses its slot when the wave and pitch match (positional loops only if the position is within 0.1) | Match on name and pitch (theirs, c_soundscape.cpp 1113-1128) |
| One-shot first play at half an interval; then a full random interval | 0.5 factor (theirs, c_soundscape.cpp 1240) |
| Interval as "min,max" text | Two-number form in data (theirs, interval.cpp 38); a seen example is "45,90" in soundscapes_streetwar.txt (seen, not receipted) |
| Nesting depth cap | 8 levels (theirs, c_soundscape.cpp 24) |
| Server per-pass trace budget | 20 traces and half the max clients as players, both tested with `<=` so one more than the stated figure can run (theirs, soundscape_system.cpp 307-310, 320) |
| Non-ambient loops start at volume 0.05 | Minimum start so the engine does not cull them (comment at 1166, volume 0.05 at 1178) |

Data counts (grep -c over the four `soundscapes_*.txt` files in `game/mod_hl2mp/scripts/`; a count, not a read of every entry): labs 5 top-level, 18 playlooping, 4 playrandom, 0 playsoundscape; streetwar 39 top-level, 33 playlooping, 29 playrandom, 57 playsoundscape; strike 2 top-level, 3 playlooping, 0 playrandom, 2 playsoundscape. Event sounds: `game_sounds_player.txt` has 28 top-level entries by a grep of lines starting with a quote (the first 10 are `HL2Player.*`, then `Player.*`, `Geiger.*`, `NPC_*`; line 1 is `"HL2Player.SprintNoPower"`); `game_sounds_weapons.txt` has 145 entries, 34 of them with `rndwave` lists.

## 4. TypeScript sketch

simplified: the sketch keeps the zone pick (sphere or everywhere; the holder stays while in range; a challenger must be in range, visible and strictly nearer), the bed crossfade (old loops to zero; matching wave and pitch reuses its slot; step is dt over fade time; removed at zero) and the one-shot schedule (first at half an interval, then a random interval; uniform wave). It omits: positional loops (the donor stops a moved positional loop at once; the sketch fades every loop as ambient, which is the fix), the nested `playsoundscape` chain and its volume multiplication, DSP, the 0.05 start, the line-of-sight trace (replaced by an injected `visible` callback), the server trace budget (sound is client-only in Frankendom), and the immediate-stop cancel path. Order: zone pick, then bed change, then loop fades, then one-shot timers, as in the donor `Update` path with the zone pick moved first.

```ts
// Licence: Valve Source 1 SDK LICENSE (restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Vec3 = { x: number; y: number; z: number };
type Rng = () => number;

// Donor ReadInterval stores start and range (max - min); RandomInterval = start + uniform(0, range).
interface Interval { start: number; range: number }

interface Loop { wave: string; pitch: number; volume: number }
interface OneShotData { time: Interval; volume: Interval; waves: string[] }

// A zone is data: a sphere (radius < 0 = everywhere), a bed of stacked loops, and one-shot schedules.
interface BedData {
  zoneId: number;
  centre: Vec3;
  radius: number;
  loops: Loop[];
  oneShots: OneShotData[];
}

interface Out {
  set(wave: string, pitch: number, volume: number): void;
  stop(wave: string, pitch: number): void;
}

const FADE_S = 3.0; // donor default for soundscape_fadetime (seconds)

function dist(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function randomIn(i: Interval, rnd: Rng): number {
  return i.start + (i.range !== 0 ? rnd() * i.range : 0);
}

function approach(target: number, current: number, step: number): number {
  if (current < target) return Math.min(target, current + step);
  return Math.max(target, current - step);
}

// Zone pick: a zone is "in" when the listener is inside its radius and it is visible.
// The holder (current zone) keeps the slot while in range; a challenger needs to be
// in range and visible, and (if the holder is still in range) strictly nearer than the holder.
interface Pick { zoneId: number | null; distance: number }

function pickZone(cur: Pick, zones: BedData[], listener: Vec3, visible: (z: BedData) => boolean): Pick {
  let next: Pick = { zoneId: cur.zoneId, distance: cur.distance };
  let holderIn = false;
  let holderDist = 0;
  const holder = zones.find(z => z.zoneId === cur.zoneId);
  if (holder) {
    holderDist = dist(holder.centre, listener);
    holderIn = (holder.radius < 0 || holderDist < holder.radius) && visible(holder);
    next = { zoneId: holder.zoneId, distance: holderDist };
  }
  for (const z of zones) {
    if (holder && z.zoneId === holder.zoneId) continue;
    const d = dist(z.centre, listener);
    const inRange = z.radius < 0 || d < z.radius;
    if ((!holderIn || d < holderDist) && inRange && visible(z)) {
      next = { zoneId: z.zoneId, distance: d };
      holderIn = true;
      holderDist = d;
    }
  }
  return next;
}

interface Slot { wave: string; pitch: number; bed: number; current: number; target: number }

// Crossfade: a new bed fades every old loop to 0; a matching wave+pitch from the new bed
// reuses its slot so the level continues from where it was (no restart, no pop).
class BedMixer {
  private slots: Slot[] = [];
  private bed = 0;
  constructor(private fadeS: number = FADE_S) {}

  startBed(loops: Loop[]): void {
    this.bed++;
    for (const s of this.slots) s.target = 0;
    for (const loop of loops) {
      let slot = this.slots.find(s => s.bed !== this.bed && s.wave === loop.wave && s.pitch === loop.pitch);
      if (!slot) {
        slot = { wave: loop.wave, pitch: loop.pitch, bed: this.bed, current: 0, target: loop.volume };
        this.slots.push(slot);
      }
      slot.bed = this.bed;
      slot.target = loop.volume;
    }
  }

  // Frame-rate independent: each level moves toward its target by dt / fadeS per call.
  update(dtS: number, out: Out): void {
    const step = this.fadeS > 0 ? dtS / this.fadeS : dtS;
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const s = this.slots[i];
      if (s.current === s.target) continue;
      s.current = approach(s.target, s.current, step);
      if (s.target === 0 && s.current === 0) {
        out.stop(s.wave, s.pitch);
        this.slots.splice(i, 1);
      } else {
        out.set(s.wave, s.pitch, s.current);
      }
    }
  }
}

// One-shot schedule: first play after half an interval, then a full interval each time.
class OneShot {
  private next: number;
  constructor(private data: OneShotData, now: number, rnd: Rng) {
    this.next = now + 0.5 * randomIn(data.time, rnd);
  }
  tick(now: number, rnd: Rng, play: (wave: string, volume: number) => void): void {
    if (now < this.next) return;
    const wave = this.data.waves[Math.floor(rnd() * this.data.waves.length)];
    play(wave, randomIn(this.data.volume, rnd));
    this.next = now + randomIn(this.data.time, rnd);
  }
}

class SoundscapeClient {
  private cur: Pick = { zoneId: null, distance: 0 };
  private mixer = new BedMixer();
  private oneShots: OneShot[] = [];
  constructor(private zones: BedData[], private rnd: Rng) {}

  // Order: zone pick, then bed change (new one-shots), then loop fades, then one-shot timers.
  update(dtS: number, now: number, listener: Vec3, visible: (z: BedData) => boolean, out: Out, play: (wave: string, volume: number) => void): void {
    const next = pickZone(this.cur, this.zones, listener, visible);
    const changed = next.zoneId !== this.cur.zoneId;
    this.cur = next;
    if (changed) {
      const zone = this.zones.find(z => z.zoneId === next.zoneId);
      this.mixer.startBed(zone ? zone.loops : []);
      this.oneShots = zone ? zone.oneShots.map(o => new OneShot(o, now, this.rnd)) : [];
    }
    this.mixer.update(dtS, out);
    for (const s of this.oneShots) s.tick(now, this.rnd, play);
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/client/audio/soundscape.ts` (new; client-only, since sound is client-only by ruling). The zone id comes from the zone data the server already sends; the client picks the bed. The pick rule (sphere, holder kept while in range, strictly nearer challenger) and the crossfade live here. No trace in the client; visibility is a client-side check against the zone's own geometry if needed.
- Parity-checklist row: 12 (combat sound cues). No row covers zone ambience; the nearest is 12. Zone-bed fields (radius, loops, one-shots, fade time) are zone data. Note: the brief's hint was row 14, which is HUD; sound is row 12.
- Reuse tag: rewrite-from-idea (Valve Source 1 SDK licence is restricted: clean-room, shape only; no line of donor code is translated)
- Brief rule served: 1 (one engine, zones as data); sound is client-only, so the server only carries the zone id.

## 6. Gaps and risks

- Licence: Valve Source 1 SDK. The sketch is written from the mechanism only. Do not copy donor lines.
- Defect 1, positional pop. A positional loop whose position changes is stopped at once (c_soundscape.cpp 1141), with no fade, and the donor comment admits this "gets screwy". Fix: crossfade positional beds the same way as ambient ones (the sketch does this for all loops).
- Defect 2, sticky last bed. The holder is only cleared when the zone is disabled (soundscape.cpp 251), so as far as the lines read (245-300), a player who leaves every zone keeps the last bed. Keep the sticky holder (it stops flicker on borders), but add a default bed with an exit fade after a set time outside all zones. This is a design choice to make in Frankendom; the donor does not show one.
- Defect 3, budget between players, not per trace, and off by one. The server budget is checked between players with `<=` (soundscape_system.cpp 320), not per trace (356), so a pass can run maxPlayers + 1 players and one player can exceed 20 traces. Fix: check the budget per trace if any server-side zone pick is ever kept. Frankendom keeps the pick client-side, so this is a note for later.
- Defect 4, uniform repeats. The wave pick is uniform (c_soundscape.cpp 1250) and can repeat the same wave back to back. Fix: skip the previous wave for a one-shot list of two or more. Not in the sketch.
- Lazy one-shot scheduling (a simple efficiency rule not in the first pass): `UpdateRandomSounds` (c_soundscape.cpp 1290-1315) returns early until `m_nextRandomTime`, the earliest due one-shot, then plays what is due, resets the check time to an hour ahead and recomputes it from all timers. Frankendom's scheduler should wake at the earliest due time, not poll every timer each frame.
- Voice limits and priority are not in the SDK. The sound engine is closed; the donor has no per-channel voice cap and no priority rule. Frankendom must set its own cap as a data field (count per channel). No donor number is available.
- Event sounds: `game_sounds_player.txt` (28 entries) and `game_sounds_weapons.txt` (145 entries) map a named event to channel, volume, soundlevel and wave; the emit path was only partly read (SoundEmitterSystem.cpp 855-880). Hit and spell sounds can use the same named-event table shape, but this donor shows no priority between two events on the same channel.
- Nesting multiplies volume: a `playsoundscape` inside another multiplies the parent volume (1042). A deep nest can become silent. Frankendom should cap the nest depth (8 is the donor cap) and bake the product into the data, not let it stack at runtime.
- Source-engine concepts (SNDLVL attenuation, the channel enum, the trace masks) do not map to Web Audio. The sketch uses a sphere radius in game units only.
- Frankendom's rulings: one engine and zones as data transfer; the server-side trace pick does not (sound is client-only; the server must not choose audio).

Reuse tag: rewrite-from-idea (Valve restricted licence; clean-room only)
Brief rule served: 1 (one engine, zones as data); sound is client-only; the server carries the zone id only

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Event-sound count wrong: game_sounds_player.txt has 28 top-level entries, not 10 (grep of lines starting with a quote). The weapons counts (145, 34 rndwave) hold. Confirmed.
- Server budget: the loop condition at soundscape_system.cpp:320 is playerCount <= maxPlayers and traceCount <= maxTraces, so it handles maxPlayers + 1 players and can reach 21 or more traces. Confirmed.
- Loop reuse: positional loops reuse a slot only when the position matches within 0.1 (1128), else the old sound is stopped at once (1141). Confirmed.
- Missed: lazy one-shot scheduling in UpdateRandomSounds (1290-1315). Confirmed. The 0.05 non-ambient start is at 1166-1178, so "not receipted" is dropped.
- Verified OK by checker: licence header, fade 3.0 s, UpdateLoopingSounds, Update, StartNewSoundscape, AddRandomSound, interval.cpp, recursion cap 8, server UpdateForPlayer, data counts for labs, streetwar, strike.
Fixed 2026-10-12: event-sound counts, server budget wording and table row, loop-reuse rule, 0.05 receipt, lazy scheduling line added. Sketch unchanged.
