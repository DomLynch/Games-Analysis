# Gap check GM (Garry's Mod family and s&box) - date 2026-10-12 - Frankendom repo commit 8d6ae33a9 (read-only)

## For Dom
1. 12 donor notes (GM001-GM004), 10 distinct ideas after merging the three chat notes into one.
2. REUSE 2 (housing, bounty: the design already exists in our specs, no code yet), ADD 3, SKIP 5.
3. Top addition 1: phone stick dead zone with smooth ramp and a release point (small, real, lands in `src/input.ts`).
4. Top addition 2: one server chat gate (rate window, recipient list shared with the "who hears me" preview). Spec is written, no code, and GAME_SPEC lists chat as deferred, so build it when chat opens.
5. Top addition 3: hash-pin a content bundle after it passes the reference check (reference check itself already exists).
Licence note: GM002 (Garry's Mod) has no declared licence, so those rows carry the idea only, no donor numbers. s&box and DarkRP are MIT.

## Table
| Donor note | Idea (8 words) | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| GM001 input-touch-controls | Dead zone once, rescale, press and release points | `src/input.ts:384-392` radial dead zone 0.12, hard cut to zero; `:405-420` pointer capture and release | Output jumps from 0 to 0.12 (no rescale); no press/release hysteresis on analog-to-button | ADD | `src/input.ts` `moveStick`. Proposed `src/fight/input-stick.ts` does not exist (src/ is flat); a pure helper could be a new file beside `src/touch-router.ts` |
| GM001 chat-social-moderation (merged with GM002 chat, GM004 chat) | Host-only chat: rate window, recipients, block, mute | Design only: `docs/specs/origins/one-shard.md:84-92` (filter, strikes, 1 msg per 2 s, mute/block). No chat code anywhere. `GAME_SPEC.md:181` defers chat | Everything in code: single intake, per-channel-group cooldown key, one recipients function shared with the preview, exact-one-match name target, role/phase audience gate | ADD (later, gated on chat opening) | `origins/server/chat-intake.ts` and `chat-audience.ts` do not exist; nearest real homes `origins/presence/server.ts` + `wire.ts` and `origins/server/handlers.ts`. Build one `chat.ts`, not three |
| GM002 chat-social-moderation | Audience by phase, side and role | Nothing: no spectator or coach concept in `origins/pit/pit.ts`, `src/duel.ts`, `docs/pit-design.md` | Needs spectators first | Merged into the chat row (SKIP as its own feature) | same as chat row |
| GM004 chat-social-moderation | Cooldown by group, ambiguous-name refusal | Same as chat row | Same | Merged into the chat row | same as chat row |
| GM001 modding-authoring-tools | Verify bundle references, pin its hash | `origins/contracts/registry.ts:31-80` `loadContent` resolves every cross-reference and reports `unknown-id` with the path | No byte hash pin, no "skip rescan on same bytes", no publish step | ADD (hash pin only; drop the code scanner, our content is rows) | `origins/contracts/registry.ts` or `origins/region1/load.ts`; `origins/content/zone-publish-gate.ts` does not exist (no `origins/content/` folder) |
| GM002 modding-authoring-tools | Per-owner quota, default-deny paste | Nothing player-built; house is one preset per account (`living-world.md:351-358`) | No player-placed pieces to cap | SKIP: no user building in scope; revisit only if furniture arrives | none (`origins/server/content-quota.ts` absent) |
| GM002 character-creation-appearance | Appearance registry with fallback row | `origins/contracts/items.ts:62` item `appearance.asset`; `docs/specs/origins/body-families.md` mob family rows; `GAME_SPEC.md:181` defers a character creator | No saved player look to resolve | SKIP: no creator; retired-id fallback exists for loot (`origins/contracts/ids.ts:78,112`) | none (`origins/server/appearance-rows.ts` absent) |
| GM003 housing-player-built-spaces | Timed upkeep, release when unpaid | Design: `living-world.md:349-358` rent per week, 14 days' grace, contents go to bank, plot frees. No code | Spec already ahead of the donor (grace, no loss). Needs the metals ledger first (`origins/server/upgrade.ts:26`: not built) | REUSE the spec; nothing to take | `origins/server/housing.ts` absent; build from living-world.md after the ledger |
| GM003 reputation-factions-crime-justice | One bounty contract, two cooldowns | Design parked: `docs/specs/origins/feuds.md:393-399` (PvP bounty), `:477` posting record; held-place `bounty` state in `origins/server/location.ts:23` | No PvP; escrow and refund-on-abort rules should be added to feuds.md section 9 | REUSE the spec; add "escrow at accept, refund on abort, re-check gates at accept" to it | `docs/specs/origins/feuds.md`; `origins/server/bounty.ts` absent |
| GM003 trading-barter-vendors | Vendor with owner margin and one-sale lock | `docs/specs/origins/trading.md:17-18`: barter only, no currency in player trade (Dom, 2026-10-07); housing "Not a vendor" (`living-world.md:358`) | Conflicts with the ruling | SKIP | none |
| GM004 economy-trade | Escrow instrument for money, refund on every exit | Item escrow exists (`origins/contracts/economy.ts`, `items.ts:134` `trade-escrow`); metal is not an item (`economy.ts:70`); metals ledger not built; no duel wager (`src/duel.ts`, `docs/duel-architecture.md` have none) | Money escrow has no use under the barter-only ruling. Keep one lesson: every cancel path must return the escrow (already in trading.md section 2.5) | SKIP | none (`origins/server/ledger.ts` absent) |
| GM004 character-stats-skills | Fed meter, starvation damage, sleep freeze | Nothing (no hunger/tired in code or specs); combat stamina/fatigue is separate (`src/fatigue.ts`) | Out-of-fight survival meter is not in the fighting-game scope | SKIP | none (`origins/server/condition.ts` absent) |

## Merges
- Three chat notes (GM001, GM002, GM004) propose the same server chat gate: one build, one file.
- GM003 vendor and GM004 escrow both need a currency trade; both stop at the same ruling.

## Not verified
- I did not open the donor repos, only the notes' headline lines and "Lands in" sections.
- "No chat code" and "no spectator concept" come from keyword searches (chat, whisper, spectat) over `origins/` and `src/`, not a full read.
- Whether an unmerged branch already has stick or chat work: not checked (clean checkout only).
