// Licence: MIT (donor LICENSE, Maxsu 2022). Sketch written from the described mechanism, not a copy of the donor lines.
// clean-room
export interface GraphVars {
  setBool(name: string, v: boolean): void;
  setFloat(name: string, v: number): void;
}

export interface ParamSpec {
  name: string; // graph float name the value is written to
}

// Read the longest numeric prefix (donor uses from_chars, which stops at the first non-number character).
function parseLeadingFloat(s: string): number {
  const m = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(s);
  return m ? Number(m[0]) : NaN;
}

// One animation event payload, e.g. "EnableAdvance|90|110|300|...".
// Returns true only if every value parsed.
export function applyPayload(
  vars: GraphVars,
  payload: string,
  specs: Record<string, { enableName: string; params: ParamSpec[] }>,
): boolean {
  const tokens = payload.split("|").filter((t) => t.length > 0); // empty fields are dropped, so later positions shift
  const verb = tokens[0];
  const spec = verb === undefined ? undefined : specs[verb];
  if (spec === undefined) return false; // unknown verb is ignored

  vars.setBool(spec.enableName, true); // donor: the enable is written BEFORE any value is parsed
  for (let i = 0; i < spec.params.length; i++) {
    const raw: string | undefined = tokens[i + 1];
    const value = raw === undefined ? NaN : parseLeadingFloat(raw);
    if (Number.isNaN(value)) return false; // stop here; values already written stay written
    vars.setFloat(spec.params[i]!.name, value);
  }
  return true;
}

// Consumer side: the distance window is widened by the weapon ranges (donor Circling_Hook.cpp 24-33).
export function inCirclingWindow(
  distance: number,
  minDist: number,
  maxDist: number,
  optimalWeaponRange: number,
  maxWeaponRange: number,
): boolean {
  const lo = minDist + (minDist > 0 ? optimalWeaponRange : 0);
  const hi = maxDist + maxWeaponRange;
  return distance >= lo && distance <= hi;
}

// Outside the window the donor floors the chance at 0.1 so units do not stall behind a barrier (Circling_Hook.cpp 47-48).
export function circlingChance(inWindow: boolean, baseChance: number, minChance: number): number {
  return inWindow ? baseChance : Math.max(0.1, minChance);
}

export {};
