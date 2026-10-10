# cmangos-mangos-classic (status-effects, cell SE006)

Donor: `/mnt/frankendom-donors/cmangos-mangos-classic` | Licence: GPL-2.0 (LICENSE file, "Version 2, June 1991"; README points to a COPYING file that is not in the box) | Game content: named by COPYRIGHT.md as Blizzard Entertainment's, class C | Decision: adapt (idea), clean-room

Checked: read in full: `src/game/Entities/Unit.h` 534-590 (diminishing structs and levels) and 1081; `Unit.cpp` 4925-5060 (aura holder add rules), 8813-8905 (GetDiminishing, IncrDiminishing, ApplyDiminishingToDuration, ApplyDiminishingAura), 918-934 (damage path, partly), 9973-10010 (SetFleeing), 10438-10460, 8935; `Spells/SpellMgr.cpp` 2640-2790 (DR group assignment, type, limit functions); `Spells/SpellStacking.h` and `.cpp` (all); `Spells/SpellAuras.cpp` 2373-2384, 2431-2520 (fear, stun), 2732-2782 (root), 3161-3246 (periodic damage apply); `Spells/Spell.cpp` 1420-1441 (DR call sites); `Globals/SharedDefines.h` 1639-1676; `AI/ScriptDevAI/scripts/eastern_kingdoms/zulgurub/zulgurubScripts.cpp` 30-125 (one soulflayer AI). Data: `sql/updates/mangos/z2828_01_mangos_spell_groups.sql` (row counts), `sql/base/mangos.sql` 12586-12600 (schema). Confidence: high on the diminishing-returns and stacking code; medium on fear presentation (MotionMaster not read); high that the 10 s cap is not called (grep of the whole `src/` tree for the function name returns only its declaration and definition).

Half read: both (server code and the spell-group data rows). Client half: not in the box, no paired client donor here. The spell table (`sql/base/dbc/original_data/Spell.sql`, about 8.5 MB) was counted only, not read row by row.

## 1. What the player sees and feels

The donor ships no client, so this is what the server state would drive on a 375-wide screen. A target hit by the same hard control again and again gets less of it: the first stun lands full, the second lasts half as long, the third a quarter, and the fourth is missed with an "immune" result and no effect. The ladder only resets after a quiet window once the last effect has ended. A fear sends the target running on its own path, which reads very differently from a stun that freezes it in place. A root holds the feet while the body can still act. A bleed lands with its damage bonus fixed by the caster at the moment it lands, but the target's own damage-taken modifiers apply on every tick. The four readable states are frozen, running, rooted and immune, and each one can be named at a glance.

## 2. Why it is striking (375-wide criteria)

- Readable beat: the four states differ in motion (still, running, feet locked, miss label), so a player can name the state in under a second.
- One signature behaviour: the diminishing ladder is kept per target, not per caster. Three attackers working on one hero share one ladder, which is the chain-lock case our many-vs-one rule needs.
- One signature effect: an "immune" miss with no effect. (Our proposal, not in the donor, which only sends a miss code.)
- Could be made ours at 20-30 percent resemblance: yes. Keep the ladder and the reset window; change the names, the chip art, the fear path and every number.

## 3. The rule behind it

Per hit, on the target (order as the code runs):
1. Read the target's current level for the control group: `GetDiminishing` (`Spell.cpp` 1422) then `ApplyDiminishingToDuration` (`Spell.cpp` 1426).
2. Duration times a ladder: full, half, quarter, immune. Only some groups scale (see the three types below). Ladder multipliers: `Unit.cpp` 8881 (half) and 8889 (the multiply).
3. Immune: when the diminished duration comes out at zero (the immune level), the spell is replaced by an immune miss (`Spell.cpp` 1431).
4. After the hit lands, the level moves up one step: `Spell.cpp` 1441 calls `IncrDiminishing`, which pushes a new entry at level 1 (`Unit.cpp` 8841-8860).
5. Each aura apply or remove changes an active count for the group and stamps the group's clock (`Unit.cpp` 8892-8905). The count stops a reset while any aura of the group is still up.
6. Reset: with no active aura and more than 15 s since the stamp, the level returns to full (`Unit.cpp` 8830-8833).

Groups and types:
- 18 named control groups plus NONE (`SharedDefines.h` 1647-1675). Types (`SpellMgr.cpp` 2749-2777): ALL (stuns of both kinds, a blind, a charm, one rogue opener) always scale; PLAYER (sleep, roots, fear, polymorph, silence, disarm, freeze, knockout, banish, a warlock fear) scale only when both sides are players (`SpellMgr.cpp` 2779-2782); NONE includes the limit-only groups.
- Charm is type ALL but its duration only scales in player-vs-player (`SpellMgr.cpp` 2738-2744).
- Consequence: a mob's stun diminishes on a player; a mob's fear does not.

Holder rule: a new aura in a group that already has an active aura replaces it (`Unit.cpp` 4994-4997), unless the existing aura is judged stronger by `IsSimilarExistingAuraStronger` (checked in the same function, after the group test). So one control per group per target is live at a time, with that exception.

Stacking, separate from diminishing returns:
- Spell-group table with three rule values: UNIQUE (rule 1), UNIQUE_PER_CASTER (rule 2), MAX (rule 3) (`SpellStacking.h` 30-36; the per-caster check is `Unit.cpp` 4988). Data: 19 groups and 325 spell memberships in the 2828 update file (counted by line); the groups use rule 1 (12 groups) and rule 2 (7 groups), none uses rule 3.
- Per aura-type switch in `SpellStacking.cpp` that decides if two auras of one type can coexist. Some types never stack (`SpellStacking.cpp` 345); others stack only across casters.

Control flags:
- Stun: sets the stunned flag per aura. The flag clears only when no stun aura is left (`SpellAuras.cpp` 2514-2517). A frost stun also sets the frozen state.
- Root: the immobile state clears only when no root aura is left (handler `SpellAuras.cpp` 2732-2782).
- Fear: sets the fleeing flag and suppresses the target's threat entries (`SpellAuras.cpp` 2379-2384). Fear and stun are separate flags; there is no priority between them in this code.
- Fear priority: a normal fear beats a timed panic (`Unit.cpp` 9975); a prevents-fleeing aura blocks it (9981); a confused unit does not panic (9984).
- Damage path: auras with a damage-breakable flag are gathered and cleaned up when the target takes damage (`Unit.cpp` 918-934; the rest of that loop was not read). A stunned target whose stun breaks on damage is treated as suppressed for threat (`Unit.cpp` 8935, helper at 10438).

DoT numbers: the caster-side bonus is computed once when the DoT lands, with the current stack count (`SpellAuras.cpp` 3225). The target-side bonus is recomputed on each tick (`SpellAuras.cpp` 4558; enclosing function name not checked).

Scripted cadence (one creature AI, not an engine rule): a soulflayer picks one of two hard controls (fear or knockdown) at respawn (`zulgurubScripts.cpp` 55, 61); its first control comes after 2-5 s (73), then every 8-10 s (115). Its timers do not tick while it is casting (88).

Designer data fields (all donor values are null because the donor is GPL-2.0):

| name | unit | donor_value_or_null |
|---|---|---|
| dr.ladder | multiplier per level, levels 0-3 (full, half, quarter, immune) | null |
| dr.reset_window | seconds with no active aura before the ladder resets | null |
| dr.pvp_cap | seconds, applied when both sides are players | null (declared, never called) |
| dr.kind | all / pvp / none, per control group | null |
| stack.rule | unique / unique_per_caster / max | null |
| cc.first_window | seconds before the first control (script) | null |
| cc.cadence | seconds between controls (script) | null |
| dot.snapshot | caster bonus fixed at landing: yes / no | null |

## 4. For Frankendom

- Shape: the diminishing table lives on the target in the engine, keyed by control group, never by caster. Our cap is 3 attackers, so a hero faces at most three chains into one ladder, which the donor's per-target design already gives.
- Target file: `src/fight/status.ts` (proposed new module, owned by the duel step). Parity row 1 (duel step / sim).
- Clock: fixed-step ticks, so a replay (row 19) reproduces the same ladder. The donor uses wall time in one place and a cached world tick in another (see defect D2).
- Keep: a per-target ladder; the reset window counted from the last aura end; immune as a visible miss; the control group as data; a stacking table for the few types that need it.
- Change, and the reason: (a) wire the PvP cap, which the donor declares and never calls (D1); (b) ticks, not wall time (D2); (c) choose one control priority, because the donor's flags are independent, so a fear and a stun can both be set at once (`Unit.cpp` 9975 for fear; its stun flag is separate); (d) keep the DoT split as the donor does it: caster bonus fixed at landing, target modifier live each tick.
- Proposal to test, not a donor fact: stuns use the ladder on a hero whatever their source (donor type ALL), while fear and root use it only in hero-vs-hero duels (donor type PLAYER). This keeps mob chains from locking a hero while leaving mob fears as a clean tool.

## 5. Look test (5 minutes, Dom on his phone)

Build one dummy target with a status strip under its health bar at 375 wide: four chips (stun, fear, root, immune). Three attackers chain a stun onto it, and the chip reads 100, 50, 25, then immune. Then run one fear and one root. Compare with a flat stun version using the same timings and no ladder. Dom judges three things: (1) can he name the state in one second; (2) does the third stun feel earned (short, chip shows 25) rather than broken; (3) does a fear read as "runs off" while a stun reads as "frozen". Style flag only, no release rows.

## 6. Licence and IP

- Code: GPL-2.0 (LICENSE). Clean-room only: this note and the sketch are written from the described mechanism, and no donor line is translated.
- Game content: COPYRIGHT.md names World of Warcraft content as Blizzard Entertainment's and calls the project a non-commercial fan emulator. Class C for data. No spell names, IDs or stat blocks are copied here.
- Traits kept: the ladder shape, the reset counted from the last aura end, one control per group, the immune miss.
- Traits changed: names, every number (ours are proposals), the clock (ticks), the fear path art, the chip art, and the scripted cadence.

## 7. Gaps

- Not read: the spell table rows (`Spell.sql`, counted only), most of `SpellAuras.cpp` (aura types beyond stun, root, fear and periodic damage), `MotionMaster` (how fleeing moves), the body of the threat-suppression helper, and the Warden modules.
- Half read: server code and the spell-group rows. Which spells carry which group comes from the code rules plus the spell table, which was not read.
- Client half: not in the box.
- Unverified: whether the soulflayer's CC ability is set before its first update (see D3); the spawn order was not read.
- Counts: 18 named DR groups plus NONE (enum); 19 spell groups and 325 memberships (2828 update, by line).

## Defects (keep the idea, fix the defect)

- D1. The 10-second PvP cap is declared but never applied. `IsDiminishingReturnsGroupDurationLimited` (`SpellMgr.cpp` 2713) has no caller in `src/`. The limit-only group is assigned in code (`SpellMgr.cpp` 2666, 2673), so those effects get no cap even though the enum comment says they do (`SharedDefines.h` 1674). Fix: apply the cap in the duration step when both sides are players (sketch: `pvpCapTicks`).
- D2. Mixed clocks. The reset reads wall time (`Unit.cpp` 8830); the stamp in `ApplyDiminishingAura` is wall time (8900); the stamp at first hit comes from the cached world tick (`Unit.cpp` 8860, set per update in `World.cpp` 1511). Same base, different freshness. Fix: one fixed-step tick counter (sketch: `nowTick`).
- D3. The soulflayer's CC ability (`zulgurubScripts.cpp` 61) is picked only in `JustRespawned`; the constructor (47) sets only the buff ability. If the first update runs before a respawn call, the CC value is unset. Not verified. Fix: pick it in the constructor too.
- Not a defect, noted for the AzerothCore comparison: this tree starts the reset clock on every apply and every removal; the AzerothCore tree starts it only when the last aura ends.

## Sketch (typechecked on the VPS, strict, es2020)

simplified: the sketch keeps the donor ladder, the three types (ALL, PLAYER, NONE) and the reset window after the last aura ends. It fixes D1 (PvP cap applied in the duration step) and D2 (fixed-step ticks). It omits the immune miss path, holder replacement, the stacking table, the DoT split, the fear and stun flags, and the script cadence. The donor numbers are not used; the constants are our proposals.

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism; no donor lines translated.
export {};

type DrGroup = 'stun' | 'root' | 'fear' | 'charm' | 'limitonly';
type DrKind = 'all' | 'pvp' | 'none'; // 'all' diminishes on any target, 'pvp' only when both sides are players, 'none' is limit-only

// Designer data fields. Donor values are not copied (donor is GPL-2.0, so donor_value is null).
const DR_DATA = {
  ladder: [1, 0.5, 0.25, 0] as const, // level 0 full, 1 half, 2 quarter, 3 immune
  resetTicks: 15 * 20,                // quiet time after the last aura of the group ends (20 ticks per second)
  pvpCapTicks: 10 * 20,               // duration cap when both sides are players (declared in donor, never called)
  kind: { stun: 'all', root: 'pvp', fear: 'pvp', charm: 'pvp', limitonly: 'none' } as Record<DrGroup, DrKind>,
};

interface DrEntry { level: number; active: number; endedTick: number; }

export class DrTable {
  private readonly rows = new Map<DrGroup, DrEntry>();

  // Read before the hit lands. A quiet window resets the ladder; the clock is fixed-step ticks, not wall time.
  level(group: DrGroup, nowTick: number): number {
    const row = this.rows.get(group);
    if (!row) return 0;
    if (row.active === 0 && nowTick - row.endedTick > DR_DATA.resetTicks) row.level = 0;
    return row.level;
  }

  // Called after the hit lands. The first hit moves the ladder to level 1.
  land(group: DrGroup): void {
    const row = this.rows.get(group);
    if (!row) { this.rows.set(group, { level: 1, active: 0, endedTick: 0 }); return; }
    row.level = Math.min(row.level + 1, DR_DATA.ladder.length - 1);
  }

  startAura(group: DrGroup): void {
    const row = this.rows.get(group);
    if (row) row.active += 1;
  }

  endAura(group: DrGroup, nowTick: number): void {
    const row = this.rows.get(group);
    if (!row || row.active === 0) return;
    row.active -= 1;
    if (row.active === 0) row.endedTick = nowTick; // the reset clock starts when the last aura ends
  }

  // Duration in ticks for the next application of this group to this target.
  duration(baseTicks: number, group: DrGroup, nowTick: number, bothPlayers: boolean): number {
    const ticks = bothPlayers ? Math.min(baseTicks, DR_DATA.pvpCapTicks) : baseTicks;
    const kind = DR_DATA.kind[group];
    const diminishes = kind === 'all' || (kind === 'pvp' && bothPlayers);
    return diminishes ? Math.floor(ticks * DR_DATA.ladder[this.level(group, nowTick)]) : ticks;
  }
}
```

Note: the sketch's `startAura` only works after `land` has created the row. A caller must call `land` on the first hit, which matches the donor order (read, apply, then increment).

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: rule 1 (one engine, the fight is one ledger), and the many-vs-one rule (MAX_ATTACKERS = 3, shared ladder per target)
Best transferable idea: a per-target diminishing ladder per control group, read before each hit and advanced after it, so every attacker shares one ladder.
