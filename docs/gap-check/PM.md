# Gap check PM (pets, mounts, companions) - date 2026-10-12 - Frankendom repo commit 8d6ae33a9

## Summary for Dom
- 9 donor notes checked (PM001 x3, PM002 x3, PM003 x3): 0 REUSE, 8 ADD, 1 SKIP.
- Frankendom has no pet, tame, companion or mount code at all. The only trace is one zone switch, `rules.mountsAllowed` (origins/world/schema.ts:115, default false), and old donor spec text that mentions pets only for XP and loot credit.
- The 8 ADDs fold into 3 real builds: (1) one tame-and-companion module (5 notes merged), (2) companion follow plus XP drip, (3) mount fatigue meter.
- Top 3: (1) tame gate + slot cap + capture roll + loyalty as one module (PM001 ModernUO, PM001 veloren, PM003 TrinityCore, PM003 rathena); (2) companion follow/leash on the server tick (PM002 ACE); (3) mount food/fatigue meter (PM002 ryzom).
- Every proposed target path is wrong: `src/fight/` does not exist, `origins/server/companions.ts` and `mounts.ts` do not exist. Real home is `origins/server/` (new files) with pure rules beside them, like `origins/inventory/inventory.ts` + `origins/server/consume.ts`.

## Facts used (read in repo)
- Mob leash/roam already exist as catalogue fields: origins/mobs/row.ts:15-16, defaults at :49, ranges at :56. Pattern to copy for companion fields.
- XP/credit award is `award()` in origins/progression/model.ts:245; events are only ArenaWin, Kill, StoryStep (:219), so a companion drip needs a new event kind.
- Burn-an-item with idempotent op id: origins/server/consume.ts and `consume` in origins/inventory/inventory.ts (use for a lure or collar).
- Seeded roll: `RollSource = (seed, hit)` in origins/luck/luck.ts:23 and src/roll.ts:5.
- Server tick: origins/presence/server.ts (wall-clock-aimed tick, `rules.tickMs`, ~line 42-46); tick stats only in origins/presence/ticks.ts.
- No weather/day table, no summon service anywhere (weather is a zone preset key only, origins/world/schema.ts:84).

## Table
| Donor note | Idea (8 words) | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| PM001 EQEmu (power-tier pet scaling) | Caster power picks pet tier; level bonus capped | Nothing. Only EQEmu spec text on pet XP owner (docs/specs/origins/eqemu-experience.md:256) | No companion record, no tier rows, no stat scaling | ADD (PM001) | New `origins/server/companions.ts` (+ pure `origins/companions/companions.ts`); tier rows as catalogue data. Proposed `src/fight/pets.ts` does not exist |
| PM001 ModernUO (skill roll plus loyalty) | Tame is one skill roll; loyalty rises, decays | Nothing. Seeded roll helper exists (origins/luck/luck.ts:23) | No skill field, no loyalty ledger, no hourly decay pass | ADD (PM001); merged with rathena roll below | Same companion module; loyalty = one field per companion on the character record (origins/server/career.ts is nearest save file) |
| PM001 veloren (collar tame) | Collar item tames nearest eligible within radius | Nothing. Item burn exists (origins/server/consume.ts) | No owned-pet cap, no eligibility data, no pet tuning fields | ADD (PM001); merged with TrinityCore slot cap | Same module; collar burned via existing `consume` |
| PM002 AAEmu (travel XP drip) | Moving companion earns timed XP, server-measured | `award()` (origins/progression/model.ts:245) but no companion event kind, no motion tracking | New CareerEvent kind, 60 s timer, owner check, rate | ADD (PM002) | `origins/progression/model.ts` (new event) + tick hook in companions module; proposed `origins/server/companions.ts` does not exist |
| PM002 ACE (follow and leash) | Companion trails owner, despawns when far | Mob leash/roam fields only (origins/mobs/row.ts:15-16), for hostile mobs, no owner link | No owner-follow step, no despawn-distance zone field | ADD (PM002); same module as AAEmu | Follow step in the presence tick (origins/presence/server.ts) calling companions module; despawn distance as a zone data field next to `rules.mountsAllowed` (origins/world/schema.ts:115) |
| PM002 ryzom (mount food meter) | Mount fatigue drains per metre above walk | Only `rules.mountsAllowed` flag (schema.ts:115). Hero stamina is in src/fatigue.ts (duel fight, not travel) | No mount, no meter, no speed cap on zero | ADD (PM002) | New `origins/server/mounts.ts` (proposed path also absent); meter fields in mount catalogue rows; speed cap enforced in presence server |
| PM003 TrinityCore (ordered tame gate) | One ordered gate; slot caps; no roll | Nothing | No gate, no unlock flag, no slot caps (5 active, 200 stored are the donor's idea; set our own in data) | ADD (PM003); merged with veloren cap and ModernUO | Same tame module (`origins/server/tame.ts` beside companions); `src/fight/companions.ts` does not exist |
| PM003 rathena (capture roll by HP) | Capture chance rises as target HP falls | Nothing | No capture-rate field on creature rows (origins/mobs/row.ts has no tame field); zero-rate flag missing | ADD (PM003); merged with ModernUO roll (one roll function, two modes) | Add `tameRate` to mob row schema (origins/mobs/row.ts) + roll in tame module; lure burn via `consume` |
| PM003 daggerfall-unity (summon service) | Day-gated paid summon with reputation chance | No day table, no summon service, no reputation-with-entity | Whole feature; depends on world day/weather data that has no rule use yet | SKIP: no day table or service to hang it on; reopen when a quest NPC needs paid summons | none |

## Merge notes
- PM001 ModernUO + PM001 veloren + PM003 TrinityCore + PM003 rathena all propose "the tame". Build one `tame` function: ordered gate (TrinityCore), cap (veloren, TrinityCore), one roll (rathena HP-scaled or ModernUO skill window, chosen per creature row), loyalty after (ModernUO). One test file.
- PM001 EQEmu (tiers) and PM002 AAEmu (XP) and ACE (follow) all need the same companion record. Define that first.
- Licences: EQEmu, ModernUO, veloren, TrinityCore, rathena GPL; ACE, ryzom AGPL; AAEmu unclear; daggerfall-unity MIT. All rows are idea-only, no donor numbers or code copied.

## ADD rows for the next checker pass (group id)
PM001 (EQEmu, ModernUO, veloren), PM002 (AAEmu, ACE, ryzom), PM003 (TrinityCore, rathena).
