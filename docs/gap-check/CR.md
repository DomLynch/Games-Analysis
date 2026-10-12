# Gap check CR (crafting, repair, gear wear) - 2026-10-12 - Frankendom repo commit 8d6ae33a9

## For Dom
- 9 donor notes (CR001-CR003), all "adapt". Calls: 0 REUSE, 5 ADD, 4 SKIP.
- The 5 wear/repair notes all ask for the same thing, so they merge into ONE new piece: gear wear and repair.
- Frankendom has NO durability, wear, repair or salvage today. Gear is two fixed multipliers (Attack, RES) and nothing changes in a fight (src/gear-stats.ts:1-30).
- The 4 SKIPs are gathering nodes and salvage: GAME_SPEC.md:181 lists crafting and open world as NOT NOW, and nothing in the repo mints raw materials yet.
- Top 3 additions: (1) one gear-wear module (per-hit wear, protection falls as it wears, two counters so repair has a limit); (2) a "repair" kind on the existing NPC service list, built like the smith's upgrade; (3) wear written server-side in one batch with a retry receipt, copying how upgrade and consume already do it.

## What Frankendom has that the ideas can reuse
- Loadout of two multipliers, RES scales damage taken: src/gear-stats.ts:28, loadoutFor at :93. Wear would scale RES, so the sim stays free of tiers and slots.
- Hit location (head, torso, legs): src/blade.ts:43; wounds carry a site in src/duel.ts:24.
- Sim entry point: stepDuel, src/duel.ts:195 (pure, no loot imports; the sim-boundary test refuses them, src/gear-stats.ts header).
- NPC services: SERVICE_KINDS is only 'upgrade', with a comment saying an armourer's repair "later adds a kind here": origins/contracts/economy.ts:276-278.
- Server one-batch write with idempotent op id and stored receipt: origins/server/upgrade.ts header; burns in origins/inventory/inventory.ts:393-474 (BURN_REASONS = quest-handin, upgrade-cost).
- Upgrade cost rows already take material lines: origins/contracts/economy.ts:312.
- Zone respawn delay exists only for creatures: origins/world/schema.ts:76-78.
- tests/loot-wear.test.ts is about equipping a piece, not about damage to it.

## Table
| Donor note | Idea (8 words) | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| CR001 ModernUO | Gear wears per hit; repair costs max durability | Nothing; RES is a fixed multiplier (src/gear-stats.ts:28) | Per-piece hp and ceiling, hit wear, limited repairs | ADD (merged: gear wear) | New file. src/fight/ does not exist; nearest real files are src/gear-stats.ts (resolve to Loadout) and origins/server/ (writes). Suggest src/gear-wear.ts plus a server write |
| CR001 ryzomcore | Per-swing wear scaled by weapon speed, carry | Nothing | Swing-based wear with fractional carry | ADD (merged; Dom to choose per-swing vs per-hit, one rule only) | Same gear-wear module |
| CR001 ACE | Salvage a taken piece into capped material bags | Take-one loot (src/loot-claims.ts); materials only burned for upgrades | No source of materials, no salvage action | SKIP (crafting is NOT NOW, GAME_SPEC.md:181; no material mint exists) | Would be origins/server/ beside upgrade.ts later; src/fight/salvage.ts does not exist and a salvage is not a fight |
| CR002 swgemu Core3 | Per-hit-location wear, ramp, cap-cost repair tiers | Hit location exists (src/blade.ts:43) | No wear, ramp or repair tiers | ADD (merged: gear wear; best fit since sites are only head, torso, legs) | Same gear-wear module; repair tiers as a catalogue table |
| CR002 EQEmu | Zone row as gather node with respawn | Zone respawn for creatures only (origins/world/schema.ts:78) | No nodes, no click, no payout | SKIP (open world and crafting NOT NOW) | origins/server/gather-nodes.ts does not exist |
| CR002 Veloren | Node hardness, partial drops, full-break pay | Nothing | Same as above | SKIP, merged with EQEmu and Terasology (one gather module if ever built) | Same |
| CR003 Terasology | Break order: veto, drop roll, grant | Nothing | Same as above | SKIP, merged with the two above | src/fight/gather-drops.ts does not exist; not a fight thing, would sit with the gather module |
| CR003 Cataclysm DDA | Repairable damage plus a floor repair cannot pass | Nothing | Two-counter wear so repair is limited | ADD (merged; the cleanest limit rule, same as ModernUO's ceiling idea, pick one) | Same gear-wear module; repair roll needs a skill, so keep optional |
| CR003 Cubyz | Wear written after the gate, with rollback | Server one-batch write and receipt (upgrade.ts, inventory.ts burn) | Wear step not yet in that batch | ADD (merged: reuse that write pattern, no new mechanism) | Same pattern as origins/server/upgrade.ts |

## Notes for Lead
- Duplicates: ModernUO, ryzomcore, swgemu, CDDA and Cubyz all propose src/fight/gear-wear.ts. Build it once. Three of them differ on how a piece is limited (ceiling drop per repair, floor, cap cost): choose one.
- Three notes propose gather modules in two different places; no spot exists either way.
- Gear still "changes nothing in a fight yet" (src/gear-stats.ts header). Wear should wait for, or ship with, the step that puts a Loadout into stepDuel.
- No donor numbers copied (several donors are copyleft or restricted).
