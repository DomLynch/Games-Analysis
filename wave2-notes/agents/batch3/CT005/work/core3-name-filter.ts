// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

// Reason classes (donor name_manager.lua lines 3-6).
export const ACCEPTED = 0;
export const DEVELOPER = 1;
export const FICTION = 2;
export const PROFANE = 3;
export const RESERVED = 6;

export interface FilterRow { pattern: string; reason: number; }
export interface CompiledRow { re: RegExp; reason: number; }

// Load-time check (fix): a short plain pattern with no word boundary matches inside longer names.
// The rule only rejects plain patterns under 4 characters. The donor has 656 plain lines of 1,479 (section 6);
// longer plain lines are left as they are here, and that is a gap, not a fix.
export function compileRows(rows: FilterRow[]): CompiledRow[] {
  return rows.map((r) => {
    if (!r.pattern.includes('\\b') && r.pattern.length < 4) {
      throw new Error(`filter row "${r.pattern}" needs a word boundary`);
    }
    // Case-insensitive, as donor RegexData.h line 16 compiles every row with icase.
    return { re: new RegExp(r.pattern, 'i'), reason: r.reason };
  });
}

// First match wins. resultClass 0 checks every row; any other value checks only rows of that class
// (donor NameManager.cpp checkNamingFilter 251-284).
export function checkName(name: string, rows: CompiledRow[], resultClass = 0): number {
  for (const row of rows) {
    if (resultClass > 0 && row.reason !== resultClass) continue;
    if (row.re.test(name)) return row.reason;
  }
  return ACCEPTED;
}

export function isProfane(name: string, rows: CompiledRow[]): boolean {
  return checkName(name, rows, PROFANE) !== ACCEPTED;
}

// Generate-until-clean for a random name (donor loop NameManager.cpp 613-624), with the fix that the
// final result is checked: after maxTries the function returns null, not an unchecked name.
export function generateClean(gen: () => string, rows: CompiledRow[], maxTries = 10): string | null {
  for (let i = 0; i < maxTries; i++) {
    const candidate = gen();
    if (candidate.length > 0 && !isProfane(candidate, rows)) return candidate;
  }
  return null;
}
