# afritz1-OpenTESArena (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Interface/GameWorldUiMVC.cpp | Licence: MIT | C++ | symbol GameWorldUiModel::getCurrentPlayerStatusGradientType

## 1. Mechanism

- Input: a `Player`'s `currentHealth` and `maxHealth`, plus its `effectsState` flags for drunk and diseased (the gradient does not read paralysed).
- `Player::isHealthCriticallyLow` (Player.cpp 791) clamps the health ratio to 0 to 1 and returns true at or below 0.15 (793-794). A `maxHealth` of 0 is not guarded: 0/0 is NaN, the clamp keeps NaN and the comparison is false.
- `GameWorldUiModel::getCurrentPlayerStatusGradientType` (GameWorldUiMVC.cpp 358) returns exactly one state, in priority order: NearDeath, then Poisoned (drunk), then Diseased, then Buffed (disabled by `else if (false)`), else Healthy.
- `GameWorldUiView::getStatusGradientTextureAsset` (924) turns the state into a texture asset: `StatusGradients` with the enum's integer as frame index. The enum order is Healthy 0, Diseased 1, Poisoned 2, NearDeath 3, Buffed 4 (GameWorldUiMVC.h 108-115).
- Output: one texture for the status gradient drawn by the game-world UI view. No state is written back.
- These functions have no tick of their own and write nothing; they are pure reads. Who calls the gradient function and when is not read.
- `GetStatusEffectString` (GameWorldUiMVC.cpp 86-~115, opened) reads the same check at line 89 plus diseased, drunk and paralysed, but with a different priority: diseased first (96), then critically hurt (100), then drunk (104). It is a text path, not the gradient path.

## 2. Key functions

| Name | Absolute VPS path | Lines | What it does |
|---|---|---|---|
| GameWorldUiModel::getCurrentPlayerStatusGradientType | /mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Interface/GameWorldUiMVC.cpp | 358-380 | Priority pick: NearDeath, Poisoned, Diseased, Buffed (off), Healthy |
| Player::isHealthCriticallyLow | /mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Player/Player.cpp | 791-795 | Health ratio clamped 0 to 1; true at or below 0.15 |
| GameWorldUiView::getStatusGradientTextureAsset | /mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Interface/GameWorldUiMVC.cpp | 924-928 | Maps the state enum to a StatusGradients texture frame |
| PlayerStatusGradientType (enum) | /mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Interface/GameWorldUiMVC.h | 108-115 | Five states; integer value is the atlas frame index |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Derive one visual state from a ratio and status flags, in strict priority order | Critical threshold 15% of max health (`Player.cpp` 794) (theirs) |
| Clamp the health ratio to 0 to 1 before comparing | Clamp range 0 to 1 (general, not theirs) |
| Map a state enum to an atlas frame by integer index | Enum order Healthy 0, Diseased 1, Poisoned 2, NearDeath 3, Buffed 4 (theirs); texture set name StatusGradients (theirs) |
| Reserve a state that is wired but disabled | Buffed branch behind `else if (false)` (theirs) |

## 4. TypeScript sketch

Lift: the logic is lifted from the paths above (MIT permits it). The sketch keeps the real structure and comments the source paths.

simplified: the sketch adds a `buffed` flag that the donor hard-disables (`else if (false)`, line 372) and takes plain booleans instead of the donor's `effectsState` queries; `GetStatusEffectString` (a different priority order) is not covered.

```ts
// Licence: MIT
// Lifted from afritz1-OpenTESArena: src/Interface/GameWorldUiMVC.cpp (getCurrentPlayerStatusGradientType)
// and src/Player/Player.cpp (isHealthCriticallyLow).

type GradientState = 'Healthy' | 'Diseased' | 'Poisoned' | 'NearDeath' | 'Buffed';

// Same order as the enum in GameWorldUiMVC.h. The index is the atlas frame index.
const GRADIENT_ORDER: GradientState[] = ['Healthy', 'Diseased', 'Poisoned', 'NearDeath', 'Buffed'];

interface StatusInput {
  currentHealth: number;
  maxHealth: number;
  drunk: boolean;
  diseased: boolean;
  buffed: boolean; // always false in the source (see the @todo)
}

const CRITICAL_HEALTH_RATIO = 0.15;

function isHealthCriticallyLow(currentHealth: number, maxHealth: number): boolean {
  const ratio = Math.min(1, Math.max(0, currentHealth / maxHealth));
  return ratio <= CRITICAL_HEALTH_RATIO;
}

// One state, in priority order: near death wins over status effects.
function currentStatusGradient(p: StatusInput): GradientState {
  if (isHealthCriticallyLow(p.currentHealth, p.maxHealth)) return 'NearDeath';
  if (p.drunk) return 'Poisoned';
  if (p.diseased) return 'Diseased';
  if (p.buffed) return 'Buffed';
  return 'Healthy';
}

function gradientFrameIndex(state: GradientState): number {
  return GRADIENT_ORDER.indexOf(state);
}
```

## 5. Lands in

- Frankendom: TARGET `src/fight/hud.ts` (low-health feedback, the screen-edge tint), today: `src/hud.ts` (moving).
- Parity checklist row 14 (HUD). Row 16 (colour grade/quality) is the alternative if the tint is treated as a grade.
- Reuse tag: adapt
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- Poisoned and Diseased come from status effects that Frankendom's duel does not have. Either define server statuses for them or drop the branches.
- The threshold of 15% is theirs. Frankendom's critical feel must be chosen for its own duel, not copied.
- Near death always beats a status effect, so a poisoned low-health fighter shows only the near-death tint. Decide whether that is the intended read.
- The state index is the art frame index. Reordering the enum would silently swap the art. Frankendom should key the art by name.
- Authority: the input HP must come from the server snapshot. The client must not compute the tint from predicted HP.
- The Buffed branch is a stub (`else if (false)`). Do not treat it as a working state.
- Status text (`GetStatusEffectString`, line 89) uses the same check but a different priority (diseased before critical). If Frankendom takes both, share the threshold and decide one order.
- MIT: the lift is permitted. No conflict with the one-engine ruling; the code is a pure UI derivation, and the input HP must come from the one fight state (server-verified).
