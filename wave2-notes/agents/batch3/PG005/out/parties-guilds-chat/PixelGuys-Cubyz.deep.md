# PixelGuys-Cubyz (parties-guilds-chat, cell 1)

Donor: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/permission.zig` (with `src/entityComponent/permissions.zig`, `src/server/command.zig`, `src/server/command/permission/group.zig`) | Licence: GPL-3.0 (LICENSE file: GNU General Public License v3; no "or later" clause read) | Zig | symbol `Permissions.hasPermission`

Checked: Read `src/server/permission.zig` 1-262 (in ranges; 98-109, 112-200, 206-262 in full), 344-347 and 442-470 (tests); `src/entityComponent/permissions.zig` 1-130 (all); `src/server/command.zig` 15-35 and 70-90; `src/server/command/permission/group.zig` 1-130 (lines 132 onward not read); `src/network/protocols.zig` 795-830; `src/server/server.zig` 893-935. Callers of `hasPermission` (grep): command.zig:79 and group.zig:105 read; `help.zig:26,39` and `perm.zig:39,55` and `group.zig:132` NOT read. Searched for party, guild, friend and channel code: none found; `/invite` (command/invite.zig) connects by IP and was only grep-read. Confidence: high on the resolver and the group lifecycle; medium on the full caller set. camera_scope: n/a.

## 1. Mechanism

- A permission check is a path string such as `/command/kick`. There is no rank ladder: a player holds a set of permission groups plus their own permission lists, and the answer is yes, no or neutral.
- Order of steps for the resolver (`Permissions.hasPermission`, `src/server/permission.zig` 98-109): start with the full path. At each level it checks the blacklist first, then the whitelist, for that exact prefix (103-104). If neither matches, it cuts the last segment and repeats (106). After the loop only the root entry `/` on the whitelist can answer yes (108); otherwise the answer is neutral. For `/command/kick` the levels are `/command/kick`, then `/command`; the root `/` is then checked on the whitelist only (line 108). The first hit wins, so the most specific entry decides.
- The entity check (`entityComponent/permissions.zig` 67-82) runs in two steps. (a) The player's own lists go first: yes returns true, no returns false (68-72). (b) Only on neutral does it loop over the groups the player belongs to (73-80); any group that answers yes grants the path (79). A group's no does not block another group's yes.
- Stale membership: if a group id no longer resolves (`GroupInstance` lookup returns GroupNotFound, permission.zig 243), the membership is removed during the check (line 76, inside the `catch blk:` branch). The donor's comment says why ids must be unique (190).
- Group lifecycle: `createGroup` gives the new group id = current list length (219), so a deleted id is never handed out again. `delete` sets that slot to null (252) and removes the name from the name map (251). The default group cannot be removed from a member (group.zig 77-78).
- Grants (`/group <g> add|remove <whitelist|blacklist> <path>`, group.zig 99-128): the command first checks that the caller has the path (105). If not, it sends a warning (106) and does not return; the rule is still added (112-116). This is a donor weakness, not a guard.
- Command gate (`command.zig` 79): a user without the command's permission path gets "No permission" and the command does not run. The server console source is always allowed (`command.zig` 26).
- Chat: there are no channels. `messageFrom` (`server.zig` 893-895) formats one line and calls `sendMessage` (909-912), which calls `sendRawMessage` (897-906); that loops over every connected user (903-904). The server checks the length cap before relaying (`protocols.zig` 817-821). Chat is sent on the `.lossy` label (825); the transport comment says lossy is still a TODO (`network.zig` 1498).
- No party, guild, friend list or invite-to-group code was found. Two graphics files matched the word search and were not opened.
- Ticks: none. Each check runs synchronously when a command arrives.

## 2. Key functions

- `Permissions.hasPermission`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/permission.zig` 98-109 (the resolver).
- `Entity hasPermission`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/entityComponent/permissions.zig` 67-82 (own lists, then group union, stale removal).
- `Group.createGroup`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/permission.zig` 212-225 (never-reused id).
- `Group.delete` and `getInstance`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/permission.zig` 242-262 (null slot; GroupNotFound).
- `/group` command: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/command/permission/group.zig` 48-128 (membership add/remove, grant check at 105, default-group guard at 77-78).
- Command gate: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/command.zig` 23-26 and 79-82.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Walk from the most specific path to the root; black before white at each level; first hit wins | None (rule) |
| Root `/` is consulted on the whitelist only, at the end | Root entry `/` (rule, permission.zig 108) |
| Own verdict first (yes/no end it); otherwise any group yes grants | None (rule, entityComponent/permissions.zig 68-79) |
| Group ids never reused; deleted id returns GroupNotFound | Id = list length (theirs, permission.zig 219) |
| Default group protected from removal | Name "default" (theirs, group.zig 78) |
| Chat cap (not part of this resolver) | 10000 bytes and 1000 visible characters (theirs, protocols.zig 817) |

There are no tuning numbers in the permission mechanism. The donor has no rank ladder or tuning numbers.

## 4. TypeScript sketch

simplified: The sketch keeps the donor's order (specific path first, black before white at each level, own verdict before groups, dead groups dropped). It differs in three deliberate ways. (1) It also honours a blacklist entry for the root `/`; the donor reads the root only from the whitelist (permission.zig 108), so a blacklisted `/` has no effect there. (2) It refuses a grant the granter cannot make; the donor only warns and still grants (group.zig 105-116). (3) It omits the server console source (always allowed), the save and load to disk, the byte format, the entity component wrapper and the default-group protection.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Verdict = "yes" | "no" | "neutral";

interface Rules {
  white: Set<string>;
  black: Set<string>;
}

// Most specific path first, then each parent, then the root "/".
function prefixes(path: string): string[] {
  const out: string[] = [];
  let p = path;
  for (;;) {
    out.push(p);
    const i = p.lastIndexOf("/");
    if (i <= 0) break;
    p = p.slice(0, i);
  }
  if (out[out.length - 1] !== "/") out.push("/");
  return out;
}

// At each level a blacklist hit beats a whitelist hit at that same level; the most specific level decides.
function resolve(rules: Rules, path: string): Verdict {
  for (const level of prefixes(path)) {
    if (rules.black.has(level)) return "no";
    if (rules.white.has(level)) return "yes";
  }
  return "neutral";
}

interface Rank {
  id: number;
  name: string;
  rules: Rules;
}

// Ids are never reused: a deleted rank keeps its slot as null, so an old membership cannot match a new rank.
const ranks = new Map<number, Rank | null>();
let nextId = 0;

function createRank(name: string): Rank {
  const r: Rank = { id: nextId++, name, rules: { white: new Set(), black: new Set() } };
  ranks.set(r.id, r);
  return r;
}

function deleteRank(id: number): boolean {
  if (!ranks.get(id)) return false;
  ranks.set(id, null);
  return true;
}

interface Member {
  personal: Rules;
  rankIds: Set<number>;
}

// The member's own verdict decides first (yes or no ends it). Otherwise any live rank that says yes grants.
function canUse(m: Member, path: string): boolean {
  const own = resolve(m.personal, path);
  if (own !== "neutral") return own === "yes";
  for (const id of m.rankIds) {
    const r = ranks.get(id);
    if (!r) {
      m.rankIds.delete(id); // stale membership of a deleted rank is dropped
      continue;
    }
    if (resolve(r.rules, path) === "yes") return true;
  }
  return false;
}

// Simplified: the donor warns when the granter lacks the path and still grants it; this sketch refuses the grant.
function grantToRank(granter: Member, r: Rank, list: "white" | "black", path: string): boolean {
  if (!canUse(granter, path)) return false;
  r.rules[list].add(path);
  return true;
}
```

## 5. Lands in

- TARGET `origins/server/guild-ranks.ts` (new, server store): rank rules and the member check that every guild action calls before it runs (invite, kick, rank edit). It sits in the one ledger on the server, not on the client.
- Parity row: none fits. Rows 1-23 cover fight, AI, controls, HUD, death and respawn, loot and XP, catalogue, and zone population (row 23). None covers guild ranks or permissions. Written as `none`; the target file is named above.
- Reuse tag: rewrite-from-idea (GPL-3.0, copyleft: clean-room only)
- Brief rule served: one ledger (rank membership and rules in one server store, checked by the engine before any guild action); server-verified actions

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described order, not from the donor lines.
- The donor has no guild, party, friend list or chat channel. This cell covers only the permission side of ranks. Party formation and friend lists need another donor.
- The donor's grant check warns and grants anyway (group.zig 105-116). Frankendom's rule must be refuse: a rank holder cannot grant a permission they do not hold.
- Root wildcard: a whitelist `/` answers yes for every path not decided earlier (permission.zig 108). For guild ranks Frankendom should default-deny the root instead.
- Path strings are not typed. A typo in a path grants nothing, silently. Frankendom should validate each guild permission path against a catalogue of guild actions.
- Stale removal happens inside the loop over the same map (entityComponent/permissions.zig 73-80, removal at 76). I did not verify that this iteration is safe in Zig's hash map; treat it as a risk.
- A personal deny (own list, no) blocks every rank for that player (entityComponent/permissions.zig 70). This is useful for a per-member ban but is a ruling question for Frankendom.
- Lossy channel: the transport comment (network.zig 1498) says lossy is still a TODO. Chat is out of this cell's scope.

Best transferable idea: Resolve a guild action by walking from the most specific permission path up to the root, so a member's own deny beats any rank allow, and never reuse a deleted rank's id so an old membership cannot match a new rank.
Decision (proposed): adapt - take the resolver order and the never-reused rank ids; do not take the donor's warn-and-grant rule, the root wildcard, or the global chat. Frankendom needs ranks as permission sets that the engine checks, with default-deny at the root and refused grants.
Acceptance: A server test shows an officer with `guild/kick` from their rank can kick a member; a personal deny on `guild/kick` blocks them even though the rank allows it; deleting and re-creating a rank named "officer" does not restore its old members' rights; an officer without `guild/invite` gets a refusal when trying to grant it to a rank.
