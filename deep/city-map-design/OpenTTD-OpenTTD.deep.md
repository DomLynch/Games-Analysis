# OpenTTD-OpenTTD (city-map-design, cell 20)

Donor: /mnt/frankendom-donors/OpenTTD-OpenTTD/src/genworld.cpp | Licence: GPL-2.0 | C++ | symbol _GenerateWorld / GenerateWorld (input line 94 verified: `_GenerateWorld`; `GenerateWorld` at 291)

## 1. Mechanism

- Generates a whole map from one seed in fixed stages, run once at new-game time (not per tick). Stages (`_GenerateWorld`, 94-232): start the economy (112), abort if the town road types are bad (113-116); make the landscape unless the mode is the empty map (121-123); if no landscape came from the generator, make the north edges void when freeform edges are set, set the flat base height (not in the menu), turn ground tiles into water and count land (125-141); when the generator did make a landscape, clear tiles are laid and land counted, and then, outside the scenario editor only, towns (abort if that fails), industries, objects and trees are placed (142-156); a flat or empty map gets none of them; then start companies, engines and disasters (159-164).
- Warm-up: the game script is started first (`Game::StartNew`, 167), before any warm-up loop. Then, unless the mode is the empty scenario map, the tile loop runs 1280 times (0x500; 170-178), and, outside the editor and only if a game script exists, the game script runs up to 2500 ticks, stopping early if the script goes to sleep (180-191). After that the done-callback runs and generation state is cleaned up (202-207); the seed is logged and, if the desync log level is visible, a debug save is written (212-217).
- Input: the generation seed (a fixed value reproduces the same map; the sentinel `GENERATE_NEW_SEED` is replaced by an interactive random value in `GenerateWorld`, 324), the map size, the generation mode, the town layout setting, and the landscape generator choice. `GenerateWorld` (291-350) also sets the map height limit from the mode when the setting is 0 (flat height, heightmap height or a terrain-generator estimate, plus ceiling room, clamped between a minimum and a maximum, 308-322), sets up the UI and progress window, and then calls `_GenerateWorld`.
- Determinism: the main random generator is seeded with the generation seed at the start of `_GenerateWorld` (103), so the same seed gives the same map. The script randomizers are initialised separately at 106 (`ScriptObject::InitializeRandomizers`, not read).
- Progress is reported per stage. Abort (`HandleGeneratingWorldAbortion`, 274-282) picks the editor or menu as the next mode, calls the abort callback and throws; the catch cleans up and either switches mode or, on a dedicated server, exits (218-231).
- Output: the map tiles, towns, industries, trees and the initial game state. No per-tick effect after the warm-up.

## 2. Key functions

- `GenerateWorld` (entry), `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/genworld.cpp`, lines 291-350. Sets mode and size, picks the map height limit, replaces the new-seed sentinel, prepares progress and windows, then calls `_GenerateWorld`.
- `HandleGeneratingWorldAbortion`, same file, lines 274-282. Chooses the return mode and throws the abort signal.
- `_GenerateWorld`, same file, lines 94-232. The whole stage pipeline, seeding, and the warm-up loops (0x500 tile ticks and 2500 script ticks).
- `CleanupGeneration`, same file, lines 77-89. Resets generation state after success or abort.
- `GenerateTowns`, `GenerateIndustries`, `GenerateObjects`, `GenerateTrees` (called from `_GenerateWorld`, lines 148-154; bodies are defined elsewhere and were not read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One seed at the start of generation; all randomness after it | Seeding from the generation seed (theirs, line 103) |
| Ordered stage pipeline with progress; abort cleans up | Stage list and progress weights (theirs) |
| Warm-up ticks so the world is settled at first play | 1280 tile-loop ticks (0x500, theirs, line 174); up to 2500 script ticks (theirs, line 184) |
| Map height limit estimated from the source, clamped | Min, max and ceiling-room constants (theirs, line 321; values defined elsewhere, not read) |

## 4. TypeScript sketch

simplified: the sketch is a two-function model: ordered stages run with one generator, then a warm-up. It omits the branch on the landscape result (flat/empty versus generated), the mode checks that skip the tile loop and the script loop, the abort path with cleanup, the progress weights, the seed sentinel, and the map-height-limit estimate. Its `warmUp` runs the tile loop and then the script loop exactly as the donor orders them, but with the script tick before the sleep check where the donor checks sleep after each tick (the same order).

```ts
// Licence: GPL-2.0 - clean-room sketch, no lines translated
// Clean-room: a seeded map build in ordered stages, followed by a fixed warm-up before play starts.
type Rng = { next(): number }; // seeded generator; the caller supplies it from one seed
type Stage = { name: string; run: (rng: Rng) => void };

const TILE_WARMUP = 1280;     // theirs
const SCRIPT_WARMUP = 2500;   // theirs

// Run every stage in order with one generator, so one seed gives one map.
function buildWorld(seed: number, rng: Rng, stages: Stage[], onProgress: (name: string) => void): void {
  void seed; // the rng is already seeded from this value by the caller
  for (const s of stages) {
    onProgress(s.name);
    s.run(rng);
  }
}

// Warm up before play: run the tile loop, then the script loop until it sleeps or the cap is hit.
function warmUp(tileTick: () => void, scriptTick: () => void, scriptSleeping: () => boolean): void {
  for (let i = 0; i < TILE_WARMUP; i++) tileTick();
  for (let i = 0; i < SCRIPT_WARMUP; i++) {
    scriptTick();
    if (scriptSleeping()) break;
  }
}
```

## 5. Lands in

- Frankendom target: `origins/world/generate.ts` (`generateZone(template, seed, overrides)` and `generateRegion`: zones from a template and a seed, "same template + seed gives the same zone, byte for byte", using a seeded mulberry32 `prng`, never `Math.random`) and the loader `origins/zones/loader.ts` (the one place that reads and checks a zone data package). Both exist on the VPS snapshot /root/work-k7 (not main); headers and `origins/world/README.md` read only. The donor adds a fixed warm-up after generation, which would sit at zone entry in the loader.
- Parity-checklist row: none of rows 1 to 22 (rows are the fight engine; zone data is outside them). Feature-map section: zones as data, brief rule 10 (zone copies with seeding) and `docs/specs/zone-runtime.md` (the loader's governing spec).
- Reuse tag: rewrite-from-idea (GPL-2.0, clean-room sketch only).
- Brief rule served: 10 (zone copies with soft cap and seeding); rules 7-9 n/a

## 6. Gaps and risks

- The donor's warm-up runs the whole world tick loop (1280 tile ticks, up to 2500 script ticks), which is heavy. Frankendom zone copies need a fixed, small warm-up tied to zone entry (brief rule 3: warm up at zone entry, not at first engage).
- The seed is global in the donor (one seed, one generator). A Frankendom zone copy must derive its own seed from the zone id and copy number, so two copies do not match by accident; `generate.ts` already takes a per-call seed.
- Generation is donor-specific (towns, industries, trees). Frankendom keeps only the stage shape; generated zones must pass the same validation as authored data (as `generate.ts` already does).
- Abort returns to a menu through an exception (274-282). Frankendom's loader must return a clear error result, not a menu.
- Only the main generator is reseeded at 103; script randomizers are set up at 106 and any other random source is outside that seeding. A Frankendom zone must draw every random value from the one seeded stream.
- Server-verified: a zone copy's seed and template must be held by the server (never taken from a client), so every client sees the same layout and a kill claim can be checked against it. One engine, Pit as a client only and MAX_ATTACKERS = 3 are unaffected.
- Not read: `GenerateLandscape`, `GenerateTowns` and the other generators, and the progress-window code.
