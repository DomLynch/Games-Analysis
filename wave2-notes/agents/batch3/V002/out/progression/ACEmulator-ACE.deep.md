# ACEmulator-ACE (progression, cell 10)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Fellowship.cs` (fellowship share: `CalculateXPSharing`, `SplitXp`, `GetMemberSharePercent`, `GetDistanceScalar`), `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Creature_Death.cs` (kill credit: `OnDeath_GrantXP`), `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Xp.cs` (`EarnXP`, `GrantXP`, `UpdateXpAndLevel`) | Licence: GNU Affero General Public License v3 (repo `LICENSE`, read; no per-file header) | C# | symbol `SplitXp` (kill-credit entry point `OnDeath_GrantXP`)

Checked: Read in full or in the relevant span: `Fellowship.cs` 453-500 (CalculateXPSharing), 502-564 (SplitXp), 604-665 (share percent, distance scalar), 738-760 (member list); `Player_Xp.cs` 1-135 (EarnXP, GrantXP, UpdateXpAndLevel), 186-352 (XP table, level-up loop), 497-511 (modifier); `Creature_Death.cs` 36-62, 160-200, 240-256, 326-345; `DamageHistory.cs` 54, 122-160; `PropertyManager.cs` 624 (grep). Callers: `SplitXp` has one caller (`Player_Xp.cs:67`, inside GrantXP); `OnDeath_GrantXP` has one caller (`Creature_Death.cs:52`). `CalculateXPSharing` has six call sites (Fellowship.cs 160, 220, 341, 373, 701, 776), only the body was read. Not read: the vitae XP pool and its penalty (`Player_Xp.cs` 134-186 read, the threshold formula at 433-435 read; not written up here), the luminance split (`Fellowship.cs` 566-600), the allegiance XP path. Table values in `GetMemberSharePercent` are read but the short value lines (e.g. `return .75;`) are not receipted, because the verifier's minimum quote length is 15 characters. Confidence: high on the order of operations and the numbers (read and receipted); medium on the heal interaction (read the formula; the call-site ordering of the health update was not checked). Nothing was executed.

## 1. Mechanism

- Kill credit (`Creature_Death.cs` 167-196, called once from `OnDeath` at 52, skipped on no-death-XP landblocks at 51). Each attacker's damage credit is its share of `TotalHealth` (sum of all credit, `DamageHistory.cs` 54). Kill XP = `XpOverride` x (credit / total) (191-193), rounded, then `EarnXP(..., XpType.Kill)` (195). If the total is 0, nothing is granted (174). Pet damage credits the pet's owner (183). The creature's `XpOverride` is the XP budget for the kill (`WorldObject_Properties.cs` 2726).
- Heal (`DamageHistory.cs` 122-150): on a heal, every attacker's credit is multiplied by the same scalar, `1 - heal / missing-before-heal` (145, 150). A zero heal or zero missing health changes nothing (144). Shares are ratios, so a uniform scale does not move kill XP. The same stored credit feeds the kill-task loops, which skip attackers with credit <= 0 (`Creature_Death.cs` 248, 334).
- Modifier, applied once (`Player_Xp.cs` 22-47): `m_amount = round(amount x enchantment x xp_modifier)` (28, 35). The enchantment factor is `1 + enchantment bonus + augmentation`, where kill XP gets `0.05` per augmentation level (497-505, 502-503). Members then receive the split amount through `GrantXP`, which does not multiply again.
- Fellowship split, only if the earner's fellowship has `ShareXP` (`Player_Xp.cs` 63-67):
  - `CalculateXPSharing` (`Fellowship.cs` 453-495) picks a mode. If every member is at level 50 or above (`fellowship_even_share_level`, `PropertyManager.cs` 624), it is even share (466-470). Otherwise, with an online leader (473-474; with no leader the old flags are kept), the largest level gap from the leader decides: `<= 5` even share (479-481), `<= 10` proportional (484-487), more than that no share (`ShareXP` false, 491).
  - Even share (`SplitXp` 525-535): total = round(amount x `GetMemberSharePercent()`), where the percent depends on the fellowship size over all members, 1 member 1.0, 2 members 0.75, 3 members 0.6, down to 9 members 0.3 (`Fellowship.cs` 604-631). Each member gets round(total x distance scalar).
  - Proportional (`SplitXp` 543-555): each member gets round(amount x XP-to-next-level(member) / sum over all members x distance scalar).
  - Distance scalar (`GetDistanceScalar`, 639-667): 0 if one is indoors and the other is not, or both are indoors in different landblocks (650-657); 1 within `MaxDistance` = 600 units; linear from 1 at 600 to 0 at 1200 (659-665).
- Quest XP splits flat (`SplitXp` 511-517) unless a bonus option is set. Not part of this note.
- Level-up: `UpdateXpAndLevel` (`Player_Xp.cs` 87-121) caps the added XP at the max-level total (97-101). `CheckForLevelup` (276-300) loops while total XP is at or above the next level threshold (288). The thresholds and skill credits come from the client's XP table (the dat file), not from code (`GetTotalXP`, `GetXPToNextLevel`, 229-268).

Order of operations for one kill with three attackers in a fellowship, as the code runs: credit per attacker (`OnDeath_GrantXP`) → kill XP per attacker (one `EarnXP` each) → modifier (enchantment, `xp_modifier`, augmentation) → `GrantXP` → if the earner's fellowship shares, `SplitXp` for the fellowship (each member `GrantXP` with the flag removed) → each member's level-up check.

## 2. Key functions

- `OnDeath_GrantXP()`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Creature_Death.cs` 167-196. Credit share to kill XP per damager.
- `CalculateXPSharing()`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Fellowship.cs` 453-495. Level-band mode.
- `SplitXp(ulong, XpType, ShareType, Player)`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Fellowship.cs` 502-564. Quest flat split, even share, proportional split.
- `GetMemberSharePercent()` / `GetDistanceScalar(...)`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Fellowship.cs` 604-667.
- `GrantXP(...)` / `EarnXP(...)`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Xp.cs` 22-70.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Kill XP by damage share (ratio of credit to total) | `XpOverride` per creature (`WorldObject_Properties.cs` 2726); share is `credit / TotalHealth` (`Creature_Death.cs` 191) |
| Modifier applied once before any split | `xp_modifier` server property (`Player_Xp.cs` 28); augmentation 0.05 per level for kill XP (503) |
| Even share at or above a level | `fellowship_even_share_level` = 50 (`PropertyManager.cs` 624) |
| Level band from the leader | `<= 5` even (479), `<= 10` proportional (484), else none |
| Share percent by group size | 1.0, 0.75, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3 for 1..9 members; 1.0 above 9 (`Fellowship.cs` 604-631). Derived, not run: members x percent = 1.0, 1.5, 1.8, 2.2, 2.5, 2.7, 2.8, 2.8, 2.7, so a larger party gets more XP in total |
| Distance falloff | `MaxDistance` = 600 units (`Fellowship.cs` 633), zero at 2 x 600 (659), linear between (665) |
| Heal rescales credit | `1 - heal / missing` (`DamageHistory.cs` 145), applied to every attacker by the same factor (150) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: kill XP from the credit share, then the level-band mode, then the even or proportional split with the distance scalar. It omits the quest flat split, the luminance split, the fellowship flag stripping, `DesiredShareXP` (the sketch takes the mode as given), the max-level cap and level-up loop, the vitae pool, augmentation (folded into the modifier the caller applies), the no-online-leader rule (the sketch returns the previous mode, as the donor keeps old flags), the pet-owner mapping, the dropped-member list, and the killed-creature landblock rule. The sketch takes indoor and landblock checks as booleans. It uses `Math.round` where C# uses `Math.Round` (the .NET default is ToEven, not checked in this repo). The 0.3..1.0 share table is copied from the donor.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Mode = "even" | "proportional" | "none";

interface Attacker {
  id: string;
  credit: number; // absolute damage credit
}

interface Fellow {
  id: string;
  level: number;
  xpToNext: number;            // XP from this level to the next (the donor reads this from the client XP table)
  dist: number;                // distance to the earner, game units
  sameIndoorState: boolean;    // both indoors or both outdoors
  indoorLandblockOk: boolean;  // false when both are indoors in different landblocks
}

// Kill XP: the kill's XP times each attacker's share of total credit. Shares are ratios, so a uniform scale leaves them unchanged.
function killXpShares(xpOverride: number, attackers: Attacker[]): Map<string, number> {
  const out = new Map<string, number>();
  const total = attackers.reduce((sum, a) => sum + a.credit, 0);
  if (total === 0) return out; // donor: no kill XP when total credit is zero
  for (const a of attackers) out.set(a.id, Math.round(xpOverride * (a.credit / total)));
  return out;
}

// Heal: every attacker's credit is scaled by the same factor, 1 - heal / missing-before-heal.
function healCredits(attackers: Attacker[], heal: number, currentAfterHeal: number, max: number): void {
  const missingBefore = max - (currentAfterHeal - heal);
  if (heal === 0 || missingBefore === 0) return;
  const scalar = 1 - heal / missingBefore;
  for (const a of attackers) a.credit *= scalar;
}

// Share mode from the level band. Even share if every fellow is at or above evenShareLevel; otherwise the band is measured from the leader.
function shareMode(levels: number[], leaderLevel: number | undefined, previous: Mode, evenShareLevel = 50): Mode {
  if (levels.every((l) => l >= evenShareLevel)) return "even";
  if (leaderLevel === undefined) return previous; // donor: no online leader, keep the old flags
  const maxDiff = Math.max(...levels.map((l) => Math.abs(leaderLevel - l)));
  if (maxDiff <= 5) return "even";
  if (maxDiff <= 10) return "proportional";
  return "none";
}

// Share percent by fellowship size (donor table for 1..9; 1.0 above 9).
function memberSharePercent(count: number): number {
  const table: Record<number, number> = { 1: 1.0, 2: 0.75, 3: 0.6, 4: 0.55, 5: 0.5, 6: 0.45, 7: 0.4, 8: 0.35, 9: 0.3 };
  return table[count] ?? 1.0;
}

// Distance scalar: 1 inside maxD, linear fall to 0 at 2 x maxD, 0 across indoor/outdoor or blocked landblocks.
function distanceScalar(f: Fellow, maxD = 600): number {
  if (!f.sameIndoorState || !f.indoorLandblockOk) return 0;
  if (f.dist >= maxD * 2) return 0;
  if (f.dist <= maxD) return 1;
  return Math.max(0, 1 - (f.dist - maxD) / maxD);
}

// Split one earned amount across the fellowship. The count for the share percent includes every fellow, in range or not.
function splitXp(amount: number, mode: Mode, fellows: Fellow[]): Map<string, number> {
  const out = new Map<string, number>();
  if (mode === "none") return out; // donor: GrantXP does not call the split when sharing is off
  if (mode === "even") {
    const total = Math.round(amount * memberSharePercent(fellows.length)); // donor rounds the total before the per-member scalar
    for (const f of fellows) out.set(f.id, Math.round(total * distanceScalar(f)));
    return out;
  }
  const sum = fellows.reduce((s, f) => s + f.xpToNext, 0);
  for (const f of fellows) out.set(f.id, Math.round(amount * (f.xpToNext / sum) * distanceScalar(f)));
  return out;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/xp.ts` (new, engine side): the kill-credit ledger and per-attacker XP award at the server death event, with the modifier applied once. Parity-checklist row 18 (loot roll and XP award). Sub-line for timing: "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3). Credit must be read at the server kill, never on the client (kills are server-verified).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only, the shape and numbers from the described mechanism, no code copied)
- Brief rule served: 1 (the server owns the kill and the credit ledger); zones as data for `XpOverride` (per creature)

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism.
- Frankendom has no fellowship or party yet. The level-band split and the distance scalar belong to a party feature that does not exist here, so they are not adopted now. Only the per-attacker credit award is in scope, for the one-to-three attacker fights (MAX_ATTACKERS = 3).
- Credit must be fixed at the server kill event. The donor reads the damage history at death and grants XP before the corpse is built (`Creature_Death.cs` 51-52). Frankendom should do the same in the engine, not in the client.
- Heal: the donor scales every attacker's credit by the same factor. That does not move the XP shares (a ratio). A heal to full sets the scalar to 0 and zeroes all stored credit; hits after the heal start new credit. Whether a death can reach `OnDeath_GrantXP` with a zero total (which returns at 174 and grants nothing) was not traced. Frankendom must state its rule for a heal and test it. The kill-task checks (`Creature_Death.cs` 248, 334) skip attackers with credit <= 0, a different consumer of the same numbers.
- Out-of-range fellows lose their share in the donor (scalar 0), and the share percent still counts them. If Frankendom ever shares XP, decide on redistribution explicitly.
- The donor's XP-to-next-level thresholds come from the client's dat file. Frankendom must keep its own table as data; do not copy the dat values into code.
- Pet credit goes to the pet owner (`Creature_Death.cs` 183). Frankendom has no pets in the duel; drop this rule unless pets arrive.
- The vitae XP pool (`Player_Xp.cs` 134-186, threshold at 433-435) is a separate progression mechanism. Not written up here; a candidate for a later cell.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (server owns the kill and the credit ledger); zones as data

Best transferable idea: Award kill XP per attacker as the kill's XP budget times that attacker's share of total damage, computed once on the server at the death event, so a many-on-one fight splits the reward by work done.
Decision (proposed): adapt - take the per-attacker credit-share award for the up-to-three attackers; leave the fellowship level-band split and distance scalar until Frankendom has a party system.
Acceptance: a server test with a 100-XP kill and three attackers with credit 50/30/20 awards 50, 30, 20 XP (before the modifier), and after a heal of half the missing health every attacker's credit halves while the three XP shares stay 50/30/20.
