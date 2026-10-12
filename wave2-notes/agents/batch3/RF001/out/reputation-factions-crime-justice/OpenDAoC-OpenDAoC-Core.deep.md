# OpenDAoC-OpenDAoC-Core (reputation-factions-crime-justice, cell 3)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/Faction.cs` (with `gameutils/FactionMgr.cs`, `serverrules/AbstractServerRules.cs`, `gameobjects/GameNPC.cs`, `ai/brain/StandardMob/StandardMobBrain.cs`, `ai/brain/Guards/GuardBrain.cs`) | Licence: GNU GPL version 2 or later per `gplheader.txt` line 6 ("either version 2 ... or (at your option) any later version"); the repo `LICENSE` file is the GPL version 3 text (line 2). Treated as copyleft, clean-room only | C# | symbol `Faction.OnMemberKilled`, `Faction.ChangeAggroLevel`, `Faction.GetStandingToFaction`

Checked: read in full: `GameServer/gameutils/Faction.cs` (159 lines), `GameServer/gameutils/FactionMgr.cs` (91 lines), `GameServer/gameobjects/GameGuard.cs` (64 lines), `GameServer/ai/brain/Guards/GuardBrain.cs` (57 lines), the field lines of `CoreDatabase/Tables/DbFaction.cs`, `DbFactionLinks.cs`, `DbFactionAggroLevel.cs`. Read in part: `GameServer/serverrules/AbstractServerRules.cs` 1036-1058 (the kill loop), `GameServer/gameobjects/GameNPC.cs` 2204-2232 and 2476-2492, `GameServer/ai/brain/StandardMob/StandardMobBrain.cs` 526-540, `GameServer/gameobjects/GamePlayer.cs` 312-315 and 10017. Callers: `OnMemberKilled` has one caller (AbstractServerRules.cs 1052); `GetStandingToFaction` is called from GameNPC.cs 2213 and 2482 and StandardMobBrain.cs 536 (all read). Not read: the default value of `DbFaction.BaseAggroLevel`, the realm rule `IsAllowedToAttack`, the GuardBrain base methods (`BuildPlayerAggroCandidateLoop`, `SendPlayerAggroLosCheck`, `AddToAggroList`), the GM faction commands, and `GamePlayer.ObjectId`'s getter (the setter writes `DBCharacter.ObjectId`). `PvPServerRules.cs` was grepped for guard references only: its keep-guard branches (lines 239-271) are realm keep rules, not a crime system. Searched for murder, karma, outlaw, jail, notoriety: none. The only "bounty" in the donor is DAoC bounty points, a PvP reward currency (GamePlayer.cs 3488-3834), not a bounty on a head. Confidence: high on the standing ledger and its link spread (read end to end); medium on the guard brain (base class not read). camera_scope: not applicable.

Best transferable idea: a faction is a grudge network: one bounded number per player per faction, pushed up by the death of a friend faction's member and down by an enemy faction's member, read as a standing by simple thresholds; killers become hated by the dead member's family and liked by its rivals, with no separate criminal state.
Decision (proposed): adapt - keep the friend and enemy link spread and the four standing bands; make the change deterministic per kill (no 20% roll); send the change line only when the stored value moves; keep the faction rows as catalogue data.
Acceptance: after a kill, the killer's standing with a friend faction of the dead member moves by exactly one point, and the "relationship" line appears only when the number changes; a server test asserts that a value already at the limit sends no line, and that a Hostile or Aggressive standing blocks an other-realm player's interaction.

## 1. Mechanism

Data first. Each faction row has a `BaseAggroLevel` (DbFaction.cs 64). Links join two factions with an `IsFriend` flag (DbFactionLinks.cs 64; FactionMgr.cs 26-45 builds `FriendFactions` and `EnemyFactions` per faction). A faction is its own friend (Faction.cs 28). Each player's number per faction is one row, `AggroLevel` (DbFactionAggroLevel.cs 64), keyed by the character (Faction.cs 58-76; loaded at login, GamePlayer.cs 10017 and FactionMgr.cs 68-84).

Order of operations for one NPC kill:

- Kill loop. For each player in the kill's damage table (`playerCountAndDamage`), the server runs the experience step and then `killedNpc.Faction?.OnMemberKilled(player)` (AbstractServerRules.cs 1043-1052). So every damage dealer gets the faction change, not only the killer.
- Friend and enemy spread. `OnMemberKilled` (Faction.cs 88-95) calls `ChangeAggroLevel(killer, +1)` on every friend faction (this faction included, 90-91) and `ChangeAggroLevel(killer, -1)` on every enemy faction (93-94). Positive means more hostile: the message says "decreased" for a positive amount (131).
- Change. `ChangeAggroLevel` (111-133) rolls a 20% chance (113). If the roll passes, a player with no record gets `clamp(base + amount, -100, 100)` (119) and is marked dirty only if that differs from base (120). A player with a record gets `clamp(stored + amount, -100, 100)` (124) and is marked dirty if it changed (125). Then, whatever the roll or clamp result, the player is told "Your relationship with {Name} has increased/decreased" (131-132).
- Persistence. Dirty records are written to `DbFactionAggroLevel` by `SaveAggroLevels` (Faction.cs 38-86); a deleted player's record is removed from memory (52-53).
- Read. `GetStandingToFaction` (135-147) takes the stored value or the faction base (137), then returns Aggressive above 75, Hostile above 50, Neutral above 25, otherwise Friendly (139-146).
- Consumers of the standing:
  - Examine text for an NPC uses the standing (GameNPC.cs 2213-2232).
  - Interaction is blocked when the player is not in the same realm and the standing is Hostile or worse (GameNPC.cs 2482-2489; a "dirty look" line is sent).
  - An NPC brain aggroes a player whose standing is Aggressive (StandardMobBrain.cs 533-536). An NPC aggroes an NPC whose faction is one of its enemies (537-538).
  - `CanLivingAttack` refuses an attack when the two NPCs are friends (FactionMgr.cs 86-89).
- Guard NPCs (a separate rule, not a ledger). `GuardBrain` thinks every 2000 ms (7), has an aggro level of 90 (8) and an aggro range of 750 (9). Its player scan asks others for a line-of-sight answer (23-27); its NPC scan takes the first valid NPC in range and returns (33-44), with no line-of-sight check ("No LoS check, we just attack what's in range", 42). Guards attack even grey targets (47-49), provided the server rules allow it (52-54).

## 2. Key functions

- `Faction.OnMemberKilled`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/Faction.cs` 88-95. Friend +1 and enemy -1 spread.
- `Faction.ChangeAggroLevel`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/Faction.cs` 111-133. The 20% roll, the clamp, and the message.
- `Faction.GetStandingToFaction`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/Faction.cs` 135-147. Four standings from thresholds.
- `FactionMgr.Init`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/FactionMgr.cs` 15-48. Builds the friend and enemy sets from the link rows.
- Kill loop: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/serverrules/AbstractServerRules.cs` 1043-1052.
- `GuardBrain.CanAggroTarget`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ai/brain/Guards/GuardBrain.cs` 52-55.

## 3. Numbers vs mechanism

| Reusable rule (formula) | Donor value (range) | Where in donor |
|---|---|---|
| Per (faction, player) value clamped to `[lo, hi]` | lo = -100, hi = 100 | Faction.cs 14-15, 119, 124 |
| Start value for a player with no record | faction `BaseAggroLevel` (data, default not read) | Faction.cs 35, 137; DbFaction.cs 64 |
| Member killed: each friend faction (self included) `+1` | +1 per kill per friend faction | Faction.cs 28, 90-91 |
| Member killed: each enemy faction `-1` | -1 per kill per enemy faction | Faction.cs 93-94 |
| Change gate | 20% chance per faction per player per kill (donor) | Faction.cs 113 |
| Standing bands on the value `v` | Friendly v <= 25; Neutral 26-50; Hostile 51-75; Aggressive 76-100 (derived from strict `>`) | Faction.cs 139-146 |
| Interact block (other realm, Hostile or worse) | standing >= Hostile | GameNPC.cs 2482 |
| NPC aggro on player | standing == Aggressive | StandardMobBrain.cs 536 |
| NPC aggro on enemy-faction NPC | enemy link | StandardMobBrain.cs 537-538 |
| Kill loop coverage | every damage dealer | AbstractServerRules.cs 1043-1052 |
| Guard brain think interval | 2000 ms | GuardBrain.cs 7 |
| Guard brain aggro range | 750 units | GuardBrain.cs 9 |
| Guard brain aggro level | 90 (use inside the base class not read) | GuardBrain.cs 8 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for one kill: each damage dealer's standing moves by +1 in each friend faction (the dead member's faction included) and -1 in each enemy faction; each move is clamped to the same range; the standing bands read the same value with the same strict thresholds. It differs from the donor in three places, which are the fixes: there is no 20% roll (every kill moves the value), the change line is sent only when the stored value actually moves, and the message uses the faction id where the donor uses the faction name. It omits: the dirty flag and database save, the thread-safe dictionary, the realm rule and the interact and examine checks, the guard brain, the faction GM commands, and the donor's removal of deleted players' records.

```ts
// Licence: GPL-2.0-or-later (gplheader.txt; the repo LICENSE file is the GPL version 3 text). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Faction standing: each faction keeps one aggro number per player (-100..100, starting at the faction base).
// A player kill moves the killer's aggro with the dead member's friend factions up and its enemy factions down.

export type Standing = "friendly" | "neutral" | "hostile" | "aggressive";

export interface FactionNode {
  id: number;
  base: number;        // starting aggro for a player with no record (data)
  friends: number[];   // includes the faction itself
  enemies: number[];
}

const MIN_AGGRO = -100;
const MAX_AGGRO = 100;

// Donor GetStandingToFaction: strict thresholds on the aggro value.
export function standingOf(aggro: number): Standing {
  if (aggro > 75) return "aggressive";
  if (aggro > 50) return "hostile";
  if (aggro > 25) return "neutral";
  return "friendly";
}

export class FactionBook {
  private aggro = new Map<string, number>();

  constructor(
    private nodes: Map<number, FactionNode>,
    private notify: (msg: string) => void,      // player message channel
  ) {}

  value(factionId: number, playerId: string): number {
    const stored = this.aggro.get(`${factionId}:${playerId}`);
    if (stored !== undefined) return stored;
    return this.nodes.get(factionId)?.base ?? 0;
  }

  standing(factionId: number, playerId: string): Standing {
    return standingOf(this.value(factionId, playerId));
  }

  // Donor OnMemberKilled: each friend faction moves +1 against the killer, each enemy faction -1.
  onMemberKilled(factionId: number, playerId: string): void {
    const node = this.nodes.get(factionId);
    if (!node) return;
    for (const f of node.friends) this.bump(f, playerId, +1);
    for (const f of node.enemies) this.bump(f, playerId, -1);
  }

  // Donor ChangeAggroLevel, with two changes: the donor's 20% roll is dropped so every kill moves the value,
  // and the message follows the value (the donor sends it even when the roll fails or the value is clamped).
  private bump(factionId: number, playerId: string, delta: number): void {
    if (!this.nodes.has(factionId)) return;
    const before = this.value(factionId, playerId);
    const after = Math.min(MAX_AGGRO, Math.max(MIN_AGGRO, before + delta));
    if (after === before) return;
    this.aggro.set(`${factionId}:${playerId}`, after);
    this.notify(`Your relationship with ${factionId} has ${delta > 0 ? "decreased" : "increased"}`);
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/faction.ts` (proposed new module; the same proposal as for EQEmu, because the kill step is shared): the standing ledger updated when a kill is verified on the server. Parity-checklist row 18 (loot roll and XP award; the faction change is part of the kill reward step, alongside XP and loot).
- Data: each faction's base, its friend and enemy links, and the per-faction clamp are catalogue data; the band thresholds and the clamp of -100 to 100 are engine constants; the per-NPC faction is zone data.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later / GPL-3.0; clean-room only)
- Brief rule served: 18 (kill reward); server-verified kills (the change comes from the server's verified kill list, not a client message); the standing alone never starts a fight (the server engages).

## 6. Gaps and risks

- Copyleft (GPL): clean-room only. The sketch is written from the described mechanism; no donor line is translated.
- The donor's 20% roll means a kill can leave a standing unchanged, and two linked factions can drift apart for the same kill. Our rule is one point per kill, so standing will move faster than in the donor; the step and the bands must be tuned as data before launch, not left at the donor's numbers.
- Friend includes self: killing a member makes its own faction more hostile to the killer (Faction.cs 28, 90-91). That is a design choice (the family takes revenge); we must decide it on purpose, not inherit it.
- The interact block (GameNPC.cs 2482) is a realm rule. In Frankendom's one-engine design a hostile standing must not gate the server's kill or engage decision; it can only change what a client shows (dirty look, closed interact). The server must verify interaction too.
- Standing reads the aggro-like value directly (StandardMobBrain.cs 536). In our fight loop, engage is a state change and MAX_ATTACKERS = 3 applies, so an NPC aggressive standing should only raise the chance of an engage, not start one on its own.
- The guard brain is realm-based through the server rules (GuardBrain.cs 52-54), not a crime system. For zones, the guard rules (2000 ms think, 750 range, one NPC per think) are a spawn and aggro rule, closer to row 23 than to the ledger; not built here.
- No murder count, karma or jail in this donor (searched). The donor's "bounty points" are a kill-reward currency (GamePlayer.cs 3488-3834); they are not a bounty mechanic and are out of scope for this topic.
- Persistence: each changed record is marked dirty and written in a batch later (Faction.cs 38-86). That is good for cost; our ledger needs one write per kill, flushed on the kill step.

Defects (fix each; idea kept):
1. Message sent without a change (Faction.cs 113-132): the "relationship has changed" line is sent after the 20% roll whether it passed or not, and also when the stored value is already at the clamp. The player is told the standing moved when it did not. fix: remove the roll (decision), and send the line only when the stored value changes (sketch `bump`, `if (after === before) return`).
2. Clamp at the limit still reports (Faction.cs 124-132): a player already at +100 who gains again is clamped to 100 and still sees "increased". fix: same as defect 1: no change, no message.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later / GPL-3.0; clean-room only)
Brief rule served: 18 (kill reward and standing ledger); server-verified kills (gap 4: interaction must also be server-checked).
