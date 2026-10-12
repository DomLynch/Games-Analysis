// Licence: MIT (donor LICENSE.md). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Hash = string;
type Where = string;

interface Finding { symbol: string; where: Where[]; }

interface GateResult {
  ok: boolean;
  rescanned: boolean;
  errors: Finding[];
}

// Name -> hash of the exact bytes that last passed. One pin per name, so a new hash replaces the old pin.
const pins = new Map<string, Hash>();

// Rule grammar: "*" is a wildcard; a leading "!" marks an allow-list exception.
function ruleToTest(rule: string): (symbol: string) => boolean {
  const body = rule.replace(/^!/, "");
  const pattern = body
    .split("*")
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  const re = new RegExp("^" + pattern + "$");
  return symbol => re.test(symbol);
}

// Deny-by-default: blocked if a deny rule matches and no exception rule matches.
function blocked(symbol: string, rules: string[]): boolean {
  const denies = rules.filter(r => !r.startsWith("!")).map(ruleToTest);
  const allows = rules.filter(r => r.startsWith("!")).map(ruleToTest);
  if (!denies.some(t => t(symbol))) return false;
  return !allows.some(t => t(symbol));
}

// Gate one published bundle. The hash and the reference collector are injected:
// the donor uses SHA-256 and Mono.Cecil; this sketch takes them as parameters.
function gateBundle(
  name: string,
  bytes: Uint8Array,
  hash: (b: Uint8Array) => Hash,
  collectRefs: (b: Uint8Array) => Map<string, Where[]>,
  allowedRef: (symbol: string) => boolean,
  ownPrefix: string,
): GateResult {
  if (!name.startsWith(ownPrefix)) {
    return { ok: false, rescanned: false, errors: [{ symbol: name, where: ["name prefix"] }] };
  }

  // Same bytes as the pinned version: accept without rescanning.
  const h = hash(bytes);
  if (pins.get(name) === h) return { ok: true, rescanned: false, errors: [] };

  // Changed bytes: rescan every referenced symbol, keep at most 5 locations each.
  const errors: Finding[] = [];
  for (const [symbol, where] of collectRefs(bytes)) {
    if (symbol.startsWith(ownPrefix)) continue; // a bundle may reference itself freely
    if (!allowedRef(symbol)) errors.push({ symbol, where: where.slice(0, 5) });
  }
  if (errors.length > 0) return { ok: false, rescanned: true, errors };

  pins.set(name, h);
  return { ok: true, rescanned: true, errors: [] };
}

export {};
