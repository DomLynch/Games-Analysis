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
