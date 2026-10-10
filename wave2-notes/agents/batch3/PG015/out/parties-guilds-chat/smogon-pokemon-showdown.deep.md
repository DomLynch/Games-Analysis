# smogon-pokemon-showdown (parties-guilds-chat, cell 3)

Donor: `/mnt/frankendom-donors/smogon-pokemon-showdown/server/user-groups.ts` (`Auth.hasPermission`, `Auth.hasJurisdiction`) with `config/config-example.js` (rank order and jurisdictions), `server/config-loader.ts` (rank numbers) and `server/chat-commands/moderation.ts` (promote) | Licence: MIT (`LICENSE`: "The MIT License (MIT)", Copyright (c) 2011-2026 Guangcong Luo and other contributors) | TypeScript | symbol `Auth.hasPermission`

Checked: `Auth.hasPermission` (user-groups.ts 113-185) and `Auth.hasJurisdiction` (211-231) read in full; `Auth.atLeast` instance (71-88) and static (187-188) read; `getGroup` fallback (98) read; config-loader.ts 188-200 read; the permission docs (config-example.js 530-560) read; the grouplist entries (config-example.js 586-760) read only for their id, symbol, jurisdiction and promote/ban/mute keys (grep), not whole entries; the global promote block (moderation.ts 1441-1500) read in full; the room-level promote path was not located and not read (moderation.ts 1521-1522 is a different command). Confidence high on the check order and the 'u' rule; medium on the grouplist ordering because only the keys were read. Not read: the `inherit` field (documented in config-example.js near 540-546; the code that follows it was not read), the room-level promote path, and the section-leader code beyond line 149. Topic check: rooms.ts (the hint) shows the room user list grouped by rank (656-670, grep only); that is social state sync and is not written here. Friend list and chat throttle are in section 6, not written.

Best transferable idea: Give every rank a jurisdiction (which other ranks it may act on) with one rule, "any rank strictly below mine", so an officer can kick any member below officer without a table entry per rank, and require the permission on both ends of a promotion.
Decision (proposed): adapt - take the rank number, the "strictly below me" rule and the promote-both-ends check; drop the section-leader override and the account-trust pseudo-ranks, fail closed on unknown ranks, and make each guild's minimum rank per action data.
Acceptance: a server test with a leader (rank 4), an officer (rank 3) and a member (rank 1): the officer kicks the member and it succeeds; the officer kicks another officer and it is refused; the officer promotes the member to rank 2 and it succeeds; the officer promotes the member to rank 3 and it is refused.

## 1. Mechanism

One check answers "may this actor use this permission, against this target (a rank, or nobody)?" (`Auth.hasPermission`, user-groups.ts 113-185; the target check is `Auth.hasJurisdiction`, 211-231). Steps in order:
(a) Global sysop bypass (121).
(b) The actor's effective rank comes from the room's auth map, or the global one outside a room (123-125). A target with no entry, or a pseudo-entry ('whitelist', 'trusted', 'autoconfirmed'), is treated as the default rank (135-136).
(c) A group flagged `root` may do anything (140).
(d) Each group lists, per permission, a jurisdiction. A plain `true` takes the group's default `jurisdiction` (151-152). The jurisdiction is a string of target symbols plus two specials: 'a' (any group) and 'u' (any group strictly lower in rank than the actor) (config-example.js 545-546; checks at 222-228).
(e) A room may set its own minimum rank for a command or a permission. If it does, the actor must reach that rank (`atLeast`) or the check fails, and the jurisdiction becomes 'u' (155-183; the plain-permission case is at 180-181).
(f) The target check (`hasJurisdiction`, 211-231): no target means "allowed if the jurisdiction is set" (217, 220); the target's symbol listed in the jurisdiction means allowed (222); 'a' means allowed (225); 'u' means allowed when the actor's rank is strictly higher than the target's (228).

Promotion (moderation.ts 1475-1496, global form): the actor needs the 'promote' permission against the CURRENT group (1475) and against the NEW group (1479). The change is a demotion when the new group's rank is lower than the current one (1495).

Ranks come from list order: `rank = numGroups - i - 1` (config-loader.ts 198), so the first group in `grouplist` is the highest. Example order in config-example.js: admin (586), owner (615), host (633), mod (648), driver (665), bot (695), player (714), voice (728), prizewinner (742), whitelist (748), regular (760). The example gives admin, owner, host, mod, driver and bot the default jurisdiction 'u' (589, 619, 637, 652, 669, 699). Some permissions are explicit: admin's promote is '~u' (595), and driver's mute lists the host symbol as well as 'u' (675).

## 2. Key functions

- `Auth.hasPermission`: `/mnt/frankendom-donors/smogon-pokemon-showdown/server/user-groups.ts` 113-185. Sysop bypass, target normalisation, root bypass, default jurisdiction, room override, and the final target check.
- `Auth.hasJurisdiction`: `/mnt/frankendom-donors/smogon-pokemon-showdown/server/user-groups.ts` 211-231. Null target, listed symbol, 'a', 'u' with strictly lower rank.
- `Auth.atLeast` (static): `/mnt/frankendom-donors/smogon-pokemon-showdown/server/user-groups.ts` 187-188. Rank greater than or equal. The instance method at 71-88 adds the sysop, locked and whitelist cases.
- Rank assignment: `/mnt/frankendom-donors/smogon-pokemon-showdown/server/config-loader.ts` 188-200 (rank from list order at 198).
- Promote (global): `/mnt/frankendom-donors/smogon-pokemon-showdown/server/chat-commands/moderation.ts` 1475-1496 (both-end check at 1475 and 1479; demotion test at 1495).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Rank is a position in an ordered ladder; higher is more power | Order = example grouplist order (theirs, config-example.js 586-760); rank = count minus index (theirs, config-loader.ts 198) |
| Each permission lists the ranks it may act on | Per-group jurisdiction strings (theirs; the example uses 'u' for six groups, config-example.js 589-699) |
| "Strictly below me" as one rule | 'u' (documented at config-example.js 545-546; checked at user-groups.ts 228) |
| A room or guild can raise the minimum rank for an action | Room settings map (theirs, user-groups.ts 155-183); the minimum is a rank symbol, not a number |
| Promotion needs the permission on both the old and new rank | Documented at config-example.js 554-555; enforced at moderation.ts 1475 and 1479 |

There are no numeric game constants. The donor's numbers are the ordering only.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: sysop bypass, root bypass, the group's permission with its default jurisdiction, the room minimum rank (which turns the jurisdiction into 'u'), then the target check (listed symbol, 'a', or 'u' with strictly lower rank), and the two-ended promotion. It omits the section-leader override (user-groups.ts 141-149), the pseudo-ranks 'whitelist', 'trusted' and 'autoconfirmed', the locked and semilocked checks, the voice fallback for unknown symbols (user-groups.ts 98), per-command room permission names and namespaces, the `inherit` chain, and the "unranked target" symbol quirk. It fails closed on unknown groups, which the donor does not.

```ts
// Licence: MIT (donor, LICENSE: "The MIT License (MIT)", Copyright 2011-2026 Guangcong Luo and other contributors). Adaptation is allowed under MIT; this sketch was written from the rules the donor documents and implements, not copied from its lines.
// Rank ladder: a higher rank number has more power. Each group lists, per permission, which target groups it may act on.
// 'a' = any group, 'u' = any group strictly lower in rank than the actor, or a list of target symbols.
interface GroupDef {
  rank: number;
  root?: boolean;                       // may do anything
  jurisdiction?: string;                // default for permissions granted as plain `true`
  permissions: Record<string, true | string>;
}

type Groups = Record<string, GroupDef>;

// Per-room (per-guild) override: permission -> minimum symbol needed to use it.
type RoomOverrides = Record<string, string>;

interface Actor { symbol: string; sysop: boolean; }

// Target check, in the donor's order: symbol listed, then 'a', then 'u' with a strictly lower rank.
function jurisdictionAllows(groups: Groups, actorSymbol: string, jur: string, targetSymbol: string): boolean {
  if (jur.includes(targetSymbol)) return true;
  if (jur.includes("a")) return true;
  const t = groups[targetSymbol];
  return jur.includes("u") && t !== undefined && groups[actorSymbol].rank > t.rank;
}

// Can `actor` use `permission`, optionally against `target` (a group symbol, or null for no target).
function canUse(
  groups: Groups,
  actor: Actor,
  permission: string,
  target: string | null,
  overrides: RoomOverrides | null,
): boolean {
  if (actor.sysop) return true;
  const g = groups[actor.symbol];
  if (g === undefined) return false;
  if (g.root) return true;

  let jur: string | true | undefined = g.permissions[permission];
  if (jur === true) jur = g.jurisdiction ?? true;

  if (overrides !== null && overrides[permission] !== undefined) {
    const need = groups[overrides[permission]];
    if (need === undefined || g.rank < need.rank) return false;
    jur = "u";
  }

  if (!jur) return false;
  if (target === null) return true;
  if (jur === true) return true;
  return jurisdictionAllows(groups, actor.symbol, jur, target);
}

// Promotion needs the permission against BOTH the current and the new group.
function canPromote(groups: Groups, actor: Actor, from: string, to: string, overrides: RoomOverrides | null): boolean {
  return canUse(groups, actor, "promote", from, overrides) && canUse(groups, actor, "promote", to, overrides);
}

export {};
```

## 5. Lands in

- TARGET `origins/server/guild-permissions.ts` (new; one server-side check that every guild action calls before it changes state). Not checked against the Frankendom repo (not read).
- Parity row: none fits. Guild ranks and permissions are not in checklist rows 1-23. Named plainly as a gap in the checklist; no row is forced onto it.
- Reuse tag: adapt-allowed (MIT; the rule is rewritten from the documented rules, not copied)
- Brief rule served: server-verified (the check runs on the server before the guild change); one ledger (the rank is one field on the guild membership row); no client-side rule.

## 6. Gaps and risks

- MIT: code may be adapted. The sketch is written from the documented rules and the check order, not copied.
- The section-leader override (user-groups.ts 141-149): a global role gives room moderator powers in its section, unless the room rank is already higher. Frankendom should not add a cross-guild role unless it is designed on purpose.
- The pseudo-ranks ('whitelist', 'trusted', 'autoconfirmed', user-groups.ts 135 and 71-88) mix account trust with rank. They are not in Frankendom's ladder; do not import them.
- Locked or semilocked users fail the instance `atLeast` check (user-groups.ts 78), which the room override path uses. Frankendom needs an equivalent (a removed or muted member), stated as a field on the membership, not an account flag.
- Unknown group symbols get the voice rank's permissions (user-groups.ts 98: "unidentified groups are treated as voice"). That fails open. Frankendom should fail closed: an unknown rank does nothing.
- Room overrides name a minimum rank per command or permission (user-groups.ts 155-183). Frankendom's guild ranks are data per guild; the minimum per action should be the same kind of field, not code.
- The `inherit` field (documented at config-example.js near 540-546) lets a group borrow another group's permissions. Not read in code. Frankendom should not add inheritance silently.
- The room-level promote path was not read. Only the global promote (moderation.ts 1441-1496) was read in full, so room promotion rules are not verified here.
- Not written (found, read only in part): friend list caps and request limits (server/friends.ts 13-15 MAX_FRIENDS 100, MAX_REQUESTS 6, checks at 326, 336-338, 356; a block-friend-requests setting at users.ts 331 and friends.ts 137, 184, 194). Chat throttle: a queue with a 600 ms delay for normal users, 100 ms for trusted, 25 ms for public bots, a buffer of 6, and an overflow notice (users.ts 33-39, 1437-1483; read by grep and the queue lines only). Either could be a separate note later.
