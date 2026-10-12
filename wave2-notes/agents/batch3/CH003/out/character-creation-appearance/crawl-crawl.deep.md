# crawl-crawl (character-creation-appearance, cell 3)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/tiledoll.cc` (with `tilemcache.cc`, `tilereg-doll.cc`, `hash.cc`, `newgame.cc`) | Licence: GNU GPL version 2 (LICENSE lines 6-7 "either version 2 of the License", header "Version 2, June 1991"; the LICENSE also says some pieces carry other GPL-compatible licences, not checked per file) | C++ | symbol `create_random_doll` (tiledoll.cc:240)

Checked: Read in full: `create_random_doll` (tiledoll.cc 240-260), `_get_random_doll_part` (227-231), the ghost doll layer fill (tilemcache.cc 1546-1558), `hash_with_seed` (hash.cc 57-62), `newgame_random_name` (newgame.cc 557-568) and the name buffer (572). Read in part: `fill_doll_for_newgame` (tiledoll.cc 962-990) and `fill_doll_equipment` (313-330, first lines only), `tilep_race_default` (tilepick-p.cc 607-620, first lines only), `_job_allowed` and `_char_defined` (newgame.cc 136-145). Not read: the tile atlas that defines `tile_player_part_start` and `tile_player_part_count` (defined outside the files I opened), the `TILEP_PART_*` enum, `job_allowed` (species.cc), `make_name` (item-name.cc), the rest of `tilep_race_default`. Searched by grep for `create_random_doll(`, `hash_with_seed(`, `MAX_NAME_LENGTH`, and scar/face terms (none found in the doll code I searched). Depth thin. Confidence high on the roll order, the chances and the seeded pick; medium on how the full doll is assembled.

## 1. Mechanism

- A paper doll is a set of layers. Each layer is one tile index, taken as `tile_player_part_start[p] + random2(tile_player_part_count[p])` (tiledoll.cc 227-231). The layer list the code rolls is: body, hand1, leg, boots, hair, cloak, arm, hand2, helm, beard.
- Random roll (`create_random_doll`, 240-260), in this order: body, hand1, leg, boots and hair are always rolled (243-247); cloak, arm, hand2 and helm are each a coin flip (250-257); beard is one in four (259). The function takes no species argument, so the same global part ranges apply to every species (this is what the code shows; whether a visible mismatch results was not checked).
- Who calls it: the doll editor only. The randomise key in the doll editor (tilereg-doll.cc 408-409) calls `create_random_doll` on the current doll. The name screen does not roll a doll; it shows the doll built from the species, the job and the starting kit (`fill_doll_for_newgame`, tiledoll.cc 962-990, and the call in `_choose_name`).
- Seeded look for NPCs and ghosts (tilemcache.cc 1546-1558). The seed is a hash of the monster's name XOR a hash of a data word (1546-1547). The species and job defaults are applied first. Then for each layer from cloak upward (1553) that is still unset (1555), the layer is `tile_player_part_start[p] + hash_with_seed(tile_player_part_count[p], seed, p)` (1557-1558). Same name, same look.
- `hash_with_seed` (hash.cc 57-62): returns 0 for a count below 2 (60), otherwise a hash of (seed, id) modulo the count (62).
- Names. `newgame_random_name` (557-568) calls `make_name()` up to 100 times (559, 561) and keeps the first name for which no save file exists (563), otherwise returns an empty string. The name buffer holds `MAX_NAME_LENGTH + 1` bytes (572), and `MAX_NAME_LENGTH` is 30 (`externs.h` 81).
- Start gate. `_char_defined` (newgame.cc 136-138) is true only when species and job are both set. It is called in several places (1403, 1463, 2160); those callers were not read, so I do not claim how a new game is blocked without it. `_job_allowed` (141-145) bans the delver job in sprint games and otherwise defers to `job_allowed` (not read). The job is a class-like background, so the start is species plus job, not class-free.

## 2. Key functions

- `create_random_doll`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/tiledoll.cc` 240-260.
- `_get_random_doll_part`: tiledoll.cc 227-231 (`tile_player_part_start[p] + random2(tile_player_part_count[p])`).
- Ghost layer fill: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/tilemcache.cc` 1546-1558 (seed, then the loop over unset layers).
- `hash_with_seed`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/hash.cc` 57-62.
- Randomise key: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/tilereg-doll.cc` 408-409.
- Newgame doll: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/tiledoll.cc` 962-990 (`fill_doll_for_newgame`, `fill_doll_equipment` at 989).
- Name: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/newgame.cc` 557-572; cap `externs.h` 81.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Always-rolled layers | Chance 1 for body, hand1, leg, boots, hair (tiledoll.cc 243-247) |
| Coin-flip layers | Chance 0.5 for cloak, arm, hand2, helm (250-257) |
| Rare layer | Chance 0.25 for beard (259) |
| Seeded pick per layer | `hash mod count`; zero when count is below 2 (hash.cc 60, 62) |
| Seed from the name | hash32 of the name XOR hash of a data word (tilemcache.cc 1546-1547) |
| Unique generated name | 100 tries, first name with no save file (newgame.cc 559-563) |
| Name cap | 30 (externs.h 81) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's roll order (always-layers first, then the coin-flip layers, then the one-in-four beard) and its seeded fill for layers that the species or job did not set. It omits the species base tile, the equipment overrides, the tile atlas (tile ranges are an input here, not donor data), the ghost armour-class scaling and the doll file. It adds one fix the donor does not have: a layer with no range for a species is skipped. The ranges in the code are illustrative input, not donor data.

```ts
// Licence: GPL-2.0 (donor, LICENSE "either version 2 of the License"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// simplified: the sketch keeps the donor's roll order (always-layers first, then the coin-flip layers, then the one-in-four beard) and its seeded fill for layers that the species or job did not set. It omits the species base tile, the equipment overrides, the tile atlas (tile ranges are an input here, not donor data), the ghost armour-class scaling and the doll file. It adds one fix the donor does not have: a layer with no range for a species is skipped.
// The ranges below are ILLUSTRATIVE INPUT ONLY, not donor data. The layer ids are this list's indices, not the donor's enum values (not read).

type Layer = "body" | "hand1" | "leg" | "boots" | "hair" | "cloak" | "arm" | "hand2" | "helm" | "beard";

// Roll order, as in the donor's create_random_doll. Index = layer id used by the seeded fill.
const LAYER_ORDER: Layer[] = ["body", "hand1", "leg", "boots", "hair", "cloak", "arm", "hand2", "helm", "beard"];

// Chance per layer: always (1), a coin flip (0.5), or one in four (0.25).
const CHANCE: Record<Layer, number> = {
  body: 1,
  hand1: 1,
  leg: 1,
  boots: 1,
  hair: 1,
  cloak: 0.5,
  arm: 0.5,
  hand2: 0.5,
  helm: 0.5,
  beard: 0.25,
};

interface PartRange {
  start: number;
  count: number;
}

// Per species (or per job) tile ranges for each layer. A missing layer means the species has no such layer.
type RangeTable = Partial<Record<Layer, PartRange>>;

type Doll = Partial<Record<Layer, number>>;

// Index in 0..count-1. Counts below two give 0 (the donor's hash helper does the same).
function pick(rng: () => number, count: number): number {
  return count < 2 ? 0 : Math.floor(rng() * count);
}

// Donor create_random_doll: each layer rolled in order, the species range decides which exist.
function randomDoll(ranges: RangeTable, rng: () => number): Doll {
  const doll: Doll = {};
  for (const layer of LAYER_ORDER) {
    const range = ranges[layer];
    if (range === undefined) continue; // fix: the donor has no species check
    if (rng() < CHANCE[layer]) {
      doll[layer] = range.start + pick(rng, range.count);
    }
  }
  return doll;
}

// Small seeded 32-bit mix of two words (clean-room, not the donor's MurmurHash).
function mix2(seed: number, id: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(id + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

// Donor hash_with_seed: hash modulo the count, 0 below two.
function seededIndex(seed: number, id: number, count: number): number {
  return count < 2 ? 0 : mix2(seed, id) % count;
}

// Donor ghost doll (tilemcache.cc 1546-1558): layers from cloak upward that the species or job
// did not set get a seeded pick, so the same name always gives the same look.
function seededDoll(setByDefaults: Doll, seed: number, ranges: RangeTable): Doll {
  const doll: Doll = { ...setByDefaults };
  LAYER_ORDER.forEach((layer, id) => {
    if (id < 5) return; // body..hair come from the species or job defaults
    if (doll[layer] !== undefined) return;
    const range = ranges[layer];
    if (range === undefined) return;
    doll[layer] = range.start + seededIndex(seed, id, range.count);
  });
  return doll;
}

// Illustrative use only.
const illustrativeRanges: RangeTable = {
  body: { start: 0, count: 3 },
  hand1: { start: 3, count: 2 },
  leg: { start: 5, count: 2 },
  boots: { start: 7, count: 2 },
  hair: { start: 9, count: 6 },
  cloak: { start: 15, count: 4 },
  arm: { start: 19, count: 2 },
  hand2: { start: 21, count: 2 },
  helm: { start: 23, count: 5 },
  beard: { start: 28, count: 3 },
};

const rolled = randomDoll(illustrativeRanges, () => 0.3);
const ghost = seededDoll({}, mix2(0x1234, 0x5678), illustrativeRanges);
void rolled;
void ghost;

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/crawl-crawl-appearance.ts` on the VPS, exit 0 (after scp to /tmp).

## 5. Lands in

- TARGET `origins/character/appearance.ts` (proposed path; the Frankendom folder layout was not checked in this pass). It holds the per-family layer ranges, the chance table for a random look, and the seeded pick for NPCs and fallen heroes. The same file is the target for the Veloren family table; the two notes meet there.
- Parity-checklist row 15 (gear dressing): the layers are the dressing on the shared rig, and the equipment would later override the base layers the way `fill_doll_equipment` does (not read in full).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: one engine (the seeded pick is a pure function of the name and the layer, so the client and server agree without a stored look).

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism and the ranges are illustrative.
- Defect 1, species-blind roll. `create_random_doll` has no species argument (tiledoll.cc 240), so any layer range can be rolled for any species, including a beard. The code does not show whether this shows a visible mismatch; the fix is a per-species range table that skips missing layers (in the sketch).
- Defect 2, unseeded random roll. The randomise key uses the global random source (`random2`, `coinflip`, `one_chance_in`), so a re-roll is not reproducible. Frankendom wants a seed-stable look for anything that other players see; use the seeded pick for that and keep the random roll for the creator only.
- Frankendom rule. The part ranges come from a tile atlas outside the files read (not read). Frankendom must keep the ranges as catalogue data (rows 20-21), not as code.
- Class-free start. The donor's new-game flow asks for a species and a job, a background that is class-like (`newgame.cc` 136-138 and 141-145; the flow functions are named `_choose_species_job` and `_resolve_species_job`, the full flow was not read). A class-free start in Frankendom cannot take the job step as it stands; it can keep the layered look and drop the job pick.
- No faces, no scars. The doll layers are body, hands, legs, boots, hair, cloak, arm, second hand, helm and beard. There is no face or scar layer in the code read. "Scars as grades" must be designed fresh.
- The seeded pick uses `hash mod count`. For small counts the bias is small, but the mod-of-hash is not a uniform draw for every count; this does not matter for looks, but do not reuse it for any roll that pays out.
- Not read: the tile atlas counts, the `TILEP_PART_*` enum, `job_allowed`, `make_name`, the rest of `tilep_race_default` (where the species base and the hair and beard defaults are set), and the middle of `fill_doll_equipment`.

Best transferable idea: a look is a set of layers, each layer has a chance (always, coin flip, one in four), and a layer that the species or job did not set takes a seeded pick from its range so the same name always looks the same.
Decision (proposed): adapt - keep the layer chance table and the seeded pick for fallen and NPC looks, add a per-species range table so missing layers are skipped, and keep the randomise roll for the creator only.
Acceptance: a fallen NPC with the same name shows the same layer ids on two visits (a server test asserts identical ids for one seed), and a species with no beard range never rolls a beard (a test asserts it).
