# OpenRA-OpenRA (loot-drops, cell 8)

Donor: /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Crates/Crate.cs | Licence: GPL-3 | C# | symbol Crate.OnCrushInner / CrateAction.GetSelectionSharesOuter (verified: `OnCrushInner` at 153, `GetSelectionSharesOuter` at CrateAction.cs 68; the crush entry points are 107 and 148).

## 1. Mechanism

- A crate is a world actor (`Crate`, Crate.cs 75-). Its tick (184-188) disposes it once `++ticks >= Duration` when `Duration != 0` and it is in the world (Duration 0 means never; line 26). It is collected in two ways: a unit crushes it (`INotifyCrushed.OnCrush`, 107-113, which returns unless the crusher's crush classes contain the crate's `CrushClass`, then calls `OnCrushInner`), or the crate parachutes down (`OnLanded`, 116-151): landing on a cell with no other actors does nothing (the crate stays, 143-144); if other actors are there and one is a Mobile whose locomotor crushes this class and the crate is at ground level, that one collects (147-148); if others are there but none qualifies, the crate is disposed (149-150).
- `OnCrushInner` (153-182) returns at once if `collected` is set (155-156), takes the crate's `CrateAction` traits (158), calls `self.Dispose()` and then sets `collected = true` (160-161), and only after that computes the shares and picks. So the crate is gone and flagged before any action pays, and a second call returns early.
- Each `CrateAction` trait on the crate reports a share count for this collector through `GetSelectionSharesOuter` (`CrateAction.cs` 68-83). The count is zero if the trait is disabled, before the action's time delay (world tick), if the collector's type is excluded, or if the owner lacks the prerequisites. Otherwise it is `GetSelectionShares(collector)`, by default the action's `SelectionShares` (default 10, CrateAction.cs line 21; theirs). The cash action overrides it to return zero when its `Amount` is negative and the owner's cash plus resources is zero (GiveCashCrateAction.cs 50-57; default Amount 2000, line 20). The gate order is: trait disabled (70), world tick before `TimeDelay` (73), collector actor name in `ExcludedActorTypes` (76), prerequisites not held per the owner's tech tree (79), then the override (82).
- The shares are summed (168), one roll `SharedRandom.Next(total)` gives `n` (169), and the list is walked in trait order: if `n < share` that action's `Activate` runs on the collector and the walk ends, else `n -= share` (171-180). The only guard is `shares.Count != 0` (166); with a total of zero no `n < share` can hold, so nothing activates (the RNG's behaviour for `Next(0)` was not read). `Activate` in the base class only plays sound, notification text and an effect (90-102); the cash action queues the cash change at frame end (37-48).
- `SharedRandom` is the world's shared RNG; the `ticks` and `Location` fields carry `[VerifySync]` (Crate.cs 83-87). That it is the lockstep-synced RNG is from the OpenRA design (the RNG class was not read).
- Inputs: collector, crate actions, world tick, synced RNG. Outputs: one action activated.
- Tick: on crush or collect.

## 2. Key functions

- `Crate.OnCrushInner`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Crates/Crate.cs` lines 153-182. Collect-once check, dispose, flag, share list, weighted pick, activate. Also read: `OnCrush` 107-113, `OnLanded` 116-151, `Tick` 184-188.
- `CrateAction.GetSelectionSharesOuter`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Crates/CrateAction.cs` lines 68-83. Gates an action out of the pick (disabled, time delay, excluded type, prerequisites), else its share count.
- `GiveCashCrateAction.GetSelectionShares`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Crates/GiveCashCrateAction.cs` lines 50-57. Cash action gate: no share when a negative amount meets zero cash.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Collect once: flag and dispose before paying out | Duration 0 = no auto-removal (theirs, line 26); CrushClass "crate" (theirs, line 32) |
| Weighted pick: one roll over the sum of shares, walk the list | default share 10 (theirs) |
| Per-option gates that remove an option from the pick (time delay, excluded type, prerequisite) | TimeDelay in world ticks, default 0 (theirs, data, line 46) |
| Pick from a shared RNG stream | `SharedRandom` (theirs, not read) |
| Cash option removed when it would take money the owner lacks | cash or resources check (theirs); default Amount 2000 (theirs, line 20) |

## 4. TypeScript sketch

simplified: the crush-class gate, the auto-disposal tick (Duration), the parachute landing path and the frame-end deferral of `Activate` are omitted; the donor disposes the actor before setting its flag (the sketch sets the flag first); the gate chain is a boolean `eligible` per option plus the separate `sharesFor` and `cashShares` helpers, which `collect` does not call; the donor's `Count != 0` guard is replaced by the zero-total return.
```ts
// Licence: GPL-3 (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
interface LootOption { name: string; shares: number; eligible: boolean; activate: (who: string) => void; }
interface Crate { collected: boolean; }

// Collect once: mark and remove before any option pays out.
function collect(crate: Crate, who: string, options: LootOption[], rollBelow: (n: number) => number, remove: () => void): string | null {
  if (crate.collected) return null;
  crate.collected = true;
  remove();
  const live = options.filter(o => o.eligible && o.shares > 0);
  const total = live.reduce((s, o) => s + o.shares, 0);
  if (total === 0) return null;
  let n = rollBelow(total);
  for (const o of live) {
    if (n < o.shares) { o.activate(who); return o.name; }
    n -= o.shares;
  }
  return null;
}

// Gate per option: an option that is not eligible for this collector has zero shares.
function sharesFor(base: number, disabled: boolean, worldTick: number, delayTicks: number, excluded: boolean, prereqsMet: boolean): number {
  if (disabled || worldTick < delayTicks || excluded || !prereqsMet) return 0;
  return base;
}

// Cash-like option: no share when it would take money the owner does not have.
function cashShares(base: number, amount: number, ownerCash: number): number {
  if (amount < 0 && ownerCash === 0) return 0;
  return base;
}
```

## 5. Lands in

- TARGET origins/encounters/encounters.ts (`rollTable`, the EQEmu loot port: it already does a weighted pick over eligible entries and gates entries by level). The donor adds only two things that table lacks: a per-entry time/prerequisite gate (`TimeDelay`, prerequisites, excluded types) which would be new catalogue fields on the loot-table entry (row 21), and the explicit collect-once-then-pay order, which Frankendom already gets from the token consumption in origins/server/mob-rewards.ts (the kill's reward commits in one transaction with the token). A new src/fight/loot.ts is not needed.
- Parity checklist row 18 (loot roll and XP award; post-K item 3). Today the Pit's own table is src/loot.ts (moving to server rewards).
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks

- Server-verified kills: the donor's pick runs in a lockstep simulation (every client computes it from `SharedRandom`). Frankendom has one authoritative roll: the server rolls from a seeded stream and replays it to verify; `rollLoot` already takes a seed. A shared RNG is not needed.
- Trigger: crates are collected by moving units; Frankendom drops come from a verified kill. The donor's gates (time delay, prerequisites, excluded actor types) have to be catalogue fields on loot entries, not code (no hidden numbers).
- One ledger: `Activate` changes the collector's cash and effects directly (GiveCashCrateAction.cs 37-48). Frankendom pays through the server inventory and career in the one transaction of origins/server/mob-rewards.ts.
- Idempotency: the donor's flag lives on a crate that is disposed in the same call. A Frankendom kill drop has no actor; the same guarantee must come from the spent token and the per-drop mint key `loot:<killId>:<n>` (origins/encounters/encounters.ts `intoBackpack`), not from a flag in memory.
- MAX_ATTACKERS = 3: up to three creatures may be engaged on one player, so up to three drops may be pending at once; each has its own token and is rolled independently. The donor's one-crate-one-collector rule does not cover that.
