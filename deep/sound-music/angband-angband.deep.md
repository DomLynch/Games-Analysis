# angband-angband (sound-music, cell 15)

Donor: /mnt/frankendom-donors/angband-angband/src/sound-core.c | Licence: GPL-2.0-only or the Angband licence (dual, per the source header; the Angband licence allows copying for educational, research and non-profit purposes only); clean-room only | C | symbol play_sound

## 1. Mechanism
- A thin event-to-sound dispatcher. A game event carries a message type. The dispatcher looks up the list of sounds registered for that message type, picks one at random, loads it on first use, and asks the platform to play it.
- Inputs: a message type from the event data, and a per-message sound list (filled at load time). Output: one platform play call, or nothing.
- Steps: if no platform play hook is set, do nothing. If the message type has no sounds, return. Pick a random index in the list (`randint0`). Look up the sound id. If the sound's status is still unknown, load it (the load routine sets the status to error only just before it hands an existing file to the platform hook, so a file the platform rejects stays at error and is never retried; if no file with a supported extension exists, or the load hooks are missing, the status stays unknown and the load is tried and logged again on the next play). Only if the status is loaded, call the platform hook with the sound (lines 313-333). Each message holds at most `MAX_SOUNDS_PER_MESSAGE - 1` sounds (line 245).
- No priority, no channel limit, no volume and no duration. Those are the platform's job.
- Runs on each `EVENT_SOUND` game event, in the event handler registered by `init_sound` (383). Not on a tick.

## 2. Key functions
- play_sound (angband) | /mnt/frankendom-donors/angband-angband/src/sound-core.c | 309-334 | dispatches one message event to one random sound through the platform hook.
- event_add_handler registration (angband) | /mnt/frankendom-donors/angband-angband/src/sound-core.c | 383 | hooks play_sound to the EVENT_SOUND event.
- load_sound (angband) | /mnt/frankendom-donors/angband-angband/src/sound-core.c | 127-169 | tries each platform file type for the sound's file until the platform hook loads it. Called lazily from play_sound, or at registration when preload_sounds is set (registration path 237-238). It sets the status to error before each hook attempt, and only for a file that exists (154-160); it logs a failure at 166-167. With no existing file the status stays unknown.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Event type to a list of variants, one picked at random per event | Per-message sound lists (theirs, data) |
| Lazy load on first play | Load-status check: unknown / error / loaded (lines 327-331) (theirs) |
| Platform play behind a hook, so the core stays portable | Hook name play_sound_hook (theirs) |

## 4. TypeScript sketch
simplified: the donor's per-file-type loop in `load_sound` (path build, one try per supported extension) and the per-message list cap are folded into `load()`; the platform hook receives the sound record, not an id; the sketch's `load()` always ends in loaded or error, where the donor leaves the status unknown when no file exists (so it retries on the next play).

```ts
// Licence: GPL-2 or Angband licence (angband-angband). CLEAN-ROOM: from the mechanism description; no donor lines.
type SoundId = number;
type Status = 'unknown' | 'error' | 'loaded';
interface SoundSlot { status: Status; load: () => void; } // load() sets status to 'loaded' or 'error'
interface GameMessage { type: number; }

// Dispatch one game message to one randomly chosen sound through the platform hook.
function playEvent(msg: GameMessage, lists: Map<number, SoundId[]>, slots: SoundSlot[],
                   play: ((id: SoundId) => void) | null, rnd: () => number): void {
  if (!play) return;                       // no platform hook: nothing to do
  const list = lists.get(msg.type);
  if (!list || list.length === 0) return;  // no sound registered for this message
  const id = list[Math.floor(rnd() * list.length)];
  const slot = slots[id];
  if (slot.status === 'unknown') slot.load();   // lazy load once; an 'error' slot is not retried
  if (slot.status === 'loaded') play(id);       // only play what actually loaded
}

// Boot-time preload: the donor's own preload_sounds option does this at registration.
function preloadAll(slots: SoundSlot[]): void {
  for (const s of slots) if (s.status === 'unknown') s.load();
}
```

## 5. Lands in
- Frankendom file(s): TARGET `src/fight/sound.ts` (cue table: event type to a list of variants, picked at random, lazy or preloaded).
- Parity-checklist row: 12 (combat sound cues).
- Reuse tag: rewrite-from-idea (GPL-2 / non-profit Angband licence, so the mechanism only; the pattern is trivial)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- No priority, no polyphony limit, no spatial audio. Frankendom's combat cues need those in its own layer (row 12).
- The variant pick is `randint0` (line 320), which looks like the game's general RNG (definition not read). In Frankendom the cue pick must use a separate cosmetic RNG so it never shifts the fight sim or the record (rows 1, 19); cues never reach the server.
- Load on first use can stutter on web; the donor offers `preload_sounds` (set by `set_preloaded_sounds`, 345-351) for that. Frankendom preloads the cue set at boot, with the cue table as zone-independent data.
- Licence is GPL-2 or the non-profit Angband licence: the sketch is clean-room only.
