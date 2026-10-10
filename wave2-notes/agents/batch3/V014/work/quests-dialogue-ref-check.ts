// Licence: restricted (donor is proprietary, no licence). Clean-room sketch written from the described mechanism, not a translation of the donor.
// clean-room
// A dialogue reference is either one line id, or a prefix with an inclusive numbered range (prefix1..prefixN).
type LineRef =
  | { kind: "single"; tag: string }
  | { kind: "range"; prefix: string; from: number; to: number };

interface DialogueRef {
  stringFile: string; // the string table that must hold the lines
  ref: LineRef;
}

// Step 1: expand every reference into the explicit set of line ids each table must contain.
function requiredLines(refs: DialogueRef[]): Map<string, Set<string>> {
  const required = new Map<string, Set<string>>();
  for (const r of refs) {
    let ids = required.get(r.stringFile);
    if (!ids) {
      ids = new Set<string>();
      required.set(r.stringFile, ids);
    }
    if (r.ref.kind === "single") {
      ids.add(r.ref.tag);
    } else {
      // Bounds are plain numbers here, so 10 and up expand correctly.
      for (let n = r.ref.from; n <= r.ref.to; n++) ids.add(`${r.ref.prefix}${n}`);
    }
  }
  return required;
}

// Step 2: diff required ids against the ids a table really holds. A table that is absent counts as empty.
function missingLines(
  required: Map<string, Set<string>>,
  tables: Map<string, Set<string>>,
): Map<string, string[]> {
  const report = new Map<string, string[]>();
  for (const [file, ids] of required) {
    const have = tables.get(file) ?? new Set<string>();
    const missing = [...ids].filter((id) => !have.has(id));
    report.set(file, missing);
  }
  return report;
}

// Step 3: the caller decides what to do with the report. Here: fail when anything is missing.
function assertDialogueComplete(report: Map<string, string[]>): void {
  const problems: string[] = [];
  for (const [file, missing] of report) {
    if (missing.length > 0) problems.push(`${file}: ${missing.join(", ")}`);
  }
  if (problems.length > 0) throw new Error(`missing dialogue lines\n${problems.join("\n")}`);
}

export {};
