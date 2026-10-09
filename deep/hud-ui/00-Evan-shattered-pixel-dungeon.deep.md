# 00-Evan-shattered-pixel-dungeon (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/ui/HealthBar.java | Licence: GPL-3.0-or-later per HealthBar.java header (LICENSE.txt is GPL v3) | Java | symbol HealthBar.level(Char)

## 1. Mechanism

- Input: a `Char` (HP, max HP, shield amount, incoming damage over time). `level(Char)` (93-102) computes `max = max(HP + shield, maxHP)`. The shield can push the denominator above max HP.
- It passes three fractions to `level(health, shield, DOT)`: health = HP / max, shield = (HP + shield) / max, DOT = incomingDOT / max. The shield segment stacks on top of health.
- A null `Char` does nothing; the bar keeps its last values.
- `level(float, float, float)` (86-91) stores the three values and calls `layout()` at once (line 90; line too short to receipt). There is no tick: the bar redraws on every call.
- `layout()` (64-80) sizes four colour blocks in draw order: background (full width), shield, health, DOT. Each length is snapped up to whole screen pixels using the camera zoom: `width * ceil(fraction * pixelWidth) / pixelWidth`.
- The DOT block sits at the right edge of the shield segment (`Dot.x += Shld.width - Dot.width`). It darkens the health portion it will remove.
- The DOT clamp (`Dot.scale.x = min(Dot.scale.x, Shld.scale.x)`, line 78) does cap the DOT width: in `ColorBlock` (`SPD-classes/.../noosa/ColorBlock.java` 35-42) `size()` sets `scale` and `width()` returns `scale.x`, so scale is the pixel width. The DOT block is never wider than the shield block.
- Output: a 2-pixel-high bar; red background, white shield, green health, translucent black DOT.

## 2. Key functions

- `HealthBar.level(Char)`, `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/ui/HealthBar.java`, lines 93-102. Actor to fractions with the shared denominator.
- `HealthBar.level(float, float, float)`, same file, lines 86-91. Store fractions and re-layout.
- `HealthBar.layout()`, same file, lines 64-80. Pixel-snapped segment sizes and the DOT offset.
- `HealthBar.createChildren()`, same file, lines 47-61. Creates the four colour blocks in draw order and sets height 2.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Bar as fractions of one denominator, the larger of current pool and max | Denominator is max(HP + shield, max HP) (theirs, as the rule) |
| Stacked segments: health, then shield on top, then DOT at the shield edge | Colours `0xFFAA0000` background, `0xFF00EE00` health, `0xFFFFFFFF` shield, `0x66000000` DOT (theirs) |
| Snap segment width up to whole screen pixels | Bar height `2` px (theirs) |
| Re-layout on each value change, no tick | Ordering of the four blocks (theirs) |

## 4. TypeScript sketch

Clean-room sketch: written from the mechanism above, no lines translated.

simplified: no Char or camera objects (zoom is a plain parameter, donor falls back to 1 when no camera), no `layout()` call chain, no null-Char guard, no bar x/y origin, height or colours; the three fractions come from one function instead of `level(Char)` then `level(float,float,float)`; order of the four blocks matches the donor.

```ts
// Licence: GPL-3.0-or-later (donor) - clean-room sketch, no lines translated
// Clean-room: a stacked pool bar as fractions of one denominator; the DOT segment ends at the shield edge.
type Actor = { hp: number; maxHp: number; shield: number; incomingDot: number };
type Segments = { health: number; shield: number; dot: number };

// Fractions of one shared denominator. The denominator grows when shield pushes the pool past max.
function barSegments(a: Actor): Segments {
  const total = Math.max(a.hp + a.shield, a.maxHp);
  return {
    health: a.hp / total,
    shield: (a.hp + a.shield) / total,
    dot: a.incomingDot / total,
  };
}

// Snap a fraction up to whole screen pixels at the current zoom.
function snapWidth(fraction: number, widthUnits: number, zoom: number): number {
  const pixelWidth = widthUnits * zoom;
  return (widthUnits * Math.ceil(fraction * pixelWidth)) / pixelWidth;
}

// Returns the draw rectangles for one frame, in draw order.
// (shield and health widths are the same snap as the donor; the DOT clamp to shield is included)
function layoutBar(a: Actor, widthUnits: number, zoom: number) {
  const s = barSegments(a);
  const shieldW = snapWidth(s.shield, widthUnits, zoom);
  const healthW = snapWidth(s.health, widthUnits, zoom);
  const dotW = Math.min(snapWidth(s.dot, widthUnits, zoom), shieldW);
  return [
    { name: 'background', x: 0, w: widthUnits },
    { name: 'shield', x: 0, w: shieldW },
    { name: 'health', x: 0, w: healthW },
    { name: 'dot', x: shieldW - dotW, w: dotW },
  ];
}
```

## 5. Lands in

- Frankendom file(s): TARGET `src/fight/hud.ts` (HUD bars and numbers), today: `src/hud.ts` (moving).
- Parity-checklist row: 14 (HUD). The shield value, if Frankendom has one, belongs to fight state (row 3, guard/parry/stamina, `src/fight/`).
- Reuse tag: rewrite-from-idea. The arithmetic is short and generic; the donor code is GPL-3.
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- Shield and DOT are read from the actor, not from the fight record. In Frankendom the values must come from `src/fight`, so the HUD cannot be the source of truth.
- Max HP of zero is not guarded in `level(Char)`. The denominator would be zero if both HP and max are zero; the donor does not handle it.
- The DOT width is clamped to the shield width (line 78, scale is width in `ColorBlock`), but not to the health segment: a DOT larger than the health fraction darkens shield too. Frankendom must decide what a DOT may cover.
- No numbers, no change animation, no low-value warning. The bar is two pixels high and built for mobs and targets.
- Callers (IconTitle, WndInfoMob, CharHealthIndicator, TargetHealthIndicator, found by grep) were not read.
- Licence GPL-3: clean-room only.
- Client only. Frankendom rulings: one engine and server-verified kills, so shield and DOT values come from the one fight state in `src/fight/`, and the HUD never computes them.
