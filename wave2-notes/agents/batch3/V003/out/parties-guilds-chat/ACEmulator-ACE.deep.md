# ACEmulator-ACE (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Fellowship.cs` (symbols `CalculateXPSharing` 453, `SplitXp` 502, `GetMemberSharePercent` 604, `GetDistanceScalar` 639), with `Source/ACE.Server/WorldObjects/Player_Xp.cs` (`GrantXP` 53-70) and `Source/ACE.Server/Managers/PropertyManager.cs` 624, 672 | Licence: AGPL-3.0 (LICENSE header: "GNU AFFERO GENERAL PUBLIC LICENSE Version 3") | C# | symbol `SplitXp`

Checked: Fellowship = the party. Read `Fellowship.cs` 448-600 (CalculateXPSharing, SplitXp, the start of SplitLuminance), 600-700 (GetMemberSharePercent, GetDistanceScalar), 699-712 (OnFellowLevelUp), 736-762 (GetFellowshipMembers), plus 51-60 (constructor) and 160-162 (call site). `Player_Xp.cs` 20-100 (EarnXP, GrantXP). `PropertyManager.cs` read by grep only (lines 556, 624, 672). Callers: `SplitXp` has one caller, `Player_Xp.cs:67`; `GetDistanceScalar` and `GetMemberSharePercent` are used only inside `SplitXp` (plus two read-only debug displays in `DeveloperCommands.cs` 2684, 2710, not read). Not read: `Fellowship.cs` 1-50 and 76-447 (join, leave and leader-change bodies; only their `CalculateXPSharing()` call sites were grep'd at 160, 220, 341, 373, 776), 763-798, `AllegianceManager` (guild XP chain), `UpdateXpAllegiance`, chat channels. Confidence: high on the XP split (order of operations and numbers read end to end); the party chat path is not covered by this note. `camera_scope`: not applicable.

## 1. Mechanism

- One kill's XP enters at `Player.EarnXP` (`Player_Xp.cs` 22-44): XP modifier and enchantment are applied first (35), then `GrantXP`. `GrantXP` (53-70) sends the XP to `Fellowship.SplitXp` only if the fellowship has `ShareXP` on and the share flag is set (63-67). Otherwise the earner keeps all of it.
- Mode is decided beforehand by `CalculateXPSharing` (453-486), which runs on join (160), removal (220), quit or disband (341, 373), level-up (701) and dropped-member cleanup (776). Leader reassignment itself (`AssignNewLeader`, 377) does not call it (checked by grep):
  1. If every member is at or above `fellowship_even_share_level` (default 50, `PropertyManager.cs` 624), share evenly and stop (463-470). Level gap is not checked in this case.
  2. If the leader is offline, return and keep the flags as they were (474-475). This is a stale-state path.
  3. Level gap = max over members of |leader level - member level| (477). Gap <= 5: even share (479-482). Gap <= 10: proportional share (484-487). Otherwise `ShareXP = false` and the earner keeps all XP.
- `SplitXp` (502-564), in order:
  1. Strip the Fellowship share flag from the share type so the recursive grants do not split again (508).
  2. Quest XP (flat): if the XP is quest XP and `fellow_quest_bonus` is off, each member gets `amount / member count` (511-513). The earner gets type Quest, the others type Fellowship. Quest XP ignores the distance rule.
  3. Even share (523-538): `total = amount x GetMemberSharePercent()` (527); each member gets `total x GetDistanceScalar(earner, member)` (531). The earner's own grant is the same formula (distance 0, scalar 1). Non-earners get XP type Fellowship. Return.
  4. Proportional (541-562): weight_i = member's XP to next level / sum of that over ALL fellowship members (545-549), then each member gets `amount x weight_i x GetDistanceScalar` (551). An out-of-range member's share is not given to anyone else.
- `GetMemberSharePercent` (604-630): 1 member 1.0, 2 members 0.75, 3 0.6, 4 0.55, 5 0.5, 6 0.45, 7 0.4, 8 0.35, 9 0.3; anything else 1.0. Because each member gets `amount x percent`, the group total is roughly `members x percent x amount`: 1.5x for two, 1.8x for three, 2.7x for nine, when everyone is in range.
- `GetDistanceScalar` (639-668): quest XP returns 1.0 (644). Different indoor/outdoor state gives 0 (650). Both indoors in different landblocks gives 0 (654). Distance d: 1.0 if d <= 600 (662-663), 0 if d >= 1200 (659-660), otherwise linear `1 - (d - 600) / 600` clamped at 0 (665-667).
- Timing: all of this runs when an XP grant happens (on the kill or quest event). When the XP is not shared, `GrantXP` queues `UpdateXpAndLevel` on the player's action queue (`Player_Xp.cs` 72). There is no per-frame loop; the distances are read at the moment of the grant.

## 2. Key functions

- `SplitXp`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Fellowship.cs` 502-564. Quest flat split, even share, proportional share.
- `CalculateXPSharing`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Fellowship.cs` 453-486. Chooses even, proportional or off from levels.
- `GetMemberSharePercent`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Fellowship.cs` 604-630. Per-size table; the code comment at 628 says "TODO: handle fellowship mods with > 9 players?".
- `GetDistanceScalar`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Fellowship.cs` 639-668. Full share to 600 units, linear falloff to 1200, indoor/landblock rules.
- `GrantXP` routing: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Xp.cs` 53-70.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Party share = size percent x base XP, each member scaled by distance | Table 1.0 / .75 / .6 / .55 / .5 / .45 / .4 / .35 / .3 for 1-9 members (Fellowship.cs 604-630, values read; the single-value lines are under 15 characters, so the receipts are the function header and the TODO line) |
| Full share inside a radius, linear falloff, zero beyond 2x | `MaxDistance = 600` (Fellowship.cs 633), zero at `MaxDistance * 2` (659), falloff at 665 |
| Level-gap band picks the mode | Even share at gap <= 5 (479), proportional at gap <= 10 (484), off beyond; all members >= 50 forces even (464) via `fellowship_even_share_level` default 50 (PropertyManager.cs 624) |
| Party size cap | `MaxFellows = 9` (Fellowship.cs 26) |
| Proportional weight | XP to next level per member (545-549), not the kill amount |
| Quest XP flat | amount / count (513) unless `fellow_quest_bonus` (511) |
| Base XP scale | `xp_modifier` default 1.0 (PropertyManager.cs 672), applied at `Player_Xp.cs` 35 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for the even and proportional splits (mode from level gap, then size-table share or level-weighted share, each times a distance scalar) and the donor's constants. It omits: the quest flat split and `fellow_quest_bonus`; the `fellow_even_share_level` all-members shortcut (the sketch does apply it, as written in `shareMode`); the stale-flags path when the leader is offline (the sketch takes the leader level as an argument); the indoor/outdoor and landblock zero rules in `GetDistanceScalar`; the online-session filter in `GetFellowshipMembers`; the XP-type labels (Kill, Quest, Fellowship); the `Math.Round` on ulong; the allegiance chain. The proportional branch reproduces the donor's loss: out-of-range shares are not redistributed. The sketch is clean-room (AGPL-3.0 donor).

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch of the described mechanism (party XP split: size table, distance falloff, level-gap band), not a translation.
// clean-room
export interface Member {
  id: string;
  level: number;
  xpToNext: number;   // XP still needed to the next level (weight for the proportional mode)
  x: number;
  y: number;
}

const MAX_FELLOWS = 9;                  // party size cap (engine constant)
const EVEN_SHARE_LEVEL = 50;            // all members at or above this level share evenly (zone-independent property)
const EVEN_GAP = 5;                     // max level gap for even share
const PROP_GAP = 10;                    // max level gap for proportional share
const FULL_RADIUS = 600;                // full share within this distance (world units)
const SHARE_TABLE = [1, 0.75, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3]; // index = members - 1

export type Mode = "even" | "proportional" | "off";

export function shareMode(leaderLevel: number, members: Member[]): Mode {
  if (members.every(m => m.level >= EVEN_SHARE_LEVEL)) return "even";
  const gap = Math.max(...members.map(m => Math.abs(leaderLevel - m.level)));
  if (gap <= EVEN_GAP) return "even";
  if (gap <= PROP_GAP) return "proportional";
  return "off";
}

// 1.0 inside FULL_RADIUS, linear to 0 at 2 x FULL_RADIUS, 0 beyond.
export function distanceScalar(a: Member, b: Member): number {
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  if (d <= FULL_RADIUS) return 1;
  if (d >= FULL_RADIUS * 2) return 0;
  return Math.max(0, 1 - (d - FULL_RADIUS) / FULL_RADIUS);
}

// Splits one kill's XP. The earner must be one of the members.
export function splitXp(amount: number, earner: Member, members: Member[], mode: Mode): Map<string, number> {
  const out = new Map<string, number>();
  if (mode === "off") {
    out.set(earner.id, amount);
    return out;
  }
  if (mode === "even") {
    const total = amount * SHARE_TABLE[Math.min(members.length, MAX_FELLOWS) - 1];
    for (const m of members) out.set(m.id, Math.round(total * distanceScalar(earner, m)));
    return out;
  }
  // proportional: weight = member's XP to next level over ALL members (out-of-range shares are lost, as in the donor)
  const sum = members.reduce((s, m) => s + m.xpToNext, 0);
  for (const m of members) {
    out.set(m.id, Math.round(amount * (m.xpToNext / sum) * distanceScalar(earner, m)));
  }
  return out;
}

// Example: three members, two in range, one at 900 units.
const a: Member = { id: "a", level: 60, xpToNext: 100, x: 0, y: 0 };
const b: Member = { id: "b", level: 60, xpToNext: 100, x: 100, y: 0 };
const c: Member = { id: "c", level: 60, xpToNext: 100, x: 900, y: 0 };
const grants = splitXp(1000, a, [a, b, c], shareMode(60, [a, b, c]));
void grants;
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file `/tmp/V003_party_xp_split.ts`), exit 0. Hand-checked example: even mode, grants a 600, b 600, c 300 (total 1500 from 1000).

## 5. Lands in

Target: `origins/server/party-xp.ts` (proposed new module; the split runs on the server at the kill, so it is not in `src/fight/` client code). Parity row: 18 (loot roll and XP award). The split runs at the grant, not per server tick, so it does not use the "server tick" sub-line of row 18 or post-K item 3. Zone-population row 23 is not used here.

## 6. Gaps and risks

- Ledger inflation: the even-share table makes the group total grow with party size (1.5x for two, 2.7x for nine when all are in range). Frankendom's one ledger must state the per-kill total explicitly. Do not port the table as a silent multiplier.
- Frankendom caps the party at MAX_ATTACKERS = 3. Use a table for 1-3 only, and treat any larger party as a rule error, not as a silent cap at 9.
- Proportional share loses out-of-range shares (the weights sum over all members, 545-549, but out-of-range members get 0 at 551 and nothing is redistributed). Frankendom needs one rule: either normalise over in-range members or record the lost share in the ledger.
- Stale comments: the even-share and proportional comments say "within level range" (523, 541), but the code uses distance and sums over every member. Do not copy the comments as spec.
- Stale state: when the leader is offline `CalculateXPSharing` returns early and keeps old flags (474-475). Frankendom must recompute on every roster change, server-side, and test the offline-leader case.
- Server-verified kills: the split is computed on the server, which fits; but the donor reads distance from the earner's position at grant time. Frankendom must take positions from the server's authoritative state, not the client.
- Zones as data: the 600 radius and the 1200 zero radius are arena-size dependent. Put them in zone data. The level bands (5 and 10) and the even-share level (50) are engine constants.
- Pit as client: the Pit is a fixed arena; a party split there is only for the client display, and the grants must come from the engine.
- The indoor/outdoor and landblock rules (650-654) do not map to Frankendom's zones; reject them unless zones gain an indoor flag.
- Not read: the guild (allegiance) XP chain, chat channel routing, and the join/leave bodies. This note covers the XP share only.

Reuse tag: reuse-first (AGPL donor; shape only, no port)

Brief rule served: rule 5 (callers of SplitXp, GetDistanceScalar and GetMemberSharePercent checked by grep); rule 2 (candidate files opened: Fellowship.cs, Player_Xp.cs, PropertyManager.cs); rule 4 (Best transferable idea below); rule 10 (receipts verified).

Best transferable idea: A party's kill XP is a size-indexed share, scaled per member by distance, and the mode is picked from the level gap, so the rule can be a few zone-data numbers and one server function.

Decision (proposed): adapt - take the share-by-size table (capped at MAX_ATTACKERS = 3), the distance falloff and the level-gap band as one server function; drop the indoor/landblock rules and the 9-member table, and keep the group total explicit in the ledger.
Acceptance: A server test with a 3-member party where two members are within 600 units and one at 900 units, all within 10 levels of the leader: a 1000 XP kill grants 600, 600 and 300 XP (total 1500) and the ledger shows the 1500 with each grant's reason; a member beyond 1200 units gets 0.
