# daggerfall-unity (pets-mounts-taming, cell 29)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/UserInterfaceWindows/DaggerfallQuestPopupWindow.cs` (plus `Assets/Scripts/Game/Formulas/FormulaHelper.cs`, `Assets/Scripts/Game/Utility/Dice100.cs`, `Assets/Scripts/Game/Guilds/MagesGuild.cs`) | Licence: MIT (LICENSE: "MIT License", Copyright (c) 2009-2023 Daggerfall Workshop; code may be adapted) | C# (Unity) | symbol `DaggerfallQuestPopupWindow.DaedraSummoningService` (with `ConfirmSummon_OnButtonClick`)

Checked: read in full: `DaggerfallQuestPopupWindow.cs` 33-68 (DaedraData struct and the 16-row table), 166-216 (service entry and day pick), 218-281 (confirm: cost, payment, replacement, bonus, chance, roll, flags); `FormulaHelper.cs` 1958-1974 (summon cost and chance); `Dice100.cs` 1-25; `MagesGuild.cs` 150-160 (rank gate, read as a lookup). Read in part: `TransportManager.cs` 23-140, 206-213, 330-372 (mount toggle, mode change, dismount on interior entry; the mount is a secondary mechanism, see section 3) and `Player/PlayerSpeedChanger.cs` 29-34, 120-166, 389-411 (riding speed, run lock). Not read: `RefreshWalkSpeed` (`PlayerSpeedChanger.cs` 288-337; so the walk formula below is the initial one, not confirmed as the per-frame walk speed), reputation and flag storage (`GetReputation`, `GetFlag`, `SetFlag`), the quest popup after line 281, the `CreateFoeSpawner` argument meanings, the witches coven window (`DaggerfallWitchesCovenPopupWindow.cs` 186 and 199 call the same service; grep only), faction reputation value ranges. Taming and pets: grep for `tame` gives 2 hits, both MIDI parser files (`AudioSynthesis/Midi`); grep for `companion` gives 0 hits; no taming, pet, or stabling system found. The 31 `stable` hits were not opened (names look like the adjective). Confidence: high on the summon order and formulas (read end to end); medium on the coven failure spawn (arguments not read).

## 1. Mechanism

- Entry (`DaedraSummoningService`, 166-216). A faction's summon service reads the summoner's faction data (168-173; missing data logs and exits).
- Pick the entity for today (175-200):
  (a) Glenmoril witches always get entry 0, Hircine (176-179);
  (b) a witches coven gets one random entry from index 1 to 15 per in-game day, cached on the player (180-189; index 0 is excluded);
  (c) any other faction gets the first entry whose `dayOfYear` equals today (190-199; `break` on first match);
  (d) no match: the "not today" message and no cost (201-207).
- Confirm step (209-214): a yes/no box.
- Confirm (`ConfirmSummon_OnButtonClick`, 218-): cost = `200000 - 1000 x summoner reputation` (224; `FormulaHelper` 1964). Not enough gold: a message with the price (226, else branch 282-). Enough gold: gold is deducted (228) before any roll.
- Replacement (232-237): roll 1-100; if roll <= 5 (15 when storming), Sheogorath (entry 8) replaces the chosen entity.
- Bonus (239-244): 30 when the entity's condition is None, or Rain and raining, or Thunder and storming; else 0.
- Chance (247; `FormulaHelper` 1973): `30 + player's reputation with the entity's faction + bonus`. Roll 1-100 (248; `Dice100.Roll`, `Dice100.cs` 12). Fail when roll > chance (252): failure message (254); at a witches coven, 1 to 3 foes from 5 daedric types spawn (256-257); return with no quest.
- Success: if this entity's Summoned flag is already set, show the "already summoned" window (262-266). Otherwise set the flag (270) and offer the entity's quest if one exists (273-279).
- Order matters: payment (228) is before the replacement roll (234), the chance roll (248) and the flag (270). A failed roll keeps the gold spent.
- Tick: none. An event (a button press) with synchronous checks.

## 2. Key functions

- `DaedraSummoningService`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/UserInterfaceWindows/DaggerfallQuestPopupWindow.cs` 166-216. Entry, day pick, not-today path.
- `ConfirmSummon_OnButtonClick`: same file, 218-281. Cost, payment, replacement, bonus, chance, roll, flags, quest offer.
- `CalculateDaedraSummoningCost`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` 1958-1965. `CalculateDaedraSummoningChance`: same file, 1967-1974. Both check for a script override first (`TryGetOverride`).
- `Dice100.Roll`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Utility/Dice100.cs` 10-13. `Random.Range(1, 101)`, so 1 to 100 inclusive.
- Data table: `DaggerfallQuestPopupWindow.cs` 33-68 (struct 33-49; `daedraData` 51-68; `daedricFoes` 70-72).

## 3. Numbers vs mechanism

| Rule (formula) | Number or range | file:line |
|---|---|---|
| Day gate: entry matches when `dayOfYear == today` | 16 entries on 16 distinct days: 1, 13, 32, 46, 65, 81, 99, 129, 155, 190, 248, 278, 283, 302, 320, 350 (about 16 of 365 days) | DaggerfallQuestPopupWindow.cs 52-67; 194 |
| Witches coven pick: `Random.Range(1, daedraData.Length)` | index 1 to 15 (Hircine, index 0, excluded) | DaggerfallQuestPopupWindow.cs 185 |
| Sheogorath replacement: `roll <= (storming ? 15 : 5)` | 5% clear, 15% storm; replacement is index 8 | DaggerfallQuestPopupWindow.cs 233-236 |
| Cost: `200000 - 1000 x summonerRep` | 200000 at rep 0; minus 1000 per rep point; no floor | FormulaHelper.cs 1964; DaggerfallQuestPopupWindow.cs 224 |
| Bonus: 30 if cond None, or Rain and raining, or Thunder and storming | 0 or 30 | DaggerfallQuestPopupWindow.cs 240-244 |
| Chance: `30 + repWithEntityFaction + bonus` | no clamp; base 30 | FormulaHelper.cs 1973; DaggerfallQuestPopupWindow.cs 247 |
| Roll: `Dice100` 1-100; fail when `roll > chance` | success probability = min(chance, 100) / 100 (derived) | Dice100.cs 12; DaggerfallQuestPopupWindow.cs 248, 252 |
| Coven failure: count `Random.Range(1, 4)` (1 to 3); foe `Random.Range(0, 5)` (of 5 types) | 1-3 foes, 5 types | DaggerfallQuestPopupWindow.cs 256-257; 71 |
| Summon once: Summoned flag per entity faction | 1 per entity | DaggerfallQuestPopupWindow.cs 262, 270 |
| Mages Guild summon service rank gate | rank >= 6 | MagesGuild.cs 154-155 |
| Secondary, mount riding speed: `(LiveSpeed + dfRideBase) / 39.5`, `dfRideBase = 150 + 225 = 375` | ride base 375; cart base 250 (`dfWalkBase + 100`); ratio 39.5 | PlayerSpeedChanger.cs 30-34, 156-159 |
| Secondary, walk formula (initial; see Checked): `(LiveSpeed + 150 - 0.5 x (100 - max(LiveSpeed, 30))) / 39.5` | drag 0 at LiveSpeed 100, 35 at LiveSpeed 30 or less | PlayerSpeedChanger.cs 389-392 |
| Secondary, run lock while riding: `CanRun = !IsRiding` | no run while riding | PlayerSpeedChanger.cs 139 |
| Secondary, mount toggle: horse or cart -> foot; else horse if owned; else cart | horse before cart | TransportManager.cs 113-126 |
| Secondary, dismount on interior entry: building or dungeon interior -> foot | forced | TransportManager.cs 206-211 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (gold check, payment, replacement roll, chance roll, once-only flag). It omits the day-of-year lookup and the coven's daily random pick (the caller passes the entity), the faction data lookup, the "not today" and "not enough gold" messages (returned as codes), the quest offer and window pushes, the witches' failure ambush (the caller spawns foes on "failed"), and the donor's hard-coded replacement index 8 (the caller passes the replacement). The donor's Mages Guild rank gate is a service check outside the popup and is not in the sketch.

```ts
// Licence: MIT (donor). Sketch written from the described mechanism, not copied from the donor lines.
// clean-room
export {};

type BonusCond = "none" | "rain" | "thunder";

interface Weather {
  raining: boolean;
  storming: boolean;
}

interface Target {
  id: string;
  repWithPlayer: number;   // the player's reputation with this summoned entity's faction
  bonusCond: BonusCond;
}

interface Player {
  gold: number;
  summonedIds: Set<string>;
}

type SummonResult = "not-enough-gold" | "failed" | "already-summoned" | "summoned";

// Cost depends on the summoner's reputation, not the player's.
function summonCost(summonerRep: number): number {
  return 200000 - summonerRep * 1000;
}

// Chance in percent, no clamp in the donor formula.
function summonChance(targetRep: number, bonus: number): number {
  return 30 + targetRep + bonus;
}

// 30 applies when the condition is none, or when rain or thunder matches the weather.
function bonusFor(cond: BonusCond, w: Weather): number {
  const applies = cond === "none" || (cond === "rain" && w.raining) || (cond === "thunder" && w.storming);
  return applies ? 30 : 0;
}

// roll100() returns an integer 1..100. Order follows the donor: gold check, payment, replacement roll, chance roll, once-only flag.
function attemptSummon(
  target: Target,
  replacement: Target,
  summonerRep: number,
  player: Player,
  w: Weather,
  roll100: () => number,
): SummonResult {
  const cost = summonCost(summonerRep);
  if (player.gold < cost) return "not-enough-gold";
  player.gold -= cost;                          // paid before the roll: a failed summon keeps the gold

  const replaceChance = w.storming ? 15 : 5;
  const chosen = roll100() <= replaceChance ? replacement : target;

  const chance = summonChance(chosen.repWithPlayer, bonusFor(chosen.bonusCond, w));
  if (roll100() > chance) return "failed";

  if (player.summonedIds.has(chosen.id)) return "already-summoned";
  player.summonedIds.add(chosen.id);
  return "summoned";
}
```

## 5. Lands in

- TARGET `src/fight/summon.ts` (new module, proposed; this reader did not read the current Frankendom layout). One server-side summon action: gate by the day table, take the cost, roll the replacement and the chance, set the once-only flag, all in one write. Parity-checklist row 21 (catalogue fields): the day, bonus condition and entity id become catalogue fields on the summon row, and the cost and chance formulas become zone data (per summoner) with engine defaults.
- today: no summon model read in this reader's pass.
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; this sketch is written from the mechanism)
- Brief rule served: server-verified outcomes (the roll is on the server, never the client); one ledger (gold and the once-only flag in one write); zones as data (the day table and the foe table as data)

## 6. Gaps and risks

- The donor rolls on the client: `Dice100.Roll` runs in the UI window (QuestPopup 234, 248, 252). Frankendom must roll on the server; the client only shows the result.
- Gold is spent before the roll (228 before 248). A failed summon keeps the gold. Frankendom must state the refund rule in the data and apply it in the same write.
- Chance has no clamp (FormulaHelper 1973). A high reputation makes `chance` at or above 100, so the summon always succeeds; a very low one makes it at or below 0, so it always fails. The reputation range was not read. Fix: clamp chance into a data range (for example 5 to 95) with the bounds in zone data.
- Cost has no floor (FormulaHelper 1964). Above summoner rep 200, the formula goes negative (if the rep range allows it; not read). Fix: floor the cost at a data minimum.
- The first matching day wins (`break`, 194-198). The table has unique days today, so nothing clashes, but a second entry on the same day would be silently ignored. Fix: check day uniqueness when the table loads.
- Hard-coded indexes: the Sheogorath replacement is `daedraData[8]` (236) and the coven is `Random.Range(1, daedraData.Length)` (185). Fix: look the replacement up by id, not index.
- The failure ambush is hard-coded to the witches group (256) and five foe types (257). Fix: put the ambush table on the zone row (zones as data).
- The comment at 239 says the 30 bonus applies only to some daedra, but the code (243) also gives it to every entry whose condition is None. Read as "None means always". Fix: name that case "always" in the data so the rule reads the same in code and data.
- Mount (secondary): riding speed is a flat add to live speed (`+375` ride base, `+250` cart base over 39.5, PlayerSpeedChanger 33-34, 158-159), and the walk drag term is not applied while riding (drag is only in the walk formula, 391-392). Riding also blocks running (139). This is a design to keep as data if Frankendom adds mounts. Dismount on interior entry (TransportManager 206-211) is a clean rule: entering a building or dungeon interior forces foot.

Best transferable idea: a summon is a gated service: a day table picks the entity, the price falls with the sponsor's reputation, the chance rises with the player's reputation with that entity (30 + rep + 30 bonus on matching weather), the price is paid before the roll, a Sheogorath-style replacement roll can swap the entity, and a failed roll can spawn an ambush.
Decision (proposed): adapt - keep the day gate, the price, the chance and the replacement roll and the once-only flag, but move the roll to the server, clamp the chance, floor the price, and make the refund rule an explicit data field (the donor has no refund).
Acceptance: a server test on a matching day, with enough gold, at a chance of 60: seeded rolls 1 to 60 summon the entity and rolls 61 to 100 fail; the gold is spent in both cases; a second success for the same entity returns "already-summoned" with no second quest.
