# jynew-jynew (parties-guilds-chat, cell 1)

Donor: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameSave/GameRuntimeData.cs` | Licence: unclear (project `LICENSE`: no use of code or resources without public authorisation; per-file headers say MIT) | C# (Unity) | symbol `JoinRoleToTeam` / `LeaveTeam`

Checked: Read in full `JoinRoleToTeam` (404-450) and `LeaveTeam` (453-480), plus `GetTeam` / `GetTeamMembersCount` (383-401). Read the Lua bridge wrappers `Join`, `JoinWithoutHint`, `Leave`, `TeamIsFull` (Jyx2LuaBridge.cs 1395-1480). Read the kick UI (XiakeUIPanel.cs 280-330 region, gates at 289 and 299) and the mod flag (MODRootConfig.cs 38). Callers: read ONE story caller (`ka96.lua` lines 1-20); `TeamIsFull` appears in 82 Lua lines across the mod, not all read. Not read: the value of `MAX_TEAMCOUNT` (it comes from a game-settings spreadsheet via `GameSettings.GetInt`), `RoleInstance.Recover` (RoleInstance.cs:198) and `UnequipItem` (RoleInstance.cs:786). Chat, friends and guilds: `Assets/Scripts` searched for party|guild|clan|faction|friend; the only hits are two Steam store links (ModPanelNew.cs:263 `curator_clanid`). `ChatUIPanel.cs` is a story dialogue box, not social chat. Confidence: high that there is no chat channel, friend list or guild system in the scripts; moderate-high on the team roster; camera_scope not applicable. Depth: thin (the roster is a fragment of a single-player game).

## 1. Mechanism

- The "party" is a single-player companion team: a list of role ids (`TeamId`, GameRuntimeData.cs:129). The hero is role 0 and is always in it (`CreateNew` joins role 0 first).
- Join (`JoinRoleToTeam`, 404-450): refuses a role already in the team (406) or an unknown role. For each item the member carries, it adds the item to the shared inventory (425) and sets the carried count to 0 (438); a count of 0 is first set to 1 (424). It then clears the member's weapon, armour and xiulian slots to -1 (443-445), clears the carried list (447) and appends the id (449). The function has NO size check.
- Size cap: enforced by the caller, not the engine. The Lua wrapper `TeamIsFull` (Jyx2LuaBridge.cs 1473-1475) is true when the count is greater than `MAX_TEAMCOUNT - 1`, i.e. when the team is at the cap. A story script (`ka96.lua` 7) checks it and refuses the join before calling `Join(16)` (ka96.lua 15). A script that skips the check can join a full team.
- Leave (`LeaveTeam`, 453-480): unequips the weapon (468) and armour (470), clears the slots to -1, clears the xiulian item's user, removes the id (476) and calls `Recover()` on the member (477). Recover's body is not read.
- Leave gate: the party UI (XiakeUIPanel.cs 289) refuses a leave unless the current map has the WORLDMAP tag, when `EnableKickTeammateBigMapOnly` is set (default true, MODRootConfig.cs 38). The hero cannot leave (XiakeUIPanel.cs 299). Both are UI checks; `LeaveTeam` itself has neither.
- No tick, no network, no per-frame loop. Changes happen on story events and in the party screen.

## 2. Key functions

- `JoinRoleToTeam`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameSave/GameRuntimeData.cs` 404-450. Duplicate guard, item pool transfer, gear clear, id append.
- `LeaveTeam`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameSave/GameRuntimeData.cs` 453-480. Unequip, slot reset, id removal, recover.
- `TeamIsFull` (Lua bridge): `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/LuaCore/Jyx2LuaBridge.cs` 1473-1475. The only cap in the code path.
- Kick gate: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/UI/XiakeUIPanel.cs` 289-299.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Join refuses a duplicate id, then moves the member's carried items into one shared pool | Carried count 0 becomes 1 before the move (GameRuntimeData.cs 424) |
| Leave strips gear and removes the id, then restores the member | Gear sentinel -1 (443-445, 469) |
| Full = count >= cap | Cap `MAX_TEAMCOUNT` (GameConst.cs 132), value NOT READ (settings spreadsheet) |
| Leave only on the world map | Flag default true (MODRootConfig.cs 38) |

The donor's own doc comment on `TeamIsFull` says "(>=6)"; that is a comment, not the value read from the settings table.

## 4. TypeScript sketch

simplified: the sketch follows the donor's join order (duplicate and unknown checks, carried items to the shared pool, gear cleared, id appended) and its leave order (gear cleared, id removed, recover). It DIFFERS from the donor in three ways on purpose: it puts the size cap, the hero-cannot-leave rule and the map-only rule inside the engine class (the donor has them in Lua and UI); it takes the Recover body as a callback because it was not read; and it does not model the xiulian item reset, the zero-to-one count quirk, the story-on-leave script or the pop-up messages. Where the carried gear goes is not modelled (the donor's gear assignments do not show it).

```ts
// Licence: unclear (donor LICENSE forbids use of code or resources without public authorisation; file headers say MIT). Clean-room sketch from the described mechanism, not a translation of the donor.
type ItemId = number;
interface Gear { weapon: number | null; armour: number | null; }
interface Role {
  id: number;
  gear: Gear;
  carried: Map<ItemId, number>; // items the companion brings with them
  hp: number;
  mp: number;
}
type JoinResult = "joined" | "full" | "duplicate" | "unknown";
type LeaveResult = "left" | "not-in-party" | "protected" | "blocked-off-map";

class Party {
  // slot 0 is the hero; order is the roster order
  private order: number[] = [];

  constructor(
    private readonly roles: Map<number, Role>,
    private readonly pool: Map<ItemId, number>,   // one shared inventory (one ledger)
    private readonly maxSize: number,             // donor: settings value, not read
    private readonly leaveOnlyOffMap: boolean,    // donor: mod config flag, default true
    private readonly recover: (r: Role) => void   // donor Recover() body, not read
  ) {}

  join(id: number): JoinResult {
    if (this.order.includes(id)) return "duplicate";
    const role = this.roles.get(id);
    if (!role) return "unknown";
    if (this.order.length >= this.maxSize) return "full"; // donor: this check lives in the Lua caller, not in join
    for (const [item, n] of role.carried) {
      this.pool.set(item, (this.pool.get(item) ?? 0) + n);
    }
    role.carried.clear();
    role.gear = { weapon: null, armour: null };
    this.order.push(id);
    return "joined";
  }

  leave(id: number, onWorldMap: boolean): LeaveResult {
    if (id === 0) return "protected";                      // donor: the hero rule is in the UI, not in LeaveTeam
    if (this.leaveOnlyOffMap && !onWorldMap) return "blocked-off-map"; // donor: UI rule
    const i = this.order.indexOf(id);
    if (i < 0) return "not-in-party";
    const role = this.roles.get(id);
    if (!role) return "not-in-party";
    role.gear = { weapon: null, armour: null };
    this.order.splice(i, 1);
    this.recover(role);
    return "left";
  }
}
```

Typecheck: the block above plus `export {}` passed `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/jynew-party-roster.ts`, exit 0).

## 5. Lands in

- TARGET `origins/party/roster.ts` (new): the party roster as engine state, with the cap and leave rules inside the join and leave functions. The roster is outside the duel step, so it is not `src/fight/`.
- Parity row: 18 (loot roll and XP award), used only for the item move on join. NO parity row fits party formation exactly; say so in review.
- today: Frankendom's current party code was not checked (out of scope for this donor read).
- Reuse tag: rewrite-from-idea (licence unclear; clean-room, shape only)
- Brief rule served: 1 (one engine: the cap and the leave rule belong in the engine, not in scripts or UI); one ledger (carried items move to one shared pool)

Best transferable idea: a party roster where joining a member moves that member's carried items into the one shared pool and strips their gear, and leaving strips gear and restores the member, with the size cap checked inside the join.
Decision (proposed): adapt - take the roster rule and the item move on join, but put the size cap, the hero-cannot-leave rule and the map-only rule inside the engine join/leave, which the donor does not do (donor checks them in Lua and UI).
Acceptance: a server test asserts that a 7th join to a full party returns "full" and leaves the shared pool unchanged; a joining member's items appear in the pool exactly once; a leave off the world map is refused.

## 6. Gaps and risks

- The cap is NOT enforced in the donor's join (JoinRoleToTeam 404-450 has no check). A script that skips `TeamIsFull` can overfill the party. Frankendom must check the cap in the engine join, and must not reuse the fight cap of MAX_ATTACKERS = 3 for the party size.
- Single-player: there is no server, so join and leave are client state changes. Frankendom must make them server-verified.
- One ledger: the donor moves carried items to the shared pool (425) but the gear clear at 443-445 does not show the equipped items going anywhere. Whether equipped gear is returned or lost is an open question (`UnequipItem` not read); do not copy the gear behaviour until it is read.
- The cap value is in a game-settings spreadsheet, not read. Decide whether the cap is a zone field or an engine constant before copying any number.
- The hero-cannot-leave and map-only rules live in the UI (XiakeUIPanel.cs 289, 299). Frankendom's rule is that the engine decides; the UI should only show the refusal.
- Licence unclear: the project LICENSE restricts use of code and resources, so this is clean-room, shape only.

## Checker findings

- Verdict: CLEAN
- Corrected: nothing to correct
- Missed: LeaveTeam also zeroes ExpForItem (GameRuntimeData.cs 473); the sketch omits it, and the note admits the xiulian reset is not modelled
