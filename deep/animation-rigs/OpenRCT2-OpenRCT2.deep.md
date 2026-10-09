# OpenRCT2-OpenRCT2 (animation-rigs, cell 3)

Donor: /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/peep/PeepAnimations.cpp | Licence: GPL-3.0 (per PeepAnimations.cpp header and licence.txt) | C++ | symbol getAnimationsByPeepType / availableGuestAnimations

## 1. Mechanism
- Donor: OpenRCT2 peep (guest and staff) animation sets. The code does not drive a skeleton; it chooses which animation clip name a peep plays for a named action, and which costume set to load.
- Tables (27-100): one static EnumMap per peep type (guest, handyman, mechanic, security, entertainer), each mapping a script-name string (walking, wave, sittingIdle, and so on) to a PeepAnimationType enum value. The guest table has 26 entries (27-55); handyman 8, mechanic 11, security 4, entertainer 6. The map holds names and enum ids only; the actual frames live in the loaded PeepAnimationsObject (not read).
- getAnimationsByPeepType (102-118) switches on the type; guest, handyman, mechanic and security return their own table, and entertainer or any other value returns the entertainer table. getAnimationPeepType (120-134) separately maps a StaffType to a peep type with the same entertainer default.
- findRandomPeepAnimationsIndexForType (196-212) picks one loaded animation object of a type: it first gets the indexes with the random-only filter, retries unfiltered if that is empty, returns the null index if still empty, and otherwise takes one sample with a std::mt19937 seeded from std::random_device.
- findAllPeepAnimationsIndexesForType (160-176) scans the 255 object slots (kMaxPeepAnimationsObjects = 255 in ObjectLimits.h:37), keeps slots whose loaded object matches the type, and with randomOnly set skips objects whose ShouldExcludeFromRandomPlacement is true.
- The callers that choose a set per peep, and the PeepAnimationsObject class, were not read here; the table and pick functions are the mechanism. The rest of the file (getAnimationGroupsByPeepType 214-246, getAvailableCostumeStrings 248-281, inferMaxAnimationDimensions 284-377: costume list and sprite bounds for the UI) is not used by the sketch.

## 2. Key functions
- getAnimationsByPeepType | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/peep/PeepAnimations.cpp | 102-118 | returns the action table for a peep type; entertainer is the default branch.
- availableGuestAnimations (table) | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/peep/PeepAnimations.cpp | 27-55 | the guest script-name to enum map (26 entries).
- findRandomPeepAnimationsIndexForType | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/peep/PeepAnimations.cpp | 196-212 | random pick of a loaded set of the type, with a retry without the exclusion flag.
- findPeepAnimationsIndexForType | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/peep/PeepAnimations.cpp | 136-146 | first loaded set of a type.
- findAllPeepAnimationsIndexesForType | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/peep/PeepAnimations.cpp | 160-176 | all loaded sets of a type, optionally minus the random-excluded ones.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Per-type action table: one table per actor class, unknown class falls back to a default | Five peep types, entertainer as the default branch (theirs) |
| Random pick from loaded sets, excluding flagged sets, retry without the flag if empty | Set count bound kMaxPeepAnimationsObjects (theirs) |
| Action key map as data | Script names such as wow, throwUp, sittingLookAroundLeft (theirs, 27-55) |

## 4. TypeScript sketch
simplified: omits the 255-slot object scan and null-index sentinel, the staff-type to peep-type map, and the unseeded std::sample pick (the sketch takes an injected rand). The donor maps names to an enum id; the sketch maps names to Frankendom clip names, which is our data, not theirs.

```ts
// Licence: GPL-3.0 | clean-room: written from the mechanism, no donor lines.
// Actor animation as data: each actor class maps action keys to clip names. Unknown classes fall back to a default.
// A costume set is picked at random from the loaded sets of a class, skipping sets marked as excluded;
// if that leaves none, the exclusion is dropped; if none at all, the result is null.
type ActorClass = "guest" | "handyman" | "entertainer";
interface AnimSet { id: number; cls: ActorClass; excludeFromRandom: boolean; }

const CLIPS: Record<ActorClass, Record<string, string>> = {
  guest: { walking: "walking", wave: "wave", sittingIdle: "sittingIdle" },   // illustrative subset of the donor names
  handyman: { walking: "walking", watchRide: "watchRide", staffSweep: "staffSweep" },
  entertainer: { walking: "walking", wave2: "wave2" },
};

function clipFor(cls: string, action: string): string | undefined {
  const table = (CLIPS as Record<string, Record<string, string>>)[cls] ?? CLIPS.entertainer;
  return table[action];
}

function randomSet(sets: AnimSet[], cls: ActorClass, rand: () => number): AnimSet | null {
  const ofClass = sets.filter(s => s.cls === cls);
  let pool = ofClass.filter(s => !s.excludeFromRandom);
  if (pool.length === 0) pool = ofClass;     // retry without the exclusion
  if (pool.length === 0) return null;
  return pool[Math.floor(rand() * pool.length)];
}
```

## 5. Lands in
- Frankendom file: origins/preview/mob-clips.ts (creature clips, own copy today); origins/npcs/row.ts for NPC data.
- Parity-checklist row: 7 (creature actor and clips, origins own copy; K3 creatures). The clip-name table itself is row 21 data (catalogue fields).
- Also usable: zone-schema rule (every property a data field with a default; action table is data).
- Reuse tag: rewrite-from-idea (GPL-3.0; mechanism only).
- Brief rule served: zone-schema rule (every property is a data field with a default); rules 7-9 n/a

## 6. Gaps and risks
- Peeps have no combat clips and no hit reactions in this file. Frankendom's hit and death clips are in the fight engine and are not covered here.
- Selection is random without a seed. Frankendom needs seeded picks if an encounter must replay the same way.
- The donor has no skeleton, bone, IK or blending; those are rows 6 and 7 and are covered by the other animation donors.
- The donor's exclude flag is a placement rule, not a runtime rule. Frankendom must not use it to hide a creature's kit.
- GPL-3.0: mechanism only. The clip table values are the donor's; do not copy them.
