# EQEmu (death-respawn-penalty, cell 1)

Donor: `/mnt/frankendom-donors/EQEmu/zone/attack.cpp` (Client::Death 1814-2140), `/mnt/frankendom-donors/EQEmu/zone/corpse.cpp`, `/mnt/frankendom-donors/EQEmu/zone/client_process.cpp` | Licence: GPL-3.0 (`/mnt/frankendom-donors/EQEmu/LICENSE.md`, "GNU GENERAL PUBLIC LICENSE Version 3") | C++ | symbol `Client::Death`, `Corpse::Corpse(Client*...)`

Checked: Opened and read end to end: attack.cpp 1814-2140 (Client::Death, the player-death pipeline), corpse.cpp 193-475 (player corpse constructor and item move), 999-1135 (Process, decay, CanPlayerLoot), 1185-1225 (loot rights), 1313-1368 (PvP slot filter), 1419-1530 and 1700-1745 (loot take and take-one reset), 1955-2042 (Summon, CompleteResurrection), 2243-2378 (rez timer, CastRezz), client_process.cpp 2126-2225 (hover respawn, rez branch), spell_effects.cpp 1826-1842 (summon-corpse spell), common/ruletypes.h (rule defaults). Not read: NPC::Death (attack.cpp 2470+), Corpse::LoadCharacterCorpse and DB save bodies, MakeLootRequestPackets packet bodies, the hover non-rez branch past 2225, zone/exp.cpp beyond the level-up message. Confidence: high on the death, corpse, loot and rez chain; medium on the hover branches. Camera scope: not applicable.

## 1. Mechanism

- One function resolves a player death: `Client::Death` (attack.cpp 1814). Inputs: the killer (may be null), the damage, the spell id if any, the killed-by type. Output: XP lost, a corpse (or not), a death packet, and the timers.
- Killer tier is decided first. A client killer who is the duel opponent sets `Killed_DUEL` (1946). Another client sets `Killed_PVP` (1956). An NPC sets `Killed_NPC` (1921). The tier later sets the corpse rez window.
- XP loss is computed next (1973-2021). It is zero when the level is under `DeathExpLossLevel` (default 10) or over `DeathExpLossMaxLevel` (1997-2007), and zero when the killer is a client or bot or a pet owned by one (2010-2013). A player-killed or duel-killed death therefore costs no XP. Otherwise the loss is `floor(level * (level/18.0) * 12000)` (1985), optionally capped to the XP above the level floor when `DeathKeepLevel` is on (1997-2001, default off). The percent-table branch (1973) is used only when `UseDeathExpLossMult` is on (default off).
- The lost XP is taken off the character (2041) and handed to the corpse as `rez_exp` (2065).
- The corpse exists only if `LeaveCorpses` is on and level is at least `DeathItemLossLevel` (default 10), or if `LeaveNakedCorpses` is on (2061-2065, default naked off). Below the item-loss level with naked off, there is no corpse and no items are lost.
- The corpse constructor (corpse.cpp 193) moves items only when the level gate passes (316). `MoveItemToCorpse` (419) copies each possession slot, and each bag's contents, onto the corpse, then deletes it from the character (471). Cash moves to the corpse too, with a rule to leave cursor cash behind.
- Two timers start in the constructor. Decay runs from `CorpseDecayTime` (294, default 7 days). The rez window runs from `CorpseResTime` (295, default 3 h), or from `DuelCorpseResTime` (2270, default 10 min) for a duel death.
- The rez clock only runs while the owner is online. In `Corpse::Process` (999), if the owner is offline the remaining rez time is saved and the timer is disabled (1026-1031). When the owner comes back and the timer is off, `SetRezTimer` restarts it from the saved value (1035-1041; corpse.cpp 2281).
- Loot rights (corpse.cpp 1185-1214). The owner gets full access (1194). Anyone else needs the corpse unclaimed (`CanPlayerLoot`, 1124) and a PvP reward on the corpse. The reward is set at death from the server variable `ServerType` (attack.cpp 2068), with `PvPreward`: 3 = one defined item (`PvPitem`), 2 = take all (-1), 1 = take one (1), anything else = nothing (2069-2084). A killer's group may loot too (2092).
- Take-one. In single mode only top-level possession slots can be taken (corpse.cpp 1361; 1505-1507 leave bags alone). After a take, the kill-item reset runs (1734-1735): anything other than take-all goes back to 0. Kill item 0 blocks every non-owner (1489-1490), so one item is the whole PvP take.
- Resurrection. A rez by spell (`CastRezz`, 2307) re-reads the corpse from the DB (2324) and sends `m_rezzed_experience` to the world (2374). After the rez window, only a GM can rez (2330-2334). A corpse already rezzed once (corpse gate) gives zero XP (2346). `CompleteResurrection` (2024-2037) marks the corpse rezzed with zero XP and disables the rez timer on expiry.
- Hover respawn (optional, `RespawnFromHover`, default off). The hover window is 300 s (attack.cpp 2132). The rez option is always the last one (client_process.cpp 2141). Choosing rez puts HP at `GetMaxHP() / 5` (2185) at the corpse. Any other choice goes to the bind point.
- Necromancy on corpses. A summon-corpse spell (spell_effects.cpp 1832-1841) moves the corpse to the caster, with a level cap given by the spell's effect value. Its path calls `Summon(caster, true, true)`, and `Summon` with `spell=true` skips the consent check and the distance check (corpse.cpp 2016-2018 `else { GMMove }`). The non-spell summon (1955-2011) needs the owner, or a consented group, raid, guild or named player, and stands within 100 units (`dist2 = 10000`, 1957).
- Tick: death is a synchronous event. The corpse timers are checked once per tick inside `Corpse::Process` (999). Timer values are in milliseconds.

## 2. Key functions

- `Client::Death`: `/mnt/frankendom-donors/EQEmu/zone/attack.cpp` 1814-2140. The whole death pipeline: tier, XP loss, corpse decision, corpse creation, respawn choice.
- `Corpse::Corpse(Client*, rez_exp, killed_by)`: `/mnt/frankendom-donors/EQEmu/zone/corpse.cpp` 193-417. Carries the lost XP, moves cash and items under the level gate, starts the timers.
- `Corpse::Process`: `/mnt/frankendom-donors/EQEmu/zone/corpse.cpp` 999-1077. Per-tick: owner-online check, rez-clock pause and resume, rez expiry, decay or bury.
- `Corpse::LootCorpseItem` and loot rights: `/mnt/frankendom-donors/EQEmu/zone/corpse.cpp` 1185-1214 (request type), 1466-1530 (take guard and item pick), 1700-1745 (take-one reset).
- `Corpse::Summon`: `/mnt/frankendom-donors/EQEmu/zone/corpse.cpp` 1955-2022. Owner, consent and distance paths; spell path at 2016-2018.
- `Corpse::CompleteResurrection` and `Corpse::SetRezTimer`: `/mnt/frankendom-donors/EQEmu/zone/corpse.cpp` 2024-2037 and 2243-2281.
- `Corpse::CastRezz`: `/mnt/frankendom-donors/EQEmu/zone/corpse.cpp` 2307-2375.
- `Client::HandleRespawnFromHover`: `/mnt/frankendom-donors/EQEmu/zone/client_process.cpp` 2126-2225 (rez branch read; bind branch partly read).

## 3. Numbers vs mechanism

| Formula or rule | Number range (donor default) | file:line |
|---|---|---|
| XP loss = floor(level x (level/18) x 12000) | level 10 gives about 66,666 XP; default-on for levels 10-255 | attack.cpp 1985; rule DeathExpLossLevel ruletypes.h 45 (10); DeathExpLossMaxLevel 46 (255) |
| XP loss zero for client/bot or owned-pet killer | 0 when killer is PvP or duel | attack.cpp 2010-2013 |
| XP loss % table (only if UseDeathExpLossMult) | 0.5% to 11% by DeathExpLossMultiplier 0-10 (default 3 = 3.5%) | attack.cpp 1973; ruletypes.h 48, 50 (default false) |
| XP loss capped at XP above level floor (DeathKeepLevel) | cap = XP minus XP at killed level; off by default | attack.cpp 1999; ruletypes.h 49 (default false) |
| Corpse made if LeaveCorpses and level >= DeathItemLossLevel, or naked rule | level gate 10 | attack.cpp 2061; corpse.cpp 316; ruletypes.h 47 (10) |
| Corpse rez window (non-duel) | 10,800,000 ms = 3 h | corpse.cpp 295; ruletypes.h 54 |
| Corpse rez window (duel) | 600,000 ms = 10 min | corpse.cpp 2270; ruletypes.h 55 |
| Corpse decay (player) | 604,800,000 ms = 7 days | corpse.cpp 294; ruletypes.h 52 |
| NPC corpse decay | 450,000 ms (level < 55) or 1,500,000 ms (level >= 55); empty corpse 0 + 1 s | corpse.cpp 1081-1087; ruletypes.h 675, 676, 678 |
| Hover window | 300 s, off by default | attack.cpp 2132; ruletypes.h 126-127 |
| Hover rez HP | max HP / 5 | client_process.cpp 2185 |
| PvP reward modes | 0 none, 1 take one, 2 take all, 3 one defined item | attack.cpp 2068-2084 |
| Corpse summon distance | 100 units (dist2 = 10000) | corpse.cpp 1957 |
| Summon-corpse spell level cap | target level <= spell effect value | spell_effects.cpp 1832 |
| Max looters per corpse | 72 (MAX_LOOTERS) | corpse.h 38 (not receipted; read in corpse.cpp 1129) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (XP loss first, then the corpse decision; take rules; rez XP; rez clock; hover; summon). It drops the percent-table branch, the cash and cursor rules, the bag-content walk, the per-slot looter array (MAX_LOOTERS 72 becomes one claimed looter), the quest hook, the buff/DoT exception, the group-looter list, the GM rez path and the NPC decay. The donor's rez clock is a timer; the sketch uses dt, which is frame-rate safe. The donor's `take-one` closes the corpse only through the kill-item reset; the sketch names that as mode "none". The donor's bind branch sets no HP in the lines read; the sketch returns null for that.

```ts
// Licence: GPL-3.0 (donor EQEmu). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room
type Pt = { x: number; y: number };
export type KillerKind = "npc" | "pvp" | "duel";
export type LootMode = "none" | "one" | "all" | "defined";

export interface DeathRules {
  leaveCorpses: boolean;      // rule LeaveCorpses
  nakedCorpses: boolean;      // rule LeaveNakedCorpses
  itemLossLevel: number;      // rule DeathItemLossLevel
  expLossMinLevel: number;    // rule DeathExpLossLevel
  expLossMaxLevel: number;    // rule DeathExpLossMaxLevel
  keepLevel: boolean;         // rule DeathKeepLevel
  resWindowS: number;         // rule CorpseResTime, seconds
  duelResWindowS: number;     // rule DuelCorpseResTime, seconds
}

export interface DeathOutcome {
  xpLost: number;
  corpse: boolean;
  itemsToCorpse: boolean;
  rezWindowS: number;
}

// Order: XP loss first, then the corpse decision. The killer kind must come from the server.
export function resolveDeath(
  level: number, xp: number, xpAtLevelFloor: number, killer: KillerKind, r: DeathRules,
): DeathOutcome {
  let xpLost = Math.floor(level * (level / 18) * 12000);
  if (level < r.expLossMinLevel || level > r.expLossMaxLevel || killer !== "npc") xpLost = 0;
  if (r.keepLevel) xpLost = Math.min(xpLost, Math.max(0, xp - xpAtLevelFloor));
  const itemsToCorpse = r.leaveCorpses && level >= r.itemLossLevel;
  const corpse = itemsToCorpse || r.nakedCorpses;
  const rezWindowS = killer === "duel" ? r.duelResWindowS : r.resWindowS;
  return { xpLost, corpse, itemsToCorpse, rezWindowS };
}

export interface CorpseItem { id: string; topLevel: boolean; }
export interface PlayerCorpse {
  owner: string;
  claimedBy: string | null;   // first non-owner looter
  mode: LootMode;             // set from the PvP reward at death
  definedId: string | null;   // item for mode "defined"
  items: CorpseItem[];
  rezXp: number;              // XP held on the corpse for a full rez
  alreadyRezzed: boolean;     // corpse gate: rezzed once already
}

// Non-owner take. "one", "all" and "defined" only take top-level items (bag contents stay).
// Any take except "all" closes the corpse to everyone else.
export function takeFromCorpse(c: PlayerCorpse, who: string, index: number): string | null {
  const it = c.items[index];
  if (!it) return null;
  if (who === c.owner) { c.items.splice(index, 1); return it.id; }
  if (c.claimedBy !== null && c.claimedBy !== who) return null;
  if (c.mode === "none") return null;
  if (!it.topLevel) return null;
  if (c.mode === "defined" && it.id !== c.definedId) return null;
  c.claimedBy = who;
  c.items.splice(index, 1);
  if (c.mode !== "all") c.mode = "none";
  return it.id;
}

// XP returned by a rez. A corpse already rezzed gives no XP (corpse gate).
export function rezXpReturned(c: PlayerCorpse): number {
  return c.alreadyRezzed ? 0 : c.rezXp;
}

// Rez clock runs only while the owner is online; it pauses when they leave.
export function tickRezClock(remainingS: number, dtS: number, ownerOnline: boolean): number {
  return ownerOnline ? Math.max(0, remainingS - dtS) : remainingS;
}

// Hover window choice: "rez" puts HP at one fifth at the corpse; "bind" goes to the bind point.
export function hoverRespawn(
  choice: "rez" | "bind", maxHp: number, corpse: Pt | null, bind: Pt,
): { at: Pt; hp: number | null } {
  if (choice === "rez" && corpse) return { at: corpse, hp: Math.floor(maxHp / 5) };
  return { at: bind, hp: null };
}

// Summon a corpse to the caster. A spell summon skips consent and distance.
export function canSummonCorpse(viaSpell: boolean, isOwner: boolean, consented: boolean, distSq: number): boolean {
  if (viaSpell) return true;
  if (!isOwner && !consented) return false;
  return distSq <= 10000; // 100 units, squared
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/DR001-EQEmu-death.ts): exit 0, no output.

## 5. Lands in

- TARGET `src/fight/death.ts` (new module; the engine's death step, one ledger). The corpse, loot and rez logic goes with it; the Pit does not own it.
- Parity-checklist row 17 (death/respawn). Row 23 (zone population) is not the row here: the donor's corpse decay and rez windows are per-corpse, not zone spawn.
- Server tick: none of the death timers needs its own tick; they are read by the engine's per-tick step (`tickRezClock` takes dt).

Best transferable idea: The killer's tier (NPC, client, duel) decides both the XP loss and the rez window, and a player corpse closes itself after one take, so one server step settles who loses what and who can loot it.
Decision (proposed): adapt — keep the tier shape and the take-one close; the donor's 3 h and 10 min windows and XP formula become zone data because the Frankendom rulings do not yet say whether death costs XP.
Acceptance: A server test kills a player in an open PvP zone: the corpse holds the items, the killer takes exactly one top-level item, a second take is refused, and the victim's XP is unchanged; an NPC kill follows the level formula.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, shape only)
Brief rule served: 1 (one ledger: loot moves once, server-verified killer tier); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- Frankendom's rulings (as given to this reader) do not say whether death costs XP. The donor's shape is: NPC deaths cost XP, client and duel deaths do not (attack.cpp 2010). That is the decision to make. Kills are server-verified, so the killer tier must come from the server, not the client.
- The take-one rule is a single item per corpse. The donor closes the corpse after any single take (1734-1735). Frankendom's take-one must close the same way, and the test must assert it.
- Donor defect (latent, not triggered): corpse.cpp 1718 tests `(GetPlayerKillItem() != -1 || GetPlayerKillItem() != 1)`. That is always true, so the bag-walk runs for every mode. It does nothing in practice because `bag_item_data` is only filled in the default branch (1509), which single and take-all modes skip (1505-1509). Fix: use `&&`, and keep the bag-walk only for the default branch. The sketch does not copy the bag-walk.
- Donor defect (not a bug, a gap): the rez window only pauses while the owner is offline (1026-1031). That lets a player log off to stop the clock, which is a design choice; Frankendom should decide whether the duel and open-PvP windows also pause.
- A rez for a corpse owned by a player in another zone travels as a world message (corpse.cpp 2374), so the rez outcome lives outside the zone. Frankendom keeps the rez in the one ledger on the server, not in a client message.
- Hover respawn and its bind branch were not read in full (client_process.cpp past 2225). The hover mode is off by default; if Frankendom wants a respawn window, the bind branch needs reading first.
- One ledger: in the donor, the XP loss (attack.cpp 2041), the corpse build (2065) and the item moves are separate steps. The item moves sit inside a DB transaction (corpse.cpp 369-402). Frankendom should make the whole death one server transaction. Duel and PvP windows are data fields, not hard-coded numbers.
