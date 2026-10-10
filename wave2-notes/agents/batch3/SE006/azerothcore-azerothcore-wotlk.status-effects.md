# azerothcore-azerothcore-wotlk (status-effects, cell SE006)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk` | Licence: GPL-2.0 (LICENSE, "Version 2, June 1991") | Game content: README says it is not an official Blizzard product; ownership of the game-derived data is not stated, so class C | Decision: adapt (idea), clean-room

Checked: read in full: `src/server/game/Entities/Unit/Unit.h` 265-300 (levels and the DR struct), `Unit.cpp` 11353-11490 (GetDiminishing, IncrDiminishing, ApplyDiminishingToDuration, ApplyDiminishingAura), 13917-14034 (SetControlled for stun, root, confuse and flee, apply and remove, with re-resolve), `Spells/Auras/SpellAuras.cpp` 2027-2110 (Aura::CanStackWith), `Spells/Auras/SpellAuraEffects.cpp` 3628-3672 (fear, stun and root handlers), `Spells/Spell.cpp` 3195-3216 (DR read and increment) and 3260-3273 (limit call), `Spells/SpellMgr.cpp` 294-400 (group type, max level, limit table, limit-only groups), `Spells/SpellMgr.cpp` 811-870 (group stack rule), `Spells/SpellMgr.h` 360-370, `shared/SharedDefines.h` 3489-3511 (group enum), `game/Entities/Creature/CreatureData.h` 60-70, `Unit.cpp` 4700-4720 (aura add). Partly read: `SpellMgr.cpp` 107-291 (group assignment, read in part and by grep). Data: `data/sql/base/db_world/spell_group.sql` and `spell_group_stack_rules.sql` (row counts). Stagger and knockdown searched across the tree. Confidence: high on the ladder, the limit, the control priority and the stacking order; medium on group assignment (read in part); the DoT handler was not read.

Half read: both (server code and the spell-group data rows). Client half: not in the box (the `*_dbc.sql` files are schema only, see the catalogue DC007). The paired client donor in this batch is WoWdot, not read here.

## 1. What the player sees and feels

The donor has no client, so this is what the server state would drive on a 375-wide screen. A hard control on one target lands at full length, the second half, the third a quarter, and the next is an immune miss with no effect. Taunts on a creature that obeys the taunt-ladder fall off faster: the second holds about 65 percent of base, the third about 42, the fourth about 27, then immune. Controls never stack as icons. The server keeps one primary state, chosen by priority: stun over confuse over fear. A root locks the feet only when no stun is up. The hand-off is the striking part: if a fear is hidden under a stun, the fear comes back the moment the stun ends, so the target stops frozen and starts running. A player reads four states: frozen, running, rooted, immune.

## 2. Why it is striking (375-wide criteria)

- Readable beat: one primary state at a time, so a player sees a single state instead of a stack of icons.
- One signature behaviour: the hand-off. A control that is hidden under a higher one is not lost; it is re-resolved when the higher one ends.
- One signature effect: the immune miss, and a stun-to-fear hand-off that a player can feel as a change of motion. (Our proposal; the donor sends a miss result.)
- Could be made ours at 20-30 percent resemblance: yes. Keep the priority rule and the hand-off; change the ladder numbers, the taunt curve, the names and the art.

## 3. The rule behind it

Per hit (order as the code runs):
1. Read the target's level for the group: `GetDiminishing` (`Spell.cpp` 3201; the body is `Unit.cpp` 11353-11376). A world-boss caster skips this (`Spell.cpp` 3198-3200).
2. Apply the limit: a per-spell-family limit (6, 12, 40 or 120 s in the table) or the default 10 s, but only when the target is a player (or a creature with the all-diminish flag) and the source is a player (`Spell.cpp` 3266; `Unit.cpp` 11403-11413; `SpellMgr.cpp` 324-376).
3. Scale by the ladder: player type 1, 0.5, 0.25, then immune at 0 (`Unit.cpp` 11452-11461). Taunt on a creature with the taunt-ladder flag: 1, 0.65, 0.4225, 0.274625, then 0 (`Unit.cpp` 11424-11436).
4. On the hit itself, the level moves up, but only when the caster is player-owned or player-charmed (`Spell.cpp` 3211-3213). A mob's hit does not move the ladder.
5. Reset: with no active aura and more than 15 s since the stamp, the level returns to full (`Unit.cpp` 11367). The stamp is set when the last aura of the group ends (`Unit.cpp` 11487).

Group types (`SpellMgr.cpp` 294-312): ALL for taunt, controlled stun, stun, opening stun, cyclone and charge; NONE for the limit-only and none groups; PLAYER for the rest, which scale only when the target (or its owner) is a player or a creature has the all-diminish flag (`Unit.cpp` 11444-11447). There are 20 named groups plus NONE (`SharedDefines.h` 3489-3511). Max level: immune at 3 for all groups, 4 for taunt (`SpellMgr.cpp` 313-321; `Unit.h` 272-277).

Control model (one primary state, from counts):
- Apply: the state bit is set first (`Unit.cpp` 13924). Root sets the rooted behaviour only when no stun is up (13930-13932). Confuse sets confusion only when no stun is up (13934-13935). Fear sets the fleeing behaviour only when neither stun nor confuse is up (13945).
- Remove: a state clears only when no aura of its kind is left, then the next state is re-resolved from what remains: stun, then confuse, then fear (`Unit.cpp` 14006; the removal branches start at 13972 and 13977-13988).
- Fear enters the same model as the flee state, with the caster and a fear flag (`SpellAuraEffects.cpp` 3636). Stun on apply sets the stunned state and re-evaluates threat suppression (`SpellAuraEffects.cpp` 3646-3648; the helper body was not read).

Stacking (separate from diminishing):
- `Aura::CanStackWith` (`SpellAuras.cpp` 2027-2110): same-caster passive and rank rules; trigger links; explicit exclusion by spell; then the spell-group rule switch (2070): EXCLUSIVE and EXCLUSIVE_HIGHEST refuse; EXCLUSIVE_FROM_SAME_CASTER refuses only for the same caster; DEFAULT and SAME_EFFECT fall through; then the family check; then per-caster rules, and periodic effects from different casters always stack.
- Stack rule for a spell is the first non-default rule among its groups, taken in group-id order (`SpellMgr.cpp` 811-856).
- Data: `spell_group_stack_rules.sql` has 69 rows: rule 0 (2 groups), 1 EXCLUSIVE (19), 2 FROM_SAME_CASTER (3), 3 SAME_EFFECT (20), 4 HIGHEST (25). `spell_group.sql` has 532 membership rows across 113 groups. A negative entry in a group's member list names another group; spells that sit in both are not grouped together (`SpellMgr.cpp` 811-835).

Designer data fields (all donor values null because the donor is GPL-2.0):

| name | unit | donor_value_or_null |
|---|---|---|
| dr.player_ladder | multiplier per level, levels 0-3 (full, half, quarter, immune) | null |
| dr.taunt_ladder | multiplier per level, levels 0-4 | null |
| dr.limit_default | seconds, PvP cap | null |
| dr.limit_family | seconds, per-family cap (table lists 6, 12, 40, 120) | null |
| dr.reset_window | seconds with no active aura | null |
| dr.count_source | player-only (donor) or any source (our proposal) | null |
| ctrl.priority | stun > confuse > fear; root shown separately | null |
| stack.rule | default, exclusive, exclusive_from_same_caster, exclusive_same_effect, exclusive_highest | null |

## 4. For Frankendom

- Target file: `src/fight/status.ts` (proposed new module, owned by the duel step). Parity row 1 (duel step / sim).
- Keep: the control priority with re-resolve on removal (so a hidden control is not lost); one primary state shown; the 15 s reset counted from the last aura end; the taunt curve as a data field for any future hate-list taunt.
- Change, and why:
  - Who moves the ladder. The donor counts only player-sourced hits. In our many-vs-one duel the attackers are mobs, so the donor rule would let three mobs chain stuns without any ladder. We set `countMobCasts` to true in the sketch. (The donor also never counts a world-boss caster; keep that only if we add a boss tier with its own rule.)
  - Clock. The donor uses wall time (`Unit.cpp` 11367, 11487). We use fixed-step ticks so replays (row 19) match (defect D1).
  - The per-family limit table is PvP tuning for spells we do not have. Keep the idea (a cap per control as data) and drop the family list.
- Our target still needs one stun ladder shared across attackers. Set `dr.count_source` to any source, and keep the 10 s PvP cap as the only cap.

## 5. Look test (5 minutes, Dom on his phone)

Build one dummy at 375 wide with a primary-state chip under its health bar. Test one: a stun, then a fear started during the stun; when the stun ends, the fear should start at once (the donor's hand-off). Test two: three mob attackers chain stuns on one hero, once with the ladder counting mob hits and once without (the donor). Dom judges: does the hand-off read as "the fear came back" rather than "something glitched", and does the third mob stun feel shorter rather than broken. Style flag only, no release rows.

## 6. Licence and IP

- Code: GPL-2.0. Clean-room: this note and the sketch are written from the described mechanism, and no donor line is translated.
- Game-derived data (world SQL, spell names, creature and item rows): class C. The README says the project is not an official Blizzard product, and the data's owner is not stated. No spell names, IDs or stat blocks appear in our notes.
- Traits kept: the priority with hand-off, one primary state, the ladder shape (in our numbers), the 15 s reset from the last aura end, the immune miss.
- Traits changed: the ladder numbers and taunt curve (ours are proposals), who counts toward the ladder (any source), the clock (ticks), the names, the chip art, and the family limit table (dropped).

## 7. Gaps

- Not read: the periodic-damage (DoT) handler; `Aura::CanStackWith` after line 2110; the aura add path inside `Unit::AddAura` (only the stack-removal part was read); fear movement in the AI; the spell table (`spell_dbc.sql`, 4,491 rows per catalogue, not read here); the rest of group assignment in `SpellMgr.cpp` 107-291 (read in part); the threat-suppression helper body.
- Stagger: not a status in the read code. The only hit is a boss spell name and a timer in one encounter script (`boss_northrend_beasts.cpp` 34 and 323, cast at 364-365). Its effect lives in spell data, not read. Mark: "not in the half I read".
- Knockdown: only the animation ids appear in the read files (`SharedDefines.h` 2199 for the knockdown animation, 2428 for the flying one). The status itself is in spell data, not read.
- Unverified: whether every aura type reaches `ApplyDiminishingAura` in both directions. The unit-aura pair is symmetric (`SpellAuras.cpp` 2884-2899); the other aura classes were not read (see D2).
- Client half: not in the box.
- Counts: 20 named DR groups plus NONE (enum); 69 stack-rule rows; 532 spell-group memberships across 113 groups.

## Defects (keep the idea, fix the defect)

- D1. Wall-clock timer. The DR reset reads and stamps `GameTime::GetGameTimeMS()` (`Unit.cpp` 11367 and 11487). Fix: fixed-step tick counter (the sketch uses `resetTicks` in ticks).
- D2 (question, not a confirmed defect). The active count only returns to 0 through `ApplyDiminishingAura(false)`, which the unit-aura pair calls symmetrically (`SpellAuras.cpp` 2884-2899). Other aura classes were not read. Check: every removal path for a DR-grouped aura must reach that call; a missed path would hold the ladder forever on that target.
- D3. The control state is split across two places: the state bit is set on apply before the branch (`Unit.cpp` 13924), but the behaviour (rooted, confused, fleeing) is set only if no higher control is up (13930-13945). The stun-removal branch then re-applies the behaviour from the aura list (14006). It works as read, but a reader has to follow both paths to know what the player sees. Fix: compute the view from counts on every change (the sketch does this).

## Sketch (typechecked on the VPS, strict, es2020)

simplified: the sketch keeps the priority with hand-off (view computed from active counts, so a hidden control returns when a higher one ends), the two ladders (player and taunt), the 10 s PvP cap, the 15 s reset in ticks, and the source rule. It omits the stack-rule table, the threat-suppression call, the immune miss path, the per-family limit table and the world-boss exception. Constants are our proposals; no donor value is copied.

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism; no donor lines translated.
export {};

type Control = 'stun' | 'confuse' | 'fear' | 'root';

// Priority for the one control the client shows. Root is separate: it only locks the feet when no stun is up.
const PRIORITY: readonly Control[] = ['stun', 'confuse', 'fear'];

// Designer data fields (our proposals; donor values are not copied, donor is GPL-2.0 so donor_value is null).
export const CTRL_DATA = {
  playerLadder: [1, 0.5, 0.25, 0] as const,        // level 3 = immune
  tauntLadder: [1, 0.65, 0.4225, 0.274625, 0] as const, // geometric falloff, level 4 = immune
  limitTicks: 10 * 20,                              // PvP cap when both sides are players (20 ticks per second)
  resetTicks: 15 * 20,                              // quiet window after the last aura of the group ends
  countMobCasts: true,                              // our choice: mob CC advances the ladder (donor: player-sourced only)
};

export class ControlState {
  private readonly counts: Record<Control, number> = { stun: 0, confuse: 0, fear: 0, root: 0 };

  add(c: Control): void {
    this.counts[c] += 1;
  }

  // A removed aura re-resolves the view from what is still active, so a fear that was hidden under a stun returns when the stun ends.
  remove(c: Control): void {
    if (this.counts[c] > 0) this.counts[c] -= 1;
  }

  view(): { primary: Control | null; rooted: boolean } {
    const primary = PRIORITY.find((c) => this.counts[c] > 0) ?? null;
    return { primary, rooted: this.counts.root > 0 && this.counts.stun === 0 };
  }
}

// Whether a landed hit moves the ladder. The donor counts player-sourced hits only and never counts a world boss.
export function landsOnLadder(sourceIsPlayer: boolean, sourceIsWorldBoss: boolean): boolean {
  if (sourceIsWorldBoss) return false;
  return sourceIsPlayer || CTRL_DATA.countMobCasts;
}

// Duration in ticks after the ladder and the PvP cap. The table is passed in so taunt and control use different ladders.
export function scaledTicks(baseTicks: number, level: number, table: readonly number[], bothPlayers: boolean): number {
  const capped = bothPlayers ? Math.min(baseTicks, CTRL_DATA.limitTicks) : baseTicks;
  const idx = Math.min(level, table.length - 1);
  return Math.floor(capped * table[idx]);
}
```

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: rule 1 (one engine, one ledger, server-verified) and the many-vs-one rule (MAX_ATTACKERS = 3, one ladder per target)
Best transferable idea: a control priority with re-resolve on removal, so a control hidden under a stun comes back when the stun ends, and the client always shows one primary state.
