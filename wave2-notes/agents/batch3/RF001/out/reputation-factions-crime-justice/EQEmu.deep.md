# EQEmu (reputation-factions-crime-justice, cell 2)

Donor: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` (with `zone/hate_list.cpp`, `zone/attack.cpp`, `zone/zonedb.cpp`, `common/faction.cpp`, `zone/aggro.cpp`) | Licence: GNU GPL version 3 (`/mnt/frankendom-donors/EQEmu/LICENSE.md` line 3, "Version 3, 29 June 2007"; file headers say "either version 3 of the License") | C++ | symbol `Client::SetFactionLevel2`, `Client::UpdatePersonalFaction`, `Client::RewardFaction`, `HateList::DoFactionHits`

Checked: read in full or in the relevant part: `zone/zone_npc_factions.cpp` (all 299 lines; it only loads and caches the faction tables and never applies a hit, so it is not the mechanism; read to rule it out), `zone/client.cpp` 8173-8240, 8243-8460 and 9107-9194, `zone/hate_list.cpp` 287-310, `zone/attack.cpp` 2470 (signature), 2609-2660, 2694-2776 (in part), `zone/zonedb.cpp` 3362-3417 and 3500-3560, `common/faction.cpp` 23-130 (con bands), `common/ruletypes.h` 690 and 1065-1072, `common/features.h` 207-208, `zone/aggro.cpp` 722-870 and 972-1025 (in part, for the PvP gate). Callers: `DoFactionHits` has one caller (attack.cpp 2658); `UpdatePersonalFaction` is called from `SetFactionLevel` and `SetFactionLevel2` (both read); `RewardFaction` is called from `DoFactionHits` (hate_list.cpp 303); other callers (questmgr.cpp 1605, Perl and Lua wrappers) were not read. Not read: the body of `SetCharacterFactionLevel` (zonedb.cpp 3456, only the insert line was seen), the meaning of the `temp` flag in play (what happens to a temporary faction on death or logout), `GetFactionBonus` and `GetItemFactionBonus` bodies, `NPC::CheckAggro`, the merit-split branches of `NPC::Death` in full, and the task-reward caller (task_client_state.cpp 1051-1065). Confidence: high on the personal ledger, the range clamp, the con bands and the association spread (all read end to end); medium on the hate-list fan-out ordering, because the hate-list wipe timing inside `NPC::Death` was not checked. camera_scope: not applicable.

Best transferable idea: a faction standing is a personal value kept inside a range set by the faction's base (so a faction can start high and still be earned both ways), a hit spreads to linked factions by a per-link multiplier, and the hostile flag is just the lowest band of one number, not a separate state.
Decision (proposed): adapt - keep the clamped personal range, the base-relative bands and the linked-faction spread; reward the server-verified contributors instead of every client on the hate list (the donor gives the full hit to every client that is on the list); fix the zero-modifier defect.
Acceptance: after a kill, a player who dealt damage sees their con with that NPC's faction move to the next band; a second kill raises the value but never past the zone's range ceiling; a server test asserts that a zero association modifier changes nothing and that a negative hit never raises standing in a linked faction.

Secondary (same donor, PvP hostile flag): `Mob::IsAttackAllowed` lets two clients fight only when both have the PvP flag or are dueling each other (aggro.cpp 840-855), and `IsBeneficialAllowed` lets clients help each other only when their PvP flags match, or when they are dueling (aggro.cpp 1012-1023). Recorded under section 1 and gaps; the sketch covers the faction ledger only.

## 1. Mechanism

One personal number per character per faction; the con band is read from it; kills and quests change it; a hit can spread to linked factions. Order of operations for one kill:

- Kill. `NPC::Death` takes the top damage dealer as the experience giver (attack.cpp 2612). If that giver is a client and merit-based faction is off (default false, ruletypes.h 690), it calls `hate_list.DoFactionHits(GetNPCFactionID(), GetPrimaryFaction(), GetFactionAmount())` (attack.cpp 2657-2658).
- Fan-out. `DoFactionHits` walks the whole hate list (hate_list.cpp 292-309). Every client on the list gets a hit. If the NPC has a primary faction and a faction amount, the client gets `RewardFaction(faction_id, faction_value)` (302-303); otherwise it gets the older `SetFactionLevel` path driven by the NPC's faction id (305). This is not a split of the reward: each client on the list receives the full value.
- Reward. `RewardFaction` first applies the amount to the primary faction (`SetFactionLevel2`, client.cpp 9109). It then looks up the faction's linked factions (9111), scales each link's modifier by the amount (9143), and turns each into a signed step of at least one point in magnitude (9156, 9169). Each non-empty link is applied through `SetFactionLevel2` (9181-9192).
- Personal range. `SetFactionLevel2` computes the range for the faction (8352-8355): floor `min(0, min - base)`, ceiling `max(0, max - base)`, from the faction row's min and max (zonedb.cpp 3527-3529, 3557-3558; the defaults are -2000 and 2000, features.h 207-208). It reads the current personal value (8358), runs an optional Lua override (8361-8369), and calls `UpdatePersonalFaction` (8371).
- Update. `UpdatePersonalFaction` (client.cpp 8397-8447) first applies the Heroic Charisma bonus: a percentage of the hit, or a chance to double it when the percentage truncates to zero (8402-8414). Then it repairs an out-of-range value to the nearest bound (8419-8428). Otherwise it changes the value only when the hit is not already pushing against the bound it is moving towards (8429-8432), adds the hit (8436), clamps to the range (8438-8441) and writes the row (8443).
- Read. `GetCharacterFactionLevel` returns the stored personal value (8381-8390). `GetFactionLevel` (the con shown to a player) adds alliance and item bonuses (8220-8222), computes the band (8224), turns a merchant's threatening or scowling con into dubious (8233-8234), and turns any non-scowling con into threatening when the NPC's aggro check passes (8236-8237).
- Band. `CalculateFaction` (common/faction.cpp 57-88) sums the personal value, the base and the class, race and deity modifiers (61), then returns the first band whose minimum it meets (63-86), in this order: ally 1100, warmly 750, kindly 500, amiably 100, indifferently 0, apprehensively -100, dubiously -500, threateningly -750 (ruletypes.h 1065-1072), otherwise scowls (87).
- Modifier keys. Class, race and deity modifiers are stored per faction under keys `c<id>`, `r<id>` and `d<id>` (zonedb.cpp 3376-3411).
- Quest hits. When `is_quest` is set, the sign of each entry value is flipped (client.cpp 8273-8279).

## 2. Key functions

- `Client::SetFactionLevel2`: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` 8328-8379. Range, read, update and message for one faction.
- `Client::UpdatePersonalFaction`: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` 8397-8447. Heroic Charisma bonus, repair, change and clamp, database write.
- `Client::RewardFaction`: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` 9107-9194. Primary hit, then linked factions scaled by modifier and at least one point.
- `HateList::DoFactionHits`: `/mnt/frankendom-donors/EQEmu/zone/hate_list.cpp` 288-310. Fan-out over the hate list.
- `CalculateFaction`: `/mnt/frankendom-donors/EQEmu/common/faction.cpp` 57-88. Con bands.
- `Client::GetFactionLevel`: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` 8187-8240. The con a player sees, including the aggro override.
- `Mob::IsAttackAllowed` (PvP): `/mnt/frankendom-donors/EQEmu/zone/aggro.cpp` 722-870, with the client-to-client branch at 835-856.

## 3. Numbers vs mechanism

| Reusable rule (formula) | Donor value (range) | Where in donor |
|---|---|---|
| Personal floor = `min(0, min - base)`; ceiling = `max(0, max - base)` | faction min and max default -2000 and +2000; floor and ceiling never on the wrong side of zero | client.cpp 8286-8290; zonedb.cpp 3528-3529, 3557-3558; features.h 207-208 |
| Hit changes value only if not already at the bound it pushes against; result clamped | range width = max - min; bound-stuck hits are no-ops | client.cpp 8419-8441 |
| Con band = personal + base + class + race + deity, first threshold met wins | ally 1100, warmly 750, kindly 500, amiably 100, indifferently 0, apprehensively -100, dubiously -500, threateningly -750, scowls below | common/faction.cpp 61-87; ruletypes.h 1065-1072 |
| Hostile flag = lowest bands (threatening or scowls) | threatening from -750 up to just under -500 (dubious starts at -500); scowls below -750; a merchant's threatening or scowling con is capped at dubious | common/faction.cpp 84-87; client.cpp 8233-8237 |
| Linked-faction spread: `link_mod x amount`, magnitude at least 1, sign kept | mod per link (data); floor of 1 point (donor; see defect 1) | client.cpp 9143, 9156, 9169 |
| Heroic Charisma bonus: `value x (CHA/5) / 100`; chance to double when the result truncates to zero | CHA/5 percent (data via item bonus); chance = CHA/5 percent | client.cpp 8404-8414 |
| Kill hit goes to each client on the hate list | full `faction_amount` per client (per NPC data); not split | hate_list.cpp 296-303; attack.cpp 2657-2658 |
| Merit-based split (off by default) | rule `NPC.EnableMeritBasedFaction` default false | ruletypes.h 690; attack.cpp 2701, 2734, 2768 |
| Quest sign flip | sign of entry value inverted | client.cpp 8273-8279 |
| Personal value write | one database write per changed faction | client.cpp 8443 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for one hit: the personal range comes from the faction base, the value is repaired or changed and then clamped, the con band reads the same number, and linked factions are applied after the primary, each as at least one signed point unless the link modifier is zero. It omits: the Heroic Charisma bonus and its chance rounding; the quest sign flip; the Lua override; the `temp` flag and the database write; the GM exemption; the alliance and item bonuses; the per-character map load; the fan-out over the hate list and the merit split; the merchant cap and the aggro override on the con. The zero-modifier rule is a fix: the donor gives one point to a linked faction even when its modifier is zero (defect 1), and the sketch skips it.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Personal faction ledger: each faction has a personal range around its base; a hit moves the personal value
// inside that range; a hit to one faction spreads to its associated factions, scaled by a per-link modifier.

export interface FactionDef {
  base: number;                 // faction base standing (data)
  min: number;                  // personal floor before base adjustment (donor default -2000)
  max: number;                  // personal ceiling before base adjustment (donor default 2000)
}

export interface Assoc {
  id: number;                   // associated faction id (0 = unused slot)
  mod: number;                  // multiplier applied to the hit
}

// Donor: this_faction_min = min(0, min - base); this_faction_max = max(0, max - base).
export function personalRange(def: FactionDef): { lo: number; hi: number } {
  return { lo: Math.min(0, def.min - def.base), hi: Math.max(0, def.max - def.base) };
}

// Donor UpdatePersonalFaction: an out-of-range value is repaired; a hit moves the value unless it already
// sits at the bound it pushes against; the result is clamped to the range.
export function applyHit(current: number, hit: number, lo: number, hi: number): number {
  if (current > hi) return hi;
  if (current < lo) return lo;
  if (hit === 0) return current;
  if ((hit > 0 && current === hi) || (hit < 0 && current === lo)) return current;
  return Math.min(hi, Math.max(lo, current + hit));
}

// Donor RewardFaction: each associated faction gets mod x amount, at least 1 in magnitude, keeping the sign.
// fix: a zero modifier gives no change (the donor's max(1, ...) gives +1 for a zero modifier, see defect 1).
export function spread(amount: number, mods: number[]): number[] {
  return mods.map((m) => {
    if (m === 0) return 0;
    const scaled = m * amount;
    const mag = Math.max(1, Math.trunc(Math.abs(scaled)));
    return scaled < 0 ? -mag : mag;
  });
}

// Donor CalculateFaction: the con band for personal value + base + class/race/deity modifiers.
const BANDS: Array<[number, string]> = [
  [1100, "ally"],
  [750, "warmly"],
  [500, "kindly"],
  [100, "amiably"],
  [0, "indifferently"],
  [-100, "apprehensively"],
  [-500, "dubiously"],
  [-750, "threateningly"],
];

export function con(personal: number, base: number, modSum: number): string {
  const v = personal + base + modSum;
  for (const [min, name] of BANDS) {
    if (v >= min) return name;
  }
  return "scowls";
}

export class FactionLedger {
  private values = new Map<number, number>();

  constructor(private defs: Map<number, FactionDef>) {}

  hit(factionId: number, amount: number, assoc: Assoc[] = []): void {
    this.applyOne(factionId, amount);
    const spreadAmounts = spread(amount, assoc.map((a) => a.mod));
    assoc.forEach((a, i) => {
      if (a.id > 0 && spreadAmounts[i] !== 0) this.applyOne(a.id, spreadAmounts[i]);
    });
  }

  value(factionId: number): number {
    return this.values.get(factionId) ?? 0;
  }

  private applyOne(factionId: number, hit: number): void {
    const def = this.defs.get(factionId);
    if (!def) return;
    const { lo, hi } = personalRange(def);
    this.values.set(factionId, applyHit(this.value(factionId), hit, lo, hi));
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/faction.ts` (proposed new module; no file of that name exists yet): the personal ledger that the server updates when a kill is verified. The reward is a kill reward, so it sits with the XP and loot award. Parity-checklist row 18 (loot roll and XP award; the kill reward is awarded on the server in the same step).
- Data: faction base, min and max, and the per-faction class, race and deity modifiers are catalogue data; the per-NPC faction amount is zone data (it differs per NPC); the band thresholds are engine constants.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 18 (kill reward); server-verified kills (the reward goes to contributors the server verified, not to every client on the hate list).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described mechanism and no donor line is translated.
- Fan-out: the donor gives the full hit to every client on the hate list (hate_list.cpp 296-303). That is the opposite of a contribution rule and would make a group of five each earn the full value. Our server-verified kill rule should pick the contributors (damage or threat share) and split by rule if needed. The donor's merit split (off by default) is the closest existing option; its branch was only partly read.
- Hate-list timing: whether the hate list is wiped before `DoFactionHits` runs was not checked; the order in `NPC::Death` must be fixed in our kill step, not inherited.
- Temporary factions: the `temp` flag is stored with each change (client.cpp 8443) but what it does on death or logout was not read.
- Database writes: each changed faction is written on the spot (client.cpp 8443). For a fight with many linked factions that is many writes per kill. Frankendom should batch them into the one ledger write per kill.
- Charisma bonus: a percentage of the hit with a random doubling on truncation (client.cpp 8404-8414). This is a designer's option, not a rule of the ledger; as data it should be a catalogue field, and the random draw must come from the server's seeded source to stay server-verified.
- PvP flag (secondary): the donor's two-sided flag (both must be flagged to attack, aggro.cpp 840-845) is a clean hostile-flag rule for our open PvP flag. The duel exception (aggro.cpp 846-853) is a separate rule that we would keep as data.
- Quest sign flip (client.cpp 8273-8279): a quest reward that is a loss on the faction should be a separate reward type in our catalogue, not a sign trick.

Defects (fix each; idea kept):
1. Linked-faction floor of one point: `std::max(1, static_cast<int>(std::abs(temporary_values[0])))` (client.cpp 9169) gives one point even when the modifier is zero, and the sign test (9156) treats zero as positive. So a zero link turns any hit, including a loss, into a +1 gain in that linked faction. fix: skip any link whose modifier is zero before scaling (done in the sketch, `spread`), and keep the one-point floor only for non-zero modifiers.
2. Every client on the hate list gets the full hit (hate_list.cpp 296-303). This is a design choice and a gap, not a coding error; fix: reward contributors chosen by the server (see gaps).
3. Charisma bonus rounding is handled by a chance to double (client.cpp 8411-8412); the idea is sound, and no defect was found in the read code.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 18 (kill reward and ledger); server-verified kills (contributor rule, gap 2).
