# OpenDAoC-OpenDAoC-Core (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ECS-Components/Actions/WeaponAction.cs` | Licence: GPL-3 (repo LICENSE is the GPL v3 text; the .cs files carry no header; the repo's gplheader.txt template says v2 or later) | C# | symbol `WeaponAction.Execute`

Checked: Opens at line 71 and closes at 163 (verified). Also read in full: `CheckAttackPrecondition` (374-420), `MakeMainHandAttack` (422-480), `CalculateExtraSwings` (171-247), `InitiateAttack` and `FinalizeAttack` (497-526), and in `GameServer/ECS-Components/AttackComponent.cs`: `MakeAttack` (787-944), `LivingMakeAttack` (946-1118), `CalculateEnemyAttackResult` (1401-1693).

## 1. Mechanism

- `WeaponAction.Execute()` (71-163) runs once per attack round. Its caller (the attack action) was not read; a timer-callback overload (64-69) runs it for ranged ammo flight. Inputs: owner, target, main and left weapon, effectiveness, interval (weapon speed in ms), style, ranged type and ammo. Outputs: one `AttackData` per swing plus side effects (damage, style procs, shield and armour callbacks, a reflex attack).
- The round is time-gated, not frame-gated: `AttackRoundEndTime = GameLoopTime + interval`.
- `MakeMainHandAttack` (422-480) checks the precondition first (`CheckAttackPrecondition`, 374-420: target exists and is a living, alive, same region and active, in front within 120 degrees and in view for a player, in range (a style can override the range), server rules allow the attack, no damage immunity). On failure it records an `AttackData` with the reason, sends an invalid-attack message and stops (426-433). Otherwise it rolls the extra-swing count (`CalculateExtraSwings`, 171-247). Only when there are no extra swings and the owner dual-wields with no style, it swaps to the left weapon on a 50 % chance (450-457). Then it runs the first swing (`InitiateAttack`, which calls `AttackComponent.MakeAttack` and increments `SwingsExecuted`) and finalizes it.
- `Execute` sets `AttackRoundEndTime = GameLoopTime + interval` only after the main-hand attack passed its precondition (78-81).
- Each swing goes through `AttackComponent.MakeAttack` (787-944) into `LivingMakeAttack` (946-1118). For a player owner, `MakeAttack` first interrupts crafting, then after the swing adds keep damage and Vampiir mana on hits, and runs the multi-target fan-out on styled hits; non-player owners go straight to `LivingMakeAttack` (with effectiveness forced to 1 unless a necromancer pet).
- `LivingMakeAttack`: registers the attacker on the target (952), gets the result from `CalculateEnemyAttackResult` (955), then overrides it with a Miss on a 30 % chance if the attacking player is strafing in melee (960-966). On a hit the damage pipeline is: weapon damage, times `weaponSkill / armourMod`, times relic bonus, times the PvP or PvE melee rate (974-997); resistances applied to base and style damage separately (1001-1029); conversion (1032-1034); base damage cap (1037); style damage added under its own cap (1045-1051); crit chance and crit damage computed (1065-1066). On block, evade, parry or miss, half the style endurance is spent (1081-1084). Finally the target may modify the attack, messages go out, the target and (for melee) the attacker are interrupted for the swing interval, and the attacker's on-attack hooks run (1103-1117).
- The defender-side chain is `CalculateEnemyAttackResult` (1401-1693). The donor's own comment gives the order: Intercept, Evade, Parry, Block, Guard, Hit/Miss, Bladeturn (1407). In the code: a necromancer-shade target returns NoValidTarget; player intercept effects are tried first (roll against the intercept chance, 1429-1442); a stealth-opener style disables defences and clears the intercept; a player target with a bodyguard returns Bodyguarded (1454-1476); a successful intercept redirects the attack to the interceptor and returns HitUnstyled (1492-1500). Unless defence is disabled (berserk or stealth style): evade roll, then parry roll (melee only), then block (`CheckBlock`). Guard (`CheckGuard`) runs after that, outside the disabled check (1568). Then miss and fumble: fumble is a subset of miss, so the miss chance is floored at the fumble chance (1590-1591), one roll decides both (1597-1611). Then bladeturn effects (a higher-level attacker penetrates with probability 1 minus caster level over attacker level), otherwise a Miss with miss chance 100 (1627-1687). If nothing stopped the swing: HitUnstyled. Each of evade, parry and miss is one roll, `chance > roll`.
- Extra swings alternate left and right. Each runs `InitiateAttack` then `FinalizeAttack` (505-526): notify the target, deal damage, damage adds, damage shields, armour-hit callback. A Blocked result calls `OnArmorHit` with the target's active left weapon (`else if` branch at 522-523, the call on line 523; `HandleReflexAttack` follows at 525).
- After the swings, `Execute` branches on the main-hand result: HitStyle fires the style procs; TargetDead or NoTarget clears the target; NoValidTarget or NotAllowed stops the attack; OutOfRange does nothing further.
- Multi-target styles (inside `MakeAttack`, only on a styled hit) pick the number of extra targets from the style's MultiTarget proc value (255 for Shield Swipe, id 600, which also skips players), build a candidate list of players and NPCs in attack range that the server rules allow, remove the primary target, then draw extra targets by random swap-remove (882-918) and run a new `WeaponAction.Execute` for each (924-928).
- Evade, parry and miss rolls use `RandomProvider.GetPseudoDouble(RandomContextFactory.Evade/Parry/Miss(SwingsExecuted, StyleChainStage))` (1532, 1551, 1597), so those rolls are keyed on the swing index and combo stage. The intercept roll and the dual-wield roll use contexts with no swing arguments (1433, 189, 217, 230); the strafing miss, the 50 % hand swap, bladeturn penetration and the 35 % Atlas prevent-flight use `Util.Chance`, which is unseeded. `CheckBlock` and `CheckGuard` were not read.

## 2. Key functions

- `WeaponAction.Execute`: `WeaponAction.cs` 71-163. Round entry, extra swings, result branching, animation, proc.
- `WeaponAction.CheckAttackPrecondition`: `WeaponAction.cs` 374-420. Target, region, facing, range, server rules, damage immunity.
- `WeaponAction.MakeMainHandAttack`: `WeaponAction.cs` 422-480. Precondition, extra-swing count, left-hand swap, first swing.
- `WeaponAction.CalculateExtraSwings`: `WeaponAction.cs` 171-247. NPC left-hand chance, Left Axe (always one extra swing), DW/CD chance, H2H cumulative thresholds from one uniform draw. A `false` argument only sets the mechanism without rolling (165-169).
- `WeaponAction.FinalizeAttack`: `WeaponAction.cs` 505-526. Target notified first, then damage and callbacks.
- `AttackComponent.MakeAttack`: `AttackComponent.cs` 787-944. Crafting interrupt, keep and Vampiir effects, weapon condition, camouflage, multi-target fan-out.
- `AttackComponent.LivingMakeAttack`: `AttackComponent.cs` 946-1118. Result, strafing miss, damage pipeline, interrupts.
- `AttackComponent.CalculateEnemyAttackResult`: `AttackComponent.cs` 1401-1693. The ordered defender roll chain (read in full). The bodies of `TryEvade`, `TryParry`, `CheckBlock`, `CheckGuard` and `GetMissChance` are not read.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Round gate on a weapon interval (next round at now + interval) | Interval = weapon attack speed in ms (theirs, from item data) |
| Extra swings from one uniform draw against cumulative thresholds (double, then triple, then quad) | DW/CD and H2H chances (theirs, from skill tables); NPC `LeftHandSwingChance` (theirs, per NPC) |
| Left and right alternation on extra swings | 50 % left-hand substitution when dual-wielding with no style (theirs) |
| Ordered defender chain, first success ends the attack | Strafing miss 30 % (theirs, AttackComponent.cs 960); Atlas preventing-flight 35 % and spell 7083 (theirs, WeaponAction.cs 150, 155); Left Axe spec grants one extra swing; left-hand swap 50 % (theirs, 452) |
| Per-swing seed (swing index, combo stage) for replayable rolls | Multi-target caps: read from the style's MultiTarget proc value; the comments at AttackComponent.cs 866-870 say Tribal Assault and Clan's Might 1, Totemic Wrath 2, Totemic Sacrifice 3; Shield Swipe is hard-coded to 255 (theirs, 863-872) |

## 4. TypeScript sketch

simplified: `resolveSwing` models only the five ordered rolls and merges fumble into miss. The donor also has a bodyguard return, an intercept that redirects instead of ending the swing, stealth-opener and berserk defence-disabling, fumble as a subset of miss with a floor, bladeturn after the miss roll, the melee-only parry condition and guard (all omitted). Evade, parry and miss rolls are keyed by swing index in the donor; intercept and dual-wield rolls are not. The sketch's `swingSeed` shows the keyed idea only.

```ts
// Licence: GPL-3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Result = 'hit' | 'intercept' | 'evade' | 'parry' | 'block' | 'miss';

interface Roll { next(): number } // uniform in [0, 1)

// Defender-side chain: each stage is one independent roll; the first success ends the swing.
function resolveSwing(
  c: { intercept: number; evade: number; parry: number; block: number; miss: number },
  rng: Roll,
): Result {
  if (rng.next() < c.intercept) return 'intercept';
  if (rng.next() < c.evade) return 'evade';
  if (rng.next() < c.parry) return 'parry';
  if (rng.next() < c.block) return 'block';
  return rng.next() < c.miss ? 'miss' : 'hit';
}

// Extra swings: one uniform draw against cumulative thresholds.
function extraSwings(rng: Roll, dbl: number, tpl: number, quad: number): number {
  const r = rng.next();
  if (r < dbl) return 1;
  if (r < dbl + tpl) return 2;
  if (r < dbl + tpl + quad) return 3;
  return 0;
}

// Round gate on a shared clock: the next round opens one interval after the last.
function nextRoundAt(now: number, intervalMs: number): number {
  return now + intervalMs;
}

// Per-swing seed keyed on the swing index and combo stage, so a replay rolls identically.
function swingSeed(base: number, swingIndex: number, comboStage: number): number {
  return (base ^ Math.imul(swingIndex, 0x9e3779b1) ^ Math.imul(comboStage, 0x85ebca6b)) >>> 0;
}
```

## 5. Lands in

- TARGET `src/fight/duel.ts` (today: `src/duel.ts`, moving), parity-checklist row 1 (duel step / sim) and row 3 (guard, parry, roll, stamina). The ordered defender chain is a candidate shape for defence resolution. Compare first with the parry, block and guard order already in `stepDuel` (`src/duel.ts` line 221, checked in worktree `frankendom-combat-p3`, commit 6adcab27e) so there is no second resolver.
- today: `src/duel.ts` (moving) holds `stepDuel`.
- Reuse tag: rewrite-from-idea
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3: clean-room only.
- The round timer uses wall-clock `GameLoopTime`, and the evade, parry and miss rolls come from server-side random contexts. Frankendom's duel is a pure fixed-tick step that rollback re-steps (`src/net/rollback.ts`), so neither the timer nor the RNG port as-is; the keyed-per-swing seed idea is the only part that fits one engine, replayable.
- The donor has no stamina, posture or stagger model; those are in the duel step (checklist row 3). This donor adds nothing there.
- Dual-wield and H2H extra swings would be a second action inside one window, which conflicts with the one-edge-action-per-tick rule in the input path (checklist row 5). The extra-swing rule is a Lead decision; this file does not make it.
- The intercept, bodyguard and multi-target stages depend on group mechanics. Frankendom's ruling caps attackers on one target at MAX_ATTACKERS = 3 and has no group; multi-target fan-out would be an engine feature and must keep the cap.
- The donor resolves hits on the server. Frankendom's kills are server-verified through `src/net/verify-duel.ts` (a replay of both pages' records), so only the order of checks carries over, not the authority model.
- The damage pipeline (weapon skill over armour factor, then resistances, caps and style damage) is a second ordered model beside the defender chain; the notes on the cap and style-cap order were read but not compared with Frankendom's damage step.
