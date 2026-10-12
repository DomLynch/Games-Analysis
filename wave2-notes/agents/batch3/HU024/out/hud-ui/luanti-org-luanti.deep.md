# luanti-org-luanti (hud-ui, cell 1)

Donor: `/mnt/frankendom-donors/luanti-org-luanti/builtin/game/hud.lua` | Licence: LGPL-2.1-or-later (README badge; SPDX header in `src/gui/touchcontrols.cpp`; `hud.lua` itself has no licence header) | Lua | symbol `update_element`

Checked: `builtin/game/hud.lua` read in full (281 lines, numbered). Its callers were all read in the same file: `update_element` is called from `update_hud` (72, 76) and `hud_replace_builtin` (114); `update_hud` from `player_event_handler` (85, 92) and the join hook (129). Constants read in `src/constants.h` (81, 84). Confidence high for the Lua registry. Not read: the C++ host (`hud_add`, `hud_change`, statbar drawing, which engine events fire `health_changed` and `breath_changed`). Candidates opened or grepped and not used for this verdict: `src/gui/touchcontrols.cpp` (grep only), `src/client/minimap.cpp` (grep only), `po/de/luanti.po` (string table, counted, see section 3). Lock-on and target-frame grep over `src/` and `builtin/` returned one hit, `src/server/clientiface.h`, which is not a HUD file (not read); no HUD target frame or lock-on element was found.

## 1. Mechanism

- Each built-in HUD element (health, breath, minimap, hotbar) is registered once by name with a data definition `elem_def` (type, position, offset, size, icons) plus optional hooks `show_elem`, `update_def`, `update_elem`, and a list of events that refresh it (21-27, 156-180, 187-244, 248-266, 270-281).
- Order inside `update_element` (35-60), per element: (1) the show gate runs first; if it returns false the element is removed if present and the function stops (39-45); (2) if the element is not present, `update_def` runs, then `hud_add`, and the function stops, so `update_elem` is not called on first sighting (47-54); (3) if it is present, `update_elem` runs (57-59).
- Routing (81-94): `hud_changed` refreshes every element (84-86). Any other engine event refreshes only the elements registered for that event (90-93). A health change therefore touches the health bar and nothing else.
- Health (138-180): shown when the healthbar flag is set, `enable_damage` is on (read once at load, 141) and the player is not immortal (169-172). Value: `scale_to_hud_max` (143-154) returns `ceil(current / max(hp_max, current) x nominal)` (152-153). Nominal is 20 units; the `max(hp_max, current)` term keeps the value at or below the nominal, so an over-max value cannot overflow the bar.
- Breath (182-244): nominal is `breath max x 2` (193-194), so the bar has 20 half-bubble units for breath max 10. Show gate: if the bar already exists it stays while the flags allow (200-207); if it does not exist yet it is also added only when breath is below max (208-210), so a full bar is never added. When breath is full (`update_elem`, 216-243) the bar is not removed at once: one removal job per player is created with `core.after(1, ...)` (222-233). If breath becomes relevant again before the job fires, the job is cancelled (236-241).
- Minimap (246-266): shown only when the flag is set and the client protocol is 44 or newer (256-260). Size is a percentage when the protocol is 45 or newer, else a fixed 256 x 256 (261-265). Older clients already draw it in C++.
- Hotbar (270-281): flag only.
- Join (127-131): `update_hud` for the whole HUD once. Leave (120-122): clears the element id table only. Replace (98-118): `hud_replace_builtin` copies the new def and removes and re-adds that element for every connected player.

## 2. Key functions

- `register_builtin_hud_element`: `/mnt/frankendom-donors/luanti-org-luanti/builtin/game/hud.lua` 21-27 (stores def, builds event map).
- `update_element`: same file, 35-60 (show gate, add, update). Read in full.
- `update_hud`: same file, 64-79 (all elements, or a named list).
- `player_event_handler`: same file, 81-94 (routing).
- `scale_to_hud_max`: same file, 143-154 (value scaling).
- Breath `update_elem` with linger: same file, 216-243.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Bar value = ceil(current / max(max, current) x nominal), never above nominal | Health nominal 20 = `PLAYER_MAX_HP_DEFAULT` (theirs, `src/constants.h` 81) |
| Show gate before any add or change; an existing bar is not removed by a "full" test | Flags, `enable_damage` (141), immortal armour group (171, 202) |
| Idle element lingers a grace period, then is removed; recovery cancels the job | Grace 1 s (`core.after(1, ...)`, 225); one job per player (223) |
| Breath bar in half units | Nominal `PLAYER_MAX_BREATH_DEFAULT x 2` (theirs, `src/constants.h` 84; hud.lua 193-194) |
| Element position as data | Health offset x = (-10 x 24) - 25, y = -(48 + 24 + 16) (166); breath offset x = 25, y = -(48 + 24 + 16) (197); units as the Lua HUD API uses them (not read in C++) |
| Minimap available by client version | Protocol 44 (259), percentage size at 45 (264) |

String table fold-in (`po/`): 78 locale folders, each one gettext `luanti.po`. In `po/de/luanti.po`: 1,575 entries (msgid/msgstr pairs), 0 plural entries, 0 fuzzy entries, 327 untranslated (empty msgstr), 14 obsolete entries kept as commented `#~` lines, a `#:` source-file reference above each entry, and 34 lines marked c-format. The header declares two plural forms but no entry uses them. Across all 78 folders there are about 122,850 entries. Minimap state strings sit in the same file (for example the radar and surface modes with a zoom placeholder).

## 4. TypeScript sketch

simplified: the sketch replaces the Lua host (`hud_add`, `hud_change`, `hud_remove`) with an injected interface and computes the number before the add (the donor does the same in `update_def`). It drops `enable_damage` (treated as on), the minimap and hotbar, the protocol gates, the layout offsets (Frankendom's HUD owns layout) and `hud_replace_builtin`. It generalises the linger from breath alone to any element with `idle` and `lingerS`. It adds two fixes from section 6: the 0/0 guard in `scaled`, and cancelling the linger job on leave.

```ts
// clean-room: written from the described mechanism (show gate, event-routed refresh,
// scaled statbar, linger timer). Donor licence LGPL-2.1-or-later; no line is translated.

interface Player {
  name: string;
  flags: { healthbar: boolean; breathbar: boolean };
  immortal: boolean;
  hp: number;
  hpMax: number;
  breath: number;
  breathMax: number;
}

interface Hud {
  add(player: string, elem: string, number: number): number;
  change(id: number, number: number): void;
  remove(id: number): void;
}

interface Timer { cancel(): void; }
type After = (seconds: number, fn: () => void) => Timer;

interface ElemDef {
  nominal: number;                          // units shown when full (data)
  current(p: Player): number;
  max(p: Player): number;
  show(p: Player, present: boolean): boolean; // show gate, runs before any add or change
  idle?(p: Player): boolean;                // true when the element is no longer needed
  lingerS?: number;                         // seconds an idle element stays before removal
}

const HP_MAX_DEFAULT = 20;                  // engine constant (donor: PLAYER_MAX_HP_DEFAULT)
const BREATH_MAX_DEFAULT = 10;              // engine constant (donor: PLAYER_MAX_BREATH_DEFAULT)
const BREATH_LINGER_S = 1;                  // data field (donor: core.after(1, ...))

// Scale to the HUD: never above nominal, never divides by zero.
function scaled(def: ElemDef, p: Player): number {
  const cur = def.current(p);
  const maxDisplay = Math.max(def.max(p), cur);
  if (maxDisplay <= 0) return 0;            // fix: donor computes 0 / 0 when max and current are both 0
  return Math.ceil((cur / maxDisplay) * def.nominal);
}

class HudRegistry {
  private defs = new Map<string, ElemDef>();
  private routes = new Map<string, string[]>();
  private ids = new Map<string, Map<string, number>>();
  private linger = new Map<string, Timer>();

  constructor(private hud: Hud, private after: After) {}

  register(name: string, events: string[], def: ElemDef): void {
    this.defs.set(name, def);
    for (const e of events) {
      this.routes.set(e, [...(this.routes.get(e) ?? []), name]);
    }
  }

  // "hud_changed" refreshes everything; any other event refreshes only its routed elements.
  onEvent(p: Player, event: string): void {
    const names = event === "hud_changed" ? [...this.defs.keys()] : (this.routes.get(event) ?? []);
    for (const n of names) this.update(p, n);
  }

  // fix: donor leaves a pending linger job running after leave; cancel it here.
  onLeave(name: string): void {
    this.ids.delete(name);
    this.cancelRemoval(name);
  }

  private playerIds(name: string): Map<string, number> {
    let m = this.ids.get(name);
    if (!m) { m = new Map(); this.ids.set(name, m); }
    return m;
  }

  private update(p: Player, name: string): void {
    const def = this.defs.get(name);
    if (!def) return;
    const ids = this.playerIds(p.name);
    const id = ids.get(name);

    if (!def.show(p, id !== undefined)) {   // 1. show gate first
      if (id !== undefined) { this.hud.remove(id); ids.delete(name); }
      return;
    }
    if (id === undefined) {                 // 2. first sighting: add and stop
      ids.set(name, this.hud.add(p.name, name, scaled(def, p)));
      return;
    }
    this.hud.change(id, scaled(def, p));    // 3. existing element: change, then linger logic
    if (def.idle && def.lingerS !== undefined) {
      if (def.idle(p)) this.scheduleRemoval(p.name, name, def.lingerS);
      else this.cancelRemoval(p.name);
    }
  }

  private scheduleRemoval(player: string, name: string, seconds: number): void {
    if (this.linger.has(player)) return;    // one pending job per player
    this.linger.set(player, this.after(seconds, () => {
      this.linger.delete(player);
      const ids = this.ids.get(player);
      const id = ids?.get(name);
      if (ids && id !== undefined) { this.hud.remove(id); ids.delete(name); }
    }));
  }

  private cancelRemoval(player: string): void {
    const job = this.linger.get(player);
    if (job) { job.cancel(); this.linger.delete(player); }
  }
}

const health: ElemDef = {
  nominal: HP_MAX_DEFAULT,
  current: (p) => p.hp,
  max: (p) => p.hpMax,
  show: (p) => p.flags.healthbar && !p.immortal,
};

const breath: ElemDef = {
  nominal: BREATH_MAX_DEFAULT * 2,          // half-bubble units, as in the donor
  current: (p) => p.breath,
  max: (p) => p.breathMax,
  show: (p, present) => {
    const flagged = p.flags.breathbar && !p.immortal;
    if (present) return flagged;            // an existing bar is not removed early
    return flagged && p.breath < p.breathMax; // do not add a full bar
  },
  idle: (p) => p.breath >= p.breathMax,
  lingerS: BREATH_LINGER_S,
};

export { HudRegistry, health, breath };
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 luanti-hud-registry.ts` on the VPS (/tmp), exit 0.

## 5. Lands in

- TARGET `src/fight/hud.ts` (new, pure model: show gates, event routing, scaled bars, linger). The Pit and the zones render it as clients; the view code is client-only.
- Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (LGPL-2.1-or-later; clean-room, shape only).
- Brief rule served: HUD is client-only and reads engine state (Frankendom rulings: one engine, the camera/HUD/sound are client-only); section 5 target and row 14 as above.

## 6. Gaps and risks

- LGPL-2.1-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- The C++ host is not read (`hud_add`, `hud_change`, statbar drawing, the events that fire `health_changed` and `breath_changed`). (not read)
- Defect 1, fixed in the sketch: `scale_to_hud_max` divides by `max(max, current)`, which is 0 when hp max and hp are both 0 (152-153). Not reachable with the default max of 20 and not exercised here. fix: return 0 when the denominator is 0 (`scaled`).
- Defect 2, fixed in the sketch: leave clears the id table only (120-122) and never cancels the pending breath linger job. A player who leaves and rejoins inside the 1 s window can have the old job remove the new session's bar, until the next breath event. Narrow window, not run on a server. fix: cancel the job in `onLeave`.
- Frankendom ruling "one ledger": the donor reads the player's stats directly at each refresh. Frankendom's HUD values must come from the server-verified fight state; a client bar is never the source of truth.
- Frankendom ruling "MAX_ATTACKERS = 3": the registry holds one element per name. A target frame for up to three attackers needs a per-target id; this file has no such element, and the lock-on grep found none. This is a gap, not something the donor provides.
- Touch UX and minimap modes are candidates for a later pass, not in this note. `src/gui/touchcontrols.cpp` (832 lines) has a tap versus long-tap state machine: the long-tap test is at line 650 (`if (delta > m_long_tap_delay) {`), with a 400 ms default (`src/defaultsettings.cpp` 557). Located by grep only. `src/client/minimap.cpp` has hidden, surface and radar modes; located by grep only.
- Visual readability at 375 wide, death presentation and idle animation are not in this file. Not read.

Best transferable idea: a HUD element is data plus a show gate plus the list of events that refresh only it, and a bar that goes idle lingers one second before removal and is cancelled if the value recovers.

Decision (proposed): adapt — keep the show-gate-then-add/change/remove order and the event-routed refresh with the linger as data; reject the Lua host API and the pixel offsets, since the client view owns layout.
Acceptance: On a 375-wide phone the breath-style bar appears only while below max, stays for 1.0 s after reaching full, then disappears; a unit test asserts removal at 1.0 s, cancellation when the value drops below max first, and a health value with hpMax = 0 renders 0 with no NaN.

Reuse tag: rewrite-from-idea (LGPL-2.1-or-later; clean-room, shape only)

Brief rule served: parity row 14 (HUD, client-only); section 6 rulings (one ledger, MAX_ATTACKERS = 3).
