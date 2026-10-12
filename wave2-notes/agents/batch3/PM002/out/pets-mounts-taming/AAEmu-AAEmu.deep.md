# AAEmu-AAEmu (pets-mounts-taming, cell 3)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Tasks/Mate/MateXpUpdateTask.cs` | Licence: unclear (README "Licensing information" names LGPL-3.0 or later; the repo root has `LICENSE.GPL` (GNU GPL v3) and `LICENSE.MIT` (MIT, copyright 2019 Rain0Ash)); treated as copyleft, clean-room | C# | symbol `MateXpUpdateTask.Execute` with `Mate.StartUpdateXp`

Checked: Read in full: `Models/Tasks/Mate/MateXpUpdateTask.cs` (1-21); `Models/Game/Char/CharacterMates.cs` (1-236: SpawnMount, DespawnMate, Load, Save, MateDb). Read in part: `Models/Game/Units/Mate.cs` 35-41, 536-571 (AddExp), 599-620 (fall death), 659-677 (StartUpdateXp, StopUpdateXp); `Core/Packets/C2G/CSMoveUnitPacket.cs` 119-140 (the mate move branch); `Core/Managers/MateManager.cs` 175-200 (UnMountMate, line 191); `Core/Managers/TaskManager2.cs` 84-110 (Schedule; 50-61 seen by grep only); `Core/Managers/ExperienceManager.cs` 36-50, 61-96, 194 (the body of `GetLevelFromExp` from line 98 was not read, so the level-cap overflow value is not read). Candidate files opened: `Mate.cs`, `CharacterMates.cs`, `MateXpUpdateTask.cs`, `CSMoveUnitPacket.cs`, `TaskManager2.cs`, `ExperienceManager.cs`, `MateManager.cs`. Not read: the rest of `Mate.cs` (level stat formulas), `Models/Game/Items/SummonMate.cs` (50 lines), `Models/Game/Mate/*.cs` (mount skill lists), the `ExpRate` config value, the `TotalMateExp` table values. Taming: none found (grep for taming, tamed, tame in AAEmu.Game). Stabling: no stabling logic found; `NpcTemplate.cs` 46 has a `Stabler` flag whose use was not located. Loyalty: only account BM loyalty points (unrelated). `AGENTS.md` at the donor root is donor data and was not followed. Confidence: high on the timer, the one-shot scheduling, the constants and the defects; medium on the level-cap overflow (the `GetLevelFromExp` body was not read). camera_scope: n/a.

Best transferable idea: a companion earns a flat XP drip while it is moving: the first moving sample starts one 60 s award timer, a stop cancels it, and each completed minute pays a fixed amount scaled by the server rate, so travel levels a companion and idling does not.
Decision (proposed): adapt - travel-based XP for a hero's companion in open zones is a clean progression hook; the donor's client-velocity trigger and its missing owner check are defects, so the server must decide motion from its own positions (defect 1 below); the message and the award must report the same granted amount (defect 2).
Acceptance: A server test with 180 s of server-measured movement grants three awards of 300 x rate; a test that stops movement at 90 s grants exactly one award; the message shows the granted amount, not 300.

## 1. Mechanism

- Trigger: the client's unit-move packet for a mate. `CSMoveUnitPacket.cs` 124-133: if the moved unit is a `Mate`, a non-zero velocity (`dmt.VelX != 0 || dmt.VelY != 0`, 130) calls `mate.StartUpdateXp(character)` (131); zero velocity calls `mate.StopUpdateXp()` (133).
- Start (`Mate.cs` 659-670): if a task is already pending, return (661). If the mate is at max level, return (665). Otherwise create `MateXpUpdateTask` and schedule it with `TaskManager.Instance.Schedule(task, 60 s)` (667-668).
- Schedule (`TaskManager2.cs` 84-110): with no repeat interval, `RepeatCount = 1` (99-106), so the task runs once. It is then released by the queue.
- Award (`MateXpUpdateTask.cs` 12-20): cancel and clear the stored task (14-15), call `mate.AddExp(300)` (16), then send "pet received 300 experience points" (18) to `owner`. That `owner` is the character who sent the move packet (`CSMoveUnitPacket.cs` 131 passes `character`), not necessarily the mate's owner. The task does not reschedule itself.
- Stop (`Mate.cs` 672-677): cancel and clear the pending task. Also called on unmount (`MateManager.cs` 191) and by a zero-velocity packet (`CSMoveUnitPacket.cs` 133).
- `AddExp` (`Mate.cs` 536-571): ignore non-positive or max-level calls (538-541); scale the amount by the config rate and round (543); add to the total (544); look up the level with `mate` set to true (545); `GetLevelFromExp` then uses the mate table `_mateExpByLevel` (`ExperienceManager.cs` 95), which is built from `TotalMateExp` (189); if the new level is at the cap, remove the overflow (549-552); store and mirror to the item and the DB record (554-559); send the scaled change to the owner (562); on a level change, broadcast and raise the owner's mate-level-up event (564-568).
- Mount summon (`CharacterMates.cs` 57-67): if any mate is already active for the owner, despawn all of them and return (61-67). The second use summons. A new mate gets zero mileage (46) and the table XP for its level (47); a spawn with a saved HP of zero gets 100 (90).
- Despawn (`CharacterMates.cs` 131-150): write XP (142), mileage (143) and the rest back to the stored record before the despawn. `Save` writes the records with `REPLACE INTO` (183-220).

## 2. Key functions

- `MateXpUpdateTask.Execute`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Tasks/Mate/MateXpUpdateTask.cs` 12-20. The one-shot 300 XP award.
- `Mate.StartUpdateXp` and `Mate.StopUpdateXp`: `Models/Game/Units/Mate.cs` 659-677. The 60 s start and the cancel.
- `Mate.AddExp`: `Mate.cs` 536-571. Rate scaling, level lookup, cap, owner message.
- `CSMoveUnitPacket` mate branch: `Core/Packets/C2G/CSMoveUnitPacket.cs` 124-133. The trigger.
- `TaskManager.Schedule`: `Core/Managers/TaskManager2.cs` 84-110. One-shot unless an interval is given.
- `CharacterMates.SpawnMount` and `DespawnMate`: `Models/Game/Char/CharacterMates.cs` 57-150.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Time-based drip while an action continues: start once, cancel on stop, one-shot award | 60 s (`Mate.cs` 668) |
| Flat award per drip | 300 XP (`MateXpUpdateTask.cs` 10) |
| Rate scaling of every XP change | `ExpRate` from config, rounded (`Mate.cs` 543); value not read |
| Level cap with overflow dropped | `MaxMateLevel` = min(template count, cap) (`ExperienceManager.cs` 194) |
| Table of total XP per level, separate for mates | `TotalMateExp` (`ExperienceManager.cs` 46); values not read |
| Summon toggles: second use dismisses | `CharacterMates.cs` 61-67 |
| Revive-on-summon floor | 100 HP if saved HP <= 0 (`CharacterMates.cs` 90) |

Formula table (file:line):

| Quantity | Formula as coded | Value | file:line |
|---|---|---|---|
| Award per minute of continuous movement | one award per start; restarts on the next moving packet | 300 x rate per 60 s | MateXpUpdateTask.cs:10; Mate.cs:661-668 |
| XP granted | `round(ExpRate x 300)` | rate-dependent | Mate.cs:543 |
| Continuous motion over T seconds | awards = floor(T / 60) when packets keep arriving | e.g. 180 s = 3 awards | derived from Mate.cs:668 and MateXpUpdateTask.cs:14-16 |

Derived rows: because the task does not reschedule, the next moving packet after an award starts a new 60 s timer, so continuous movement earns one award per completed minute. A stop at 90 s after one award cancels the pending second minute and leaves one award.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (start once on a moving sample, stop cancels, one-shot award when due, rate scaling, cap). It takes motion from the server (a parameter) instead of the client velocity, and it returns the granted amount so the message can report it (defect 2). It omits the owner and rider lookup, the packet types, the task queue, the level-table lookup (`GetLevelFromExp`, not read), the item and DB write-back, the level-up broadcast, and the max-level early return at `Mate.cs` 540 and 665 (the sketch's cap in `applyXp` does the same job). The cap clamps the total at the top threshold; the donor removes an `overflow` value that was not read, so the numbers at the cap may differ.

```ts
// Licence: unclear per donor (GPL-3.0 / LGPL-3.0 / MIT files). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface MoveXpTimer {
  dueAtS: number | null; // server time at which the one-shot award fires; null when no award is pending
  totalXp: number;       // companion XP total
  maxTotalXp: number;    // XP threshold of the highest companion level
}

const DRIP_S = 60;   // donor TimeSpan.FromSeconds(60) (Mate.cs 668)
const DRIP_XP = 300; // donor MateXpUpdateTask.Exp (MateXpUpdateTask.cs 10)

// Called on every move sample. serverMoving must come from server positions, not from client-reported velocity.
function onMoveSample(t: MoveXpTimer, nowS: number, serverMoving: boolean): void {
  if (!serverMoving) {
    t.dueAtS = null;                 // stop cancels the pending award (donor StopUpdateXp)
    return;
  }
  if (t.dueAtS === null && t.totalXp < t.maxTotalXp) {
    t.dueAtS = nowS + DRIP_S;        // start once; a second move sample while pending changes nothing (donor early return)
  }
}

// Called on the tick. Returns the XP to grant now, scaled by the server rate.
function dripDue(t: MoveXpTimer, nowS: number, expRate: number): number {
  if (t.dueAtS === null || nowS < t.dueAtS) return 0;
  t.dueAtS = null;                   // one-shot: the next moving sample starts a new minute
  return scaledGrant(DRIP_XP, expRate);
}

// Donor rounds the rate-scaled amount (Mate.cs 543). The message must report this value.
function scaledGrant(xp: number, expRate: number): number {
  return Math.round(expRate * xp);
}

// Level cap: the total never passes the highest level threshold (donor 549-552 removes the overflow).
function applyXp(t: MoveXpTimer, grant: number): number {
  t.totalXp = Math.min(t.totalXp + grant, t.maxTotalXp);
  return grant;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/aaemu-mount-xp-drip.ts` with `export {}` appended) exits 0.

## 5. Lands in

- TARGET `origins/server/companions.ts` (new module, proposed): the moving-companion XP drip, run on the server world tick and written to the one ledger as an XP award. Parity-checklist row 21 (catalogue fields: drip interval, drip amount, level thresholds). The award itself is the row 18 XP award; the tick sits under the server-tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3).
- Reuse tag: rewrite-from-idea (licence unclear: clean-room only)
- Brief rule served: 1 (one engine: the motion test and the award are server state; the client only shows the message). Zones as data for the drip amount and interval.

## 6. Gaps and risks

- Licence unclear: clean-room, shape only. The sketch is written from the mechanism.
- Defect 1, client-decided motion: the award is decided by `dmt.VelX`/`dmt.VelY` from the client packet (`CSMoveUnitPacket.cs` 130), and the owner check is an open TODO (129). Any character sending a move for a mate can start the drip on it; the XP goes to that mate (`AddExp`), and the "pet received" message goes to the sender. Fix: decide motion from server positions and check the caller is the owner or a rider (the sketch takes `serverMoving`).
- Defect 2, the message reports the constant: `MateXpUpdateTask.cs` 18 prints `Exp` (300), but `AddExp` grants `round(ExpRate x 300)` (`Mate.cs` 543). With any rate other than 1 the message is wrong. Fix: report the granted amount (the sketch returns it).
- Defect 3, mileage is never increased: `Mileage` is copied (`CharacterMates.cs` 46, 97, 143) and stored, but no code in the donor adds to it (grep for Mileage in AAEmu.Game). Fix: if distance is a design input, add it on the same server motion measure as the drip; do not leave a dead field.
- Mount-specific rule kept as a note: when a fall kills a mount, all riders are killed too (`Mate.cs` 604-616). Frankendom should decide this as an explicit rule (a data flag), not inherit it by accident.
- Frankendom rulings: the drip is an XP award, so it must go through the one ledger and be server-verified. The duel does not use companions; the Pit is a client (row 22). MAX_ATTACKERS = 3 does not apply.
- Not verified: the level-cap overflow (`GetLevelFromExp` body from line 98), the `ExpRate` value, the `TotalMateExp` table, the mount speed and stat formulas (`Mate.cs` 40-500), `SummonMate.cs`, and what the `Stabler` NPC flag does.
