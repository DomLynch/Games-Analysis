# gawric-Unity-Client-for-L2J (parties-guilds-chat, cell 2)

Donor: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/UI/Game/Clan/DetailedClan/ClanDetailedInfo.cs` | Licence: Apache License 2.0 (`/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/LICENSE` line 2; code may be adapted) | C# (Unity client) | symbol `GetCalcNewRank` (with `OnClickApplyPrivilege`, `ClanPrivileges`)

Checked: confidence high on the client flow as written; medium on what the server does with actions 1 and 2 (server not in donor, not read). Opened and read: `ClanPrivileges.cs` (whole), `ClanDetailedInfo.cs` 73-110 and 152-190, `RankingPrivelege.cs` (whole), `PledgePowerCheckBoxInstaller.cs` (whole), `PrivilegesInfoContent.cs` 45-118, `CheckBoxInstaller.cs` 1-50, `ByteUtils.cs` 70-130, `PledgePowerGradeListDto.cs` (whole), `PledgeReceivePowerInfoDto.cs` (whole), `ManagePledgePowerIncoming.cs` (whole), `NetworkCommands.cs` 302-314, `CreatorPanelCheckBoxWindows.cs` 302-303. Not read: the server side, `SettingCheckBox`, the `ManagePledgePowerDto` class, the `SubPledgeLeaderName` source. Not read at all: the party, friend-list and chat code (outside this cell's note). The hint file (`abso-chat-actions.patch`) changes click-to-attack and chat display, not guild rights, so it was not used as the mechanism. camera_scope: not applicable.

## 1. Mechanism

- A clan rank (a "pledge grade") holds a privilege mask: one int whose set bits are the rights the rank has. The client draws the mask as checkboxes, lets an officer edit it, and sends it back. The client never decides whether an action is allowed: no client code tests a bit to gate a button or a command (grep of `ClanPrivileges.` finds only the UI lists and the leader override). The server enforces; its code is not in this donor (not read).
- Order of steps as the code runs:
  (a) Rank list arrives. `PledgePowerGradeListDto.ReadFrom` reads a count, then (rank, power) int pairs (`PledgePowerGradeListDto.cs` 15-21). `ExPledgePowerGradeListIncoming` queues `ShowGradeInfo` for the UI.
  (b) Read-only view. A grade's mask is drawn with its bits checked and disabled; the Apply button is hidden (`PrivilegesInfoContent.cs` 54-58). A mask of 0 gives an unchecked panel, and the all-bits value gets its own case (`PledgePowerCheckBoxInstaller.cs` 101-117). Other masks are split into single bits, and each bit ticks its box (`PledgePowerCheckBoxInstaller.cs` 120).
  (c) Edit. The Edit button sends `(rank, 1, current mask)` (`RankingPrivelege.cs` 80). The donor treats the reply as a `ManagePledgePower` packet (`ManagePledgePowerIncoming.cs` 6-9), which shows the editable view with Apply visible (`PrivilegesInfoContent.cs` 60-63). That the server replies this way is an inference from the donor's handlers; the server side is not read.
  (d) Apply. `GetSelectAllCheckBoxs` returns the checked boxes (`CreatorPanelCheckBoxWindows.cs` 302-303). `GetCalcNewRank` returns the one value if exactly one box is checked; otherwise it drops zero values and ORs the rest with `CombineFlags`, which throws on any value that is not a single bit (`ClanDetailedInfo.cs` 178-190; `ByteUtils.cs` 76-87). Then it sends `(rank, 2, mask)` (`ClanDetailedInfo.cs` 157-164). With no box checked the mask is 0.
  (e) Leader override. When a grade's name equals `SubPledgeLeaderName`, the displayed mask is set to CP_ALL before the read-only view is shown (`ClanDetailedInfo.cs` 82-86). It is display-only: the read-only view hides Apply, so no edit is sent.
- Numbers. Privilege values are single bits from 2 (bit 1) to 4194304 (bit 22); value 1 is unused. There are 22 flags in three groups: clan (9 flags, 2-512), clan hall (5 flags, 1024-16384) and castle (8 flags, 32768-4194304) (`ClanPrivileges.cs` 5-27). CP_ALL is 8388606, which equals 2^23 - 2 (the sum of the 22 bits; arithmetic check, not a receipt). The UI shows 21 of the 22 flags. `CP_CS_MANOR_ADMIN` (65536, `ClanPrivileges.cs` 21) has no checkbox in `CheckBoxInstaller.cs` 37-50; grep finds only its definition.
- Tick and camera: not applicable. This is request-response on click; no per-frame loop.

## 2. Key functions

- `GetCalcNewRank`: `ClanDetailedInfo.cs` 178-190. The one-box shortcut (180-183) returns the box value without the single-bit check; the multi-box path (185-189) drops zeros and calls `CombineFlags`.
- `OnClickApplyPrivilege`: `ClanDetailedInfo.cs` 157-169. Reads the checked boxes, computes the mask, sends action 2. The `-1` guard (162) is never hit by any path in this file (`SettingCheckBox.GetData` not read).
- `ByteUtils.CombineFlags(int)`: `Utils/ByteUtils.cs` 76-87. Rejects any value that is not a single positive bit, then ORs.
- `ByteUtils.SplitMask(int)`: `Utils/ByteUtils.cs` 104-115. Peels the lowest set bit each loop.
- `PledgePowerCheckBoxInstaller.HandlePowerNotAll`: `PledgePowerCheckBoxInstaller.cs` 99-122. Maps 0 and CP_ALL to special cases, else splits the mask into boxes.
- `PrivilegesInfoContent.PreShow`: `PrivilegesInfoContent.cs` 54-66. Chooses the read-only view (grade, Apply hidden) or the edit view (rank, Apply shown).
- `RankingPrivelege.OnClickEdit`: `RankingPrivelege.cs` 75-86. Sends action 1 with the selected rank's current mask.
- `RequestPledgePowerCommand`: `NetworkCommands.cs` 302-314. Carries rank, action and privs.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A right is one bit; "has right" is `mask & bit` | Bit values 2 to 4194304; bit value 1 unused (`ClanPrivileges.cs` 6-27) |
| Apply ORs the checked single bits; zeros (headers) are dropped | Single-bit guard `f <= 0 \|\| (f & (f - 1)) != 0` (`ByteUtils.cs` 82) |
| Peel the lowest bit until the mask is empty | None (the loop) |
| "All rights" is the OR of every right | CP_ALL = 8388606 (`ClanPrivileges.cs` 28) |
| Leader is shown with all rights (display only) | Leader-name match (`ClanDetailedInfo.cs` 84) |
| Two-step edit: fetch current mask, then apply | Action codes 1 and 2 (`RankingPrivelege.cs` 80; `ClanDetailedInfo.cs` 164); meaning on the server not read |

## 4. TypeScript sketch

simplified: keeps the donor's single-bit check, the zero-drop, the peel and the leader-as-all display rule as a rule. It omits the donor's one-box shortcut (which skips the single-bit check), the `-1` guard, the castle and clan-hall groups, the read-only view, the wire format and the packet names. It adds two rules the donor does not have: a server-side MANAGE_RANKS gate and a no-grant-above-own-mask rule. Only the clan group is in the sketch, so ALL_CLAN is 1022 (2 + 4 + ... + 512), not the donor's 8388606.

```ts
// Licence: Apache-2.0 (donor). Clean-room sketch of the rank-mask shape (one bit per privilege, edit by rank, leader holds all). Not a translation of the donor's C#.
export {};

// One bit per clan privilege. Each value is a single power of two (donor: ClanPrivileges.cs).
const PRIV = {
  JOIN_CLAN: 2,
  GIVE_TITLE: 4,
  VIEW_WAREHOUSE: 8,
  MANAGE_RANKS: 16,
  PLEDGE_WAR: 32,
  DISMISS: 64,
  EDIT_CREST: 128,
  MASTER_RIGHTS: 256,
  MANAGE_LEVELS: 512,
} as const;
const ALL_CLAN = 1022; // 2 + 4 + ... + 512

// Donor rule (ByteUtils.CombineFlags): every input must be one set bit, then OR them together.
function combine(flags: number[]): number {
  let mask = 0;
  for (const f of flags) {
    if (f <= 0 || (f & (f - 1)) !== 0) throw new Error(`not a single privilege bit: ${f}`);
    mask |= f;
  }
  return mask;
}

// Donor rule (ByteUtils.SplitMask): peel the lowest set bit until none are left.
function split(mask: number): number[] {
  const out: number[] = [];
  for (let m = mask; m !== 0; m &= m - 1) out.push(m & -m);
  return out;
}

// Apply step: the checked boxes become one mask for the rank. Zero entries (headers) are dropped.
function maskFromChecks(checked: number[]): number {
  return combine(checked.filter((f) => f !== 0));
}

// Display and check helper. The donor's leader override is display-only; here it is a rule.
function effectiveMask(rankMask: number, isLeader: boolean): number {
  return isLeader ? ALL_CLAN : rankMask;
}

// Frankendom rule (not in the donor): only a holder of MANAGE_RANKS may edit a rank,
// and an edit may never grant a bit the editor does not hold.
function applyRankEdit(editorMask: number, editorIsLeader: boolean, checked: number[]): number {
  const editor = effectiveMask(editorMask, editorIsLeader);
  if ((editor & PRIV.MANAGE_RANKS) === 0) throw new Error("refused: no MANAGE_RANKS");
  const next = maskFromChecks(checked);
  if ((next & ~editor) !== 0) throw new Error("refused: grants a bit the editor does not hold");
  return next;
}

const officer = PRIV.MANAGE_RANKS | PRIV.JOIN_CLAN;
const next = applyRankEdit(officer, false, [PRIV.JOIN_CLAN, PRIV.GIVE_TITLE].filter((b) => (officer & b) !== 0));
console.log(next, split(next));
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/pg010-gawric-rank-mask.ts` on the VPS, exit 0.

## 5. Lands in

- Parity row: none. Rows 1-23 do not cover guild ranks or who may do what; the nearest, row 18 (loot roll and XP award), is about rewards, not rights.
- TARGET `origins/server/guild-ranks.ts` (proposed new file; existence not checked; the server-side check and the rank mask would live here, not in the client UI).
- Reuse tag: adapt (Apache-2.0 allows adapting the shape; the sketch above is clean-room).
- Brief rule served: "server-verified" (the donor checks rights only in the client UI, so Frankendom must add the server check itself); rules 7-9 n/a.

## 6. Gaps and risks

- The donor has no client-side enforcement at all. Anything that gates a button on this mask would be a fake gate: the server must refuse the command (the sketch's `applyRankEdit`).
- The server half of the mechanism is not in the donor, so what action 1 and action 2 do, and what the server refuses, is unknown. Frankendom has to write both halves.
- Copy the no-grant rule, not the donor's leader override as a UI patch: if the server does not also treat the leader as holding all bits, the display lies.
- Do not copy the one-box shortcut in `GetCalcNewRank` (180-183): a single box skips the single-bit check.
- `CP_CS_MANOR_ADMIN` is defined but has no checkbox, so it cannot be edited here. Do not copy a flag that has no UI path without a reason.
- Clan halls and castles (the 13 flags in the clan hall and castle groups) are per-location rights. In Frankendom they would be zone data, and only if Frankendom has owned places; not needed for the fight core.
- An empty Apply sends mask 0 (`ClanDetailedInfo.cs` 159-164): a rank with no rights is a legal state. Decide whether that is wanted.
- Rank masks are per-guild server state, not designer tunables; the flag values are fixed by the protocol. The number of ranks and the default masks are not in this donor.

Best transferable idea: a guild rank as one bit-mask of single-bit rights, with an edit refused by the server unless the editor holds MANAGE_RANKS and cannot grant a bit the editor does not hold.

Decision (proposed): adapt — keep the one-bit-per-right mask and the no-grant-above-own-rights rule; drop the 22-flag, three-group clan-hall and castle layout until Frankendom has guilds that own places. The brief's rulings do not cover guilds, so this is a design input, not a port.
Acceptance: a server test shows that a member without MANAGE_RANKS gets a refused edit, that an officer cannot grant a bit they lack (refused), and that an officer's valid edit is saved and read back identically.
