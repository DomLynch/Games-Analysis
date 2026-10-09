# luanti-org-luanti (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/luanti-org-luanti/builtin/game/hud.lua | Licence: LGPL | Lua | symbol update_hud / register_builtin_hud_element

## 1. Mechanism

- A registry of built-in HUD elements (health bar, breath bar, and others). Each element registers a definition with a `show_elem` gate, an `update_def` (run before the element is added), an `update_elem` (run on later updates, not when the element is first added or recreated), and a list of named events that trigger it (lines 1-27). The event `hud_changed` always updates every element (84-87).
- Per player, a table maps element name to the engine's HUD id. Nothing is kept in the simulation.
- Update: `update_hud` runs over all elements, or only the named ones, from `hud_changed` and from custom events. `update_element` decides per element: if the gate says hide, the engine element is removed; if it has no id yet, it is added using `update_def`; otherwise `update_elem` is called.
- Health bar (156-180): the value shown is `ceil(hp / max(hp_max, hp) * item)`, where `item` is the nominal length (default `PLAYER_MAX_HP_DEFAULT`, value not read), so the bar never overflows. The gate needs the `healthbar` flag, the `enable_damage` setting and a player who is not immortal (armour group). With both `hp_max` and `hp` zero the division is 0/0.
- Breath bar (187-244): the same scaling. It is added only when breath is below the maximum; once added it stays through a full-breath state, and `update_elem` starts a one-second `core.after` removal job when breath is full, cancelled if breath drops again (222-241).
- Input: the player's flags, armour groups, hit points, breath and property maxima, and the events. Output: engine HUD element calls (add, change, remove). No simulation state changes.

## 2. Key functions

- `register_builtin_hud_element`, `/mnt/frankendom-donors/luanti-org-luanti/builtin/game/hud.lua`, lines 21-27. Registers the definition and its event list.
- `update_element`, same file, lines 35-60. Gate, add, or update decision.
- `update_hud`, same file, lines 64-79. Runs all or named elements for one player.
- `scale_to_hud_max`, same file, lines 143-154. Scales a value to the element's nominal length, with the maximum guard.
- `register_builtin_hud_element("health", ...)`, same file, lines 156-180. The health element: gate on flags and immortality, update on property and health events.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Register elements with a gate, a def, and an update, and bind them to named events | Event names `health_changed`, `breath_changed`, `properties_changed` (theirs) |
| Scale current over max to a nominal length, with max at least current | Nominal length equal to the max hit points default (theirs) |
| Remove an element when its gate is false, add it when new, otherwise update | Sprite names (`heart.png`, `bubble.png`), offsets and 24 px size (lines 160-166, 191-197) (theirs) |
| Delayed removal of a transient element | One-second removal delay (line 225) (theirs) |

## 4. TypeScript sketch

simplified: the donor's `hud_changed` event updates every element, not only bound ones; the gate also takes the player's HUD flags and the element id (the breath gate differs before and after the element exists); `hud_replace_builtin` and the removal timer are omitted; `scaleToMax` returns 0 for a zero max, where the donor gets 0/0.

```ts
// Licence: LGPL - clean-room sketch, no lines translated
// Clean-room: a named-event HUD registry where each element has a gate, a one-time setup, and a per-event update.
type Flags = { healthbar: boolean; breathbar: boolean };
type Player = { name: string; hp: number; hpMax: number; flags: Flags };
type Elem = {
  show: (p: Player, id: number | undefined) => boolean;
  setup: (p: Player) => number; // returns an engine element id
  update: (p: Player, id: number) => void;
  events: string[];
};
const elems = new Map<string, Elem>();
const byEvent = new Map<string, string[]>();
const engineIds = new Map<string, Map<string, number>>(); // player -> element -> id
function register(name: string, e: Elem): void {
  elems.set(name, e);
  for (const ev of e.events) byEvent.set(ev, [...(byEvent.get(ev) ?? []), name]);
}
// One element for one player: remove when the gate says hide, add when new, else update.
function updateElement(p: Player, name: string): void {
  const e = elems.get(name);
  if (!e) return;
  const ids = engineIds.get(p.name) ?? new Map<string, number>();
  engineIds.set(p.name, ids);
  const id = ids.get(name);
  if (!e.show(p, id)) {
    ids.delete(name);
    return;
  }
  if (id === undefined) { ids.set(name, e.setup(p)); return; }
  e.update(p, id);
}
// Event entry point: update only the elements bound to that event.
function onEvent(p: Player, ev: string): void {
  for (const name of byEvent.get(ev) ?? []) updateElement(p, name);
}
// Scale current over max to a nominal length; the max is never below current.
function scaleToMax(current: number, max: number, nominal: number): number {
  const m = Math.max(max, current);
  return m > 0 ? Math.ceil((current / m) * nominal) : 0;
}
```

## 5. Lands in

- Frankendom target: `src/fight/hud.ts` (element registry and health bar), parity checklist row 14 (HUD); today: `src/hud.ts` (moving).
- Reuse tag: rewrite-from-idea (LGPL, clean-room sketch only).
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The donor updates on named engine events (`hud_changed`, `health_changed`, ...), not on a tick. Frankendom's HUD updates from the one fight state's tick (`src/fight/`), or the bar will lag the fight.
- The `max(hp_max, hp)` guard stops overflow but not a zero max: 0/0 gives NaN at line 153. Frankendom needs the zero case explicit.
- Breath and similar transient elements depend on a delayed removal timer. Frankendom has no breath system; keep this only if a zone needs it.
- The gate reads immortality (armour group), the player's HUD flags and a global setting. Frankendom's gate reads zone data (zones as data, defaults on every property).
- Client-only; no kill or ledger authority in this file.
