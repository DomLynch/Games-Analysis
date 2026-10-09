# endless-sky-endless-sky (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/endless-sky-endless-sky/source/MiniMap.cpp | Licence: GPL-3 | C++ | symbol MiniMap::Step / Draw

## 1. Mechanism

- Minimap over the star map, run as a per-frame step (`MiniMap::Step`) and a draw (`MiniMap::Draw`). It shows the systems near the flagship's current system and the next jump target.
- Inputs: the flagship (current system, whether it is entering hyperspace, whether a jump command is set), the travel plan, and the player's preference (off, always, or only when jumping).
- Target choice each step: the next system is the flagship's jump target while jumping; otherwise the last system of the travel plan. The target is cleared when the flagship reaches it.
- Lingering: when a jump starts, the minimap is shown for 300 steps (about 5 seconds at 60 steps a second); it fades in over the first 30 steps and fades out over its last 30 steps.
- Centre: when the current or target system changes, the centre is set halfway between current and target (or on current alone) and a lerp of 150 steps moves the centre from its old value to the new one. A second lerp toward the target starts while entering hyperspace.
- Draw (148-292): only two systems get the full treatment, the current system and the target (if any), each by `drawSystemLinks` (178-269): name (placeholder "Unexplored System" if the name is not known), a ring in the government colour if the player can view it and it is inhabited, else a dim ring, a brighter ring (radii 11 and 9) on the current system, a ring and a link line for each linked system the player can view, and mission pointers. A directional arrow runs current to target, dashed when the target is not a hyperspace link (279-291). The alpha is 0.5, times `fade/30` only in the "when jumping" preference (158-164).
- Output: draw calls only, at the `mini-map` point of the `hud` interface (line 172). Nothing is written to the world.

## 2. Key functions

- `MiniMap::Step`, `/mnt/frankendom-donors/endless-sky-endless-sky/source/MiniMap.cpp`, lines 55-144. Target, linger timer, fade, retarget and lerp of the centre.
- `MiniMap::Draw`, same file, lines 148-292. Preference gate, alpha by mode, per-system rings and link lines.
- `drawSystemLinks` (lambda inside Draw), same file, lines 178-269. One system: name, ring, current-system ring, links, mission pointers. Called for the current system and then the target (273-277).
- Constant `LERP_DURATION`, same file, lines 41-44. The 150-step centre lerp.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Centre a view halfway between current and next target, lerp to it over fixed steps | 150-step lerp (theirs) |
| Linger after a trigger, then fade over the last part of the linger | 300-step linger, 30-step fade (theirs) |
| Target = next hop of the plan, cleared on arrival | Jump-command priority (theirs) |
| Ring and link draw, alpha by display mode | Ring radii 11 and 9 for the current system (line 194, theirs); 0.5 base alpha (158); lerp 150 (43); linger 300 (77); fade 30 (108-111) (theirs) |

## 4. TypeScript sketch

simplified: the donor's centre lerp never reaches t = 1 (it applies `lerpCount / 150` before incrementing, so the last applied step is 149/150); the sketch reaches the target exactly. The second "entering hyperspace" lerp and its guard (line 131), the target choice and the ring/link/mission drawing are omitted.

```ts
// Licence: GPL-3 - clean-room sketch, no lines translated
// Clean-room: a minimap centre that lerps toward the midpoint of current and next system, with a linger and fade timer.
type Pt = { x: number; y: number };
const LERP_STEPS = 150;
const LINGER_STEPS = 300;
const FADE_STEPS = 30;

// Centre target: midpoint of current and next when a target exists, otherwise the current system.
function centreTarget(current: Pt, next: Pt | null): Pt {
  return next ? { x: (current.x + next.x) / 2, y: (current.y + next.y) / 2 } : current;
}

// Linger counts down; fade ramps down in its last steps and up otherwise. Active resets the linger.
function stepTimers(linger: number, fade: number, active: boolean): { linger: number; fade: number } {
  let l = linger;
  let f = fade;
  if (active) l = LINGER_STEPS; // donor sets the linger before counting down (lines 77, 105-107)
  if (l > 0) {
    l--;
    if (l < FADE_STEPS && f > 0) f--;
    else if (f < FADE_STEPS) f++;
  } else {
    f = 0;
  }
  return { linger: l, fade: f };
}

// Centre lerp: a retarget restarts it from where the centre is now; tick() moves it one step.
class CentreLerp {
  private from: Pt;
  private to: Pt;
  private step = LERP_STEPS;
  constructor(start: Pt) { this.from = start; this.to = start; }
  retarget(to: Pt): void { this.from = this.current(); this.to = to; this.step = 0; }
  current(): Pt {
    const t = Math.min(1, this.step / LERP_STEPS);
    return { x: this.from.x + (this.to.x - this.from.x) * t, y: this.from.y + (this.to.y - this.from.y) * t };
  }
  tick(): void { if (this.step < LERP_STEPS) this.step++; }
}
```

## 5. Lands in

- Frankendom target: `src/fight/hud.ts` (minimap panel and centre lerp), parity checklist row 14 (HUD); today: `src/hud.ts` (moving). The nodes and links come from zone data (zones as data), not from the HUD.
- Reuse tag: rewrite-from-idea (GPL-3, clean-room sketch only).
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The donor's timing is in steps, not wall time; Frankendom needs the same tick rule the rest of the HUD uses.
- The "unknown system" placeholder is a fog-of-knowledge rule (`KnowsName`, line 182). Frankendom must decide what a zone reveals; the donor does not map to a zone schema.
- The minimap reads the flagship's live state. Frankendom's HUD reads fight state from `src/fight`, never a separate copy.
- Two lerps can conflict (retarget while entering hyperspace); the donor guards with `lerpCount >= LERP_DURATION` (line 131). The same branch dereferences `target` without a null check when entering hyperspace; a copy needs the check.
- Client-only; no kill or travel authority in this file.
