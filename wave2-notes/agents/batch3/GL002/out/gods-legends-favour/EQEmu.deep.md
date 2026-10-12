# EQEmu (gods-legends-favour, cell 1)

Donor: `/mnt/frankendom-donors/EQEmu/zone/tribute.cpp` | Licence: GPL-3.0 (LICENSE.md line 1 "GNU GENERAL PUBLIC LICENSE", version 3; tribute.cpp header "either version 3 of the License, or ... any later version") | C++ | symbol `Client::ToggleTribute`

Checked: Read in full: `Client::ToggleTribute` (zone/tribute.cpp:38, ends before 89), `Client::DoTributeUpdate` (89), `Client::ChangeTributeSettings` (168), `Client::TributeItem` (216), `Client::TributeMoney` (251), `Client::AddTributePoints` (262), `ZoneDatabase::LoadTributes` (314). Read the callers: renewal (zone/client_process.cpp:534-535), packet handlers (zone/client_packet.cpp:15967, 15994, 16018, 16032), bonus gate (zone/bonuses.cpp:177-186). Not read: guild tributes (tribute.cpp:374 onward), `Client::Death`, faction and deity code. Confidence high for the personal tribute mechanism. The tier data rows (costs, levels, item ids) are NOT in the donor box: only the table names and column list exist (common/database_schema.h:252-253), so every tier number is "(not read)". camera_scope: not a camera cell.

Best transferable idea: Check every slot of a multi-slot blessing set before charging anything, charge once, then renew on a server timer that switches the set off when the balance is short.
Decision (proposed): adapt - take the check-all-then-charge-once activation and the renew-or-switch-off timer for favour blessings; fix the donor's level bypass (a too-low tier must refuse the whole activation); express blessings as timed rows on the CC/effect ladder, not as item stat blocks.
Acceptance: A server test: a level-10 player asks for a blessing tier that needs level 20; the request is refused, the favour balance is unchanged and no blessing row exists. A second test: at 600000 ms on the server clock the blessing renews once and debits the tier cost; with too little favour the blessing row ends.

## 1. Mechanism

- One spendable balance (`m_pp.tribute_points`) is filled by three gains. Item donation: the item's `Favor` field times the quantity (`TributeItem`, tribute.cpp:223, 243; the packet is client_packet.cpp:15967). Platinum donation: `TakeMoneyFromPP(platinum * 1000)` takes the copper and `AddTributePoints(platinum)` adds one point per platinum (tribute.cpp:252, 258). A career total (`career_tribute_points`) counts gains only, never spends (tribute.cpp:267-271). No decay of the balance was found in the code read.
- Each tribute slot holds a tribute id and a tier index (0 to 9; `MAX_TRIBUTE_TIERS` is 10). Tribute rows come from the `tributes` table (id, name, descr, unknown, isguild, tribute.cpp:322) and tier rows from `tribute_levels` (tribute_id, level, cost, item_id, tribute.cpp:340). Load rejects tiers past the cap (tribute.cpp:356).
- Activation, `ToggleTribute(true)`, in order: (a) loop over the slots from tribute.cpp:44, skipping empty slots, unknown ids and bad tier indexes (the skips sit between 44 and 60); (b) if the player level is below `tier.level`, print a message, call `ToggleTribute(false)` and `continue`, so that slot adds no cost (tribute.cpp:61-65); (c) otherwise `cost += tier.cost` (67); (d) if `cost > m_pp.tribute_points`, call `ToggleTribute(false)` and return (70-73); (e) charge `AddTributePoints(0-cost)` (75), set the timer to `Tribute_duration` (78-79), set `tribute_active = 1` (81), then `DoTributeUpdate()` (86).
- Defect in (b): the level-too-low branch does not return. Control falls through to (d) and (e), so the blessing turns on with the too-low tier still in its slot. `DoTributeUpdate` then summons the item for every slot (tribute.cpp:138) and `bonuses.cpp:177-186` adds every slot's item bonus with no level check. The renewal path calls the same function (client_process.cpp:534-535), so the bypass repeats every renewal. Fix: return a refusal from the whole activation, as the sketch does.
- Defect in settings: `ChangeTributeSettings` (tribute.cpp:168) takes a new tier while the tribute is active. Its only check is `t->tiers[r] >= d.tier_count` (the tier count). Line 187 says "might want to check required level, even though its checked before activate". So a player can raise a tier while active, with no level check and no charge, until the next renewal. Fix: apply the level check and charge the upgrade at once (sketch `setTierWhileActive`).
- Renewal: `tribute_timer` is a `Timer` built from `Tribute_duration` (client.cpp:459). It is checked at client_process.cpp:534. `Timer::Check` defaults to `iReset = true` (common/timer.h:38). Then `ToggleTribute(true)` charges again. A failed charge calls `ToggleTribute(false)`, which clears `tribute_active`, disables the timer and calls `DoTributeUpdate()` (tribute.cpp:72-74, 89 onward). So a blessing renews every 600000 ms and ends when the balance cannot pay.
- Off: `ToggleTribute(false)` sets `tribute_active = 0`, disables the timer and calls `DoTributeUpdate`, whose else branch (tribute.cpp:147-154) deletes the tribute items from their slots with `DeleteItemInInventory`.
- Effect: while `tribute_active`, every slot's item is added as item bonuses (`bonuses.cpp:177`, `AddItemBonuses` at 186). The blessing is therefore a stat block on an item, not a timed status row.
- Trigger: the player's toggle (`Handle_OP_TributeToggle`, client_packet.cpp:16018), the settings change (`Handle_OP_TributeUpdate`, client_packet.cpp:16032) and the renewal timer (client_process.cpp:535). Callers checked: `ToggleTribute` has four call sites (tribute.cpp:63 and 72 inside itself, client_process.cpp:535 for renewal, client_packet.cpp:16018 for the toggle); `ChangeTributeSettings` has one (16032); `TributeItem` has one (15967); `TributeMoney` has one (15994).

## 2. Key functions

- `Client::ToggleTribute`: `/mnt/frankendom-donors/EQEmu/zone/tribute.cpp` 38-87 (the level skip 61-65, cost check 70-73, charge and timer 75-86).
- `Client::DoTributeUpdate`: `/mnt/frankendom-donors/EQEmu/zone/tribute.cpp` 89-155 (summon per slot at 138, `CalcBonuses()` at 154, delete when off).
- `Client::ChangeTributeSettings`: `/mnt/frankendom-donors/EQEmu/zone/tribute.cpp` 168-194 (tier-count check only; comment at 187).
- `Client::TributeItem`, `Client::TributeMoney`, `Client::AddTributePoints`: `/mnt/frankendom-donors/EQEmu/zone/tribute.cpp` 216-278 (donation values, balance, career total).
- `ZoneDatabase::LoadTributes`: `/mnt/frankendom-donors/EQEmu/zone/tribute.cpp` 314-372 (two queries, tier cap).
- Renewal call: `/mnt/frankendom-donors/EQEmu/zone/client_process.cpp` 534-535.
- Bonus application: `/mnt/frankendom-donors/EQEmu/zone/bonuses.cpp` 177-186.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sum the cost of every active slot, refuse if it exceeds the balance, charge once, then arm the timer | Cost per tier is a data row (`tribute_levels.cost`, tribute.cpp:340). Values not in donor box. |
| Timer renewal: the set pays again at each expiry and switches off when short | 600000 ms (`Tribute_duration`, common/features.h:157; the enum at features.h:145 says "all in milliseconds") |
| Tier cap per set slot | 10 tiers (`MAX_TRIBUTE_TIERS`, common/eq_packet_structs.h:4072) |
| Donation rates: item value x quantity; platinum to points at one point per platinum | `Favor` per item (item data, not read); 1 point per platinum; 1000 copper per platinum (tribute.cpp:252, 258) |
| Empty slot sentinel | `TRIBUTE_NONE = 0xFFFFFFFF` (common/eq_packet_structs.h:741) |
| Level gate per tier | `tier.level` per row (tribute.cpp:61) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's order (check all slots, then one charge, then arm the timer) but fixes the level bypass: a too-low tier refuses the whole activation. It adds a tier change while active with a level check and an upgrade charge (the donor has neither). The renewal `tick` drops overshoot past zero, as the donor's timer restart does. It omits: the item summon and `CalcBonuses` (the donor's blessing is an item stat block; the sketch treats it as a row), the career total, the guild tributes, the packet handlers, the message texts, the database load (the catalogue is passed in), and the donor's `Timer` class.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface TierRow { level: number; cost: number; itemId: number; }
interface TributeRow { id: number; tiers: TierRow[]; }
interface Slot { tributeId: number | null; tier: number; }
interface Player {
  level: number;
  favour: number;        // one ledger row: the spendable balance
  active: boolean;
  timeLeftMs: number;
  slots: Slot[];
}

const TRIBUTE_DURATION_MS = 600000;   // engine constant (donor: common/features.h:157)

// Activation: check every slot first. A too-low level refuses the WHOLE activation (fix: the donor
// skips the slot, still charges the rest and still turns the blessing on).
function activate(p: Player, catalog: Map<number, TributeRow>): { ok: boolean; reason: string; cost: number } {
  let cost = 0;
  for (const s of p.slots) {
    if (s.tributeId === null) continue;
    const row = catalog.get(s.tributeId);
    if (!row) continue;
    const tier = row.tiers[s.tier];
    if (!tier) continue;
    if (p.level < tier.level) return { ok: false, reason: "level", cost: 0 };
    cost += tier.cost;
  }
  if (cost > p.favour) return { ok: false, reason: "favour", cost: 0 };
  p.favour -= cost;
  p.timeLeftMs = TRIBUTE_DURATION_MS;
  p.active = true;
  return { ok: true, reason: "", cost: cost };
}

// Tier change while active: the same level check applies, and the upgrade is paid now.
// Fix: the donor takes the new tier with no level check and no charge until the next renewal.
function setTierWhileActive(p: Player, slot: number, tier: number, catalog: Map<number, TributeRow>): boolean {
  const s = p.slots[slot];
  const row = s && s.tributeId !== null ? catalog.get(s.tributeId) : undefined;
  if (!row || !row.tiers[tier]) return false;
  const want = row.tiers[tier];
  if (p.level < want.level) return false;
  const old = row.tiers[s.tier] ? row.tiers[s.tier].cost : 0;
  const diff = Math.max(0, want.cost - old);
  if (diff > p.favour) return false;
  p.favour -= diff;
  s.tier = tier;
  return true;
}

// Timer step, called with the ms elapsed since the last step. When the timer runs out the blessing
// renews and pays again; if the balance is short it switches off. Overshoot past zero is dropped.
function tick(p: Player, elapsedMs: number, catalog: Map<number, TributeRow>): void {
  if (!p.active) return;
  p.timeLeftMs -= elapsedMs;
  if (p.timeLeftMs > 0) return;
  const r = activate(p, catalog);
  if (!r.ok) { p.active = false; p.timeLeftMs = 0; }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {}` appended, exit 0.

## 5. Lands in

- TARGET `src/fight/favour.ts` (new module; one favour ledger row per character, plus timed blessing rows). Parity-checklist row 13 (specials). Blessing rows feed the CC/effect ladder; no item stat blocks.
- today: none in Frankendom; favour and blessings are not built yet.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one ledger (favour is a Core ledger row, charges written only by the server); rule numbers in the focus brief n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not the donor lines.
- The level bypass is a real defect in the donor (both at activation and at each renewal). Frankendom must refuse the whole activation (sketch `activate`) and test it with the server test in the Acceptance line.
- The tier-change-while-active path has no level check and no charge in the donor. Frankendom must charge the upgrade at once (sketch `setTierWhileActive`).
- The donor runs the renewal on a client-side timer (client_process.cpp:534), and the toggle comes from the client packet. Frankendom's kills and ledger are server-verified: the renewal must be a server tick, and the client only requests.
- The donor's blessing is item bonuses on an item in a tribute slot, not a timed status row. Frankendom wants timed rows on the one CC/effect ladder. The item-bonus shape does not transfer.
- Tier costs, levels and item ids are data rows that are not in the donor box. Their values are unknown here. Frankendom would keep them as catalogue rows (zone data), not constants.
- The balance has no decay in the code read. Losses are spends only.
- Guild tributes (a separate guild favour pool, tribute.cpp:374 onward) were not read and are not used here.

## GL table (gods-legends-favour, focus rows 1-14)

| # | Name | Effect | Formula | Number ranges | Gain/loss events | Decay | file:line |
|---|---|---|---|---|---|---|---|
| 1 | Favour as a resource (tribute points) | Spendable balance spent on blessings | balance += item Favor x qty; balance += platinum; balance -= sum of tier cost on activate and renewal | Favor per item: item data (not read); 1 point per platinum | Gain: item donation (tribute.cpp:223, 243), platinum donation (252, 258). Spend: activate (70-75), renewal (client_process.cpp:534-535). Career total counts gains only (267-271) | None in code read | tribute.cpp:216-278 |
| 2 | Blessings as timed rows | Tribute set active for a fixed time; item bonuses applied while active | Timer = Tribute_duration; renewal on expiry | 600000 ms (common/features.h:157) | Start on activate (78-79); renewal each expiry; off on failed renewal (72-74) | Timer, not balance | tribute.cpp:78-79; bonuses.cpp:177-186. Curses: none in the tribute code (grep of "curse" hits 3 files; not read) |
| 3 | Patron choice and switching | Not in the tribute code | Not read. Deity bit: zone/mob.h:563 (pointer only). changedeity: zone/questmgr.cpp:1201 (not read) | Not read | Not read; no conversion cost or apostasy found in the tribute code | Not read | zone/mob.h:563 (pointer only) |
| 4 | Divine domains as tags | Not read | Not read | Not read | Not read | Not read | Deity bitmask (zone/mob.h:563, pointer only) |
| 5 | Boons at favour thresholds | Tiers are gated by character LEVEL, not favour | Tier i cost = tribute_levels.cost; gate = tier.level | Max 10 tiers (common/eq_packet_structs.h:4072); values not in box | Level gate: tribute.cpp:61-65 (defective, see section 1) | None | tribute.cpp:340, 356 |
| 6 | Legend signature powers | None in this donor's tribute code | - | - | - | - | none found (grep: no tribute hit) |
| 7 | Shapeshifting | None found | grep "shapeshift": 0 files | - | - | - | none found |
| 8 | Avatars or summons under limits | None in tribute code | grep "avatar": 1 file (not read) | - | - | - | none found in read code |
| 9 | Fate, luck, oaths | None found | grep "oath": 0 files; "luck": 1 file (not read) | - | - | - | none found in read code |
| 10 | Underworld and death rules | Not read | Not read | Not read | Not read | Not read | pointer: zone/attack.cpp:1814 `Client::Death` (not read) |
| 11 | Mounts as rewards | Not read | grep "mount": 5 files (not read) | - | - | - | none read |
| 12 | Relics | Not read | grep "relic": 3 files (not read) | - | - | - | none read |
| 13 | Temples and shrines | Not read | grep "temple": 3 files; "shrine": 1 file (not read) | - | - | - | none read |
| 14 | Pantheon factions and standing | Not read | Not read | Not read | Not read | Not read | pointer: zone/client.cpp:8187 `Client::GetFactionLevel` (not read); guild tributes separate (tribute.cpp:374, not read) |

Grep counts above are file counts from one `grep -rliw` pass over zone/ and common/ on the VPS; they are pointers, not reads.

Best transferable idea (restated for the table): one favour balance paid into timed blessing rows, where activation checks every row before one charge and the server renews or switches off the row.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: one ledger (favour is a Core ledger row, charges written only by the server); rule numbers in the focus brief n/a
