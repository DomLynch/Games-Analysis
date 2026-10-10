# smogon-pokemon-showdown (asset audit, AU050)

Donor: `/mnt/frankendom-donors/smogon-pokemon-showdown` (VPS, read only)
Code licence: MIT (LICENSE line 1, copyright line 3).
Asset licence: no separate asset licence in the box. The tree holds no sprites, audio, fonts or models (0 binary files). The root MIT file is the only licence file; nothing in the box says data or text is licensed separately. `data/text/README.md` line 6 says text is "official where possible" and line 12 cites PokeAPI for translated names and descriptions. PokeAPI's licence is not in the box.
Rights holder status: unknown. The files name Guangcong Luo and contributors for the code only. Pokemon names, species data and text have no rights holder named in the box.
Best class: C (game-series names, stats and text: inspiration and shape only). Code and rule-mod mechanisms are adaptable under MIT with the licence kept.

Which half: I read the sim half (battle queue, damage, RNG) and the data half (species, text, mods). The server half (3.1 MB) was not read beyond names. The matching art and UI half is the client repo (linked in README, not in the box), so there are no sprites or sounds here to use.

## Asset inventory

| group | path | count hint | class |
|---|---|---|---|
| species, move, item, ability data | `data/pokedex.ts`, `data/moves.ts`, `data/items.ts`, `data/abilities.ts`, `data/learnsets.ts` | pokedex 1518, moves 953, items 583, abilities 321 keyed entries (grep count) | C |
| text tables (names, descriptions, placeholders) | `data/text/*.ts`, `data/text/{de,es,fr,it,ja,ko,zh-cn,zh-tw}/`, `translations/` | text pokedex 1559, text moves 952 | C |
| random-battle and factory sets (JSON) | `data/random-battles/*/` | about 40 files (sizes only) | C |
| rule-mod overlays | `data/mods/<name>/` | 47 folders | A for mechanism under MIT, C for contents |
| config and SQL schema | `config/*.csv`, `databases/` | 2 CSV, about 20 SQL | D |
| art, audio, fonts, models | none | 0 | D |

## Inspiration

- Turn order is a sorted queue: order, then priority, then speed; exact ties go to a random insertion point (`sim/battle-queue.ts` 18-20, 396-401; `sim/battle.ts` 408-414).
- Modifier stacks run in fixed point: each step becomes a 4096ths integer, multiplies the running value, rounds once with a half-step, then shifts back (`sim/battle.ts` 2318-2334). Good model for a stat-modifier stack.
- Damage variance is a percentage band from 85 to 100, applied after crit and before type (`sim/battle.ts` 2395-2397; `sim/battle-actions.ts` 1741-1742). Copy the order of steps, not the numbers.
- Seeded RNG plus an input log replays a whole fight (`sim/prng.ts` 5-10). Maps to our fight record.
- Rule variants are overlay folders (`data/mods/`, 47). Maps to zones as data on one runtime.
- Text has length budgets so a line fits its row (`data/text/README.md` 21, 25-27). A good rule for a 375 px HUD line.
- Missing translations are `null` and fall back to English (`data/text/README.md` 32). Same layering for HUD and combat log.
- Battle lines are templates with bracket placeholders (`data/text/README.md` 38). Restyle the log per language without touching logic.

## Briefs (recreate as clearly distinct originals; never copy)

- **Duel action queue with a seeded tie break.** Keep: order key, then priority, then speed; random only on exact ties. Change: our server-tick seeded RNG, tie keyed to latency bucket, tie shown as a tell in replay. Ref: `sim/battle-queue.ts` 18-20, 396-401.
- **Fixed-point modifier stack.** Keep: integer multipliers, one rounding per step, fixed event order. Change: 1000ths scale, named stack entries, cap of three for the 375 px readout. Ref: `sim/battle.ts` 2318-2334.
- **Damage roll band after crit.** Keep: narrow band, applied after crit and before type. Change: band per weapon class, faint bar on the hit impact instead of a hidden roll, tighter band for heavy hits. Ref: `sim/battle.ts` 2395-2397.
- **Replay from seed and input log.** Keep: one seed plus decisions gives the same result. Change: versioned binary log, human label per decision, checksum at the end. Ref: `sim/prng.ts` 5-10.
- **Type matchup as a compact grid.** Keep: one table keyed by defending type, one value per attacker. Change: our own element names and palette, ring thickness instead of numbers. Ref: `data/typechart.ts` 1-4 (schema read only).

## Cross-link to our topics

- Spawns and encounters: `data/random-battles/*/sets.json` shows set templates by role; not read beyond sizes.
- HUD and UI: short-text budget and null fallback are the usable parts.
- Sound, camera, VFX, animation, loot: nothing in the box. The client repo would hold them.

## Not read

sim/dex-conditions.ts and data/conditions.ts (names only); server half in full; translation bodies; random-battle JSON bodies; learnset and move bodies; mod folders other than gen1; the client repo (not in box); PokeAPI and po-devs sources cited in the READMEs.
