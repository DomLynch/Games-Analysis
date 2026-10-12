# Gap check IV (inventory, bank and equipment)
Date 2026-10-12. Frankendom repo read: frankendom-lead-catalogue at commit 517b32248 (read-only). Donor notes: 53 (IV001 to IV020, inventory-bank-equipment). No note has a 'Checker findings' block.

## Summary for Dom
1. Most of the rules already exist as a tested prototype: origins/inventory/inventory.ts (backpack 64 slots, bank 1,000 slots opened only at the Concord Exchange, split, merge, deposit, withdraw, equip, trade settle, burns, one of each piece, one location per item). Nothing in src/ imports it yet and the writer only exposes two item ops (consume, apply_upgrade), so none of it is reachable by a player.
2. Counts: REUSE 12, ADD 25, SKIP 16 (53 notes). The 25 ADD rows collapse into four builds (G1 to G4 below). Weight, burden, cell footprints, ground drops, ammo and death-loss ideas SKIP: they break the fixed-slot, one-ledger or one-of-each rulings.
3. Biggest real gaps: (a) loot intake has no overflow story: `receive` refuses a full pack and nothing says where an unplaceable collect-drop waits; (b) stackables cannot top up an existing stack on pickup, so a full pack refuses a matching pickup; (c) `equip` refuses an occupied slot and has no two-hand versus shield rule on the server.
4. Top 3 additions: G2 one loot-intake plan (all-or-nothing for take-one, take-what-fits for collect, leftover stays unclaimed, never on the floor); G1 stack-first placement with partial top-up; G3 equip swap in one step with an exclusion table in data.
5. Licence note: nearly all donors are GPL/AGPL/restricted (shape and ideas only, no donor numbers in this file). Permissive ones (MIT/BSD/Apache: 2004Scape, LostCity, Barony, OpenLara, TESArena, daggerfall, evennia, nakama, otclient, L2Solo) carry no numbers we need. Our own base is World of ClaudeCraft (MIT, credited in inventory.ts:3-4).

## What we have today (shared by all rows)
- One ledger: each ItemInstance carries its own single `location` (equipped, pack, bank, vault, trade-escrow), nothing else lists items (origins/contracts/README.md:36; origins/contracts/items.ts:128-135; header origins/inventory/inventory.ts:18). DB unique indexes per place (supabase/migrations/202610060001_origins_save.sql:126-128), quantity 1..9999 (line 93), pack_slots 1..64 (line 29).
- All-or-nothing ops: `commit` plans on a copy and runs the full invariant before returning (inventory.ts:159); `move` swaps with an occupant (272); `split` (328) and `merge` (362, whole or refused, same provenance/binding/tier required, sum must fit one stack at line 385); `deposit`/`withdraw` (301-305) behind `bankGate` at the Exchange only (180); `receive` takes one free pack slot (233-247); `equip` refuses an occupied slot, no silent swap (529-543); `unequip` refuses a full pack (546); `settle` reads each receiver's real free slots (564); `consume` and `applyUpgrade` burn with an op id and ledger (437, 474).
- Rules in data: item `stack` 1..9999, gear/cosmetic/story-critical stack 1 (items.ts:65, 102); one of each single-copy piece across pack, bank, worn (items.ts:523, inventory.ts:238-241); power derived from tier, not stored (items.ts:561, 545).
- Take-one loot: live path is one claim names one piece or null (supabase/migrations/202609230001_server_awards.sql:20-21); `dropFor` returns null if owned (src/loot.ts:145); Origins loot tables have `take-one` and `collect` presentations, personal distribution (items.ts:569-570). Spec says a full pack refuses and the kill still counts (docs/specs/origins/mobs.md:676); trades that do not fit are refused whole and stay open (docs/specs/origins/trading.md:82-83).
- Live game today: 2 open pack slots of 5, paperdoll keys head, crest, chest, arms, hands, legs, feet, main, off (src/loot.ts:24, 58); `packFull` and `stow` refuse when full (212-216).
- Missing: writer handlers for move, split, merge, deposit, withdraw, equip, unequip, loot award (origins/server/handlers.ts:68-72 lists only open, create_character, quest_advance, talk_pick, consume, apply_upgrade); any UI (inventory README "Not done"); selling; weight (a ruling: fixed slots).

## Gap table
| Donor note | Idea in 8 words | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| IV001 shattered-pixel-dungeon | Matching stack first, then free slot | receive takes a free slot only (inventory.ts:233) | Full pack refuses a matching stackable | ADD (G1) | origins/inventory/inventory.ts (receive) |
| IV001 0ad | Per-kind carry cap, one drop-off call | No gathering; Pit award is the single intake | No carried resources in any ruling | SKIP (no gathering; its silent drop on switch also breaks one ledger) | none |
| IV001 2004Scape | Move returns requested and completed counts | Ops return new state or a refusal (Result) | No placed/leftover count for partial intake | ADD (G2) | inventory.ts (new `plan` result) |
| IV002 Mindustry | One shared ledger, cap recomputed from links | One location per instance; pack_slots column | Matches one-ledger; shrinking the cap is unhandled | REUSE (clamp-loss part SKIP; shrink rule in G2) | contracts/README.md:36 |
| IV002 Card-Forge | Worn gear and saved loadouts as slot-to-id maps | equipped is a per-slot location row (items.ts:128) | No saved loadout | ADD (G3) | new origins/inventory/loadout.ts |
| IV002 CDDA | Carry capacity from size and strength, speed penalty | Fixed slots, no weight (inventory README) | Burden contradicts the fixed-slot ruling | SKIP | none |
| IV003 DOLSharp | Plan stack placement fully, then write | `commit` plan/apply (inventory.ts:159) | Bundles of several drops not planned as one | ADD (G2) | inventory.ts |
| IV003 EQEmu | Stack move by min(requested, room), remainder stays | merge refuses unless whole sum fits (385) | No partial top-up | ADD (G1) | inventory.ts (merge) |
| IV004 LostCity | Leftover becomes owner-only ground drop | Off-ledger floor items do not exist | Ground drop is a second store | SKIP (leftover stays a claim, G2) | none |
| IV004 ModernUO | Check all requirements before removing any | `consume`/`applyUpgrade` all or nothing (437, 474) | None | REUSE | inventory.ts:437 |
| IV005 NetHack | Stack identity from fixed field list | merge predicate: item, provenance, history, binding, tier, upgrade (376-384) | None; burden and bag blast SKIP | REUSE | inventory.ts:376 |
| IV005 OpenDiablo2 | Item w x h footprint, first-fit scan | Slot = one cell (inventory README) | Footprints not wanted on a phone grid | SKIP | none |
| IV005 OpenRA | Reserve capacity at start, commit on arrival | Trade settle refuses whole, trade stays open (trading.md:82) | Reservation adds a hold state | SKIP (revisit if trades fail often) | none |
| IV006 OpenTTD | Plan keep/drop/move/take, commit in steps | Single-item ops plus `commit` | Routing and money share do not apply | SKIP | none |
| IV006 OpenXcom | Slot table with per-move time cost | Equipment is settled before a fight (item-loot-storage-summary.md) | A move cost has no meaning outside fights | SKIP | none |
| IV006 Cubyz | Client sends intent, server checks then applies | Only consume and apply_upgrade are handlers (handlers.ts:68-72) | No inventory command handlers | ADD (G4) | origins/server/handlers.ts + new origins/server/items.ts |
| IV007 Barony | Pure merge plan: cap, overflow split, first slot | `merge` is pure and whole-or-refuse | No overflow split plan shared by pickup, drag, chest | ADD (G1) | inventory.ts |
| IV007 halflife | Duplicate weapon pickup becomes ammo | One of each refuses a second copy (inventory.ts:238) | No ammo in the game | SKIP | none |
| IV008 source-sdk | Duplicate pickup tops ammo, leftover stays | Same | Same | SKIP | none |
| IV008 OpenLara | Ammo folds into the held gun's count | No ammo | Same | SKIP | none |
| IV008 TESArena | Equip clears an exclusive group | `equip` refuses an occupied slot (529-543); two-hand vs shield only in the kit view (src/loot.ts:117) | No server rule that a two-hander blocks the off hand | ADD (G3) | inventory.ts (equip) + exclusion table as data |
| IV009 fallout1 | Take-all gate: one all-or-nothing check | take-one claim is one piece (202609230001:20-21) | No take-all for a collect list | ADD (G2) | inventory.ts |
| IV009 fallout2 | Hidden weightless flag; two-sided trade check | `settle` checks both sides (564); story flag in def (items.ts:43) | Hidden flag needs a loot-view container we do not have | REUSE (two-sided check); hidden flag SKIP | inventory.ts:564 |
| IV010 angband | Count what fits, move only that, report | receive is one piece, all or nothing | No count-then-take for stackable piles | ADD (G2) | inventory.ts |
| IV010 Beyond-All-Reason | Target stock stepped by player, server reconciles | No charge bank | Not an inventory shape here | SKIP | none |
| IV010 basic-computer-games | Banded roll loses carried stock per trip | No death or exit loss ruling; conservation forbids silent loss (inventory README) | Loss rule has no source in rulings | SKIP | none |
| IV011 crawl | Merge into stack first; source shrinks after accept | Same gap as IV001 | See G1 | ADD (G1) | inventory.ts |
| IV011 daggerfall | Equip resolves slot, clears hands, returns displaced | Refuses occupied slot, returns nothing | No displaced list, no hand clearing | ADD (G3) | inventory.ts (equip) |
| IV012 dhewm3 | Refuse when full, item stays, toasts paced | packFull refuses (src/loot.ts:212); mobs.md:676 says tell the player | Refusal not tied to a held claim; no toast queue | ADD (G2 refusal, G4 toast) | inventory.ts; UI new file |
| IV012 DevilutionX | Decide whole footprint first; swap one-for-one | `move` swaps with the occupant (272) | Footprint part not wanted | SKIP (swap already REUSE) | inventory.ts:272 |
| IV012 endless-sky | Take what fits, remainder stays in source | Whole-or-refuse only | Same as IV003 | ADD (G2) | inventory.ts |
| IV013 evennia | Wield eviction pushes old item to pack | Equip refuses (no eviction) | Swap and eviction table | ADD (G3) | inventory.ts (equip) |
| IV013 exult | Clamp-and-report fit; lift with put-back | `commit` returns the new state or leaves input untouched (159) | Weight part conflicts with fixed slots | REUSE (weight SKIP) | inventory.ts:159 |
| IV013 flare-engine | Fill requested slot, partial stacks, then empty | Free slot only | Fill order; buyback needs selling | ADD (G1; buyback SKIP, no selling) | inventory.ts |
| IV014 nakama | Stage-then-commit batch with one ledger row each | commit + burn ledger with op id (393-437) | Moves leave no ledger row (only trades have history) | REUSE (move ledger rows not proven needed) | inventory.ts:437 |
| IV014 Quake-2 | One armour slot with tier points conversion | Tier lives on the instance, power derived (items.ts:561) | Points-absorb breaks guard/parry combat | SKIP | none |
| IV015 fheroes2 | Full bag turns find into gold; slot-bounded loot plan | Pack full refuses | Gold conversion would destroy a unique win | ADD (G2 plan only; gold SKIP) | inventory.ts |
| IV015 ioq3 | One grab predicate for client and server | Pure TS module, shared by client and server; `packFull` greys the button (src/loot.ts:212) | None | REUSE | origins/inventory/inventory.ts |
| IV015 jynew | Gear snapshot applied then reversed exactly | Power derived each time (items.ts:545, 561) | None, no snapshot to drift | REUSE | items.ts:561 |
| IV016 l1j | Full bag still takes matching stack | Same as IV001 | See G1 | ADD (G1) | inventory.ts |
| IV016 levy-street | One merge predicate for capacity and grant; scratch batch | This is our base (inventory.ts:3-15) | None | REUSE | inventory.ts:3 |
| IV016 luanti | Two-sided permit, minimum count, remainder to source | Swap exists; no partial move | Partial merge | ADD (G1) | inventory.ts (merge) |
| IV017 keeperrl | Slot capacity from body; excess drops as loot | No wounds-to-gear rule | Not in any ruling | SKIP | none |
| IV017 openmw | Dry-run loadout planner for NPCs | NPC kits are data (origins/mobs/kits.ts exists, not opened) | Hero never auto-equips | SKIP | none |
| IV017 otclient | Pooled grid, load next rows at scroll edge | No UI | Bank has 1,000 slots, needs a virtual grid | ADD (G4) | new file under src/ (no pack UI file confirmed) |
| IV018 forgottenserver | Compute fit and whole effect first, report leftover | commit, no report | Same as IV003 | ADD (G2) | inventory.ts |
| IV018 L2Solo | Conflict table; validate whole bank batch | No table; single-item bank ops | Table and batch deposit | ADD (G3, G4) | inventory.ts (equip), handlers |
| IV018 rathena | Parked second loadout swapped in one action | No loadouts | Plan first, then swap | ADD (G3) | origins/inventory/loadout.ts |
| IV019 scummvm | Refused drop returns item to source; stack key | One location, refused ops leave input intact | None | REUSE | inventory.ts:159 |
| IV019 BrogueCE | Refuse and flag once; undo last equip | No undo | Undo last equip swap | ADD (G3) | loadout.ts |
| IV019 veloren | Precheck; remove-only overflow list on shrink | openInventory refuses state outside the grid (inventory.ts:87) | A shrunk pack_slots would lock the account | ADD (G2) | inventory.ts (open), pack_slots |
| IV020 xoreos | Two zones; never drop on load | Equip zone + pack/bank; open refuses bad state | Never dropping is already the rule | REUSE | inventory.ts:92 |
| IV020 xu4 | Gate then grant once; capped stack reports overflow | One-of-each at receive; stack cap in checkInstance (items.ts:408) | Cooldown and farm bits | REUSE (grant-once); cooldown SKIP | items.ts:523 |

## Merged additions (one build each)
- G1 Stack placement. Notes: shattered-pixel, EQEmu, Barony, crawl, flare, l1j, luanti. Rules to carry: a matching stackable tops up an existing stack before a free slot is needed, so a full pack still takes it; partial top-up moves min(requested, room) and the remainder stays at the source; same provenance, binding, tier and upgrade required (existing merge test); conservation per mint key holds after every step; refusal leaves both sides unchanged.
- G2 One loot-intake plan with overflow. Notes: 2004Scape, DOLSharp, fallout1, angband, dhewm3, endless-sky, fheroes2, forgottenserver, veloren, Mindustry (shrink). Rules: one `plan` returns requested, placed and leftover before any write; take-one is all or nothing and the claim stays open if the pack is full (no consumed claim, the kill still counts); collect lists may place what fits and leave the rest claimable; leftover never goes on the floor and never converts to gold; one of each still refuses a second copy; a shrunk pack keeps out-of-grid items withdraw-only. Open question for Strategy: where does a held leftover live (open claim row versus a pending location kind); Location has no pending kind today (items.ts:135).
- G3 Equipment swap and exclusion. Notes: TESArena, daggerfall, evennia, L2Solo, Card-Forge, rathena, BrogueCE. Rules: swap in one step, the displaced piece takes the freed pack slot (always fits); exclusion table in data (two-hander versus off hand) run by the server, not only the kit view; rank check unchanged (items.ts:477); saved loadouts store ids only; one-step undo of the last swap; equipment settled outside fights.
- G4 Inventory ops on the writer plus phone grid. Notes: Cubyz, otclient, dhewm3 (toasts), L2Solo (batch). Rules: client sends intent only (handlers.ts header), writer opens holdings (origins/server/holdings.ts), runs the pure op, writes in one transaction; batch deposit is one transaction; bank ops need `place` from presence, not the client; virtual grid for the 1,000-slot bank.

## Could not verify
- `intoBackpack`, named in docs/specs/origins/mobs.md:676, was not found by grep in src or origins; treated as spec wording only.
- No live pack UI file was located; the "lands in" for G4 grid is a new file.
- origins/mobs/kits.ts and the open-trade lock migration (202610070003) were listed but not read.
- Whether a death or zone-exit item loss ruling exists was not found in PROJECT_STATE.md or the specs searched.
- Origins currency ("metal", migration 202610070007) was not read, so coin overflow is not covered.
