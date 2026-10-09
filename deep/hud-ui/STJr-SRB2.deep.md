# STJr-SRB2 (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/STJr-SRB2/src/st_stuff.c | Licence: GPL-2 | C | symbol ST_Drawer / ST_overlayDrawer

## 1. Mechanism

- `ST_Drawer` runs once per rendered frame on the render path, not in the sim tick. It draws the seen-player name tag, applies damage and item palette flashes, draws a blindfold fill for tag-mode hiding, decides whether the stage title card shows, then calls `ST_overlayDrawer` for the display player and again for the second split-screen player.
- `ST_overlayDrawer` draws the HUD in base-resolution space. Each element is gated by a Lua HUD flag (`LUA_HudEnabled`): score, time, rings, lives (lives also needs `!modeattacking`). NiGHTS and special stages swap in their own HUD (`ST_drawNiGHTSHUD`, not read). That first block (2702-2719) and the game-over banner are skipped while the scoreboard (`hu_showscores`) is shown in multiplayer; the countdown, overtime, match, race and first-person elements are skipped whenever `hu_showscores` is set (line 2761).
- Game-over banner (2721-2756): when lives are zero (and in coop-lives netgames no other player has lives left), two patches slide in from both screen edges, at x `min(6 * deadtimer, BASEVIDWIDTH/2) - 8` and `BASEVIDWIDTH + 8 - that`. `deadtimer` is the ticks since death minus a two-second delay (`TICRATE<<1`); a spectator uses `TICRATE` instead. Nothing is drawn while `deadtimer` is negative.
- Countdown (2763-2781): a race countdown shows while `countdown > 1`; the label is `countdown / TICRATE + 1`, drawn by `ST_drawRaceNum` below 4 and as a tall number otherwise. Overtime text (2784-2786) needs the time-limit and overtime rules, `leveltime` past the limit plus half a second, and shows on even seconds (`leveltime/TICRATE % 2 == 0`).
- Lua HUD draw list (2828-2837) is rebuilt only when `renderisnewtic` is set, then drawn every frame; skipped when the scoreboard is shown in multiplayer. After it the title card, text spectator HUD, input display and debug info are drawn (2839-2849).
- Inputs: local player `lives`, `deadtimer`, `spectator`, `countdown`, `leveltime`, console cvars, and the Lua flags. Output: pixels only. No HUD state is written back to the sim.

## 2. Key functions

| Name | Absolute VPS path | Lines | What it does |
|---|---|---|---|
| ST_Drawer | /mnt/frankendom-donors/STJr-SRB2/src/st_stuff.c | 2852-2940 | Per-frame entry: name tag, palette, blindfold, title flag, calls overlay per split player |
| ST_overlayDrawer | /mnt/frankendom-donors/STJr-SRB2/src/st_stuff.c | 2699-2850 | Gates and draws score, time, rings, lives, team, race, match, first-person HUD |
| ST_overlayDrawer game-over banner | /mnt/frankendom-donors/STJr-SRB2/src/st_stuff.c | 2721-2756 | Slides two banner patches in from both edges by `min(6*deadtimer, half width)` when lives are zero |
| ST_overlayDrawer countdown and overtime | /mnt/frankendom-donors/STJr-SRB2/src/st_stuff.c | 2763-2786 | Race countdown numerals and one-second overtime blink |
| ST_overlayDrawer Lua hook | /mnt/frankendom-donors/STJr-SRB2/src/st_stuff.c | 2828-2837 | Rebuilds and draws the Lua HUD draw list |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Banner slide-in: offset = min(rate x ticks since death, half width) | Slide rate 6 px per tick (line 2750), half of `BASEVIDWIDTH` (theirs) |
| Two-second delay before the banner starts (deadtimer minus 2 x TICRATE) | Delay `TICRATE<<1` (line 2729) (theirs) |
| Per-element enable flags, all hidden by one overlay-hide condition | Flags hud_score, hud_time, hud_rings, hud_lives (theirs) |
| Countdown label = floor(ticks / unit) + 1 | Unit TICRATE (line 2766); labels below 4 use a race graphic (line 2767) (theirs) |
| Blink by parity of floor(tick / period) | One-second period, even seconds on (line 2785) (theirs) |

## 4. TypeScript sketch

Clean-room sketch: written from the mechanism in section 1, no lines translated.

simplified: the donor draws the banner as two patches from both edges, only once `deadtimer >= 0`, with coop-lives and spectator branches omitted here; the countdown below 4 uses a race graphic instead of a number; the overtime gate (game rules, time limit) is reduced to the blink parity; the name-tag, palette flash, blindfold and per-player loop of `ST_Drawer` are omitted.

```ts
// Licence: GPL-2 - clean-room sketch, no lines translated
// Generic HUD overlay: gated elements, a slide-in banner, a countdown label and a blink.

interface HudElement {
  enabled: boolean;
  draw: () => void;
}

// Offset of a banner that enters from the edge after a delay, clamped to a target width.
function slideInOffset(ticksSinceDeath: number, delayTicks: number, slideRate: number, halfWidth: number): number {
  const active = Math.max(0, ticksSinceDeath - delayTicks);
  return Math.min(slideRate * active, halfWidth);
}

function drawOverlay(
  hideAll: boolean,
  lives: number,
  ticksSinceDeath: number,
  elements: HudElement[],
  drawBanner: (offset: number) => void,
  delayTicks: number,
  slideRate: number,
  halfWidth: number,
): void {
  if (hideAll) return;
  for (const el of elements) {
    if (el.enabled) el.draw();
  }
  if (lives <= 0 && ticksSinceDeath >= delayTicks) drawBanner(slideInOffset(ticksSinceDeath, delayTicks, slideRate, halfWidth));
}
// Countdown label: a number while time remains, otherwise nothing.
function countdownLabel(remainingTicks: number, ticksPerUnit: number): string | null {
  if (remainingTicks <= 1) return null; // donor shows the label only while countdown > 1
  return String(Math.floor(remainingTicks / ticksPerUnit) + 1);
}

// Blink on/off with a fixed period.
function blinkOn(tick: number, periodTicks: number): boolean {
  return Math.floor(tick / periodTicks) % 2 === 0;
}
```

## 5. Lands in

- Frankendom: TARGET `src/fight/hud.ts` (HUD gating and the banner slide-in), today: `src/hud.ts` (moving).
- Parity checklist row 14 (HUD). Row 17 (death/respawn) for the banner timing.
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- No health bar or hit feedback in the opened functions (the draw helpers such as `ST_drawScore`, `ST_drawRings` were not read). Frankendom builds bars and numbers from the one fight state in `src/fight/`.
- Lives, rings and score are platformer concepts; Frankendom has no lives counter in a duel, so the element list will not carry over (MAX_ATTACKERS = 3 and the one ledger set what a duel HUD shows).
- The HUD reads local player state and Lua flags directly. Under the server-verified-kills rule, the banner must trigger from the server's death event, not a local `lives <= 0` check.
- GPL-2: the sketch is clean-room. Do not copy the element layout or the function bodies.
- The HUD lives in its own layer, which fits the one-engine ruling (`src/fight/` stays the whole fight).
