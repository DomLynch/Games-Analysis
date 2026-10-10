# luanti-org-luanti (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/luanti-org-luanti/builtin/game/item.lua` (roll: `core.get_node_drops`, 41-133; caller `core.node_dig`, 508-556; `core.handle_node_drops`, 462-488) | Licence: LGPL-2.1-or-later (README.md line 6 badge `LGPLv2.1%2B`; COPYING.LESSER is LGPL 2.1; `item.lua` has no per-file licence header, so the repo licence applies) | Lua | symbol `core.get_node_drops`

Checked: `core.get_node_drops` read in full (41-133), with the caller `core.node_dig` (516 and 528-555) and `core.handle_node_drops` (462-488) read in full. The drop-table fields were checked against `doc/lua_api.md` 11049-11100. Confidence high on the roll order and the cap, which I read in the code and in the engine doc. Not read: mod overrides of `core.get_node_drops` (a mod can replace it), `core.add_item` and the item entity, and how `preserve_metadata` changes drops. Nothing was run; this is read-only.

## 1. Mechanism

- One pure function turns a dug node and the wielded tool name into a list of item strings. It gives nothing to anyone; the caller does that (`core.handle_node_drops`).
- Path choice (`def.drop`, 50-69): no `drop` field gives the node itself, with its palette colour if it has one (55-62). A string gives one item or none (63-65). A table with no `items` gives nothing (66-68). A table with `items` goes to the extended path (71-132).
- Extended path, entries in list order (74). For each entry, in this order:
  - (a) Chance step first. If `rarity` is set, the entry passes when `rarity < 1` or `math.random(rarity) == 1` (77-79). That is a 1-in-N roll with N taken from the data. It is computed before the tool check (80-115), so the random draw is used up even when the tool check then fails.
  - (b) Tool step. An entry with `tools` or `tool_groups` starts as failing (80-82). It passes only if a tool name was given (83, 95). `tools` matches an exact name, or with a `~` prefix a Lua pattern searched in the name (84-93). `tool_groups` checks the registered tool's groups, either one group name or a list where any sufficient set passes (95-114). If the tool is not registered, the entry stays failing (96-97).
  - (c) If both steps pass: the entry's whole item list is added (116-126). The hit count goes up (117). If `max_items` is set and the hit count equals it, the loop stops (127-129).
- The cap counts hits, not attempts. So the entries that come first can use up the cap and block later entries, and list order decides which entries can ever hit. The engine's own doc says so: entries "should progress from low to high drop chance" (`doc/lua_api.md` 11065).
- Caller (`core.node_dig`): the drop roll reads the wielded tool name (516) before the tool takes wear (the wear block runs 519-537, `wielded:add_wear(dp.wear)` at 528). Then metadata is preserved if the node has `preserve_metadata` (540-552), then `core.handle_node_drops` (555). That function adds each drop to the digger's `main` inventory and spills any remainder into the world as an item entity at a random offset of up to a quarter node on each axis (`math.random()/2-0.25`, 481; spawn at 485).
- Timing: synchronous, once per dig, on the server that owns the node. There is no per-frame loop in this path.

## 2. Key functions

- `core.get_node_drops(node, toolname)`: `/mnt/frankendom-donors/luanti-org-luanti/builtin/game/item.lua` 41-133. The whole roll. Chance, tool filter and cap are all in the one loop (74-131).
- Chance and tool gate, inside the loop: same file, 77-115. The chance roll (78) runs first and unconditionally, then the tool block (80-115) sets `good_tool`, then the hit test (116).
- Cap: same file, 127-129. Stops after `max_items` hits. Without `max_items` there is no cap (the check at 127 is skipped when it is nil).
- Caller `core.node_dig`: same file, 516 (roll) and 555 (hand-off). Wear is applied between them (528). The roll sees the tool before its wear.
- `core.handle_node_drops`: same file, 462-488. Puts drops in the digger's inventory; leftovers spill to the world at 485.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and rules |
|---|---|
| Independent 1-in-N chance per entry, N from the data | `math.random(item.rarity) == 1` (78); `rarity < 1` always passes (78); default `rarity` is 1 (doc 11070) |
| Weapon or tool filter per entry | Exact name, or `~` Lua pattern (86); `tool_groups` (98-113); no tool name means the entry fails (81, 83) |
| Cap on how many entries can hit | `got_count == drop.max_items` (127); no cap when `max_items` is nil |
| Ordered list so rare entries come last under a cap | Doc: "entries should progress from low to high drop chance" (11065); cap stop (11063) |
| Quarter-node spill jitter for overflow items | `math.random()/2-0.25` (481). This is a placement number, not a drop number |

Example numbers in the engine doc (not the donor's game data): 1 in 1000 diamond (11069); tool-gated 1 in 5 dirt; 1 in 2 sand (doc 11078-11092).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: chance roll first (drawn even when the weapon check then fails), then the weapon check, then the cap, which counts hits only. It omits: the `~` pattern filter and the deprecated exact `tools` list (the sketch uses one `requiresWeapon` list), `tool_groups`, `inherit_color` and palette colour, the default drop when there is no `drop` field, the caller's wear and metadata steps, and the spill-to-world step. It adds an injectable RNG, which the donor does not have (the donor calls `math.random` directly).

```ts
// Licence: LGPL-2.1-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface DropEntry {
  rarity?: number;             // 1 in N chance; undefined or below 1 always passes the chance step
  requiresWeapon?: string[];   // allowed weapon ids; undefined means any digger/weapon passes
  items: string[];             // the list dropped if this entry hits
}

interface DropTable {
  maxLists?: number;           // stop after this many entries have hit
  entries: DropEntry[];        // processed in order; order decides which entries can still hit under the cap
}

// One kill or dig. The chance step is always rolled, even when the weapon check then fails.
function rollDrops(table: DropTable, weaponId: string | null, rng: () => number = Math.random): string[] {
  const out: string[] = [];
  let hits = 0;
  for (const e of table.entries) {
    const chanceOk = e.rarity === undefined || e.rarity < 1 || Math.floor(rng() * e.rarity) === 0;
    let weaponOk = true;
    if (e.requiresWeapon !== undefined) {
      weaponOk = weaponId !== null && e.requiresWeapon.includes(weaponId);
    }
    if (chanceOk && weaponOk) {
      out.push(...e.items);
      hits += 1;
      if (table.maxLists !== undefined && hits === table.maxLists) break;
    }
  }
  return out;
}
```

Typecheck: the block plus `export {}` (`/private/tmp/p2/wave2-haiku/batch1/E/work/luanti-drop-roll.ts`) was copied to the VPS and run with `tsc --noEmit --strict --target es2020`: exit 0, no output.

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module: the roll step for a kill, given the server-verified kill and the killing weapon). Parity-checklist row 18 (loot roll, XP / career award). Row 18's "Lives in" today is the Pit loot and career code and Zone `hunt.ts` and `mob-rewards` (checklist, read at its path in the Lead scratch folder).
- Reuse tag: rewrite-from-idea (LGPL-2.1-or-later; clean-room shape only)
- Brief rule served: server-verified kills and one ledger (Frankendom rulings); row 18

## 6. Gaps and risks

- LGPL-2.1-or-later: the addendum allows adaptation only for MIT, Apache and BSD. This is clean-room shape only. The sketch is written from the mechanism.
- Roll on the server, once per verified kill. The donor rolls inside the dig handler on the server that owns the node. Frankendom must not roll in the Pit or in a zone client. A kill counted twice must not roll twice.
- Many-on-one (MAX_ATTACKERS = 3): the donor has one digger and one wielded tool. Frankendom has up to three attackers. The rule for who gets the roll and which weapon gates a tool-locked entry is not in the donor and must be decided. Using the killing blow's weapon is one option; not read elsewhere.
- One ledger: the donor spills overflow to the world as a free item entity (485). Under one ledger that item must either stay in the ledger (a ground entry that is also counted) or the roll must be refused when there is no room. Pick one.
- Order under the cap: a rare entry listed first uses up a `maxLists` slot. The donor relies on its doc rule (11065), not on code. Frankendom should sort the catalogue by chance at load, or test it.
- Random source: the donor calls `math.random` directly, with no recorded seed. The fight record and replay (row 19) need the rolled outcome stored, or an RNG seed stored per fight. Otherwise a replay cannot re-derive the drop.
- Tool-locked entries with no weapon never pass (81, 83). Frankendom's catalogue must say whether a creature drop with no weapon (an environment kill) falls back to an unlocked entry.
- Data, not code: the entries are data in the node definition (the doc example). That matches "zones as data" and row 20 (catalogue as runtime source). The drop table itself is not the same as creature XP or career progression, which this file does not read (not read).
- Mod override: a mod can replace `core.get_node_drops`; I did not read whether any game mod here does. Not checked.

Best transferable idea: give each loot entry its own 1-in-N chance and weapon filter, roll the entries in a fixed order, and stop after a set number of entry hits, so the table is data and the cap is explicit.

Reuse tag: rewrite-from-idea (LGPL-2.1-or-later; clean-room shape only)
Brief rule served: server-verified kills and one ledger (Frankendom rulings); row 18
