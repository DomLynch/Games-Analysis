# openmw (modding-authoring-tools, cell 34)

Donor: `/mnt/frankendom-donors/openmw/components/lua/configuration.cpp` (with `components/esm/luascripts.hpp`, `components/lua/luastate.cpp`, `components/lua/scriptscontainer.cpp`, `components/contentselector/model/contentmodel.cpp`) | Licence: GPL-3.0 (LICENSE, read: "GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007") | C++ and Lua | symbol `ScriptsConfiguration::getLocalConf`

Checked: Read in full: components/lua/configuration.cpp 1-314 (the attachment table, the omwscripts text parser). components/esm/luascripts.hpp 14-60 (the record struct and its flags). components/lua/luastate.cpp 60-100, 155-195, 262-330, 360-410 (hook, watchdog, memory tracker start, sandbox env). components/lua/luastate.hpp 25-50 and 240-275 (call wrapper). components/lua/scriptscontainer.cpp 95-125 and 785-830 (script start, averaged instruction stats). components/contentselector/model/contentmodel.cpp 700-765 (load-order checks). files/settings-default.cfg 1194-1220. apps/openmw/mwlua/luamanagerimp.cpp 100-108 (profiler switch). Grep only: the "priority" search in scriptscontainer.cpp (no match, so no per-script priority field), the mAttach writers in components/esm3 (none; the record reader is components/esm/luascripts.cpp, not read). Not read: luastate.cpp 1-59, 131-154, 196-261, 331-359, 411-491 (script loading and error path), the body of makeReadOnly, scriptscontainer.cpp event dispatch, components/esm/luascripts.cpp (how per-record and per-reference entries are read). Confidence: high on the attachment resolution order and the parser (read end to end); high on "the budget is off in the shipped settings" (two lines read); medium on the nested-call reset defect (the reset is read; whether re-entry can happen during a script run was not checked). camera_scope: n/a (not a camera topic).

Best transferable idea: Resolve a row's attached behaviour in layers, type first, then row id, then single instance, where a later detach removes what an earlier layer attached, so a designer can change one spawn without copying the whole row.

Decision (proposed): adapt - zone and template defaults by row type, then per template, then per spawn, with a detach at the spawn level; we keep the layering and drop the script text format, because our rows are the authoring format and the behaviour is a row field, not a script.
Acceptance: A zone test gives every wolf in a pack a patrol default from the type layer, detaches it on one wolf row, and asserts the server resolves that wolf with no patrol and the rest with patrol, identical after a reload.

## 1. Mechanism

- The attachment table is data. Each script entry in the content file has flags (GLOBAL, CUSTOM, PLAYER, MENU, LOAD, MERGE), a list of record types, and optional per-record and per-reference entries (components/esm/luascripts.hpp:20-58). The text form is one line per script: tags, a colon, then the `.lua` path (configuration.cpp:245-250). An unknown tag throws (281). A suffix other than `.lua` throws (247).
- Duplicates: the same script path in two entries keeps the last one, unless the later entry has MERGE, which appends its types, records and refs to the earlier one (configuration.cpp:64-95). Flags that differ between two entries for one script throw (82).
- Resolution, `getLocalConf(type, recordId, refnum)` (configuration.cpp:160-192). Layer 1, type: every script listed for the row type attaches, with the script's default data (164-167). Layer 2, row id: for each entry for this row id, attach (174, data from the entry) or detach (176, remove). Layer 3, instance: only if the instance has a content-file refnum, the same attach or detach by refnum (179-190, detach at 189).
- Order of steps: type, then row, then instance. Each later detach removes the script from the set for that object only (the record struct says "overrides previous attach", components/esm/luascripts.hpp:41, 52).
- Script-side safety, for any user script: a per-call instruction watchdog (luastate.cpp:62-79). A count hook fires every 1000 instructions (62, 189). It adds the step to the active script's average (73), and raises an error once the per-call counter passes the limit (75-79). The counter is reset when an engine call starts (luastate.hpp:259-263). The shipped default limit is 100000000 instructions (settings-default.cfg:1218).
- The budget is off in the shipped config: `lua profiler` defaults to false (settings-default.cfg:1204). When the setting is false, `disableProfiler` runs (luamanagerimp.cpp:102-103), so the hook is never installed (luastate.cpp:188-189) and the call wrapper skips the reset (luastate.hpp:259).
- Memory: a tracking allocator refuses big allocations above `memory limit` (default 2147483648, settings-default.cfg:1211) but always allows small ones (luastate.cpp:103, text at settings-default.cfg:1209-1210). Also only with the profiler on.
- Sandbox: the Lua environment starts empty (luastate.cpp:300). Only coroutine, math, string, table and utf8 are copied in, each read-only (60, 312). `os` is reduced to date, difftime and time (315-317).
- Average instruction count per script: a decay of 1/30 per frame (scriptscontainer.cpp:791), a decayed value under 5 becomes 0 (802-803), and each hook step adds 1000 x 1/30 (816). This feeds the profiler text only (luamanagerimp.cpp:1051-1052 says "Lua profiler is disabled" otherwise); it does not schedule anything.
- Content dependency check (contentmodel.cpp:703-723): for each master a plugin names, three errors: missing (713), inactive (719), or loaded after the plugin (721). The Bloodmoon/Tribunal case is a warning only (733).

## 2. Key functions

- `ScriptsConfiguration::getLocalConf`: `components/lua/configuration.cpp` 160-192. Type, row, instance layers.
- `ScriptsConfiguration::init`: `configuration.cpp` 53-137. Duplicate and merge rule, then index maps.
- `parseOMWScripts`: `configuration.cpp` 228-284. The text form.
- `LuaState::countHook`: `components/lua/luastate.cpp` 66-82. Per-call watchdog.
- `LuaState::call` (template): `components/lua/luastate.hpp` 255-270. Resets the counter on entry (263).
- `LuaState` constructor sandbox block: `components/lua/luastate.cpp` 292-318. Empty env, safe packages, reduced os.
- `ScriptsContainer::decayedInstructionCount`: `components/lua/scriptscontainer.cpp` 793 onward. Stats only.
- `ContentModel::checkForLoadOrderErrors`: `components/contentselector/model/contentmodel.cpp` 703 onward (read to 765). Missing, inactive, later.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor value or rule (reference) |
|---|---|
| Layers: type, row, instance; detach removes | order at configuration.cpp 164-189; detach at 176, 189 |
| Duplicate script: last wins; MERGE appends | configuration.cpp 64, 83-91 |
| Hook step | 1000 instructions per count event (luastate.cpp 62) |
| Per-call instruction cap | 100000000 by default (settings-default.cfg:1218), zero = unlimited (luastate.hpp:34), off unless profiler on (luamanagerimp.cpp:102) |
| Memory cap | 2147483648 bytes by default (settings-default.cfg:1211), big allocations only (luastate.cpp:103) |
| Stats decay | 1/30 per frame (scriptscontainer.cpp:791); floor 5 to zero (803) |
| Master checks | three error codes: missing, inactive, later (contentmodel.cpp 713, 719, 721) |

The only timers are the hook step and the 1/30 decay. There are no spawn or zone numbers in this donor.

## 4. TypeScript sketch

simplified: keeps the donor's order (type layer, then row layer, then instance layer; detach removes) and the data fallback to the script default. It omits the duplicate and MERGE rule (configuration.cpp 64-95), the flag checks, the `.lua` text parser, the refnum-without-content-file guard (179-180), and the per-record data override as the donor stores it (it copies the record's data at parse time). Entries are kept in file order, as the donor keeps vectors.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface AttachEntry {
  script: string;      // script id
  attach: boolean;     // true = attach; false = detach (removes what an earlier layer attached)
  data?: string;       // per-entry init data; falls back to the script default
}

export interface AttachConfig {
  byType: Record<string, AttachEntry[]>;      // row type -> scripts (type layer: attach only)
  byRow: Record<string, AttachEntry[]>;       // row id -> attach or detach
  byInstance: Record<string, AttachEntry[]>;  // spawn instance id -> attach or detach
}

// Layers are applied in order: type, then row, then instance. A later detach removes
// the script for that instance only; a later attach replaces the data.
export function resolveAttachments(
  type: string,
  rowId: string,
  instanceId: string | undefined,
  cfg: AttachConfig,
  defaults: Record<string, string>,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of cfg.byType[type] ?? []) {
    out.set(e.script, e.data ?? defaults[e.script] ?? "");
  }
  const layers: AttachEntry[][] = [cfg.byRow[rowId] ?? []];
  if (instanceId !== undefined) layers.push(cfg.byInstance[instanceId] ?? []);
  for (const layer of layers) {
    for (const e of layer) {
      if (e.attach) out.set(e.script, e.data ?? defaults[e.script] ?? "");
      else out.delete(e.script);
    }
  }
  return out;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/content/attach-layers.ts` (new): resolves the behaviour of a zone spawn from its type, its row and its spawn instance. Parity-checklist row 20 (catalogue as runtime source; catalogue fields). The zone population spawn caps (row 23) read the result; they are not part of this file.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, no donor lines reused)
- Brief rule served: zones as data on one runtime; one ledger (the detach is a row edit, not a second store); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0 is copyleft in our classes: clean-room only. The sketch is written from the layer order.
- Defect, fixed in the sketch (keep the idea): none in the layer order itself.
- Defect 1, the budget is opt-in: with `lua profiler = false` (settings-default.cfg:1204) the instruction cap and memory cap are not installed (luamanagerimp.cpp:102-103; luastate.cpp:188-189). Fix: for us the cap must be on by default for any user formula or script, and tested with a loop that must stop.
- Defect 2, the watchdog counter is reset on every engine call and not restored when the call returns (luastate.hpp:263). If a script can re-enter an engine call, the outer call's budget restarts. Not verified whether re-entry happens in practice. Fix: save and restore the counter around nested calls, or give each nested call its own budget that is added to the outer one.
- Defect 3, the per-script average (scriptscontainer.cpp 816) is for the profiler only. It must not decide who gets compute on a tick; Frankendom's per-tick NPC budget (server tick, post-K item 3) needs its own counter.
- The layered attach works for scripts; for us a row field set per layer is the same shape, but a detach must never delete a server-verified kill rule. Gap: the sketch does not check that a detach targets a known behaviour id.
- Load-order checks (contentmodel.cpp 713-721) are the same shape as the Luanti dependency check: missing, inactive, out of order. Both are seen; this note takes the layer idea, the Luanti note takes the publish refusal.
- Not transferable: the Lua sandbox and the memory tracker (browser JS has its own). Shape only: an empty environment plus a few allowed helpers.
