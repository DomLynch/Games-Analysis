# Gap check DR (death, respawn, penalties)

Date 2026-10-12. Frankendom repo commit read: 8d6ae33a9 (frankendom-lead-catalogue, read-only). 9 donor notes (DR001 to DR003).

## Summary for Dom
- REUSE 0, ADD 5, SKIP 4 (nine notes, two of them merged into one corpse module).
- Frankendom has no death module today: no src/fight/ folder, no corpse, grave, downed state or respawn rule for players. A lost fight is only a recorded loss.
- Standing rulings block the heavy ideas: "no death penalty" (docs/specs/origins/progression-proposal.md:318) and "recoverable failure, banked items safe, no full-loot" (docs/briefs/origins/origins-blueprint-2026-10-06.md:205). So XP loss, item-loss budgets and lives are SKIP unless Strategy reopens them.
- Top 3 additions: (1) Downed at 1 HP with timed ally revive and a cap, for zone group fights (Veloren). (2) One corpse module for open-PvP zones: take-one close, damage-share loot rights, server reclaim gate with repeat-death wait (EQEmu, ModernUO, TrinityCore merged). (3) Staged death beat for the player's own death (Daggerfall), which GAME_SPEC.md:226 leaves for a v2 review.
- Every donor target says src/fight/death.ts; that path does not exist. Nearest real files: src/duel.ts (Killed event, lines 414 and 481), origins/server/encounter.ts (loss on settle), origins/world/schema.ts (zone rules, pvp flag line 112).

## Table

| Donor note | Idea in 8 words | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| DR001 crawl | Piety save and spent-life revive on lethal hit | Nothing. Spec forbids permadeath; a lost fight is a normal loss (origins/server/encounter.ts header: "never a harsher penalty") | No lives, no save roll; no piety system either | SKIP: no lives or piety in Frankendom, and no death penalty to save from | none |
| DR001 EQEmu | Killer tier sets loss; corpse closes after one take | Take-one loot exists for the Pit only (src/loot.ts, one take per win). pvp zone flag exists (origins/world/schema.ts:112). No player corpse. XP loss ruled out (progression-proposal.md:318) | No player corpse, no tier, no take-one close in zones | ADD the corpse take-one close for open-PvP zones only; SKIP the XP loss. Same module as ModernUO, TrinityCore | new origins/server death/corpse file (src/fight/ is missing; nearest origins/server/encounter.ts plus origins/inventory/inventory.ts remove/receive) |
| DR001 ModernUO | Loot rights by damage share, first-hitter bonus | Nothing for zones. src/loot-claims.ts is a win-claim outbox, not rights. MAX_ATTACKERS only as queued PR #2129 in docs/state/lead.md:114, not in the tree | No damage-share record, no rights threshold | ADD, after #2129 lands; merge with the EQEmu corpse row. SKIP item-fate tiers unless Strategy allows item loss in PvP | same corpse file; reads fight events from src/duel.ts |
| DR002 ACE | Level-banded item loss with ranked drops | Nothing. Rulings: banked items safe, no full-loot (blueprint line 205) | Contradicts ruling. Corpse loot permission (one hour) is the only part that fits | SKIP the item-loss budget; the permission idea folds into the EQEmu corpse row | none (permission goes in the corpse file) |
| DR002 NetHack | Death leaves a pile by depth chance | Nothing. Zones have no depth tier field (origins/world/schema.ts) | Needs item loss to exist first; same ruling conflict | SKIP: no item loss, so nothing to pile | none |
| DR002 Veloren | Downed at 1 HP, ally revive, capped | Nothing. Lethal hit emits Killed (src/duel.ts:414, 481) and the fight ends. Group fights not built (blueprint line 160 lists death/revive as a later step) | No Downed state, no revive action, no cap | ADD, for zone group fights only, not duels | new file beside src/duel.ts (src/fight/ is missing); input for the hold sits in src/input.ts |
| DR003 OpenDAoC | Two-stage XP loss, grave, pray to recover | Nothing. No XP loss by ruling | A grave holding nothing is pointless | SKIP: the grave recovers XP and we lose none. Revisit only if a corpse-run is wanted, then merge with TrinityCore | none |
| DR003 TrinityCore | Repeat-death raises reclaim wait; server gate | Nothing. Server already verifies fights and settles losses (origins/server/encounter.ts settle) | No ghost state, no reclaim timer, no time and distance check | ADD, only if the corpse module is approved; merge with the EQEmu corpse row. Do not copy the GPL code shape | same corpse file; zone data field for the wait in origins/world/schema.ts |
| DR003 Daggerfall | Timed input-locked death beat, lootable body | The player's own death keeps the plain fall (GAME_SPEC.md:226). Finishers are for the victim opponent. src/first-loss.ts stages a scripted loss. Camera death dolly authorised (GAME_SPEC.md:236) | No player-death beat or fade; take-one body is the corpse row | ADD the beat as presentation only (needs the v2 review GAME_SPEC.md:226 names); the body part merges with the corpse row | src/camera.ts and src/main.ts (Killed handling near line 1867) |

## Merges
- EQEmu, ModernUO, ACE (permission part) and Daggerfall (body part) all propose one player corpse with take-one. Build once.
- TrinityCore (reclaim wait) and OpenDAoC (grave) both hang on that corpse; only TrinityCore survives the no-XP-loss ruling.
- Crawl lives and Veloren Downed are both a "second chance"; only Downed fits (group fights, no permadeath).

## Could not verify
- Parity-checklist row 17 (named in every donor note): the file was not found by grep in docs/.
- Whether any unmerged lane branch already holds a death or corpse module; only the clean checkout was read.
- Camera death dolly and fade for the player's own death: read from spec text only, not the code.
