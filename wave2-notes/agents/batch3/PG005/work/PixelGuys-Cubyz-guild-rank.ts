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

export {};
