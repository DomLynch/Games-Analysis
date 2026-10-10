# Pattern page: zone population (parity row 23) — DRAFT 2026-10-10

Status: draft from 33+ spawn notes (Haiku readers). Independent Sonnet check of 16 spawn notes is running; items marked (unchecked) have not been through it yet. For: Lead Dev / World lane.

Row 23: "Zone population: spawn caps, respawn, despawn on empty with a grace timer", engine in `origins/server/world-spawns.ts`, numbers as zone data fields (cap, spawn chance, respawn s, grace s, coverage).

## The one thing no donor does

**Despawn on empty with a grace timer that re-checks when it fires.** Only SWGEmu Core3 does it (zone director spawns only while players are present, despawns after a grace timer that re-checks on fire). TrinityCore's only grace is the 30 min instance unload; Asheron's Call, AAEmu and ModernUO have none (ModernUO's "grace" just sends a displaced creature home). So the grace timer is our own design, with Core3 as the shape.

## Engine rules (what to build), with who shows it

| # | Rule | Donors (licence) | Data field |
|---|---|---|---|
| 1 | Population is a zone-wide cap plus per-type caps; check total cap, then entry cap, then weighted pick | SWGEmu Core3, ModernUO, Asheron's Call (copyleft, shape only); OpenTESArena (MIT) | `cap`, `entry_cap`, `entry_weight` |
| 2 | One chance roll per tick, scaled by spawn-point count, spawn only on an empty point | FreeOrion, Angband (copyleft) | `spawn_chance`, `points` |
| 3 | Spawn only when a player is present (presence gate) | Core3, ModernUO, EQEmu, Veloren (copyleft) | `needs_presence` |
| 4 | Respawn is a per-spawn timer that starts at removal, with random variance; dead members count toward the cap until their own respawn is due | TrinityCore, Dawn of Light, ACE, 2004Scape (MIT) | `respawn_s`, `respawn_var` |
| 5 | Respawn scales with population (2004Scape halves with players), or with level | 2004Scape (MIT), KeeperFX, Core3 (lair 60 s + 2 per level) | `respawn_scale` |
| 6 | Placement: out of the player's view, at least N steps away, retry once on failure (never drop the spawn when no cell is free) | Shattered Pixel Dungeon, Angband, Duelyst (CC0) | `min_dist`, `retry_s` |
| 7 | Group/lair refill: fixed group with a lives counter | Core3 (4 lives), ModernUO | `group`, `lives` |
| 8 | Compute budget: per-pass time budget defers remaining zones to the next pass (links to the tick sub-line under row 18) | Luanti (LGPL), GemRB | `pass_budget_ms` |
| 9 | Server-authoritative only: clients never spawn | Duelyst, all server donors | engine rule |

## Traps found in donors (read from code, not run)

- AAEmu: a spawn flag blocks refill until a respawn event clears it, so a spawner emptied without a death may not refill; its despawn-on-empty branch looks unreachable; a pack can exceed the cap because the cap is checked once before the pack.
- Exult: an edge-triggered spawn re-rolls on every re-entry, so walking back and forth re-rolls forever. Needs a grace/cooldown.
- Daggerfall: a spawn that rolls "no monster" still consumes the catch-up batch.
- ACE: generators keep regenerating while the landblock is dormant (unconfirmed).
- OpenTESArena MIT; most others GPL/AGPL: shape only.

## Proposed acceptance (to be rewritten by Lead as rows)

1. A zone never exceeds `cap` and no type exceeds its `entry_cap` at any tick.
2. A dead spawn returns after `respawn_s` ± variance, never earlier, and counts toward the cap until then.
3. A zone with no players for `grace_s` despawns its population; a player returning inside the window cancels it and the timer re-checks on fire.
4. No spawn lands in view or inside `min_dist`; a failed placement retries, never silently drops.
5. Spawn rolls come from the one seeded server stream (replayable).

## Not done / open

- Row 23 "coverage" field: no donor defines it; needs Lead's definition.
- Licence conflicts: OpenBW unclear, Doom mixed, NetHack NGPL, Sustainable Use License — shape only until ruled.
- Source notes: `wave2-notes/agents/batch3/*/out/spawns-encounters/` (receipts kept private).
