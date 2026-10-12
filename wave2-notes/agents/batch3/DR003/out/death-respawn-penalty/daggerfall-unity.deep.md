# daggerfall-unity (death-respawn-penalty, cell 3)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/` (PlayerDeath.cs, EnemyDeath.cs; Entities/DaggerfallEntity.cs; PlayerEnterExit.cs; `Assets/Scripts/Utility/GameObjectHelper.cs`) | Licence: MIT (`/mnt/frankendom-donors/daggerfall-unity/LICENSE`, "Copyright (c) 2009-2023 Daggerfall Workshop"; file headers say MIT too) | C# (Unity) | symbol `PlayerDeath.PlayerEntity_OnDeath` and `EnemyDeath.CompleteDeath`

Checked: Read in full: PlayerDeath.cs (1-200, the rest is the default switch), EnemyDeath.cs (1-171). Partly read: DaggerfallEntity.cs 305-342 (health and death trigger) and 875-880 (event raise); GameObjectHelper.CreateLootableCorpseMarker 786-836. Candidates opened: PlayerDeath.cs, EnemyDeath.cs, DaggerfallEntity.cs, GameObjectHelper.cs, PlayerEnterExit.cs (only the respawn signature, 428-466). grep hits not opened: PlayerEntity.cs, DaggerfallRestWindow.cs, DaggerfallLoot.cs, StateManager.cs, InputManager.cs. The donor has NO death penalty (no XP loss, no item loss, no durability on death) and NO death respawn: "respawn" here means streaming the player into a location (PlayerEnterExit.cs 428). Verdict is STRONG for the death beat and the corpse container, not for a penalty. Confidence: high on the sequence and numbers (read in full); medium on the corpse build path (partly read). Necromancy on corpses: not searched.

Best transferable idea: a death is a timed, input-locked beat (the camera drops at a fixed speed, the screen fades over 2 s, the game returns to the title after 3 s), and the enemy's body stays as a lootable container that keeps its own items.
Decision (proposed): adapt — take the staged beat as the presentation of a Pit or world death (it makes a loss readable without a penalty), keep the corpse as the loot container, but make the loot take-one (the donor takes all), and fix the camera overshoot and the mixed clock.
Acceptance: when a player dies, the camera drops and the screen fades to black over 2 s with input locked; after 3 s the player is returned to the title (or the Pit's end card); a server test asserts that a looter takes one unit per action and the corpse keeps the rest.

## 1. Mechanism

Player death, as the code runs (PlayerDeath.cs):

- (a) Health reaches zero. `DaggerfallEntity.SetHealth` clamps health between 0 and the entity's computed max health (line 333; max health is a per-entity value, not a constant) and raises the death event when `currentHealth <= 0` (334-335), unless the entity is in `quiesce` state (the raise is gated at 875-880). A shield effect absorbs incoming damage first (`DecreaseHealth` 315-325, 328).
- (b) Death starts once. `PlayerEntity_OnDeath` returns if a death is already running or there is no camera (150-151). Otherwise it sets `deathInProgress = true` and `timeOfDeath = Time.fixedTime` (154-155), pauses input (156), records the camera height and sets a target height `height - height * 1.25` (159-160), fades the HUD to black over `FadeDuration` (162), plays the death pain sound (164-173), and raises `OnPlayerDeath` (175-176).
- (c) Each frame while dying (`Update`, 77-96). Movement is cancelled (79). The camera falls while it is above the target: `currentCameraHeight -= fallSpeed * Time.deltaTime` (83), where `fallSpeed` = 2.5 (29). Position y is written (84-86).
- (d) Return. When `Time.fixedTime - timeOfDeath > TimeBeforeReset` (89; `TimeBeforeReset` = 3, line 33), the start method is set to `TitleMenuFromDeath` (92), `deathInProgress` clears (93), and the camera resets to the start height (94; `ResetCamera`, 106-114).
- (d2) What the return does (StartGameBehaviour.cs 325-350, `StartTitleMenuFromDeath`): resets the death camera, pops the UI to the HUD, clears the quest state (`QuestMachine.ClearState`), disables the parent interiors and resets the weapon manager, then posts the title-menu message. `StateManager` also switches to the Death state when `OnPlayerDeath` fires (StateManager.cs 141). So death ends the session and clears quests, though there is still no XP, item or durability penalty.
- (e) ClearDeathAnimation (119-128) can end the beat early: it clears the fade, unpauses input and resets the camera.
- (f) Enemy death (EnemyDeath.cs). The enemy entity's death event sets `performDeath` (161-167). `CompleteDeath` (62-141) waits while a quest-linked foe is not yet marked dead (67-73). It disables the enemy GameObject but does not destroy it, so the enemy's state is saved (76-77). It shows the death line (80-83), builds a lootable corpse marker with the enemy's corpse texture (85-101), unequips the enemy's head-to-feet items (107-116, so they are not marked as equipped), then moves every item the enemy owned into the corpse (123, take-all), plays a body-fall sound (126-129), and clears the player's alert only if this enemy was targeting the player (135-136). `OnEnemyDeath` is raised last (139-140).
- (g) Corpse container. `GameObjectHelper.CreateLootableCorpseMarker` (786) finds the ground under the enemy (817), creates a `CorpseMarker` loot container (820-828), marks it as a custom drop and not player owned (832-833), and parents it to the dungeon, interior or streaming target (800-810).

## 2. Key functions

- `PlayerDeath.PlayerEntity_OnDeath` and `Update`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/PlayerDeath.cs` 148-177 and 75-97.
- `PlayerDeath.ClearDeathAnimation`: same file 119-128.
- `EnemyDeath.CompleteDeath`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemyDeath.cs` 62-141.
- `DaggerfallEntity.SetHealth` and `DecreaseHealth`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Entities/DaggerfallEntity.cs` 313-338.
- `GameObjectHelper.CreateLootableCorpseMarker`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Utility/GameObjectHelper.cs` 786-836.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Camera falls at a fixed speed per second, frame-rate independent (83) | 2.5 units per second (29) |
| Camera target is a fraction of the controller height below the start (160) | target = h - 1.25 h = -0.25 h |
| Screen fades to black over a fixed time (162) | 2 s (32) |
| Return to title after a fixed time from death (89) | 3 s (33) |
| Input and movement locked while the beat runs (79, 156) | flag |
| Death fires once per beat (150) | guard |
| Health floor at zero, death at zero or below (333-335), skipped while the entity is quiescent (875-880) | 0 |
| Corpse keeps the enemy's items, all moved (123) | take-all |
| Alert clears only when the dying enemy targeted the player (135-136) | flag |

## 4. TypeScript sketch

simplified: keeps the death beat (the camera drop at a fixed speed, the fade, the input lock and the return after a fixed time) and the take-one corpse. Omits the death pain sound, the HUD fade object, the camera reset (`ResetCamera`), the quest-gated death, the corpse texture and marker placement, the item unequip, the alert clearing and the shield. Two deliberate changes, not donor behaviour: the camera is clamped to the target height (the donor subtracts without a clamp and can pass the target by one step, Update 81-86), and the take is one unit per action (the donor's TransferAll takes all, EnemyDeath 123). The donor also measures the return with `Time.fixedTime` and the fall with `Time.deltaTime` (PlayerDeath 83, 89); the sketch uses one clock.

```ts
// Licence: MIT (donor). Adapted sketch of the mechanism: a staged death beat and a corpse with take-one loot.
// Times are in seconds. The camera height is the local height used by the donor (units).

export interface DeathBeatCfg {
  fallSpeed: number;     // donor 2.5 units per second
  fadeS: number;         // donor FadeDuration 2 s
  returnAfterS: number;  // donor TimeBeforeReset 3 s
}

export interface DeathBeat {
  startedAt: number;
  startY: number;
  targetY: number;       // donor: height - height * 1.25, i.e. -0.25 of the controller height
  camY: number;
  locked: boolean;       // movement and input locked while the beat runs
  returned: boolean;     // true once the game should return to the title
}

export function beginDeath(now: number, camY: number, controllerHeight: number): DeathBeat {
  const targetY = controllerHeight - controllerHeight * 1.25;
  return { startedAt: now, startY: camY, targetY, camY, locked: true, returned: false };
}

// One frame. dt is the frame delta in seconds, so the fall is frame-rate independent.
// Fix: the camera is clamped to targetY. The donor subtracts without a clamp and can pass the target by one step.
export function tickDeath(b: DeathBeat, now: number, dt: number, cfg: DeathBeatCfg): { beat: DeathBeat; fade: number } {
  const camY = Math.max(b.targetY, b.camY - cfg.fallSpeed * dt);
  const fade = Math.min(1, (now - b.startedAt) / cfg.fadeS);
  const returned = b.returned || now - b.startedAt > cfg.returnAfterS;
  return { beat: { ...b, camY, returned }, fade };
}

// Corpse loot. Donor: TransferAll moves every item to the corpse container (take-all).
// Fix (Frankendom take-one): the looter takes one unit of one stack per action; the rest stays on the corpse.
export interface LootItem {
  id: string;
  qty: number;
}

export interface Corpse {
  items: LootItem[];
}

export function takeOne(c: Corpse, index: number): { taken: LootItem | null; corpse: Corpse } {
  const item = c.items[index];
  if (!item) return { taken: null, corpse: c };
  const rest = c.items.slice();
  if (item.qty > 1) rest[index] = { id: item.id, qty: item.qty - 1 };
  else rest.splice(index, 1);
  return { taken: { id: item.id, qty: 1 }, corpse: { items: rest } };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/DR003-daggerfall-death.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/death.ts` (the death state change and the beat's timing values; the beat itself is client presentation only). Parity-checklist row 17 (death/respawn). The corpse take-one belongs to row 18 (loot roll) and is out of scope for this one row.
- Current Frankendom death presentation was not read in this pass.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, the sketch is written from the mechanism)
- Brief rule served: rule 4 (kill and death state are server-verified; the beat is a client) and rule 1 (one engine); parity row 17

## 6. Gaps and risks

- MIT: code may be adapted; the sketch is still written from the mechanism, not copied.
- No death penalty and no respawn penalty in this donor. The donor is not a source for the penalty; TrinityCore and OpenDAoC are. Death here ends the session into the title menu (PlayerDeath 92), and that return also clears the quest state (StartGameBehaviour.cs 325-340), a real consequence even if not a penalty.
- Defect 1, camera overshoot. The fall subtracts `fallSpeed * dt` while the camera is above the target and never clamps (PlayerDeath 81-86), so one frame can end below target. Fix: clamp (sketch).
- Defect 2, mixed clocks. The fall uses `Time.deltaTime` (83) and the return uses `Time.fixedTime` (89, 155). Under a paused or scaled clock the two can disagree. Fix: one clock.
- Defect 3, the death beat and the death state are one object. `deathInProgress` is set in the client (PlayerDeath 154) and the title return is a client action; Frankendom's rule is that kills are server-verified. Fix: the server sends the death; the client runs the beat.
- Corpse take-all (EnemyDeath 123) conflicts with Frankendom's take-one loot. Fix: take-one (sketch).
- The alert-clear on death (EnemyDeath 135-136) is a useful pattern for many-on-one: a dying enemy releases the player's alert only if it was targeting the player, the other attackers keep it raised. That matches MAX_ATTACKERS = 3 logic if the hate list lives in the engine.
- Frankendom's Pit as client: the beat fits the Pit's end-of-fight presentation, and the camera drop is a first-person effect here; a third-person world camera would need the same offset idea (value is local, tunable as data), but this note does not claim a world-camera result.
- Not verified: the corpse build path beyond line 836, the DaggerfallLoot container, the quest-gated death path.

Reuse tag: rewrite-from-idea (MIT; adapted from the mechanism)
Brief rule served: rule 4 (server-verified death; the beat is client) and rule 1 (one engine); parity row 17


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Mechanism 'clamps to 0..MaxHealth (333)' reads as value 333; 333 is the line number and MaxHealth is computed (DaggerfallEntity.cs:258 GetMaxHealth), not a constant. RaiseOnDeathEvent is gated by !quiesce (DaggerfallEntity.cs:875-880) not mentioned. Everything else verified (2.5 fall, 2 s fade, 3 s reset, 160 target, fixedTime vs deltaTime, EnemyDeath 62-141 incl TransferAll 123, alert clear 135-136, MIT).
Missed: StateManager.cs:141 reacts to OnPlayerDeath with ChangeState(Death); StartGameBehaviour.cs:325 StartTitleMenuFromDeath also clears quest state (QuestMachine.ClearState) and pops UI, a real consequence of death the note says does not exist. Not a penalty, but part of the death flow.

Fixed 2026-10-12 (Sonnet fixer): clarified that 333 is a line number and max health is computed per entity; added the quiesce gate on the death event; added the StateManager Death state and the StartTitleMenuFromDeath consequences (quest state cleared, UI popped) and softened 'no consequence' in the gaps. Sketch not changed.
