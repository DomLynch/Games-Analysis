# Facepunch-garrysmod (character-creation-appearance, cell 31)

Donor: `/mnt/frankendom-donors/Facepunch-garrysmod/garrysmod/` (`gamemodes/sandbox/gamemode/player_class/player_sandbox.lua`, `gamemodes/base/gamemode/player_class/player_default.lua`, `lua/includes/modules/player_manager.lua`, `gamemodes/base/gamemode/player.lua`) | Licence: none declared (no LICENSE file; README.md and CONTRIBUTING.md name no licence; README.md says binaries are not public and are derived from the Source SDK) | Lua | symbol `player_manager.TranslatePlayerModel` / `PLAYER:SetModel` (sandbox)

Checked: read in full: `player_sandbox.lua` 1-20 and 80-125, `player_default.lua` 60-80, `player_manager.lua` 1-150 (the stock list continues to line 414; not read), `base/gamemode/player.lua` 236-270. Read by grep with line numbers only: `base/gamemode/player.lua` 277-286 (`GM:PlayerSetHandsModel`, called through the engine `SetupHands` at 257), `sandbox/gamemode/init.lua` 39 (sets the class), `sandbox/gamemode/editor_player.lua` 60-95 (picker, read in part). Candidate files opened: 6. Searched and found nothing: name filters or name rules (grep for `namefilter`, `SetName`, `Nick()` across base, sandbox, terrortown, lua/includes and lua/autorun: `Nick()` is used only for display and kill messages); faces, scars, body-shape sliders (not present). Confidence: high on the appearance path (cvars, registry, per-spawn application); moderate that this counts as "character creation": there is no creation flow, only a model picker and per-player cvars. Hint in the brief was parity row 3; row 3 is guard, parry and stamina, so row 15 is used instead (see section 5). `camera_scope` not applicable.

Best transferable idea: appearance as data rows: a registry of named body families (model, hands model, hands body string) with a fallback row for unknown names, and per-player variants (skin, one value per bodygroup slot, two colours) applied on every spawn from the saved values.
Decision (proposed): adapt - take the registry with fallback and the apply-on-spawn step for catalogue rows; add the range checks the donor lacks (each slot clamped to its family's variant count, unknown family ids to the fallback) and use one bodygroup format for rows and for the player's saved values.
Acceptance: a player whose saved look names a retired family, or a slot above the family's variant count, spawns with the fallback family and slot 0; the server's resolved record names the same family id and slot values the client draws; a test asserts both.

## 1. Mechanism

- Saved values (client convars, read by the server through USERINFO, archived): model name `cl_playermodel` (`player_default.lua` 69), skin `cl_playerskin` (`player_sandbox.lua` 9), bodygroups `cl_playerbodygroups` (10), primary colour `cl_playercolor` (7), weapon colour `cl_weaponcolor` (8).
- Order on each spawn (`base/player.lua`): the class `Spawn` runs first (246), which sets the primary colour (`player_sandbox.lua` 108-109) and the weapon colour (111-115). Loadout follows (251). Then `PlayerSetModel` (255, 265-267) runs the class `SetModel`. The base `SetModel` reads `cl_playermodel` (69), translates it through the registry (70), precaches and sets the model (71-72). The sandbox `SetModel` then sets the skin (88-89) and applies the bodygroups (91-97). Finally `SetupHands` (257, an engine call) fires the `PlayerSetHandsModel` hook (`base/player.lua` 277-286). It tries the class `GetHandsModel` hook first (277-279), then falls back to the registry row for the current model. The hands skin is `info.matchBodySkin and pl:GetSkin() or info.skin` (283): a row flagged `matchBodySkin` follows the player's chosen skin, otherwise it uses the row's skin. The body string comes from the row.
- Registry (`player_manager.lua`): `AddValidModel` stores model, title and category under a name (24-35) and a reverse map from lowercased model path to name (33). `AddValidHands(name, model, skin, body, matchBodySkin)` stores a hands row with skin default 0, body default `"0000000"` and `matchBodySkin` default false (40-42). `TranslatePlayerModel` returns the model for a known name, otherwise `models/player/kleiner.mdl` (84-92). `TranslateToPlayerModelName` returns the name for a known path, otherwise `kleiner` (95-105). `TranslatePlayerHands` returns the hands row, otherwise a default with body `"100000000"` (110-118).
- Stock rows: Half-Life 2 families are added in a list starting at line 135 (for example `alyx` at 135, `kleiner` at 139, `mossmanarctic` at 145 with body `"0100000"`); the rows through line 150 are 14 (the list continues past 150, not counted). Each takes a hands row from one of three arms models defined at 124-127.
- Bodygroups on the player (`player_sandbox.lua` 91-97): the cvar is one space-separated string; slot k takes `tonumber(groups[k+1]) or 0` for every slot the model has. No value is checked against that slot's variant count.
- Colours: primary is taken as a vector (108-109). Weapon colour is floored at 0.001 when its length is under 0.001 (112-113). The reason for the floor is not in the donor (not read).
- Picker UI (`editor_player.lua` 60-95, read in part): the registry is listed by category with title and icon, with a quick-filter bar (62-66). Only the registry names are offered.

## 2. Key functions

- Sandbox appearance: `/mnt/frankendom-donors/Facepunch-garrysmod/garrysmod/gamemodes/sandbox/gamemode/player_class/player_sandbox.lua` 84-99 (`SetModel`), 104-117 (`Spawn`).
- Base model choice: `/mnt/frankendom-donors/Facepunch-garrysmod/garrysmod/gamemodes/base/gamemode/player_class/player_default.lua` 67-72.
- Registry: `/mnt/frankendom-donors/Facepunch-garrysmod/garrysmod/lua/includes/modules/player_manager.lua` 24-44 and 84-118.
- Spawn order and hands: `/mnt/frankendom-donors/Facepunch-garrysmod/garrysmod/gamemodes/base/gamemode/player.lua` 236-270 and 277-286 (`PlayerSetHandsModel`; the last only by grep).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Registry row lookup with fallback to a default row | fallback model `models/player/kleiner.mdl` (`player_manager.lua` 90); fallback name `kleiner` (103); fallback hands body `"100000000"` (116) |
| One value per bodygroup slot, default 0 | default 0 (`player_sandbox.lua` 96); cvar default `"0"` (10) |
| Skin | default skin 0 on the hands row (`player_manager.lua` 42); cvar default `"0"` (`player_sandbox.lua` 9); hands skin = player's skin when the row has `matchBodySkin` (`player.lua` 283) |
| Two colours as 0-1 vectors | primary default `0.24 0.34 0.41` (line 7); weapon default `0.30 1.80 2.10` (line 8, above the 0-1 in its own help text); floor `0.001` (112-113) |
| Hands body as one digit per slot | `"0000000"` default (42); `"0100000"` for gloves on `mossmanarctic` (145) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: resolve the family with fallback, then the slots, then the colours. It differs from the donor in three places: each bodygroup slot is range-checked against the family's variant count (the donor only checks that the slot exists); the weapon tint is clamped to 0-3, not 0-1, because the donor's default is 2.10 on one channel (the sketch keeps that range); and the hands body is parsed as digits, not spaces. It omits the model precache, the spawn-time order relative to loadout and the class-level hands hook (tried before the registry in the donor); the hands skin rule (`matchBodySkin`) is in `handsSkin`. The family table is passed in, not read from the registry.

```ts
// Licence: none declared in the donor (clean-room). Sketch written from the described mechanism, not a translation of donor lines.
interface BodyFamily {
  id: string;
  model: string;          // resolved on the server; unknown ids fall back
  handsModel: string;
  handsBody: string;      // one digit per bodygroup slot, e.g. "0000000"
  handsSkin: number;      // fixed hands skin of the row
  matchBodySkin: boolean; // true: hands skin follows the player's chosen skin
  groupCounts: number[];  // number of variants per bodygroup slot
}

const FALLBACK_ID = 'default';

interface Appearance {
  familyId: string;
  skin: number;
  slots: string;                       // space-separated, one number per slot (client-supplied)
  primary: [number, number, number];   // each 0..1
  weapon: [number, number, number];    // donor default exceeds 1 on two channels
}

interface Resolved {
  family: string;
  model: string;
  skin: number;
  slots: number[];
  primary: [number, number, number];
  weapon: [number, number, number];
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

function resolve(families: Map<string, BodyFamily>, a: Appearance): Resolved {
  const fam = families.get(a.familyId) ?? families.get(FALLBACK_ID);
  if (fam === undefined) throw new Error('no fallback body family');
  const parts = a.slots.trim() === '' ? [] : a.slots.split(' ');
  // Fix: each slot is range-checked against the family's variant count; anything else becomes 0.
  const slots = fam.groupCounts.map((count, k) => {
    const v = Number(parts[k]);
    return Number.isInteger(v) && v >= 0 && v < count ? v : 0;
  });
  // Donor default weapon tint is 0.30 1.80 2.10 although its help text says 0-1: this keeps a 0-3 range.
  const clampTint = (x: number): number => Math.min(3, Math.max(0, x));
  let weapon: [number, number, number] = [clampTint(a.weapon[0]), clampTint(a.weapon[1]), clampTint(a.weapon[2])];
  // Donor keeps the weapon tint from being exactly zero (reason not read); the same floor is kept here.
  if (Math.hypot(weapon[0], weapon[1], weapon[2]) < 0.001) weapon = [0.001, 0.001, 0.001];
  return {
    family: fam.id,
    model: fam.model,
    skin: Math.max(0, Math.trunc(a.skin)),
    slots,
    primary: [clamp01(a.primary[0]), clamp01(a.primary[1]), clamp01(a.primary[2])],
    weapon,
  };
}

// Donor rule: a hands row flagged matchBodySkin takes the player's skin, otherwise the row's own skin.
function handsSkin(fam: BodyFamily, playerSkin: number): number {
  return fam.matchBodySkin ? Math.max(0, Math.trunc(playerSkin)) : fam.handsSkin;
}

// Hands use the digit-string form (one character per slot), a different format from the space-separated player cvar.
function parseHandsBody(s: string, count: number): number[] {
  return Array.from({ length: count }, (_, k) => (s.charAt(k) === '1' ? 1 : 0));
}

export { handsSkin };
```

## 5. Lands in

- TARGET `origins/server/appearance-rows.ts` (new module, proposed; not checked against the Frankendom repo). Resolves a saved look to a catalogue row on the server; the client draws what the server resolved.
- Parity row 15 (gear dressing). The brief hint was row 3, but row 3 is guard, parry and stamina; gear dressing is the row that covers what is drawn on the rig.
- Reuse tag: rewrite-from-idea (no licence declared; clean-room only).
- Brief rule served: catalogue rows as data (the family table is data; the function holds no constants); the server resolves, the client draws.

## 6. Gaps and risks

- No licence is declared: clean-room only.
- No creation flow, no faces, no scars, no name rules, no class choice at start. The donor has a model picker and per-player cvars only. Frankendom's creation work cannot take its flow from this donor.
- Defect A1, unchecked client values: `cl_playerbodygroups`, `cl_playerskin` and the colours are client-supplied userinfo (`player_sandbox.lua` 7-10) and are applied with no check against the model's variant count (96). fix: clamp each slot to the family's count and reject unknown family ids on the server (the sketch's `resolve`).
- Defect A2, two formats for one idea: the player's bodygroups are space-separated (94), while the hands row uses one digit per slot (`player_manager.lua` 42, 145). A digit string such as `"0100000"` typed into the player cvar becomes a single token, and `tonumber` reads it as one number for slot 0 (not tested; engine behaviour for an out-of-range slot not read). fix: one format for rows and saved values, parsed the same way.
- Defect A3, weapon tint help text: the help says 0-1 (line 8) but the default is 1.80 and 2.10. Clamping every channel to 0-1, as the primary colour would be, changes the look; keep the donor's range for the weapon tint or check the Frankendom look first.
- The weapon colour floor (112-113) has no reason in the donor (not read). The sketch keeps it.
- Fallbacks are silent (90, 103, 116): an unknown model shows as kleiner with no notice. fix: log the fallback to the server ledger so a retired family is visible.
- Not verified: the 15 stock families' bodygroup counts (the donor does not list them in Lua); the engine's rule for an out-of-range `SetBodygroup`; the rest of `player_manager.lua` (150-414) and the taunt camera and class files (not read). The spawn-menu content for player models is the picker in `editor_player.lua` (60-95), read in part.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- base/gamemode/player.lua 277-286 is GM:PlayerSetHandsModel, not 'SetupHands' (an engine call at 257). Confirmed.
- The hands skin is `info.matchBodySkin and pl:GetSkin() or info.skin` (line 283), not only the registry row's skin. Confirmed.
- Missed: class `GetHandsModel` hook is tried before the registry (277-279). Confirmed.
- Missed: `AddValidHands` has a 5th field `matchBodySkin` (player_manager.lua:40-42): hands skin follows the player's chosen skin; the sketch dropped it.
Fixed 2026-10-12: Mechanism spawn-order bullet, registry bullet, Skin row, Key functions and Checked line now name PlayerSetHandsModel and matchBodySkin; sketch gained `handsSkin`/`matchBodySkin` fields (work/gm002-appearance-rows.ts updated).
