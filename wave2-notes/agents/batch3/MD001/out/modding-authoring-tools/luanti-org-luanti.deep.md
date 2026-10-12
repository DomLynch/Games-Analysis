# luanti-org-luanti (modding-authoring-tools, cell 34)

Donor: `/mnt/frankendom-donors/luanti-org-luanti/src/content/mod_configuration.cpp` (with `src/script/cpp_api/s_security.cpp` and `builtin/game/chat.lua`) | Licence: LGPL-2.1-or-later (code: SPDX header at s_security.cpp line 2; COPYING.LESSER is LGPL 2.1); textures and sounds CC BY-SA 3.0 (LICENSE.txt line 8) | C++ and Lua | symbol `ModConfiguration::resolveDependencies`

Checked: Read in full: mod_configuration.cpp 1-321 (addMods, checkConflictsAndDeps, resolveDependencies). s_security.cpp read 1-330 (initializeSecurity), 765-951 (getCurrentModName, checkPath, checkPathWithGamedef), 1091-1120 (io.open), 1190-1202 (os.remove). chat.lua read 222-262 (grant command). Grep only: mods.h:16, mods.cpp:28, settingtypes.txt:1943, scripting_server.h:54, scripting_client.h:42. Not read: s_security.cpp 331-764 (client and SSCSM variants), 952-1090 and 1121-1189 (load, require, io.input/output/lines wrappers), 1203-1263; the body of the server's checkPathInternal (only its declaration, scripting_server.h:49); the code that throws the unsatisfied-mods error. Confidence: high on load order, clash policy and the write rules (read end to end); medium that the server always reaches checkPathWithGamedef (not verified). camera_scope: n/a (not a camera topic).

Best transferable idea: Refuse to publish a content pack whose required rows are missing or whose names clash, naming the missing rows or the cycle, instead of letting a later pack silently replace an earlier one.

Decision (proposed): adapt - the dependency check and the clash refusal fit zones and legends, which reference each other by row id; the Lua sandbox is rejected because user content is rows and never code.
Acceptance: A server publish test sends a zone pack that needs an absent legend pack and a second pack with a duplicate name; both are refused with the missing or clashing names, and the live zone list is unchanged afterwards.

## 1. Mechanism

- Load in two steps. Add: packs are added in two groups, the modpack group first (mod_configuration.cpp:55). A name seen again in a later group replaces the earlier pack (74-82, the "Overridden by" warning) and drops that name's clash (88). A name seen twice inside one group is recorded as a clash (100). After all adds, `checkConflictsAndDeps` throws if any clash is left (212), so the load stops and the message lists the names. Name rule: lowercase letters, digits and underscore only (mods.h:16, enforced at mods.cpp:28).
- Order: `resolveDependencies` (219). Required deps are copied into the waiting set (266). Optional deps are added only if the named pack exists (268-270). Packs with an empty waiting set go on a stack (279). The loop takes the last one (294), appends it to the sorted list (295), pops it (296), and removes its name from every waiting pack (299). A pack whose waiting set empties goes back on the stack (300-302). Anything still waiting after the loop stays unsatisfied (312).
- Stuck report: `getUnsatisfiedModsError` prints each pack with the names it lacks, then the hint that this "may be caused by a dependency cycle" (mod_configuration.cpp:17-36, text at 33).
- Write rule (s_security.cpp, `checkPathWithGamedef` from 869). Reads may go to builtin, the game and every mod directory (904). Writes are refused for `.git` folders (922, 928). Writes to the mod-data path are allowed (928). In the world path, writes are allowed except into the world's `worldmods` and `game` folders (933-943); the comment at 933 gives the reason: a same-named mod there would override a trusted one.
- Sandbox (`initializeSecurity` from 122): copies only whitelisted globals (124; `copy_safe` at 73 copies only the listed fields) and swaps load, require, io.open and similar for checked wrappers (265-278). io.open checks the path against the write rule for write modes (1108).
- Who may be named: `getCurrentModName` returns a name only in an environment that trusts names (770; server and client return true at scripting_server.h:54 and scripting_client.h:42), only for a call made from the mod's main file scope with nothing below it (785, 791), and never inside a coroutine (780).
- Grant ceiling (chat.lua 228-260): the caller needs `privs` or `basic_privs` (230). A caller without `privs` can grant only names in `basic_privs` (default "interact,shout", 244), checked per privilege (246). On success the privileges are set (260).

## 2. Key functions

- `ModConfiguration::addMods`: `mod_configuration.cpp` 45-106. Two groups, the clash policy.
- `ModConfiguration::checkConflictsAndDeps`: `mod_configuration.cpp` 197-217. Throws on leftover clashes, then calls the sort.
- `ModConfiguration::resolveDependencies`: `mod_configuration.cpp` 219 onward. Required and optional deps, ready stack, leftovers.
- `ScriptApiSecurity::checkPathWithGamedef`: `s_security.cpp` 869 onward. The read and write ceiling.
- `ScriptApiSecurity::getCurrentModName`: `s_security.cpp` 765-796. Who may be named.
- `handle_grant_command`: `builtin/game/chat.lua` 228-260. Grant ceiling.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor value or rule (reference) |
|---|---|
| Pack name charset | a-z, 0-9, underscore only (mods.h:16) |
| Name clash | same group: error; later group replaces earlier and forgives the clash (74-88, 100, 212) |
| Required dependency | pack waits until present; never satisfied if absent (266) |
| Optional dependency | counts only when the named pack exists (268-270) |
| Ready order | stack, last ready pack first (279, 294-296) |
| Who may grant | `privs`, or `basic_privs` with a per-privilege ceiling; default basic set "interact,shout" (230, 244, 246) |
| Write ceiling | readable: builtin, game, all mod dirs (904); writable: mod-data path, and world path except worldmods and game (928, 933-943) |

No timers, sizes or rates in this mechanism. The only numbers are the name charset and the default basic set.

## 4. TypeScript sketch

simplified: keeps the donor order (names, then the ready stack, then the stuck report) and the write ceiling. Changes: (a) no two-group override, any duplicate name is an error, because the donor's later-group replacement (74-88) is the defect for a live world; (b) names are sorted before the stack, because the donor's order follows input order and an optional shuffle (line 235); (c) the cycle finder is new, the donor only prints a "may be" hint. It omits first_mod and last_mod, the donor's load-time name abort (the sketch records the error and returns), the .git rule (not needed for rows), normalisation beyond refusing `..`, and the Lua privilege layer.

```ts
// Licence: LGPL-2.1-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface PackSpec {
  name: string;
  depends: string[];     // required: the pack waits until each of these is loaded
  optdepends: string[];  // ordering only if the named pack is present
}

export interface LoadPlan {
  order: string[];
  errors: string[];
}

const NAME_RE = /^[a-z0-9_]+$/; // donor: MODNAME_ALLOWED_CHARS

// Returns one cycle (as a list of names) that blocks the pack `start`, or null.
function findCycle(start: string, waiting: Map<string, Set<string>>, done: Set<string>): string[] | null {
  const path: string[] = [];
  const at = new Map<string, number>();
  let cur: string | undefined = start;
  while (cur !== undefined && !at.has(cur)) {
    at.set(cur, path.length);
    path.push(cur);
    cur = [...(waiting.get(cur) ?? [])].find(d => waiting.has(d) && !done.has(d));
  }
  return cur === undefined ? null : path.slice(at.get(cur)!);
}

export function planLoadOrder(input: PackSpec[]): LoadPlan {
  const errors: string[] = [];

  // 1. Names. A bad name or a second pack with the same name is an error. Nothing overrides anything.
  const byName = new Map<string, PackSpec>();
  for (const p of input) {
    if (!NAME_RE.test(p.name)) errors.push(`bad name: ${p.name}`);
    if (byName.has(p.name)) errors.push(`name clash: ${p.name}`);
    else byName.set(p.name, p);
  }
  if (errors.length > 0) return { order: [], errors };

  // 2. Order. A pack is ready when every required dep is loaded; an optional dep counts only if present.
  //    Names are sorted first so the same input always gives the same order.
  const names = [...byName.keys()].sort();
  const waiting = new Map<string, Set<string>>();
  for (const n of names) {
    const p = byName.get(n)!;
    const w = new Set<string>(p.depends);
    for (const o of p.optdepends) if (byName.has(o)) w.add(o);
    waiting.set(n, w);
  }
  const ready = names.filter(n => waiting.get(n)!.size === 0);
  const queued = new Set<string>(ready);
  const done = new Set<string>();
  const order: string[] = [];
  while (ready.length > 0) {
    const n = ready.pop()!; // stack: the last ready pack goes first
    order.push(n);
    done.add(n);
    for (const m of names) {
      const w = waiting.get(m)!;
      if (w.delete(n) && w.size === 0 && !queued.has(m)) {
        ready.push(m);
        queued.add(m);
      }
    }
  }

  // 3. Stuck packs are reported with what they wait for; one cycle is named when there is one.
  for (const n of names) {
    if (done.has(n)) continue;
    errors.push(`${n} waits for: ${[...waiting.get(n)!].join(" ")}`);
  }
  for (const n of names) {
    if (done.has(n)) continue;
    const cycle = findCycle(n, waiting, done);
    if (cycle) { errors.push(`cycle: ${cycle.join(" -> ")}`); break; }
  }
  return { order, errors };
}

// 4. Write rule for user content (donor: checkPathWithGamedef). Only the user's own
//    draft root is writable; live roots are never writable from user content.
export function canWriteUserPath(path: string, draftRoot: string, liveRoots: readonly string[]): boolean {
  if (path.split("/").includes("..")) return false;
  const under = (p: string, root: string): boolean => p === root || p.startsWith(root + "/");
  if (!under(path, draftRoot)) return false;
  return !liveRoots.some(r => under(path, r));
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/content/pack-validate.ts` (new): a publish-time check on the server. Zones and legends are rows that name other rows. Parity-checklist row 20 (catalogue as runtime source). The write ceiling lands in the same publish door, never in the live catalogue.
- Reuse tag: rewrite-from-idea (LGPL-2.1-or-later; clean-room only, no donor lines reused)
- Brief rule served: zones as data on one runtime; one ledger (no silent override of a live row); rules 7-9 n/a

## 6. Gaps and risks

- LGPL-2.1-or-later is copyleft in our classes: clean-room only. The sketch is written from the mechanism and reuses no donor lines.
- Location differs: the donor's checks run in the client-side mod loader. Ours must run on the server at publish, since kills and rows are server-verified. The idea transfers; the place does not.
- Defect, fixed in the sketch (keep the idea): a later group silently replaces an earlier pack and forgives its clash (mod_configuration.cpp:74-88). Fix: any duplicate name is an error at publish.
- Defect, fixed in the sketch: load order follows input order and an optional shuffle (line 235). Fix: sort names before the ready stack.
- Defect, fixed in the sketch: the cycle hint is vague ("may be", line 33). Fix: name one cycle.
- Not transferable: the Lua sandbox (copy_safe, io/os wrappers). Our rule is rows, never code, so the sandbox is rejected.
- Not in this donor: content publishing, rating and upload. A grep of src and builtin for contentdb, publish and rating found no content-publish code (only unrelated hits). Publishing stays Dom-only until beta, our rule; no donor evidence for rating.
- In-game builder: the chat commands here (for example /set at chat.lua 629 and /teleport at 570) are admin tools, not a row editor. Not read beyond their registration lines.
- The write ceiling is a file-path rule. In a browser the same idea is a per-row ownership check, so only the shape transfers.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: No errors found. Verified: addMods 45-106 (modpack group first 55, replace 74-88, same-group clash 100), checkConflictsAndDeps throw 212, resolveDependencies 219-312 (266, 268-270, 279, 294-296, 299, 300-302, 312), shuffle 235, error text 17-36 (hint 33), MODNAME_ALLOWED_CHARS mods.h:16 enforced mods.cpp:28, checkPathWithGamedef 869-948 (904, 922, 928, 933-943), getCurrentModName 765-796, initializeSecurity 122/124/265-278, io.open write check 1108, modNamesAreTrusted true in scripting_server.h:54 and scripting_client.h:42, chat.lua grant 228-260 (230, 244, 246, 260), LICENSE.txt line 8 CC BY-SA 3.0, SPDX LGPL-2.1-or-later. Small honesty point: the note says only the DECLARATION of the server checkPathInternal was seen, but scripting_server.h:49-53 is an inline body that calls checkPathWithGamedef, so its medium-confidence caveat is actually resolved (conservative, not wrong).
Missed: first_mod / last_mod handling (225-289) is omitted from the mechanism, though the sketch header discloses it; random_mod_load_order setting is a setting default, not examined.
