# openmw (character-creation-appearance, cell 31)

Donor: `/mnt/frankendom-donors/openmw/apps/openmw/mwgui/race.cpp` (chargen part lists and face/hair cycling); `/mnt/frankendom-donors/openmw/apps/openmw/mwclass/npc.cpp` (race scale); also `apps/openmw/mwphysics/actor.cpp`, `apps/openmw/mwmechanics/character.cpp`, `apps/openmw/mwrender/npcanimation.cpp`, `components/esm3/loadrace.hpp` | Licence: GPL-3.0 (LICENSE line 2: "Version 3, 29 June 2007") | C++ | symbol `RaceDialog::getBodyParts`, `Npc::adjustScale`

Checked: Read race.cpp 250-300 and 322-370 (part filter, face and hair cycling, preview record), npc.cpp 1082-1116 (adjustScale), physics actor.cpp 244-262 and scene.cpp 340-347 (the callers of the rendering and collision scale), npcanimation.cpp 460-545 (head, hair and skeleton lookup, read in part), actorutil.cpp 8-35, character.cpp 1960-1990 and 2495-2506 (speed), windowbase.cpp 18-30 (wrap), charactercreation.cpp 395-405 (name) and 520-600 (class quiz, read but not written up). Grep-level only (the matched line and its neighbours, not the whole block): loadrace.hpp 57, loadrace.cpp 206, loadbody.hpp 46-47, settings-default.cfg 331. Callers of `adjustScale` checked: npc.cpp (definition), physics actor.cpp 255 and 260, scene.cpp 346 (updateObjectScale), spellcasting.cpp 483 (not read beyond the call). Not read: the BodyPart record loader, the full RaceDialog preview widget, and how `NpcAnimation` removes or replaces parts on a rebuild beyond updateNpcBase. Confidence: high on the chargen filter, the scale split and the speed factor; medium on completeness of the body-part flow (the render path was read only as far as updateNpcBase). Not a camera note.

## 1. Mechanism

- A body family is a race record plus a gender. The race record holds four numbers: male and female weight and height (loadrace.hpp 57; defaults 1 at loadrace.cpp 206).
- Chargen builds a list of heads and a list of hairs for the chosen race and gender. The filter is: skin type, not not-playable (race.cpp 331), gender flag equals the chosen sex (race.cpp 337), not first-person-only, and race equals the chosen race (race.cpp 341). Lists are filled in store order. Changing gender refills both lists and resets both indices to 0 (race.cpp 346-352).
- The face and hair indices step through their list with `wrap` (race.cpp 282 for the face; hair is the same pattern at 294). `wrap` returns 0 when a forward step runs past the end (windowbase.cpp 27-28). The preview record takes `mAvailableHeads[mFaceIndex]` and `mAvailableHairs[mHairIndex]` (race.cpp 364, 367).
- In the world, `NpcAnimation::updateNpcBase` reads the NPC's head and hair ids and looks each up in the body-part store (npcanimation.cpp 476, 481, 490). A werewolf form overrides both ids (476-477). A missing id logs a warning and leaves the slot empty (npcanimation.cpp 485, 494).
- The base skeleton is chosen by gender, beast flag and werewolf flag (actorutil.cpp 8-20; the female base is line 17, the male base line 19). Beast is read from the race flags (npcanimation.cpp 502). So gender and beast pick a skeleton file; the NPC's head and hair ids pick meshes; the race ratios change scale only.
- Scale is one function, `Npc::adjustScale(ptr, scale, rendering)`. Order of steps:
  (a) if `rendering` is false, return at once (npc.cpp 1084-1085). So collision never sees the race body. The donor comment gives the reason: "having the same collision extents for all races" (npc.cpp 1086).
  (b) if the ptr is the player in first person, multiply the uniform scale by height only (npc.cpp 1094-1101).
  (c) otherwise multiply x and y by the race weight and z by the race height, for the chosen gender (npc.cpp 1104-1116; male x at 1106, male z at 1108, female x at 1112, female z at 1114).
- Physics calls it twice (physics actor.cpp 255-261): once with `rendering=false` for `mHalfExtents`, and once with `rendering=true` for `mRenderingHalfExtents`. The scene node is scaled the same way (scene.cpp 346), from `Actor::updateScale` (actor.cpp 244-247), which physicssystem.cpp 525 calls (caller context not read).
- Speed: `CharacterController::update` starts from the cell scale (character.cpp 1982). If the setting "normalise race speed" is off (default false, settings-default.cfg 331), it multiplies by the race weight for the chosen gender (character.cpp 1984, 1988-1989). The horizontal movement vector is then multiplied by that scale (character.cpp 2503-2504).
- Tick: none of its own. The scale is applied through `scaleObject` when the first-person or third-person view changes (npcanimation.cpp 305-306, "apply race height after view change"). Per-frame refresh of the physics extents goes through `Actor::updateScale` (actor.cpp 244-247); its per-frame caller was not read.

## 2. Key functions

- `RaceDialog::getBodyParts(int part, std::vector<ESM::RefId>& out)`: `/mnt/frankendom-donors/openmw/apps/openmw/mwgui/race.cpp` 324-344. The filter for one body-part list.
- `RaceDialog::recountParts()`: `/mnt/frankendom-donors/openmw/apps/openmw/mwgui/race.cpp` 346-353. Rebuilds both lists and resets both indices.
- `RaceDialog::updatePreview()`: `/mnt/frankendom-donors/openmw/apps/openmw/mwgui/race.cpp` 361-367 (only the lines receipted: head line 364, hair line 367).
- `Npc::adjustScale`: `/mnt/frankendom-donors/openmw/apps/openmw/mwclass/npc.cpp` 1082-1116. The three-step order above.
- `Actor::updateScaleUnsafe`: `/mnt/frankendom-donors/openmw/apps/openmw/mwphysics/actor.cpp` 250-262. Collision extents (cell scale only) and rendering extents (race scale).
- `NpcAnimation::updateNpcBase`: `/mnt/frankendom-donors/openmw/apps/openmw/mwrender/npcanimation.cpp` 460-530 (read through the skeleton choice; the rest of the function was not read).
- `CharacterController::update`, race weight in speed: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/character.cpp` 1984-1989 and 2503-2504.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Body family = race x gender; a shared base skeleton picked by gender and beast flag | Base skeleton file names (actorutil.cpp 17, 19: `mBaseanimfemale`, `mBaseanim`) |
| Per-body head and hair lists filtered by race, sex flag, playable, not first-person | Sex flag value `BPF_Female = 1` (loadbody.hpp 46); not-playable flag `BPF_NotPlayable = 2` (loadbody.hpp 47) |
| Index cycles through the filtered list; forward past the end returns 0 | Wrap as written (windowbase.cpp 27-28); backward step not read |
| Render scale: width ratio on x and y, height ratio on z, per gender | Ratios are data on each race record, default 1 (loadrace.hpp 57; loadrace.cpp 206) |
| Collision uses the cell scale only, so hit extents do not depend on body | Rule, not a number (npc.cpp 1084-1085) |
| Movement factor includes the width ratio unless a setting turns it off | Setting default false (settings-default.cfg 331) |
| Class from 10 answers: one bucket above 7 gives one class (aside, not part of appearance) | Threshold 7 of 10 (charactercreation.cpp 543, 549); answers mapped to Combat, Magic or Stealth (530) |

Quantities: the donor has no sliders. A body is one of a fixed list of body-part records, and the only continuous numbers are the four race ratios per race (weight and height, male and female).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the scale function (collision first and unscaled, then first-person height only, then width and height for the render). It omits the skeleton file choice, the werewolf and beast overrides, the vampire head, the first-person player case for movement, and the donor's rebuild on view change. The backward step of the index is not read in the donor; the sketch uses modular arithmetic for both directions. The donor's list is in store order and the sketch keeps the same order. The speed factor is written as the donor writes it (weight times cell scale), without the later speed multiplier at character.cpp 2407.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Gender = "male" | "female";
type Part = "head" | "hair";

interface BodyPartRec {
  id: string;
  race: string;
  part: Part;
  female: boolean;          // sex flag on the record
  playable: boolean;
  firstPersonOnly: boolean;
}

// Race record: weight scales width (x, y); height scales z. Both per gender, default 1.
interface RaceRec {
  id: string;
  weight: Record<Gender, number>;
  height: Record<Gender, number>;
}

// Chargen list: the parts a race and gender may pick, in data order.
function partsFor(store: BodyPartRec[], race: string, gender: Gender, part: Part): string[] {
  const wantFemale = gender === "female";
  return store
    .filter(b => b.playable && !b.firstPersonOnly && b.part === part && b.race === race && b.female === wantFemale)
    .map(b => b.id);
}

// Index step over a list. Forward past the end returns 0.
function step(index: number, count: number, delta: number): number {
  if (count === 0) return 0;
  return (((index + delta) % count) + count) % count;
}

interface Scale3 { x: number; y: number; z: number; }

// Render scale for a body. Collision is never scaled by race, so every body has the same hit extents.
function scaleFor(race: RaceRec, gender: Gender, cell: number, phase: "collision" | "render", firstPersonPlayer: boolean): Scale3 {
  if (phase === "collision") return { x: cell, y: cell, z: cell };
  if (firstPersonPlayer) {
    const h = cell * race.height[gender];
    return { x: h, y: h, z: h };
  }
  return { x: cell * race.weight[gender], y: cell * race.weight[gender], z: cell * race.height[gender] };
}

// Horizontal movement factor. Race weight is included unless the normalise setting is on (donor default: off).
function moveFactor(race: RaceRec, gender: Gender, cell: number, normaliseRaceSpeed: boolean): number {
  return normaliseRaceSpeed ? cell : cell * race.weight[gender];
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS at /tmp/ch001-openmw-body-family.ts exited 0.

## 5. Lands in

- TARGET `origins/catalogue/body-family.ts` (proposed, new file): the catalogue rows for race and gender, the head and hair lists, and the render-only scale. Collision and movement stay in the sim (`src/fight/` is not changed by the scale).
- Parity-checklist row 21 (catalogue fields). The lead hint said row 3; row 3 is guard, parry and stamina, which this mechanism does not touch, so row 21 is used. The render side of the scale belongs under row 6 (hero actor) when the hero body is built; that is a note for the implementer, not a second row.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine: the scale is a client render value and the duel sim gets no race numbers except where a ruling says so); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- Speed by weight changes the sim. In the donor the setting defaults to false (settings-default.cfg 331), so the weight multiplies horizontal speed and heavier races move faster. For Frankendom, a duel's movement speed is a server-verified input. Do not copy the speed factor into the fight step; if it is wanted, make it a catalogue flag with default off.
- Collision is cell scale only (npc.cpp 1084-1086; actor.cpp 255-257). This is the right rule for us: a heavy body and a light body must have the same hit spacing in the duel. Keep it as a test: two bodies with different ratios give identical hit extents.
- The donor silently leaves a slot empty when a head or hair id is missing (npcanimation.cpp 485, 494 log a warning). Frankendom should reject a catalogue row with a missing id at load time, not render a headless body.
- The head and hair lists are filtered by race and sex only; there is no per-zone or per-encounter list. A zone or event that needs a different look must be a catalogue row, not a donor-style override.
- The donor has no scars or wounds in chargen (a word search for "scar" as a whole word in apps and components returned no hits) and no name validation: the typed name is stored as entered (charactercreation.cpp 402-403). Frankendom's name rules must be added on our side.
- The schema here allows only "zone data" or "engine constant" for data fields. The race ratios are catalogue data, not zone data; they are marked "zone data" in the sidecar only to fit the schema, and the catalogue should be a third option.
- The class-from-answers quiz (charactercreation.cpp 530-549) is a separate idea on the class-free start topic. It is not written up here. The idea: ten answers, each tagged with one of three buckets, and one class only when a bucket has more than 7 of 10 (charactercreation.cpp 543, 549); otherwise a lookup table.
- Not read: the BodyPart loader, the full preview widget, and the complete `updateNpcBase` rebuild.

Best transferable idea: a body family is a race-and-gender record that holds two ratios (weight and height), with render-only scale and collision left at the cell scale, so every body fights on identical hit geometry.
Decision (proposed): adapt - keep the shape (race x gender ratios, head and hair lists filtered by race and sex, render-only scale) and drop the race weight from movement speed, because a duel's speed is server-verified and must not vary by body unless a ruling says so.
Acceptance: a heavy and a light body of the same race stand on the same rig with the same hit extents, and a server test asserts that two bodies with different ratios give identical hit extents and identical movement speed.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one engine: collision and movement stay in the sim, body scale is a client render value); rules 7-9 n/a
