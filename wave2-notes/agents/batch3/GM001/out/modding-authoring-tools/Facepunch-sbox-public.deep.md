# Facepunch-sbox-public (modding-authoring-tools, cell 1)

Donor: `/mnt/frankendom-donors/Facepunch-sbox-public/engine/Sandbox.Access/AccessControl.cs` | Licence: MIT (repo `LICENSE.md`, "Copyright (c) 2025 Facepunch Studios Ltd", standard MIT text; `game/thirdpartylegalnotices` is separately licensed and was not read) | C# | symbol `AccessControl.VerifyAssembly`

Checked: Read `AccessControl.cs` 1-140 (VerifyAssembly, AddSafeAssembly, CheckSafeAssembly, ForgetAssembly), `AssemblyAccess.cs` 60-130 (Verify), `AssemblyAccess.Rules.cs` (whole, 28 lines), `AssemblyAccess.Touch.cs` 1-80 (touch recording; the type walk after line 80 is not read), `Compiler/Blacklist/` (Rules.cs, Rules.Methods.cs, Rules.Types.cs, Rules.Attributes.cs, BlacklistCodeWalker.cs; whole), `PackageLoader.cs` 95-125, `Compiler.Build.cs` 250-275, `PublishConfig.cs` (whole), `PublishPage.1b` (whole), `PublishPage.2b.LicenseCheckWizardPage.cs` 1-200 of 415, `PublishPage.1.ReviewWizardPage.cs` (grep only). Confidence: high on the verify-and-pin path. Medium on the inference that a pinned assembly is not re-checked when the allow-list changes (from call order, AssemblyAccess.cs 92-96; the rules-reload path is not read). Not read: the authoring format for content (s&box is code-first, so "content as data" was not found in the rows sense), upload and finalize pages (PublishPage 3, 4). Camera: not a camera cell.

Best transferable idea: Verify a user-made bundle once against an allow-list of everything it references, pin the SHA-256 of those exact bytes, and load only pinned bytes, so a published zone or legend bundle that passed review is the one the live world runs.
Decision (proposed): adapt. Take the verify-then-pin-by-hash and the reference allow-list for zone and legend row bundles; do not take the C# deny-list walker, because Frankendom content is rows and no user code is loaded.
Acceptance: A test publishes a zone-row bundle that references an unknown spawn kind; the publish is refused and the reply lists that reference with up to five row locations. Re-publishing the identical bundle is accepted without a second scan. Changing one byte of the bundle forces a full re-check.

## 1. Mechanism

- Entry: `VerifyAssembly` copies the stream to bytes, runs `AssemblyAccess.Verify`, and on success stores a pin for the name (AccessControl.cs 52-66; the pin call is line 64).
- Order inside `Verify` (AssemblyAccess.cs 75-115):
  - (a) the name must start with `package.`, else the result is an error (85-88).
  - (b) if the pinned hash for this name equals the SHA-256 of these bytes, return success with no scan (92-96).
  - (c) otherwise collect every reference the assembly touches (`InitTouches`, line 100).
  - (d) run the rules (`CheckPassesRules`, line 102). A reference that is not package-prefixed and not on the allow-list becomes an error with its name and locations (AssemblyAccess.Rules.cs 14-23).
  - (e) with no errors, return the stream (114-115).
- Pin storage: `SafeAssemblies[name] = hash` (AccessControl.cs 118-123). The hash is base64 of SHA-256 over the bytes (127). One pin per name, so a new hash for the same name replaces the old pin. `ForgetAssembly` removes it (74-76).
- Reference recording: each touched symbol is stored once with a count, and at most five locations (AssemblyAccess.Touch.cs 21-33; the cap of 5 is at 27-28).
- Callers: the compiler, only when `_config.Whitelist` is on (Compiler.Build.cs 258-260); the package loader (PackageLoader.cs 108).
- Separate compile-time deny list (Compiler/Blacklist): every syntax node's resolved symbol is printed as a fully qualified name and matched against wildcard patterns. `!` marks an exception (Rules.Methods.cs 10). `IsBlocked` returns true only if a deny pattern matches and no exception matches (Rules.cs 46-51). A blocked symbol becomes compile error SB500 (BlacklistCodeWalker.cs 46-60).

## 2. Key functions

- `AccessControl.VerifyAssembly`: `/mnt/frankendom-donors/Facepunch-sbox-public/engine/Sandbox.Access/AccessControl.cs` 52-66. Pins only on success and only when the caller allows it.
- `AccessControl.AddSafeAssembly` / `CheckSafeAssembly`: same file, 118-129. Hash-keyed pin store.
- `AssemblyAccess.Verify`: `/mnt/frankendom-donors/Facepunch-sbox-public/engine/Sandbox.Access/AssemblyAccess.cs` 75-115. Name guard, pin short-circuit, scan, rules, result.
- `AssemblyAccess.CheckPassesRules`: `/mnt/frankendom-donors/Facepunch-sbox-public/engine/Sandbox.Access/AssemblyAccess.Rules.cs` 8-26. Parallel check of each touched key.
- `AssemblyAccess.Touch`: `/mnt/frankendom-donors/Facepunch-sbox-public/engine/Sandbox.Access/AssemblyAccess.Touch.cs` 17-36.
- `CompilerRules.IsBlocked`: `/mnt/frankendom-donors/Facepunch-sbox-public/engine/Sandbox.Compiling/Compiler/Blacklist/Rules.cs` 46-51.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Pin = name to hash of exact bytes; a pin match skips the scan | None (SHA-256 of bytes, AccessControl.cs 127) |
| Bundle must carry its own name prefix before anything else | `"package."` (AssemblyAccess.cs 85; AssemblyAccess.Rules.cs 14) |
| Own-prefix references are free; others must be allow-listed | Prefix as above; allow-list not read |
| Locations kept per reference for the error report | 5 (AssemblyAccess.Touch.cs 27) |
| Deny rule grammar: `*` wildcard, `!` exception | `!` prefix (Rules.cs 27; Rules.Methods.cs 10) |
| Whitelist check only when the option is set | `_config.Whitelist` (Compiler.Build.cs 258) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (name guard, pin match with no scan, reference scan, pin on success) and the rule grammar (wildcards, `!` exceptions). It omits the C# and Mono.Cecil specifics (the hash and the reference collector are passed in), the per-reference count, the parallel scan, the error type with compile diagnostics, and `ForgetAssembly`. `blocked` is the deny-list matcher from the compile-time list; `gateBundle` does not call it, and whether Frankendom needs a deny list for rows is a Dom decision.

```ts
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
```

## 5. Lands in

- TARGET `origins/content/zone-publish-gate.ts` (new, proposed): the publish step that validates a zone-row or legend-row bundle and pins its bytes before the live world may load it.
- Parity-checklist row 23 (zone population). Zone rows set the spawn caps, respawn and despawn numbers, so the gate that validates them sits with row 23's zone data. (Lead hint for modding is row 23.)
- Reuse tag: adapt-allowed (MIT: code may be adapted; this sketch is clean-room).
- Brief rule served: 1 (one engine, zones as data: the bundle is data and is checked before it goes live); rules 7-9 n/a.

## 6. Gaps and risks

- The pin is keyed by name only (AccessControl.cs 122), so a new publish silently replaces the old pin. Frankendom needs a version row per publish so the previous bundle can be restored.
- Inference, not read: a pinned bundle returns success before the rules run (AssemblyAccess.cs 92-96). If the allow-list changes while a pin is held, the old pin still passes. Test this before relying on the allow-list as the only gate.
- The donor checks references (which symbols are touched), not values. A zone row with a spawn cap of 10,000 would pass this gate unchanged. Frankendom needs numeric bounds per field on top of the reference check; none exist in this donor.
- Licence mapping defect (PublishPage.2b.LicenseCheckWizardPage.cs 186-195): `CC_BYSA` maps to Attribution plus NonCommercial (line 192), and the enum comment says CC BY-SA is non-commercial (line 45). Under the CC BY-SA 4.0 licence, commercial use is permitted (general licence knowledge, not read from the donor). Fix: map CC_BYSA to Attribution only and keep share-alike as its own flag. Use a checked table, not this one, for any Frankendom asset licence check.
- The publish review blocks on archived packages, a type mismatch, a missing startup scene, a missing organisation and failed validation attributes (PublishPage.1.ReviewWizardPage.cs 161-185), but the licence page never blocks (PublishPage.2b line 19). Keep the blocker list short; warn on licences, as the donor does.
- Frankendom has no user code, so the Mono.Cecil and assembly path does not transfer. Only the pin-and-allow-list shape transfers.
- Dom-only publishing until beta (MD ruling) is not in this donor. It is a Frankendom rule the gate must enforce.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- Verify order, pin hash, pin-only-on-success, 5-location cap, IsBlocked, SB500 and the licence mapping defect all true.
- Nits: Compiler.Build whitelist check is line 257, not 258; Verify spans 75-122, not 75-115.
- Missed: PackageLoader has DisableAccessControl for local packages (a bypass path); Verify has a final Errors.Count>0 check (108) after the rules. Neither changes the lessons.
