# PixelGuys-Cubyz (crafting-gathering-repair, cell 30)

Donor: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/sync.zig` (wear on use and rollback; block-change gate in `rotation.zig` 95-125, tool stats in `items.zig` 618-680, modifiers in `proceduralItem/modifiers/`, drops in `server/BlockDrop.zig`, recipes in `items/recipes.zig`) | Licence: GNU GPL version 3 (`LICENSE` line 2: "Version 3, 29 June 2007") | Zig | symbol `executeDurabilityUseOperation`

Checked: Read in full: `items.zig` 618-680 (`ProceduralItemPhysics.evaluateProceduralItem`), `items.zig` 1063-1080 (`isEffectiveOn`, `getBlockDamage`), `proceduralItem/modifiers/durable.zig`, `fragile.zig`, `single_use.zig` (whole files), `rotation.zig` 95-125 (`canBeChangedInto`), `sync.zig` 676-712, 765-780, 836-850 and 1612-1660 (block-change command and durability use), `server/BlockDrop.zig` 1-60 and 100-160, `blocks.zig` 227-272, `items/recipes.zig` 1-286 (whole file). Greps only: `items.zig` modifier vtable 170-216, `biomes.zig` 306 and 331 (chance lines only), `gui/windows/workbench.zig` 127 (durability label). Not read: `itemdrop.zig`, `restrictions/`, the recipe and block JSON data rows (no `assets/` data rows read), `Player.defaultBlockDamage` value, the client branch of `sync.zig` beyond the rollback at 676-682. Repair: `grep -rn repair` over `src/` returns zero hits, so this donor has no repair path. Salvage: no disassembly found in the grep for salvag/disassem (zero hits). Confidence: high on the wear write, the block gate and the rollback order; high on the modifier and stat math (read end to end); medium on drops (roll read, zone rows not read); medium on recipes (code read, data not read).

Best transferable idea: Charge tool wear per effective use. A break needs tool damage above the block's resistance, an effective tool pays one durability, the server checks and swaps the block first and only then writes the wear, and the write keeps the old value so a refused command can roll it back.

Decision (proposed): adapt — the order (gate, swap, then wear, with rollback) gives Frankendom's gear wear a server-verified ledger write that costs nothing when the hit or break is refused; the grid-built stats and modifier stacking are a separate idea for gear grades (not adopted here); the creative bypass is rejected because no fight mode is creative.
Acceptance: A server test: a tool with durability 3 used on three effective breaks is removed on the third; a break refused by the block check leaves durability unchanged; a command rejected after the wear step restores the previous durability; the player sees the durability bar step down once per effective break and the item vanish at zero.

## 1. Mechanism

- Tool stats are built from the crafting grid, once per change (`evaluateProceduralItem`, items.zig 621-677). For each property, the 25 grid cells (5 by 5) add `weight x material value`, averaged or summed, then scaled (631). Damage below 1 is mapped to `1/(2 - x)` (644), so the curve is continuous at 1. Material modifiers are gathered per cell, merged by type (651), sorted by priority (659), and applied. `maxDurability` is rounded, floored at 1 (671-672), and copied into the current durability (673).
- Modifier order and maths: durable (priority 1) multiplies max durability by (1 + s) (durable.zig 19) and combines two of its kind by hypot of strengths (15). Fragile (priority 1) multiplies by (1 - s) (fragile.zig 19), with s clamped to 0..1 on load (11), and combines in odds space: 1 - 1/(1 + hypot(1/(1-s1) - 1, 1/(1-s2) - 1)) (15). Single-use (priority 1000) sets max durability to its strength (single_use.zig 19 as the set, min-combine at 15) and runs last.
- Connectivity: a flood fill over the occupied cells decides whether the grid is one piece. If not, max durability becomes 0 and durability 1 (675-677).
- Break gate (rotation.zig 106-114): start from the tool's block damage (`getBlockDamage`: modifiers apply only if the tool is effective on the block, otherwise the default player damage, items.zig 1073-1078). Subtract the block's resistance (111). Break only if the result is above 0 (112). An effective procedural tool pays `yes_costsDurability = 1` (113-114).
- Server order for a block change (sync.zig 1614-1652): the cost is computed from `canBeChangedInto` unless the player is in creative (1614). The affordability check runs first (1617). The server swaps the block with a compare-and-swap (1635), so a world changed by someone else refuses the command. Only after that the wear is applied (1651-1652).
- Wear write (`executeDurabilityUseOperation`, sync.zig 765-776): if the amount is 0 it does nothing. Otherwise the server adds a sync operation (server side only), subtracts with saturation (`-|=`, 773), and clears the slot at 0 (774-775). Before the write, `previousDurability` is recorded (843). The rollback path puts the previous durability back and the item back into the slot (681). When the command finishes, a used-up item is freed (702).

## 2. Key functions

- `executeDurabilityUseOperation`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/sync.zig` 765-776. The wear write.
- Command apply and rollback for `useDurability`: sync.zig 678-682 (undo) and 841-844 (apply, record previous).
- Block-change command: sync.zig 1612-1660. Cost, affordability, swap, wear.
- `canBeChangedInto` (in `RotationMode.DefaultFunctions`, which starts at rotation.zig 37): `/mnt/frankendom-donors/PixelGuys-Cubyz/src/rotation.zig` 95-125.
- `evaluateProceduralItem`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/items.zig` 621-677. Stats from the grid, modifiers, durability.
- `getBlockDamage` and `isEffectiveOn`: items.zig 1063-1078.
- Drop roll: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/BlockDrop.zig` 17-31 and 125-130.
- Recipe expansion: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/items/recipes.zig` 129-224.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Break gate: damage minus resistance above zero | resistance per block (blocks.zig 164 default 0); gate at rotation.zig 111-112 |
| Wear cost per effective use | 1 durability (rotation.zig 114); 0 for non-effective use (hand damage) |
| Saturating wear, zero removes the item | `-|=` (sync.zig 773); removal at 0 (774-775) |
| Server swap before wear | cmpxchg (1635) before the wear command (1651-1652) |
| Max durability from modifiers | durable x (1 + s) (durable.zig 19); fragile x (1 - s) (fragile.zig 19); single-use sets (single_use.zig) |
| Modifier stacking | durable: hypot of strengths (15); fragile: hypot in odds space (fragile.zig 15); single-use: min (15) |
| Priority order | durable and fragile 1, single-use 1000 (8 in each file) |
| Damage curve | 1/(2 - x) below 1 (items.zig 644) |
| Drop chance per row | `chance` default 1 (blocks.zig 267); roll against the global server seed (BlockDrop.zig 31) |
| Tool filter on drops | allowedToolTags and forbiddenToolTags (blocks.zig 257; BlockDrop.zig 17-27) |

## 4. TypeScript sketch

simplified: the sketch keeps the break gate, the one-per-effective-use cost, the saturating write and the rollback record. It omits the creative bypass, the block swap (compare-and-swap) and the affordability check that sit before the write in the donor, the non-air result rule (the donor refuses a non-air result for a non-effective tool, the sketch returns 0), base-item costs, the modifier and grid stat math, the drop roll, and the client prediction. The sketch takes the wear step as a separate call after the caller has passed the gate, which is the donor's order.

```ts
// clean-room: shape of the mechanism only (donor is GPL-3.0). Numbers are data fields, not copied.
interface Tool {
  durability: number;      // u32-like, never below 0
  damage: number;          // break strength before the block's resistance
  tags: Set<string>;       // tags this tool is effective on
}

interface Block {
  resistance: number;      // subtracted from the tool's damage
  tags: Set<string>;
}

interface UseOp {
  tool: Tool;
  previous: number;        // stored before the change, for rollback
  cost: number;
}

// A break needs damage above the block's resistance. Only an effective tool pays wear.
// Returns the wear cost (0 or 1), or null when the block cannot be broken.
function breakCost(tool: Tool | null, block: Block, handDamage: number): number | null {
  const effective = tool !== null && [...block.tags].some(t => tool.tags.has(t));
  const raw = effective ? (tool as Tool).damage : handDamage;
  if (raw - block.resistance <= 0) return null;
  return effective ? 1 : 0;
}

// Server-side ledger write. Saturating: durability never goes below zero.
function applyWear(tool: Tool, cost: number): { op: UseOp; destroyed: boolean } {
  const previous = tool.durability;
  tool.durability = Math.max(0, tool.durability - cost);
  return { op: { tool, previous, cost }, destroyed: tool.durability === 0 };
}

// Undo one write when a later step of the same command is refused.
function rollbackWear(op: UseOp): void {
  op.tool.durability = op.previous;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS with the block plus `export {};` (`/tmp/cr003-cubyz-tool-wear.ts`): exit 0.

## 5. Lands in

- TARGET `src/fight/gear-wear.ts` (new module, shared with the CDDA note): the per-hit or per-use wear write, saturating, with a rollback record, after the server gate. Parity-checklist row 18 (loot roll and XP award); this donor has no wear row of its own, so the row choice is the closest one. Lead to confirm.
- Reuse tag: rewrite-from-idea (GPL-3.0, copyleft: clean-room, shape only)
- Brief rule served: one ledger (the wear write is the one ledger entry); server-verified (the gate and the swap run on the server before the write); rule 2 (judge the idea, not the genre)

## 6. Gaps and risks

- GPL-3.0 copyleft: clean-room only. The sketch restates the order and the write; numbers are data fields.
- No repair path in this donor (grep: zero hits for repair across `src/`). The repair half of the topic is NONE here.
- No salvage or disassembly in this donor (grep: zero hits).
- Wear only on effective use: a tool with the wrong tags breaks any block whose resistance is below the hand damage and pays nothing (rotation.zig 112-113 with items.zig 1075-1078). Frankendom must decide whether wear applies on every hit or only on effective hits; the donor's choice would let a wrong-weapon hit cost nothing.
- Creative bypass (sync.zig 1614): wear is skipped for creative players. Frankendom has no creative mode in a fight; rejected.
- MAX_ATTACKERS = 3: one action costs one wear step, so three attackers in one exchange can each cost wear. Frankendom needs a per-exchange cap or an explicit rule, tested.
- Global server seed for drops (BlockDrop.zig 31, `main.seed`): replay (row 19) reproduces drops only if the seed is saved with the fight.
- Defect 1 (items.zig 676-677, fix: keep the two fields consistent): a disconnected tool gets max durability 0 and durability 1, so durability is above max and the tool breaks on its first use (1 minus 1 is 0). If that is the intended rule, write it in the data; otherwise set durability to 0 and refuse the craft.
- Defect 2 (items/recipes.zig 60, 96, 106; fix: free newKeys once): in `matchWithKeys`, the `errdefer newKeys.deinit()` at 60 and the `defer newKeys.deinit()` at 96 both run on the `return error.NoMatch` at 106, so the map is freed twice. Found by reading only; not run. The path is reached when a pattern has several candidate separators and none completes a match.
- Zone rows (`biomes.zig` 306, 331): only the chance lines were read, so the zone population rule is not covered here (row 23 territory).
- Recipe rows: the matcher expands `{symbol}` patterns into concrete rows at load time (recipes.zig 129-224), with `reversible` adding the mirrored row. Frankendom's catalogue can use the same expansion as a generator; the recipe data files were not read.
