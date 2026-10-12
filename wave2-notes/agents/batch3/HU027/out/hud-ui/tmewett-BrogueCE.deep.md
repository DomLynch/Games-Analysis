# tmewett-BrogueCE (hud-ui, cell 3)

Donor: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/IO.c` (readout, 4480-4612) with `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Time.c` (snapshot and alerts, 2215-2239, 893-932) | Licence: GNU AGPL v3, "either version 3 of the License, or (at your option) any later version" (IO.c header; LICENSE.txt is the AGPL v3 text) | C | symbol `printMonsterInfo` (readout) and `playerTurnEnded` (snapshot point)

Checked: Symbol `printMonsterInfo` is defined at 4489; the health block is 4591-4612 and `creatureHealthChangePercent` is 4480-4486 (both read in full). Symbol `playerTurnEnded` is defined at 2229 and closes at 2635 (read 2208-2300, 2226-2250, 2576-2630). Read also: IO.c 4409-4460 (`printProgressBar`), 4561-4640, 884-932 of Time.c (`flashCreatureAlert` body 884-891, `handleHealthAlerts` 893-932), Monsters.c 1826-1840, Rogue.h 2294 (comment). Callers: `creatureHealthChangePercent` has one caller (4601, read); `printMonsterInfo` has one caller in the sidebar (IO.c 3870, read as a line; the sidebar's ordering around it, 3695-3913, was not read). `handleHealthAlerts` has three callers (2244, 2585, 2625), all read. Not read: the player's action code that runs before `playerTurnEnded`, the body of `monstersTurn`, and the name of the monster routine that holds Monsters.c 1826-1840. Camera: not applicable. Confidence: high on the snapshot points and the readout arithmetic (read); medium on what the readout means to a player: the call order says it covers the monsters' phase, and I could not play it to confirm.

Best transferable idea: Show each combatant's health change since a snapshot taken at a chosen point in the exchange, as a signed percent on its bar, and make regeneration move the snapshot too so it never reads as a change.
Decision (proposed): adapt - take the snapshot-delta readout and the once-per-crossing threshold alert for the enemy target frame; the snapshot point is set by us (the donor's point is wrong for a player who wants to see their own hit), and the regen rule is fixed in the sketch.
Acceptance: On the target frame at 375 wide, after an exchange in which our hit lands and the enemy hits back, the enemy's bar label reads "Health (-30%)" for the whole exchange including our hit; a passive regen tick does not change the label; a server test asserts the snapshot is taken before our action is resolved and that regen moves the snapshot by the same amount.

## 1. Mechanism

- The game is turn-based. The schedule point is `playerTurnEnded` (2229), called when the player's action has been resolved (the function's own comment says "called every time the player's turn comes to an end", 2225; the action code was not read).
- Order inside `playerTurnEnded` (as the code runs): XP handling and dungeon feature message reset (2237-2238); the snapshot `recordCurrentCreatureHealths` (2239), which copies every creature's `currentHP` into `previousHealthPoints`, the player first (2215-2223); a fall branch returns early after alerts (2241-2246); otherwise the schedule loop runs, and monsters act through `monstersTurn` (2464); at the end, dead monsters are removed (2622) and `handleHealthAlerts` runs (2625).
- Readout, drawn in the sidebar's monster block (`printMonsterInfo`, 4489): if the creature has more than one max HP and is not invulnerable (4592-4593), the health bar is drawn with a label. If `currentHP <= 0` the label is "Dead" (4602-4603). Otherwise the percent is `creatureHealthChangePercent` (4601): 0 if the snapshot is 0 or less (4481-4482); else `100 * (currentHP - min(snapshot, maxHP)) / maxHP`, with C integer division (4485). The min clamps out overheal. A non-zero percent puts "Health" plus "(+x%)" or "(-x%)" in the label (4605-4607, sign character at 4606); zero gives plain "Health" (4608-4609).
- The bar itself is `printProgressBar(0, y, label, currentHP, maxHP)` (4611): the value is clamped to the max (4442), the bar is 20 cells (4449), each cell is full up to the fill point, and the fill cell is darkened by the remainder (4450-4452).
- Regeneration: the player's regen moves the snapshot up with HP only when the snapshot is below the new HP (Time.c 2283-2289 for regen, 2292-2297 for `regenPerTurn`); monster regen moves the snapshot unconditionally (Monsters.c 1831-1837). The comment at 2288 says the intent: "Regeneration doesn't display on the status bar."
- Threshold alerts (`handleHealthAlerts`, Time.c 893-915): percent is HP times 100 over max for the snapshot and for now (904-905). The alert runs only when the percent fell (907). It walks the thresholds 5, 10, 25, 40 in ascending order (895) and fires for the first one with current below it and the snapshot at or above it (909), flashing "<t% health" on the player (910-911). So a drop from 60% to 3% reports "<5%", the deepest crossing, once.
- Alert display time: 1000 ms, or 100 ms in playback (flash helper call, Time.c 888).

## 2. Key functions

- `playerTurnEnded`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Time.c` 2229-2635. Snapshot at 2239, monsters at 2464, alerts at 2625.
- `recordCurrentCreatureHealths`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Time.c` 2215-2223. Copies every creature's HP to the snapshot.
- `creatureHealthChangePercent`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/IO.c` 4480-4486. The delta arithmetic.
- `printMonsterInfo` health block: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/IO.c` 4591-4612. Label and bar.
- `handleHealthAlerts`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Time.c` 893-915 (health part). The threshold alert.
- `printProgressBar`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/IO.c` 4409-4458. The 20-cell bar.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Signed percent change since a snapshot, overheal clamped to max | Snapshot clamp at max HP (theirs, IO.c 4485); integer division (theirs, IO.c 4485) |
| Snapshot taken at one point in the schedule, all creatures at once | The point is `playerTurnEnded` after the player's action (theirs, Time.c 2239) |
| Regen moves the snapshot so it does not show | Player: only when below new HP (theirs, Time.c 2287, 2294); monster: always (theirs, Monsters.c 1837) |
| Alert once per downward crossing, deepest threshold | Thresholds 5, 10, 25, 40 percent (theirs, Time.c 895) |
| Bar of 20 cells with a remainder cell | 20 cells (theirs, IO.c 4449) |
| Alert display time | 1000 ms, 100 ms in playback (theirs, Time.c 888) |

## 4. TypeScript sketch

simplified: the sketch keeps the snapshot, the signed change with C-style truncation, the "Dead" and plain label, the regen rule and the deepest-threshold alert. It omits the bar drawing, the sidebar, the hallucination names, the mutation and status rows, the poison alert, the flash timing and the cosmetic RNG handling. It reorders one thing on purpose: the snapshot is a call the caller makes at the point the window should start (the donor makes it at the end of the player's action). It fixes one defect: regeneration always moves the snapshot with HP (the donor's player branch does not when damage was taken in the same window, Time.c 2287 and 2294).

```ts
// Licence: GNU AGPL-3.0-or-later (donor IO.c and Time.c headers). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Vitals {
  hp: number;
  maxHp: number;
  snapshotHp: number;   // HP recorded at the snapshot point (see takeSnapshot)
}

// Snapshot point: the donor takes it at the end of the player's action, before the monsters act.
// The caller decides the window. Call this at the moment the window should start.
function takeSnapshot(v: Vitals): void {
  v.snapshotHp = v.hp;
}

// Regeneration must not appear in the readout: move the snapshot with the HP, always.
// Fix: the donor's player branch only bumps the snapshot when it is below the new HP
// (Time.c 2287-2289, 2294-2296), so regen after damage in the same window shows as recovery.
function applyRegen(v: Vitals, amount: number): void {
  v.hp = Math.min(v.maxHp, v.hp + amount);
  v.snapshotHp = Math.min(v.maxHp, v.snapshotHp + amount);
}

// Percent change in the window, as the donor does it. Integer division truncates, as in the donor.
// Overheal is ignored by clamping the snapshot to max HP.
function changePercent(v: Vitals): number {
  if (v.snapshotHp <= 0) return 0;
  const base = Math.min(v.snapshotHp, v.maxHp);
  return Math.trunc((100 * (v.hp - base)) / v.maxHp);
}

// Label text, e.g. "Health (-30%)"; plain "Health" when unchanged; "Dead" at 0 HP.
function healthLabel(v: Vitals): string {
  if (v.hp <= 0) return "Dead";
  const p = changePercent(v);
  if (p === 0) return "Health";
  return `Health (${p > 0 ? "+" : ""}${p}%)`;
}

// Alert once per window, for the deepest threshold crossed downwards (thresholds ascending).
const THRESHOLDS = [5, 10, 25, 40];   // percent of max HP (data field)
function deepestCrossed(v: Vitals): number | null {
  const cur = Math.trunc((v.hp * 100) / v.maxHp);
  const prev = Math.trunc((v.snapshotHp * 100) / v.maxHp);
  if (!(cur < prev)) return null;
  for (const t of THRESHOLDS) {
    if (cur < t && prev >= t) return t;
  }
  return null;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/hud.ts` (client view-model, name only; the Frankendom repo was not opened): the target frame's delta label and the alert, as pure functions of the snapshot and current HP. Parity-checklist row 14 (HUD).
- The window itself is set in the engine's duel step, so the snapshot call sits in the step that resolves an exchange (parity row 1, duel step/sim). That is a sub-line of row 1; the note's row is 14.
- today: none checked (not read).
- Reuse tag: rewrite-from-idea (GNU AGPL-3.0-or-later; clean-room only)
- Brief rule served: HUD is client-only; the snapshot and the HP are engine state, the label is computed from them; the kill is server-verified and this readout never decides one. Rule 1 n/a.

## 6. Gaps and risks

- AGPL-3.0-or-later: clean-room only. The sketch is written from the mechanism.
- Defect 1 (snapshot point, a design gotcha, confirmed by reading the call order): the snapshot is taken at 2239, after the player's action and before the monsters act. A hit the player lands is therefore already in the snapshot, so the enemy's readout does not show it. The readout covers the monsters' phase only. Frankendom must choose the window on purpose: for the target frame, take the snapshot before our action is resolved. The header comment on the field says the opposite ("at the start of the turn", Rogue.h 2294), so the comment and the code disagree; trust the code. (The action code that runs first was not read, so the exact interleaving is inferred from the call order.)
- Defect 2 (player regen, confirmed by reading): the player's regen branch moves the snapshot only when it is below the new HP (Time.c 2287 and 2294). After damage taken in the same window, the snapshot stays high, so regen shows as a partial recovery in the readout. The monster branch does not have this gate (Monsters.c 1837). The fix is in the sketch: always move the snapshot by the same amount.
- Turn-based, not real-time: the snapshot and alerts run on the player's turn. Frankendom is real-time with a server tick, so "exchange" must be a defined window (for example, from our commit to the next resolved hit), not a turn. This does not transfer as is.
- Alerts fire once per window per threshold (deepest only). Two thresholds in one window report one alert. Keep that rule so a heavy hit does not produce a spam of alerts.
- Accessibility: the label is text (sign and number), so the meaning does not depend on colour alone. The bar's colour is not used for the change; keep it that way. Contrast was not checked.
- The donor's readout is in a text sidebar, not a target frame. The layout and the 375-wide fit are not checked here.
- Not read and not verified: the player action code, `monstersTurn`, and the enclosing monster routine name for Monsters.c 1826-1840.

## Reuse tag

rewrite-from-idea (GNU AGPL-3.0-or-later; clean-room only)

Brief rule served: HUD client-only; engine snapshot; the server kill is never decided by the readout (rule 14 HUD only).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: CLEAN. No errors found.
- Missed (minor): poison alert thresholds {100,90,50} (Time.c 917-933) share the same function; the note omits them on purpose. Nothing important missed.
