# diasurgical-DevilutionX (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/diasurgical-DevilutionX/Source/control/control_panel.cpp | Licence: Sustainable Use License v1.0 (donor LICENSE.md: internal business or non-commercial use only, free non-commercial distribution only); clean-room only, never a line-by-line translation | C++ | symbol DrawMainPanel / DrawDurIcon / DrawDeathText

## 1. Mechanism

- `DrawMainPanel` (control_panel.cpp 433) paints the bottom panel box, then the info box (`DrawInfoBox`, control_infobox.cpp 392, not read). It is called from the frame draw in scrollrt.cpp (line 1873, only when the control panel flag `drawCtrlPan` is set), after `DrawView`; `DrawDurIcon` is called at 1404 and `DrawDeathText` at 1439 (surrounding conditions not read).
- `DrawDurIcon` (751) draws durability warnings for four equipped slots: head, chest, left hand, right hand. It first checks panel geometry: if both side panels are open and there is no room between or under them, it draws nothing. Otherwise it places the icons at the main panel's right edge, shifted left if the right panel overlaps.
- `DrawDurIcon4Item` (166) skips empty items and items with durability above 5. For items at or below 5, it fills the icon from the bottom: gold for the part above 2, red for the rest. The gold height is the icon height times (durability minus 2) over 3, integer division (200-205). Gold is drawn in the bottom rows, red in the rest above (209-216). Slot order is head (c=3), chest (2), left hand, right hand (768-771), and each icon advances x left by the icon height plus 8 (line 218). The icon sprite index comes from the item type when the slot does not set one.
- `DrawLifeFlaskUpper` (control_flasks.cpp 102) and `DrawFlaskUpper` (38-55) fill a flask by rows: filled rows = rect height minus clamped (81 minus fill percent). Life and mana use fixed panel offsets (107 and 475, lines 104-111). The fill value is `MyPlayer->_pHPPer`, which `player.h` 690 sets to `clamp(hp * 81 / maxHP, 0, 81)`.
- `DrawDeathText` (787) draws "You have died" in large gold text, then a prompt. The prompt names the button by control mode (ESC, gamepad start, or menu button). Single player offers "load last save" if a save file is valid, otherwise "return to Main Menu". Multiplayer offers "restart in town".
- Inputs: the local player's equipped items (durability, type), panel geometry, control mode, save-file validity, multiplayer flag. Output: pixels only.

## 2. Key functions

| Name | Absolute VPS path | Lines | What it does |
|---|---|---|---|
| DrawMainPanel | /mnt/frankendom-donors/diasurgical-DevilutionX/Source/control/control_panel.cpp | 433-437 | Paints the main panel box and the info box |
| DrawDurIcon | /mnt/frankendom-donors/diasurgical-DevilutionX/Source/control/control_panel.cpp | 751-772 | Places and draws the four equipment warning icons, or skips them if no room |
| DrawDurIcon4Item | /mnt/frankendom-donors/diasurgical-DevilutionX/Source/control/control_panel.cpp | 166-219 | Gold/red fill for one item icon; hidden above durability 5 |
| DrawDeathText | /mnt/frankendom-donors/diasurgical-DevilutionX/Source/control/control_panel.cpp | 787-831 | "You have died" text and the prompt chosen by control mode and save state |
| DrawFlaskUpper | /mnt/frankendom-donors/diasurgical-DevilutionX/Source/control/control_flasks.cpp | 38-55 | Fills a flask by clamped rows over the empty flask cel |
| DrawLifeFlaskUpper | /mnt/frankendom-donors/diasurgical-DevilutionX/Source/control/control_flasks.cpp | 102-106 | Life flask at a fixed offset, fill from current HP percent |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two-threshold warning: hidden above level A, two-colour band between A and B, single colour at or below B | Levels 5 and 2 (lines 168-169, theirs) |
| Band height = icon height x (value - B) / (A - B), floored | Denominator 3 is A - B (theirs) |
| Icon vertical offset above the panel, spacing between icons | Y offset -17 from the main panel top (line 208, theirs); gap 8 px after the icon height (line 218, theirs) |
| Flask fill = clamped rows from a percent | Full scale 81 (flask fill value, `DrawFlaskUpper` line 41; `player.h` 690) (theirs); life and mana offsets 107 and 475 (control_flasks.cpp 104, 110) (theirs) |
| Death prompt chosen by input device and save state | Button labels (ESC, gamepad start, "Menu Button", lines 809-815), text sizes 42 and 30 (790, 794); vertical padding 42 (798) (theirs) |

## 4. TypeScript sketch

Clean-room sketch: written from the mechanism in section 1, no lines translated (licence is the Sustainable Use License v1.0).

simplified: no empty-item check, no icon-slot placement, no panel-room check (`DrawDurIcon` 753-759 returns early only if both side panels are open and there is no room), no per-item sprite index, and no flask fill; `deathPrompt` hardcodes the English strings and the three-way control-mode label table is passed in.

```ts
// Licence: Sustainable Use License v1.0 (non-commercial / internal use only) - clean-room sketch, no lines translated
// Equipment warning icon: hidden above a warn level, two-colour band between warn and red levels, one colour at or below red.

interface DurabilityIcon {
  durability: number;
  warnLevel: number;  // icon shows at or below this value
  redLevel: number;   // red only at or below this value
  iconHeight: number; // pixels
}

interface IconBands {
  visible: boolean;
  goldPx: number; // filled from the bottom
  redPx: number;  // the remainder
}

function durabilityBands(icon: DurabilityIcon): IconBands {
  if (icon.durability > icon.warnLevel) return { visible: false, goldPx: 0, redPx: 0 };
  const span = icon.warnLevel - icon.redLevel;
  let goldPx = 0;
  if (span > 0 && icon.durability > icon.redLevel) {
    const above = icon.durability - icon.redLevel;
    goldPx = Math.floor((icon.iconHeight * above) / span);
  }
  return { visible: true, goldPx, redPx: icon.iconHeight - goldPx };
}

type ControlMode = 'keyboard' | 'gamepad' | 'virtual';

// Prompt after death: the button name depends on control mode, the target on save state and multiplayer.
function deathPrompt(mode: ControlMode, multiplayer: boolean, hasSave: boolean, buttonName: Record<ControlMode, string>): string {
  const button = buttonName[mode];
  if (multiplayer) return `Press ${button} to restart in town.`;
  if (hasSave) return `Press ${button} to load last save.`;
  return `Press ${button} to return to Main Menu.`;
}
```

## 5. Lands in

- Frankendom: TARGET `src/fight/hud.ts` (equipment warning icon, if gear wear exists; flask-style fill if wanted), today: `src/hud.ts` (moving); the death prompt belongs with the death screen in `src/fight/`.
- Parity checklist row 14 (HUD) for the warning icon and fill. Row 17 (death/respawn) for the death screen.
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- No durability system in Frankendom. The warning band is only useful if gear wear is a design decision (Lead's call, not this file's).
- Death screen offers "load last save". A client-side reload would undo a death. That conflicts with the server-verified kills ruling: the death must be the server's event, and the client shows it but never reloads.
- Respawn and restart-in-town are multiplayer-state concepts. Frankendom's respawn rules (row 17) belong on the server, not in this prompt.
- The prompt text depends on save files, which Frankendom's server model does not have. Do not port the save-file branch.
- `DrawMainPanel` also calls `DrawInfoBox` (not read); `DrawMainPanelButtons` (line 439) is a separate function whose body was only skimmed. Do not rely on either.
- Licence is the Sustainable Use License v1.0 (internal business or non-commercial use only): clean-room only. Do not copy sprite sheets, panel layout or text strings.
- The save-reload path conflicts with server-verified kills, flagged above. No conflict with the one-engine ruling for the HUD itself.
