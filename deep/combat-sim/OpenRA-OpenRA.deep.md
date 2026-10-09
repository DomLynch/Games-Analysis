# OpenRA-OpenRA (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Armament.cs` | Licence: GPL-3 | C# | symbol `Armament.FireBarrel / Tick / CheckFire`

Checked: `FireBarrel` is at 296-363, `CheckFire` at 272-294, `Tick` at 211-236 (`ITick.Tick` wrapper at 238), `CanFire` 252-268, `UpdateBurst` 365-392, `ScheduleDelayedAction` 244-250, all read in full (verified). The donor does the firing cadence and burst; the hit itself is a projectile object, not read here.

## 1. Mechanism

- Each weapon slot is an `Armament` trait with a list of barrels (muzzle offset + yaw). Input: a `Target` (position or actor), the facing, and the trait's own counters. Output: a projectile added to the world, a sound, a recoil impulse, and notify callbacks.
- Runs once per world tick via `Tick` (211-236): it refreshes the reloading condition, then returns if the trait is disabled; otherwise it counts `ticksSinceLastShot` up to the weapon's reload delay (capped, 219-220), counts down `FireDelay`, decays recoil by the recovery length (floored at zero), and fires any scheduled delayed actions (the projectile spawn after the fire delay, the after-fire sound) whose tick count has run out (227-235).
- `CheckFire` (272-294): gate first (`CanFire`, 252-268: not reloading (`FireDelay > 0` or trait disabled), not paused, turret facing reached, target in range and outside min range, weapon valid against the target). If `ticksSinceLastShot` has reached the weapon's reload delay, the burst counter resets to the weapon's burst size (277-278), and `ticksSinceLastShot` is zeroed (280).
- A barrel is picked per shot: with weapon burst 1 the barrels cycle in order; with a larger burst the barrel is `Barrels[Burst % Barrels.Length]` where `Burst` is the shots remaining (283-286). `FireBarrel` (296-363) first notifies the preparing-attack listeners, builds the projectile args (muzzle source, passive target with first and following burst offsets, the damage, inaccuracy and range modifiers) and schedules the actual spawn after `Info.FireDelay` ticks (zero runs it at once). When it runs, the projectile is created and added to the world, the report sounds play, recoil is set and the attacking listeners are notified (343-362).
- `UpdateBurst` (365-392): after each shot, while the burst has shots left, `FireDelay` takes the inter-burst delay (the only entry if there is one, otherwise indexed by the shot number, 369-372); when the burst ends, `FireDelay` becomes the reload delay with percentage modifiers applied (minimum 1 tick), the burst counter resets, the after-fire sound is scheduled and burst-complete listeners are notified (376-390).
- The loop in `CheckFire` repeats while `FireDelay == 0` and `CanFire` still holds (291), so a zero-delay burst fires in one tick. Stop conditions: a delay is set, or the gate fails (range, validity, turret).

## 2. Key functions

- `Armament.Tick` (protected virtual): `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Armament.cs` 211-236. Per-tick countdowns, recoil decay, delayed-action queue.
- `Armament.ITick.Tick`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Armament.cs` 238-242. Wrapper that calls `Tick` so subclasses can override.
- `Armament.ScheduleDelayedAction`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Armament.cs` 244-250. Zero delay runs now; positive delay queues a (ticks, burst, action) tuple.
- `Armament.CanFire`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Armament.cs` 252-268. The gate: reload, pause, turret, range, min range, validity.
- `Armament.CheckFire`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Armament.cs` 272-294. Entry point. Picks the barrel, fires, updates the burst, loops on zero delay.
- `Armament.FireBarrel`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Armament.cs` 296-363. Builds projectile args and schedules the spawn.
- `Armament.UpdateBurst`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Armament.cs` 365-392. Burst counter, inter-burst delay, reload delay, burst-complete notify.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-tick countdown fire gate (`FireDelay`), decremented each tick | Reload delay per weapon (theirs, from the ruleset) |
| Burst counter: N shots, inter-burst delay array, then reload delay | Burst size and burst delays array (theirs, data) |
| Delayed-action queue for spawn lag and after-fire sound | Fire delay in ticks per barrel config (theirs) |
| Barrel cycle: round-robin over muzzle offsets | Muzzle offsets and yaws (theirs, data) |
| Reload delay with percentage modifiers applied, minimum 1 tick | Modifier percentages (theirs, data-driven; `Util.ApplyPercentageModifiers`, not read) |
| Recoil decays by a fixed amount per tick, floored at zero | Recovery length per tick (theirs) |

## 4. TypeScript sketch

simplified: the sketch omits the trait-disabled and paused checks, the turret and min-range gates, weapon validity, the cap on `ticksSinceLastShot`, recoil, the delayed-action queue (spawn lag, sounds), notify callbacks, percentage reload modifiers and the burst-index barrel pick (it always cycles). The inter-burst delay index is clamped to the array end, which the donor does not do.

```ts
// Licence: GPL-3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Burst { size: number; interDelays: number[]; reload: number; }
interface Weapon { burst: Burst; spawnLag: number; }
interface Gun { fireDelay: number; sinceLastShot: number; burstLeft: number; barrel: number; barrels: number; }

// Per world tick: count down the gate and the time since the last shot.
function tickGun(g: Gun): void {
  if (g.fireDelay > 0) g.fireDelay -= 1;
  g.sinceLastShot += 1;
}

// Try to fire; returns the number of shots started this tick.
function tryFire(g: Gun, w: Weapon, inRange: boolean): number {
  if (!inRange || g.fireDelay > 0) return 0;
  if (g.sinceLastShot >= w.burst.reload) g.burstLeft = w.burst.size;
  g.sinceLastShot = 0;
  let shots = 0;
  do {
    g.barrel = (g.barrel + 1) % g.barrels;
    shots += 1;
    g.burstLeft -= 1;
    if (g.burstLeft > 0) {
      const idx = Math.min(w.burst.interDelays.length - 1, w.burst.size - (g.burstLeft + 1));
      g.fireDelay = w.burst.interDelays[idx];
    } else {
      g.fireDelay = Math.max(1, w.burst.reload);
      g.burstLeft = w.burst.size;
    }
  } while (g.fireDelay === 0 && inRange);
  return shots;
}

// The spawn itself is scheduled after a lag; the caller owns the queue.
function spawnAt(now: number, w: Weapon): number {
  return now + w.spawnLag;
}
```

## 5. Lands in

- TARGET `src/fight/duel.ts` (today: `src/duel.ts`, moving), parity-checklist row 1 (duel step / sim): a ranged or pass-through weapon's fire gate and burst belong in the duel step, with the cadence on engine ticks. Row 13 (specials: timing) is the other consumer if a special repeats shots.
- today: `src/combat.ts` (moving to `src/fight/combat.ts`) holds the flat combat helpers; the duel step is `src/duel.ts` (`stepDuel`, line 221, checked in worktree `frankendom-combat-p3`, commit 6adcab27e). The fire cadence has no module today.
- Reuse tag: rewrite-from-idea
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3: clean-room only. The sketch is written from the mechanism.
- The donor fires a projectile object; the hit resolves in the projectile, not here. Frankendom's kills are server-verified, so the cadence gate must live in the one engine and be replayed by the verifier, not left to a client.
- The donor is a real-time RTS with many actors and a tick-counted gate; Frankendom's duel is a 60 Hz step capped at MAX_ATTACKERS = 3 on one target. Only the gate and burst shape transfer.
- The barrel and muzzle geometry is a rendering concern (checklist rows 6 and 10) and does not belong in the engine step.
- The burst indexing rule (`Burst % Barrels.Length`) is a donor convention. Do not copy it.
