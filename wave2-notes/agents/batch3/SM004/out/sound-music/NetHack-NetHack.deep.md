# NetHack-NetHack (sound-music, cell 2)

Donor: `/mnt/frankendom-donors/NetHack-NetHack/src/sounds.c` | Licence: NetHack General Public License (NGPL; file `dat/license`, first line "NETHACK GENERAL PUBLIC LICENSE"; GPL-family, treated as copyleft: clean-room shape only) | C | symbol `dosounds`

Checked: The hint file `doc/sound.txt` (625 lines) is the soundlib plug-in interface spec: it lists the four trigger types and function-pointer signatures, with no mechanism. The real mechanism is `dosounds()` in `src/sounds.c` 202-339, read in full, with its predicates (`mon_in_room` 19-26, `throne_mon_sound` 29-58, `beehive_mon_sound` 61-86, `morgue_mon_sound` 88-112, `zoo_mon_sound` 114-128, `temple_priest_sound` 130-178, `oracle_sound` 180-199) and the iterator `get_iter_mons` (`src/mon.c` 4552-4565). The caller is `src/allmain.c` 353, after the "once-per-turn things go here" comment at 267 (the enclosing block's closing brace was not read). Candidates opened: sounds.c, mon.c, allmain.c, sndprocs.h (the `Soundeffect` macro, lines 213-226, read only), doc/sound.txt, dat/license. Not read: `gd_sound`, `search_special`, `tended_shop`, `noisy_shop` and the vault and shop side effects; where the level feature flags (`svl.level.flags.*`) are set. Not found: music, crossfade, voice limits, hit or spell sounds. Searched `src/` and `include/` for `dosounds` and `get_iter_mons` callers. Confidence: high on the scheduler order and the rolls (read from code, not run); the hint file was not the mechanism. Camera scope: not applicable (sound).

## 1. Mechanism

- Once per game turn, `dosounds()` runs (allmain.c 353). It returns at once when the hero is deaf, acoustics are off, engulfed, or underwater (sounds.c 208-209). A hallucinating hero gets an alternate line set: `hallu` is 1 (211), and it offsets every message index.
- The rolls are sequential, in a fixed order. Each feature rolls only if the level has its flag set (`svl.level.flags.*`), so an absent feature costs no roll.
- Non-exclusive features: fountain (1 in 400, 213-219) and sink (1 in 300, 220-225). Each plays a line and falls through, so both can play on the same turn, and later features still roll.
- Exclusive features, tried in this order: court (1 in 200, 226-229), swamp (1 in 200, 230-237), vault (1 in 200, 238-277), beehive (1 in 200, 278-281), morgue (1 in 200, 282-285), barracks (1 in 200, 286-308), zoo (1 in 200, 309-312), shop (1 in 200, 313-329), temple (1 in 200, 330-334), oracle level (1 in 400, 335-338). The first one that plays ends the turn (a `return`).
- Witness rule for the predicate features (court, beehive, morgue, zoo, temple, oracle): `get_iter_mons` walks the living monsters on the level (mon.c 4557-4563) and stops at the first one whose predicate returns TRUE. A predicate checks the monster's state and its room (for example, court: asleep, a lord or a prince, not an animal, in a COURT room; sounds.c 32-34; beehive: a flying ant in a BEEHIVE room, 61-86; temple: an active priest of that temple while the hero is outside it, 130-178; oracle: the Oracle, and the line is played only when she is not visible, 180-199, but the tick ends either way). The transferable rule: do not play an ambient cue when its source is in view. If no monster qualifies, the function returns FALSE, the roll does not end the turn, and the scan continues to the next feature (for example, 227-228 fall through when the walk finds nothing).
- Swamp, vault and shop have no monster witness. Swamp plays its line and returns. Vault looks for the vault room; if none exists it clears the flag and returns (240-243). Shop plays a line only when the shop is tended and the hero is not in it (319-327), and returns either way (328), so a successful shop roll always ends the tick. The sketch models this by treating shop as a no-witness exclusive feature.
- Barracks: a sleeping mercenary in a BARRACKS room, or the sixth awake one, plays the line and returns (301-305).
- Messages are only text lines: the same `You_hear` output, with a `Soundeffect(...)` call in some branches that a sound library may use (for example, court lines at 45 and 47; `Soundeffect` is a no-op when the sound library is absent, `include/sndprocs.h` 213-226, read only).

## 2. Key functions

- `dosounds` 202-339: the scheduler (gate, rolls in order, exclusive returns).
- `get_iter_mons` (`src/mon.c` 4553-4565): iterate living monsters, stop at the first TRUE predicate, return that monster.
- `throne_mon_sound` 29-58 (court), `zoo_mon_sound` 114-128, `temple_priest_sound` 130-178, `beehive_mon_sound` 61-86, `morgue_mon_sound` 88-112, `oracle_sound` 180-199: the witness predicates. Each returns TRUE when its monster matches. Most also play a line then, but `oracle_sound` returns TRUE for any Oracle monster even when she is clearly visible and nothing is played (180-199), so the tick is consumed silently.
- `mon_in_room` 19-26: the room-type test for a monster.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Per-tick rare roll per present feature | fountain 1/400 (sounds.c:213); sink 1/300 (:220); court, swamp, vault, beehive, morgue, barracks, zoo, shop, temple 1/200 (:226, 230, 238, 278, 282, 286, 309, 313, 330); oracle 1/400 (:335) |
| Gate before any roll | deaf, acoustics, engulfed, underwater (:208) |
| Priority by return order | court > swamp > vault > beehive > morgue > barracks > zoo > shop > temple > oracle (source order, 226-338); fountain and sink never return |
| Witness must exist, roll then does not spend the tick (not shop, which needs none and always returns; not a visible Oracle, which returns TRUE silently) | predicate walk (mon.c:4561); a predicate that finds no one lets the scan continue |
| Altered-state line set | `hallu` 0 or 1 (:211); line index offset by `hallu` (for example :218, :235) |
| Line choice | `rn2(3) + hallu` or `rn2(2) + hallu` (for example :41, :218, :235) |
| Tick unit | one game turn (allmain.c:245 advances the turn counter; dosounds at :353 runs in the same pass; exact block not read) |

No cooldown: a feature can repeat on the next turn (the roll is independent each turn).

## 4. TypeScript sketch

simplified: the sketch keeps the gate, the fixed order, the per-feature roll that is skipped when the zone lacks the feature, the exclusive first-cue return, and the witness rule (a missed witness does not end the tick; shop is the exception, it needs no witness and always ends the tick after a successful roll). An oracle witness whose line is suppressed because she is visible still ends the tick in the donor; the sketch plays the cue, so the caller should set `eligible` false for a visible source and accept the small difference. It returns a list of cues instead of printing. It reorders nothing. It omits the donor's side effects (the shop message and `noisy_shop`, the vault gold and searching lines, the vault flag clear, the barracks head count, which the caller computes as `eligible`, the temple exclusion on astral and sanctum levels, and the `Soundeffect` hooks). Line strings are placeholders, not donor text.

```ts
// Licence: NGPL (NetHack General Public License, GPL family: treated as copyleft). Clean-room shape only: written from the described steps. No donor text is used; the LINE strings are placeholders.
export type Feature =
  | 'fountain' | 'sink' | 'court' | 'swamp' | 'vault' | 'beehive'
  | 'morgue' | 'barracks' | 'zoo' | 'shop' | 'temple' | 'oracle';

// Order is priority: features are tried in this order, and the first exclusive cue to fire ends the tick.
const ORDER: readonly Feature[] = [
  'fountain', 'sink', 'court', 'swamp', 'vault', 'beehive',
  'morgue', 'barracks', 'zoo', 'shop', 'temple', 'oracle',
];

const EXCLUSIVE: ReadonlySet<Feature> = new Set<Feature>([
  'court', 'swamp', 'vault', 'beehive', 'morgue', 'barracks', 'zoo', 'shop', 'temple', 'oracle',
]);

// These need a creature (a witness) in the zone before they can speak. Fountain, sink, swamp, vault and shop need none
// (donor: shop has no monster witness; after a successful roll it always ends the tick. The caller leaves 'shop' out of
// `present` when the shop is untended or the hero is inside it, which the donor checks before it plays the line).
const NEEDS_WITNESS: ReadonlySet<Feature> = new Set<Feature>([
  'court', 'beehive', 'morgue', 'barracks', 'zoo', 'temple', 'oracle',
]);

// Chance per fixed tick, by feature. Zone data may override each one.
export const DEFAULT_CHANCE: Record<Feature, number> = {
  fountain: 1 / 400, sink: 1 / 300, court: 1 / 200, swamp: 1 / 200, vault: 1 / 200, beehive: 1 / 200,
  morgue: 1 / 200, barracks: 1 / 200, zoo: 1 / 200, shop: 1 / 200, temple: 1 / 200, oracle: 1 / 400,
};

// Placeholder lines only. Normal and altered (for example, stunned or blinded) sets.
const LINE: Record<Feature, { normal: string; altered: string }> = {
  fountain: { normal: '[fountain line A]', altered: '[fountain line B]' },
  sink: { normal: '[sink line A]', altered: '[sink line B]' },
  court: { normal: '[court line A]', altered: '[court line B]' },
  swamp: { normal: '[swamp line A]', altered: '[swamp line B]' },
  vault: { normal: '[vault line A]', altered: '[vault line B]' },
  beehive: { normal: '[beehive line A]', altered: '[beehive line B]' },
  morgue: { normal: '[morgue line A]', altered: '[morgue line B]' },
  barracks: { normal: '[barracks line A]', altered: '[barracks line B]' },
  zoo: { normal: '[zoo line A]', altered: '[zoo line B]' },
  shop: { normal: '[shop line A]', altered: '[shop line B]' },
  temple: { normal: '[temple line A]', altered: '[temple line B]' },
  oracle: { normal: '[oracle line A]', altered: '[oracle line B]' },
};

export interface Witness {
  feature: Feature;   // the feature the creature stands in
  eligible: boolean;  // computed by the caller (court: asleep, lord or prince, not an animal; beehive: flying ant; temple: active priest and hero outside the temple; and so on)
}

export interface TickInput {
  rng: () => number;                          // returns a value in [0, 1)
  muted: boolean;                             // cues switched off, or the listener cannot hear
  altered: boolean;                           // use the altered line set
  witnesses: readonly Witness[];              // creatures currently in the zone
  chance?: Partial<Record<Feature, number>>;  // zone data override
}

export interface AmbientCue { feature: Feature; line: string; }

// One fixed tick. `present` is the zone's feature set (zone data).
export function ambientTick(present: ReadonlySet<Feature>, input: TickInput): AmbientCue[] {
  if (input.muted) return [];                 // gate first: no roll is spent
  const out: AmbientCue[] = [];
  for (const f of ORDER) {
    if (!present.has(f)) continue;            // no roll for a feature the zone does not have
    const p = input.chance?.[f] ?? DEFAULT_CHANCE[f];
    if (input.rng() >= p) continue;           // roll failed
    if (NEEDS_WITNESS.has(f) && !input.witnesses.some((w) => w.feature === f && w.eligible)) continue; // no witness: the roll does not end the tick
    out.push({ feature: f, line: input.altered ? LINE[f].altered : LINE[f].normal });
    if (EXCLUSIVE.has(f)) break;              // first exclusive cue ends the tick
  }
  return out;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {};` appended: exit 0.

## 5. Lands in

- TARGET `origins/zones/ambience.ts` (new, client-only: the cue is a line in the message log or a bed, and the engine never reads it). Zone features come from zone data; the chances can be overridden per zone.
- Parity-checklist row 14 (HUD): the donor's cue is a message-log line. A bed or sound version would also touch row 12 (combat sound cues); this note uses row 14 because the donor output is text.
- Reuse tag: rewrite-from-idea (NGPL, copyleft: clean-room only; the sketch is written from the mechanism)
- Brief rule served: 1 (one engine: ambience reads zone data and creature state; it never changes an outcome, and kills stay server-verified); licence rule: NGPL, clean-room only.

## 6. Gaps and risks

- Not in this donor: music, crossfades, layered beds, stingers, voice limits, hit or spell sounds. The "ambience per biome" idea is closest to per-room features (court, zoo, temple) with per-turn rare rolls, not biome beds with border crossfades.
- Hint file: `doc/sound.txt` is the soundlib plug-in interface (trigger types and function pointers). It gives no mechanism, so it was read for the interface shape only.
- No cooldown: the same feature can speak on consecutive turns. Frankendom needs a per-feature cooldown for audio beds (a data field), or the bed will loop audibly.
- Witness predicates walk every monster on the level each time a predicate feature's roll succeeds (mon.c 4557-4563). Frankendom has a per-tick NPC budget rule, so the witness set must come from a cached zone list, not from a full walk each tick.
- Level feature flags are set at level creation (not read: where). Frankendom equivalent: zone data declares the feature set; without it the scheduler is silent.
- Ticks are game turns here. Frankendom needs a fixed-step tick (one second is a sketch assumption); the rates above then mean about 400 s for a 1/400 feature at 1 Hz. Acceptance below pins this.
- Hallucination maps to an altered line set. Frankendom's altered states (stun, blindness, a curse) would need the same switch, as data, not a hard-coded flag.
- Licence NGPL: no line-by-line translation. The sketch uses only the order, rolls and witness rule.

Best transferable idea: a per-tick ambient director that rolls each zone feature at its own rarity, lets only the first exclusive feature that finds a witness speak, and does not spend the tick when no witness is there.

Decision (proposed): adapt - keep the per-feature rolls, the fixed order and the witness rule, add a per-feature cooldown the donor lacks, and use cached zone witnesses instead of a full monster walk.
Acceptance: At a fixed 1 Hz tick, a seeded test of 100,000 ticks in a zone with one fountain and one temple (no eligible priest in the witness list) gives about one fountain line per 400 ticks (within 10%) and no temple line, and never more than one exclusive line in a tick.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: MINOR
- Section 2 said each witness predicate returns TRUE only when it plays a line; false for `oracle_sound` (returns TRUE for any Oracle, silent when she is visible). Confirmed.
- Sketch treated shop as needing a witness and not ending the tick on a miss; donor shop has no witness and always returns after a successful roll (313-329). Confirmed; sketch fixed.
- Throne predicate omitted `is_prince` (32-34 is lord OR prince, not animal). Confirmed; text fixed.
- Missed: temple needs an active priest and the hero outside the temple; the Oracle line is suppressed when she is visible but the tick is consumed; beehive needs a flying ant (S_ANT and flyer), not any sleeping monster. Transferable rule: do not play an ambient cue when its source is in view. Added to section 1.

Fixed 2026-10-12: predicate-returns claim, shop witness in sketch and text, prince in court predicate, missed predicate conditions. Sketch changed; work file updated; typecheck below.
