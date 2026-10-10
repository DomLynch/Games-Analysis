# CleverRaven-Cataclysm-DDA (status-effects, cell SE003)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/` (data `data/json/effects.json`; engine `src/creature.cpp`, `src/effect.cpp`, `src/effect.h`, `src/character.cpp`) | Licence: CC BY-SA 3.0 (`LICENSE.txt` line 1; README line 64 says free to use under the same). Shape only, clean-room. C++ engine plus JSON data.

Checked: `effects.json` parsed read-only with python3 (432 `effect_type` entries). Read the engine order of operations: `Creature::add_effect` (creature.cpp 1806-1930), `Creature::process_effects` (2137-2185), `effect::decay`, `set_intensity`, `set_duration`, `apply_int_dur_factor` and the loader defaults (effect.cpp 1051-1270, 1535-1611), stun and knockback from hits (creature.cpp 1073-1170), `knock_back_to` and the fall (character.cpp 7975-8070). Five data entries read in full (stunned, downed, winded, staggered, bleed) plus the stacking entries (frenzy, dazed, paralyzepoison, onfire). Confidence: high on the stacking, intensity and decay rules (61 receipts across both notes verified). The sidebar and render code and the `effects_on_condition` scripts were not read. Earlier audit and catalogue read first: AU010 (`/private/tmp/p2/wave2-haiku/batch3/AU010/CleverRaven-Cataclysm-DDA.assets.md`), DC012 (`.../DC012/CleverRaven-Cataclysm-DDA.catalogue.md`).

Verdict: STRONG. Best transferable idea: make a status's severity a function of its remaining time (bleed: level = remaining turns / 60, capped at 40), so one number drives both the word the player reads and the damage they take.
Decision: adapt (idea), with two defects fixed in the sketch.

## 1. What the player sees and feels

A status is a named line in the status list with a word that changes as the level rises. Bleeding walks up 40 steps: from a "Minor Bleeding" word, through plain "Bleeding" and "Bad Bleeding", up to "Heavy Arterial Bleeding" at the top. A paralysing poison walks 20 steps from "Slowed" through "Sluggish" and "Partially Paralyzed" to "Totally Paralyzed". Each step is a new word, so the player reads how bad it is from the text, not from a bar. Stun is one flat status: the movement is randomised and the balance score drops. Being knocked down is a status that blocks movement until the character gets up.

At 375 wide this reads as a list of short words with a number. Nothing is drawn in the donor half read; the reading is the whole signal.

## 2. Why it works (criteria)

- Readable at 375 wide: yes, one short word per level, which changes at a fixed step.
- One signature behaviour: bleed level is set by remaining time (`int_dur_factor: 60`). Time and severity are the same number.
- One signature sound or effect: not in the half read (the donor's sound and render data were not read).
- Could be made ours at 20-30% resemblance: yes. Keep the time-as-severity link and the word ladder. Change the names, the body parts and the damage.

## 3. The rule behind it

Three ways a status gets its level (`effect_type` JSON fields, read in the engine):

1. From duration (bleed): level = ceil(duration / `int_dur_factor`), clamped to [1, max]. Bleed: 60 turns per level, max 40 levels, max duration 2400 turns. The engine re-derives the level each time the duration changes (`apply_int_dur_factor`, effect.cpp 1269).
2. Stepped on re-apply (frenzy: `int_add_val` 1, cap 5; paralyzepoison: +1, cap 20; dazed: +2, cap 10). The step is added to the current level (creature.cpp 1878).
3. Explicit: the caller passes a level, which overwrites the current one (creature.cpp 1875). This branch is used only when no duration rule is set.

Re-apply order (creature.cpp 1869-1878): (a) extend the duration by `dur * dur_add_perc / 100` (default 100); (b) apply the level rule above; (c) clamp. A new instance starts with the duration and level the caller passes (the `effect` constructor was not read).

Per turn (creature.cpp 2163-2170), for each effect in order: (a) decay (effect.cpp 1051-1075: intensity steps by `int_decay_step`, default -1, once every `int_decay_tick` turns, only while duration is below max; duration drops by 1; removed at 0); (b) the kill roll (`kill_roll`), which can end the character.

Level floor: a decay step to 0 is held at 1 unless the effect sets `int_decay_remove` (effect.cpp 1241). Only 3 entries set that flag, so most decaying effects sit at level 1 until their duration ends.

Stun and knockdown from hits (all turn-based):
- Tangle hit on a person: downed 1 turn plus stunned rng(3, 8) turns (creature.cpp 1076-1078).
- Beanbag (base strength 4; large beanbag 16): stun turns = rng(s/2, s), with s multiplied by target size: tiny x4, small x2, medium x1, large /2, huge /4 (creature.cpp 1140-1169).
- Thrown into a monster: the monster is stunned 1 turn; a strong thrower can chain-knock it (character.cpp 8025-8034).
- Thrown into a wall: 3 damage and stunned 2 turns (character.cpp 8066).
- Fall: downed rng(1, 1 + mod x 3) turns, applied with chance `mod` (character.cpp 7986).

Numbers that look like data (not donor values, see licence note below):

Data fields for our side (names, units, donor value null because the content is CC BY-SA and the code is clean-room):

| name | unit | donor_value_or_null |
|---|---|---|
| level_rule | enum: fromDuration, stepped, explicit | null |
| secondsPerLevel | seconds of duration per level | null |
| maxDuration | seconds | null |
| maxLevel | levels | null |
| addPerHit | levels per re-apply | null |
| decayEvery | seconds between decay steps (0 = none) | null |
| decayStep | levels per decay step (negative) | null |
| decayRemove | bool, level may reach 0 and end | null |
| durAddPercent | percent of the new duration added on re-apply | null |
| stun_size_multiplier | ratio per size class (tiny, small, medium, large, huge) | null |

## 4. For Frankendom

- 700 zones as data: all status definitions live in one table (432 types in the donor). A zone changes a number by data, not code. One runtime, one table.
- 100 Pit characters reuse the same status rows. A creature differs by its resist list and its level caps, not by its own code.
- Many-vs-one: with at most three attackers, stepped add on each hit gives a level up to three steps per window. Keep the cap, so a swarm cannot exceed `maxLevel`.
- Server-verified: the add, the tick and the kill are engine steps. The client gets `{id, level, duration}` in the event and shows the word and the bar. The client never computes the level.
- Keep: the time-as-severity link (bleed), the word ladder, decay before the death check (creature.cpp 2163 then 2170).
- Change, defect 1: decay phase is set by the global turn clock (`to_turn<int>( time ) % int_decay_tick == 0`, effect.cpp 1056). So the first decay can come anywhere from one turn to a full tick after applying, depending only on where the global clock is when the effect is applied. Fix: count from each instance's own last decay (`sinceDecay` in the sketch).
- Change, defect 2: the level floor is implicit (set to 1 unless `int_decay_remove`), so a decaying effect can sit at level 1 for its whole duration with no visible end. Fix: make the end explicit in the data (`decayRemove`), and show the floor in the word ladder.
- Not to port: the donor's item-destroying effects belong to inventory rules we do not have. Our one-ledger rule means no status destroys items.

## 5. Lands in

- TARGET `src/fight/status-effects.ts` (new module, engine status step). Parity-checklist row 1 (duel step/sim). Re-apply, per-turn tick and kill check all run in the duel step on the server.
- Reuse tag: rewrite-from-idea (CC BY-SA content; clean-room sketch only)
- Brief rule served: 1 (one engine: the status step is in the engine, the client only presents the word and the bar)

Typechecked sketch (strict tsc, run on the VPS):

simplified: omits the per-body-part keying, the kill roll and death message, the resist lists, and the decay message tables. It keeps the donor order: extend or create, then the level rule, then per-second decay, then the duration end. Seconds replace turns. Decay counts from each instance's own last step (donor: global clock).

```ts
// clean-room sketch, written from the described mechanism (donor is CC BY-SA 3.0; no donor values kept)
export {};

type Level =
  | { kind: "fromDuration"; secondsPerLevel: number }
  | { kind: "stepped"; addPerHit: number };

interface EffectType {
  id: string;
  maxDuration: number;   // seconds
  maxLevel: number;
  level: Level;
  decayEvery: number;    // seconds between decay steps; 0 = never
  decayStep: number;     // negative: levels lost per decay step
  decayRemove: boolean;  // true = level may reach 0 and the effect vanishes
}

interface Active {
  type: EffectType;
  duration: number;      // seconds left
  level: number;
  sinceDecay: number;    // seconds since THIS instance last decayed
}

function clampLevel(t: EffectType, v: number): number {
  return Math.min(t.maxLevel, Math.max(0, v));
}

function levelFromDuration(t: EffectType, duration: number): number {
  if (t.level.kind !== "fromDuration") return 1;
  return clampLevel(t, Math.max(1, Math.ceil(duration / t.level.secondsPerLevel)));
}

// Re-apply: extend the duration (capped), then move the level by the type's rule.
function apply(active: Map<string, Active>, t: EffectType, addSeconds: number): void {
  const cur = active.get(t.id);
  if (cur === undefined) {
    const duration = Math.min(addSeconds, t.maxDuration);
    const level = t.level.kind === "fromDuration" ? levelFromDuration(t, duration) : 1;
    active.set(t.id, { type: t, duration, level, sinceDecay: 0 });
    return;
  }
  cur.duration = Math.min(t.maxDuration, cur.duration + addSeconds);
  if (t.level.kind === "fromDuration") {
    cur.level = levelFromDuration(t, cur.duration);
  } else {
    cur.level = clampLevel(t, cur.level + t.level.addPerHit);
  }
}

// One second of game time. Returns false when the effect has been removed.
function tick(active: Map<string, Active>, id: string): boolean {
  const a = active.get(id);
  if (a === undefined) return false;
  a.duration -= 1;
  a.sinceDecay += 1;
  if (a.type.level.kind === "fromDuration") {
    a.level = levelFromDuration(a.type, a.duration);
  } else if (
    a.type.decayEvery > 0 &&
    a.sinceDecay >= a.type.decayEvery &&
    a.duration < a.type.maxDuration
  ) {
    a.sinceDecay = 0;
    a.level += a.type.decayStep;
    if (a.level <= 0) {
      if (a.type.decayRemove) {
        active.delete(id);
        return false;
      }
      a.level = 1;
    }
  }
  if (a.duration <= 0) {
    active.delete(id);
    return false;
  }
  return true;
}

// simplified: omits the per-body-part keying, the kill roll and death message, resist lists, and the
// decay-message tables. It keeps the donor order: extend or create, then the level rule, then per-second decay,
// then duration end. Seconds replace turns. Decay counts from each instance's own last step (donor: global clock).
const bleedType: EffectType = {
  id: "bleed-sketch",
  maxDuration: 40,
  maxLevel: 40,
  level: { kind: "fromDuration", secondsPerLevel: 1 },
  decayEvery: 0,
  decayStep: 0,
  decayRemove: true,
};
const paralyseType: EffectType = {
  id: "slow-sketch",
  maxDuration: 300,
  maxLevel: 20,
  level: { kind: "stepped", addPerHit: 1 },
  decayEvery: 60,
  decayStep: -1,
  decayRemove: false,
};

const board = new Map<string, Active>();
apply(board, bleedType, 12);
apply(board, paralyseType, 30);
apply(board, paralyseType, 30);
tick(board, "bleed-sketch");
tick(board, "slow-sketch");
```

Look test (Dom, phone, 375 wide, about 5 minutes): one duel against a single brute, three quick hits to make the bleed climb, then one wall push. Build a style flag on the existing duel scene: `?statusLevel=time|hits`. `time` makes the word and the damage follow remaining time (the donor's rule). `hits` steps the level on each hit only. Watch the status line in a 20-second clip. Compare: does the word tell the story (time) or the hit count (hits)? Publish the flag to the preview folder with no release rows and no lock (look-test skill).

## 6. Licence, IP and gaps

- Licence: CC BY-SA 3.0 (`LICENSE.txt` line 1; README line 64 calls the code and content free to use under the same). Share-alike content: clean-room, shape only, no donor values in our data (all `donor_value_or_null` are null). No legal conclusions.
- Names: the donor's word ladders (the 40 bleed names, the 20 paralysis names) are described by pattern only. Our words are new.
- Not read: the sidebar, render and colour code (the rating colours are not described); `effects_on_condition/` scripts; `Creature::resists_effect` and `is_immune_effect` bodies; the `kill_roll` chance tables (JSON key read only through the count); the other effect entries beyond the counts and the nine read in full (stunned, downed, winded, staggered, bleed, frenzy, dazed, paralyzepoison, onfire); the message files for the 40 bleed descriptions (counted, not quoted).
- Half read: data and engine (both). The donor is single-player, so there is no server half to compare. The render half was not read.
- Gaps against our rulings: no fear status in the half read (`spooked` and `spooked_recent` are monster AI tags, per their own descriptions); knockdown is `downed`. Walk density, idle behaviour, death and loot reveal are not in this topic and were not read.

Counts (read-only JSON parse of `effects.json`, unless a receipt is given):
- `effect_type` entries: 432.
- With `max_intensity` above 1: 124 of 432.
- Rated: 226 (bad 163, good 54, neutral 7, mixed 2).
- With `int_dur_factor`: 40. With `int_add_val`: 19. With `int_decay_tick`: 9. With explicit `max_duration`: 96. With `chance_kill`: 2.
- With `int_decay_remove`: 3.

Receipts: `/private/tmp/p2/wave2-haiku/batch3/SE003/receipts.tsv` (verified with `verify_receipts.py`, 61 of 61 pass across both notes).

Reuse tag: rewrite-from-idea (CC BY-SA 3.0; clean-room only)
Brief rule served: 1 (one engine; status step on the server, presentation on the client)
