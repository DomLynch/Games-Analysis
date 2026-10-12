# Gap check: HS (housing, player-built spaces)

Date 2026-10-12. Frankendom repo commit read: 8d6ae33a9 (frankendom-lead-catalogue, read-only).

## Summary for Dom
- 9 donor notes read (HS001 to HS003). REUSE 0, ADD 5, SKIP 4.
- Housing is designed but not built. docs/specs/origins/living-world.md section 7.1 (lines 349-360) already sets the rules: 1 house per account, rent 300 bronze a week, 14 days grace, contents go to the bank. No code, no `plots.ts`, no `origins/housing/` folder.
- The four upkeep notes (ModernUO, swgemu, AAEmu, ACE) all describe the same thing: merge them into ONE plot-upkeep module.
- Top 3 additions: (1) plot upkeep module: paid-through date, warning stage, grace, then close to bank; (2) per-owner house interior instance (lazy create, release at zero visitors); (3) the donor defect tests (first house must be charged, permission must not fall through, damage must read 0 percent at full).
- Rent needs the metals ledger, which exists only as a draft migration, not applied.

## Table

| Donor note | Idea (8 words) | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| ModernUO (HS001) | Staged decay, owner refresh restarts the clock | Spec says rent plus 14 days grace then close (living-world.md:349-360). Only decay code is encounter decay, unrelated (contracts/world.ts:458-460) | No plot row, no stage names, no server tick for plots | ADD (merged with AAEmu, swgemu, ACE; stage names are a display label over the grace window) | `origins/housing/plots.ts` does not exist (no `origins/housing/`); real nearest: new file in `origins/server/` beside `holdings.ts` |
| swgemu-Core3 (HS001) | Upkeep pool drains by rate, condemn then remove | Spec has weekly rent paid ahead up to 8 weeks (living-world.md:354), so a prepaid pool is already the design | Pool arithmetic, condemn stage, rounding fix, 0 percent at full damage test | ADD (merged into the one plot-upkeep module; keep the rounding and truncation tests) | same as above |
| AAEmu (HS001) | Paid-through date, warning window, lapse scan | Spec rent paid ahead (living-world.md:354); metal ledger with spend and refund reasons is a DRAFT (supabase/migrations/202610070007_origins_metal.sql:11-25, not applied; upgrade.ts:26 says coin not built) | Paid-through field, warning window as data, scan, heavy-plot multiplier (spec has one house per account, so multiplier not needed) | ADD (lead note of the merged module; take warning window and payment-base-date rule; SKIP multiplier). Lead must note the first-house-free defect found by the checker | same as above |
| ACE (HS003) | Due-time queue, settle once, always re-queue | None. Presence tick exists but is for players (presence/ticks.ts) | Due queue over plot rows, grace window, ledger row per removed item | ADD (merged; the "no item removed without a row" test matches spec "never lost", contents go to the bank) | `origins/server/house-upkeep.ts` does not exist; same module as above |
| Luanti (HS003) | Plot boxes in one index, exact overlap check | Plots are authored landmarks per town as data (`plots:<town>`, living-world.md:91, 353); zones resolve by rectangle (presence/zones.ts:15-25) | Nothing: players do not draw plot boxes, so no overlap test or owner index is needed | SKIP (plots are fixed landmarks, one owner per landmark row) | none |
| Veloren (HS003) | Grow a lot rectangle from a seed tile | Same: plots are authored landmarks, not player-sized lots | Nothing | SKIP (player does not size a lot; revisit only if free-form building is scoped) | none |
| ryzom-ryzomcore (HS002) | Lazy per-owner room instance, refcount, free-list | Spec calls for a fixed interior preset with three choices (living-world.md:357). Presence has two static zones only (presence/zones.ts:19); layers exist (presence/interest.ts) | Instance per owner, created on entry, released at zero visitors, stale-choice token | ADD (low priority, after upkeep; reuse interest layers for the instance) | `origins/server/housing-instances.ts` does not exist; real nearest: `origins/presence/zones.ts` and `origins/presence/interest.ts` |
| EQEmu (HS002) | Guild hall instance, two-stage capped guild bank | Guild vault location kind exists (contracts/items.ts:133-135, 216, 392); guilds are deferred in GAME_SPEC.md (deferred list, ~line 181) | Guild hall zone, deposit-then-promote, cap; whole feature depends on guilds | SKIP for now (no guilds in scope; the vault location already exists when guilds arrive) | none; if revived, `origins/server/guild-hall.ts` does not exist |
| Terasology (HS002) | Declared owned children saved and removed with owner | Spec: house chest is part of the bank, closing moves contents to the bank, never lost (living-world.md:357-359). Items already have one row per place (trading.md I3) | Cascade rule is already the design; the demolish test (every row becomes a return, none vanishes) belongs in the upkeep module tests | SKIP as a separate build (fold the acceptance test into the upkeep module) | `origins/housing/ownership.ts`-style target `origins/server/housing-ownership.ts` does not exist; not needed |

## Merge notes
- ModernUO, swgemu, AAEmu, ACE all propose a new plot upkeep file at three different paths. Build once.
- Luanti and Veloren both assume player-drawn lots; the Frankendom spec uses authored landmarks, so both drop.
- EQEmu and Terasology both depend on the ledger settle path; the spec rule already covers the cascade.

## Not verified
- Parity-checklist row 23 (all donors cite it): not looked up; the donors say housing has no row of its own.
- Whether the metals ledger migration (202610070007) is applied: file says DRAFT, NOT FOR APPLY; live state not checked.
- GAME_SPEC.md line number of the guilds deferral is approximate; docs/SCOPE.md was not read for a newer ruling on guilds or housing timing (living-world.md:898 lists housing as a later step, "(d+)").
