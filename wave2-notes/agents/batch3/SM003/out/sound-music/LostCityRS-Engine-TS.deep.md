# LostCityRS-Engine-TS (sound-music, cell 3)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/cache/midi/Midi.ts` | Licence: MIT (`LICENSE`: "MIT License", "Copyright (c) 2023-2026 Lost City") | TypeScript | symbol `parseMidiLength`, `Midi.load`, `Midi.getLength`

Checked: Confidence high on the MIDI length calculation (`Midi.ts` read in full, 300 lines) and on the server send path for songs, jingles and synth sounds (`Player.ts` 1987-1992, `PlayerOps.ts` 482-486, 851-866). Medium on the wire-width defect (traced from the 16-bit write, not run). The list hint `src/network/game/server/model/MidiJingle.ts` is a 10-line message class (fields `id` and `delay`), so the real mechanism is in `Midi.ts`; that hint is noted as the wrong file. Candidates opened (7): MidiJingle.ts (hint), Midi.ts, Player.ts, PlayerOps.ts, SynthSound.ts, MidiJingleEncoder.ts, Packet.ts (the `p2` write), plus ServerOps.ts 346 and World.ts 298 by grep. Not read: the client (not in this donor; `view/` holds EJS templates only), the compiled cache scripts that choose the song for each area (`data/raw`; a name search for the song and jingle ops found no text hits in `data`), the `OnDemand` cache reader, the Packet encoder beyond the 16-bit write. Searched for ambience beds, crossfades, voice caps and priority in `src`: none in the server; `ambient` hits are cache config flags on NPC, loc, obj and spotanim types, not read as audio. Camera scope: not applicable (sound).

Best transferable idea: take a cue's length from the asset itself, once at load, by integrating its tempo map, so the length a stinger or bed hand-off uses is correct for any tempo change rather than typed in by hand.
Decision (proposed): adapt - take the load-time length calculation (PPQ tempo integration and the SMPTE branch) for stingers and bed hand-offs; keep the value in milliseconds for the client and convert to server ticks only for scripts; widen the jingle field so a long cue is not wrapped (defect D1).
Acceptance: a stinger's length is read from its file at boot, not typed in; a headless test loads a two-track MIDI with a tempo change halfway and asserts the length equals the hand-computed value within 1 ms; a 70-second cue is sent with its real length, not wrapped.

## 1. Mechanism

Load time (`Midi.load`, 263-286, called from `World.ts` 298 at world start):
- For every cached MIDI id, read the bytes, call `parseMidiLength` (280), store the length in ms (286). A failed or empty parse leaves 0 (281-283). The whole cache is parsed once at boot, not per play.
- `parseMidiLength` (44) unwraps a RIFF container if present. It checks the header (`MThd`), reads the format, track count and division, and rejects format above 2 or zero tracks.
- For each track (`MTrk`), it walks the events: a delta time is read as a variable-length value, and the running tick increases by it. Running status is honoured for data bytes. Meta events are read, and the tempo meta event (type 0x51, 3 bytes) is stored with its tick and read order (142-144). End of track (0x2f) ends the track. Sysex is skipped. Channel messages are skipped by byte count.
- The latest tick over all tracks becomes `maxTick` (186).

Length calculation (after the tracks):
- SMPTE timing (division top bit set, 191): frames per second is `0x100 - high byte` (193), ticks per second is frames times ticks per frame, and the length is `maxTick / ticksPerSecond` seconds, rounded to ms (196). Tempo is ignored here, correctly, because SMPTE time is absolute.
- PPQ timing (200): tempo events are sorted by tick, then read order (201). The current tempo starts at 500000 microseconds per quarter, which is 120 bpm (203). For each tempo event, the span from the last event is `delta ticks x current tempo / ppq` microseconds, added to the total, and the tempo changes (208-215). After the last event, the rest of the span to `maxTick` is added the same way (218-220). The total is divided by 1000 and rounded (222).

Lookups:
- `Midi.getLength(id)` returns the stored ms, or 0 (`lengths[id] ?? 0`).
- `Midi.getTickLength(id)` returns `ceil(ms / 600) + 1` (297-298): the length in server ticks, with one tick of margin. It is used by a script op (`ServerOps.ts` 346), so scripts count in ticks.

Sending (`Player.ts`):
- `playSong(id)` writes a `MidiSong` (1987-1988). `playJingle(id)` writes a `MidiJingle` with the cached length in ms (1991-1992). The script ops for each call check `player.lowMemory` first (`PlayerOps.ts` 851 and 862), so a low-memory client never gets a song or jingle.
- The synth sound op writes a `SynthSound` with synth id, loop count and delay (482-486), also skipped for low-memory clients (482).
- The jingle encoder writes the id and the delay as a 16-bit field (`MidiJingleEncoder.ts` 11). The `p2` write is `DataView.setUint16` (`Packet.ts` 308), which keeps the low 16 bits (see D1).

## 2. Key functions

- `parseMidiLength`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/cache/midi/Midi.ts` 44-224 (header, track walk, tempo capture, SMPTE and PPQ length).
- `Midi.load`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/cache/midi/Midi.ts` 263-286.
- `Midi.getTickLength`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/cache/midi/Midi.ts` 297-298.
- Send path: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 1987-1992; `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/script/handlers/PlayerOps.ts` 482-486 and 851-866.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Length from the tempo map: piecewise integration of ticks times tempo over PPQ, plus a fixed-rate branch for SMPTE | Default tempo 500000 us per quarter, 120 bpm (`Midi.ts` 203); the SMPTE rate from the division bytes (193) |
| Cache all lengths once at boot | None (`Midi.load` 263-286) |
| Convert ms to server ticks with one tick of margin | 600 ms per server tick (298); plus one tick (298) |
| Low-memory clients get no music or synth cues | Gate is the `lowMemory` flag (`PlayerOps.ts` 482, 851, 862) |
| Jingle length on the wire | 16-bit field (`MidiJingleEncoder.ts` 11; `Packet.ts` 308): 65535 ms maximum |

Defects, each with its fix:
- D1 (jingle length wraps): `playJingle` sends `Midi.getLength(id)` in ms (`Player.ts` 1992). The field is written by `setUint16` (`Packet.ts` 308), which keeps the value modulo 65536 (the JavaScript rule for that method). A cue longer than 65535 ms (about 65.5 s) is sent as a wrong, smaller number. No clamp exists at the send. Traced, not run. Fix: send a 32-bit field, or clamp and report (the sketch clamps as a stop-gap only).
- D2 (zero is reported as a parse failure): `if (!length)` (281) treats a real zero-length file the same as a failed parse, and prints "Failed to parse". The stored value is 0 either way. Fix: check for `null` (the parser returns null on failure, `number | null`, 44) rather than falsy zero. Minor.
- D3 (dead guard): `if (tempo.tick < lastTick)` (208) cannot be true after the sort at 201, because `lastTick` only moves to a tick already passed. Harmless. Fix: remove it, or keep it as an assert.
- Risk, not confirmed: `maxTick` is the latest event in any track (186), so trailing non-audible controller events after the last note would add length. Not checked against a real cue.

## 4. TypeScript sketch

simplified: the sketch keeps the length calculation (SMPTE branch and PPQ tempo integration over the tempo events, default 120 bpm), the tick conversion, and the 16-bit jingle field. It works on a pre-parsed event list; it omits the binary parse (RIFF, running status, meta and sysex walk) and the cache loader. It fixes D1 only as a stop-gap: clamping at 65535 ms, where the real fix is a 32-bit field. It drops the donor's dead guard (D3) and the zero-length report (D2).

```ts
// Licence: MIT (donor LICENSE). Sketch written from the described mechanism; the donor code may be adapted under MIT.
// clean-room

export interface TempoEvent {
  tick: number;
  microsPerQuarter: number;
  order: number; // read order, breaks ties at the same tick
}

export interface SongTiming {
  maxTick: number;      // latest tick over all tracks
  division: number;     // PPQ, or SMPTE when the top bit is set
  tempos: TempoEvent[]; // tempo events from all tracks
}

export const DEFAULT_TEMPO = 500000; // microseconds per quarter note (120 bpm), the MIDI default
export const SERVER_TICK_MS = 600;   // one server tick
export const MAX_U16 = 0xffff;       // width of the jingle delay field on the wire

// Length in whole milliseconds: fixed rate for SMPTE timing, piecewise tempo integration for PPQ timing.
export function songLengthMs(t: SongTiming): number {
  if ((t.division & 0x8000) !== 0) {
    const framesPerSecond = 0x100 - ((t.division >> 8) & 0xff);
    const ticksPerSecond = framesPerSecond * (t.division & 0xff);
    return ticksPerSecond > 0 ? Math.round((t.maxTick / ticksPerSecond) * 1000) : 0;
  }

  const ppq = t.division || 1;
  const tempos = [...t.tempos].sort((a, b) => a.tick - b.tick || a.order - b.order);

  let current = DEFAULT_TEMPO;
  let last = 0;
  let totalUs = 0;
  for (const te of tempos) {
    totalUs += ((te.tick - last) * current) / ppq;
    current = te.microsPerQuarter;
    last = te.tick;
  }
  if (t.maxTick > last) totalUs += ((t.maxTick - last) * current) / ppq;

  return Math.round(totalUs / 1000);
}

// simplified: the donor's jingle field is a 16-bit write that wraps above 65535 ms. This sketch clamps
// instead, which is a stop-gap: the fix is a 32-bit field, so a long cue keeps its real length.
export function jingleDelayField(ms: number): number {
  return Math.min(MAX_U16, Math.max(0, Math.round(ms)));
}

// Scripts count in server ticks: ceil(ms / 600) + 1, as the donor's getTickLength does.
export function cueTicks(ms: number): number {
  return Math.ceil(ms / SERVER_TICK_MS) + 1;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/SM003-LostCity.ts`).

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (proposed new client module; sound is client-only, so the server only sends the cue id and the client reads the length from the asset). Parity-checklist row 12 (combat sound cues). The stinger length matters for the cue, so row 12 is cited.
- Catalogue note: the asset length belongs in the catalogue as a computed field (rows 20 and 21 are the catalogue rows) if Frankendom keeps a catalogue of cues.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted with the licence notice; this note is clean-room)
- Brief rule served: addendum sound-music fold-in (stingers; ambience and layering not found in the server); rule 7 (licence read); rule 8 (target plus row 12)

## 6. Gaps and risks

- The donor is a server. Playback is client-side and not in the donor, so what the client does with the length (when it resumes the bed, whether it cuts or fades) is not verified.
- Frankendom rulings: the server must not decide what sound plays for presentation; a cue length is data the client reads. The server may send a cue id, and that is all. Kills and hits are server-verified, so a stinger fires on the confirmed event.
- There is no ambience bed, no crossfade, no voice cap and no priority in this donor's server. Those ideas come from other donors (see the FWGS-xash3d-fwgs and FunkinCrew-Funkin notes in this folder).
- Scripts count in 600 ms server ticks while the packet carries ms. Frankendom should keep one unit per field and name it.
- Trailing non-audible events can lengthen the result (section 3, risk). Check one real cue before trusting the length for a hand-off.
- Not read: the client, the per-area song choice in compiled scripts, the `OnDemand` reader, the full Packet encoder.
- D1 to D3 are listed with fixes. D1 is traced, not run.

Reuse tag: rewrite-from-idea (MIT; clean-room)
Brief rule served: addendum sound-music fold-in; rule 7 (licence read); rule 8 (target plus row 12)
