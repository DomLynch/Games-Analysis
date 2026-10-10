# DCurrent-openbor (quests-dialogue, cell 2)

Donor: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` | Licence: BSD 3-clause style (LICENSE lines 1-11: copyright Roel van Mastbergen & Senile Team 2003, OpenBOR Team 2004; source and binary redistribution, and the endorsement clause at line 11) | C | symbol `text_think`

Checked: Read the text-box path end to end: model parse (openbor.c 13805-13807, 13891-13892), spawn (27653-27656, 28606 onward, the textbox assignment at 28735), `is_frozen` (1422-1426), the freeze gates in `check_attack` (33096), `check_move` (33819) and `update_ents` (33927-33970), `expand_time` (openbor.h 1838-1850), the page advance and skip in `update_animation` (32895-33056), `text_think` (49240-49247), removal in `kill_entity` (28781-28902), `kill_all` (28906-28923), and the logic clock in `update` (51467-51606). Callers: `is_frozen` has five call sites in openbor.c (32251, 32495, 33096, 33819, 33968). I read 33096, 33819 and 33968 in context; 32251 and 32495 were seen in grep only. Confidence: high for the freeze, the timer hold, the skip and the removal; moderate for the speed clock (`timer_getinterval` at 50812 was not read). Not read: `update_frame` (where a page's delay is set), the drawing of the text frames, and the script-side spawn of a text box (only the `textbox` system property at openborscript.c 9423 was seen). Depth is thin for the topic: this donor has a dialogue box and nothing else for quests or dialogue. It has no quest state, no objectives beyond the level rules, and no dialogue tree or branching. camera_scope: not applicable.

Best transferable idea: a dialogue box is one active overlay entity that holds the other actors' timers (not their logic) while it is up, advances one page per timer tick or per fresh skip press, and removes itself when its last page is drawn.
Decision (proposed): adapt - keep the single active box with re-election, the held timers, the one-press-one-page skip and the self-removal at the last page, all as client presentation; reject freezing the shared zone or a server fight for a line of text, because the donor's freeze is a whole-world pause and Frankendom's fights and zones are server-verified.
Acceptance: a player in a zone who opens a dialogue box cannot attack or move while it is up; their attack cooldown does not run out during the box and resumes with its remaining time after the last page; one skip press shows one page; a second dialogue waits in a queue rather than replacing the box; the box closes itself after its last page with no key press.

## 1. Mechanism

- A text box is an ordinary entity whose model type is "text" (openbor.c 13805-13807). Its think function is `text_think` (27656). A model can mark it `noskip` (13891-13892), which sets `SUBTYPE_NOSKIP` (openbor.h 649) and turns off the skip key for that box.
- Spawn: when a text-box entity is spawned, the global `textbox` pointer is set to it (28735). There is no check for an existing box, so the newest box becomes the active one.
- Freeze: `is_frozen(e)` (1422-1426) is true for every entity that is not a text box while `textbox` is set (1424). It is also true for the smart-bomber case and for an entity with its own freeze timer (1424-1425). Each tick, `update_ents` (33927) gives a frozen entity `expand_time` instead of its normal update (33968-33970). Attacks (33096) and movement (33819) are refused for a frozen entity too.
- Timer hold: `expand_time` (openbor.h 1838-1850) adds one to each live timer of the held entity: stall, release, next-animation (if it is not the sentinel), next-think, next-move, magic, guard, toss, mana-charge, invincibility, turn and seal timers. Freeze time is extended only while a text box or smart bomber is active (1846). The timers are compared against the tick counter, so adding one per held tick keeps each timer's remaining time, which means the wait does not use it up.
- Page advance: in `update_animation` (32895), a text box's frame moves when its next-animation time has passed (32976-32977), or when the box is not `noskip` and a skip key is in the ORed new-key set (32978-32980). The skip keys are jump, attack 1-4 and special (32981-32986). The new-key set is the OR of all players' new keys (51029), so any player can skip.
- After a page is drawn, the new-key set is cleared (33050-33056, "stop mutiple skips"). One press therefore moves one page.
- Last page: when the frame index runs past the end and the animation does not loop, `animating` is set to none (33033) and the last frame stays on screen. If the model has the animation-complete autokill, the entity is killed there.
- Removal: `text_think` (49240-49247) kills the box with the text-animation-complete trigger once `animating` is zero (49243-49245). So a box removes itself after its last page even without autokill.
- Removal of the active box: `kill_entity` (28781) marks the victim as not existing first (28798). If the victim is the active box, the pointer is cleared (28845-28846). Then a loop over the entity list sets `self` to each entity in turn (28852). If the pointer is still null and that entity is a text box, it becomes the active box (28891-28892). The loop goes in list order, so the first live text box is the new active one. `self` is restored at the end (28902).
- Global reset: `kill_all` clears `textbox` and `smartbomber` (28923).
- Clock: `update` (51467) runs logic passes while the tick counter is below the target (51538). Each pass runs the entity updates and then adds one to the counter (51604). The normal-speed target is the counter plus the interval (51521). A target more than 100 ticks ahead is capped (51533-51534). The interval comes from `timer_getinterval` (50812, not read) and is clamped: set to 1 when above the game speed and to game speed divided by 4 when above that (50815-50819).

## 2. Key functions

- `is_frozen`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 1422-1426. The one rule that freezes the world: any non-box entity while a box is active.
- `expand_time` (macro): `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.h` 1838-1850. The timer hold.
- `update_animation`, text-box branch: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 32895-33056. The page advance, the skip and the end of the animation.
- `update_ents`, freeze branch: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 33927-33970. Held entities get `expand_time` and no update.
- `kill_entity`, box pointer: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 28781-28902. Clears the pointer and re-elects a live box.
- `text_think`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 49240-49247. Removes the box once its animation has ended.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One active overlay pointer; the newest spawn wins; the first live overlay is re-elected when the active one is removed | None (28735, 28891-28892) |
| Freeze every actor except the overlay while it is up | None (rule, 1424) |
| Hold each timer by adding one per held tick, so its remaining time is kept | +1 per held tick (openbor.h 1838-1850); freeze time only while a box is up (1846) |
| Advance one page on a timer or on one fresh skip press, then clear the presses | Skip keys: jump, attack 1-4, special (32981-32986); the noskip flag (openbor.h 649) |
| Remove the overlay when its page sequence ends | Animation end flag (33033); removal in text_think (49243-49245) |
| Cap a catch-up run of logic ticks | 100 ticks (theirs, 51533); a loop constant, not a text-box one |

## 4. TypeScript sketch

simplified: the sketch follows the donor order: a frozen actor only holds its timers; the active box advances one page on its timer or on a skip press; a skip press that draws a page clears the presses; a box that has no page left is removed; removal re-elects the first live box in list order. It omits the donor's other freeze causes (smart bomber, per-entity freeze time), the full set of timers that `expand_time` holds (the sketch holds two), the frame-drawing and the frame delay source (`update_frame`, not read), the autokill flag, the page loop mode beyond a simple wrap, the donor's clearing of the new-key set for any entity (the sketch clears it only when a box draws a page), and the script-side spawn. Timer units are game ticks in the sketch; the donor uses its own tick counter.

```ts
// Licence: BSD-3-Clause (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const SKIP = 1; // one bit for "any skip key pressed this tick" (donor: attack, jump, special bits)

interface Actor {
  id: number;
  kind: "fighter" | "textbox";
  alive: boolean;
  nextMoveAt: number;   // absolute tick stamp; 0 = unset
  cooldownAt: number;   // absolute tick stamp; 0 = unset
}

interface TextBox extends Actor {
  kind: "textbox";
  frame: number;
  frameCount: number;
  dir: 1 | -1 | 0;      // 0 = animation finished
  loop: boolean;
  noSkip: boolean;      // donor SUBTYPE_NOSKIP
  nextFrameAt: number;  // absolute tick stamp for the next page
  frameDelay: number;   // ticks per page (from data)
}

interface World {
  tick: number;
  actors: Actor[];
  textbox: TextBox | null;   // the single active box
}

// Donor is_frozen: a live text box freezes every other actor.
function isFrozen(w: World, a: Actor): boolean {
  return w.textbox !== null && a.kind !== "textbox";
}

// Donor expand_time: while frozen, each stamp moves forward one tick per frozen tick, so the wait is held.
function holdTimers(a: Actor): void {
  if (a.nextMoveAt > 0) a.nextMoveAt += 1;
  if (a.cooldownAt > 0) a.cooldownAt += 1;
}

// Donor spawn: the newest text box becomes the active one.
function spawnTextBox(w: World, tb: TextBox): void {
  w.actors.push(tb);
  w.textbox = tb;
}

// Donor kill_entity: clear the pointer if the active box dies, then re-elect the first live text box in list order.
function killActor(w: World, victim: Actor): void {
  victim.alive = false;
  if (w.textbox === victim) {
    w.textbox = null;
    const next = w.actors.find((a): a is TextBox => a.alive && a.kind === "textbox");
    if (next !== undefined) w.textbox = next;
  }
}

// Donor update_animation for a text box: a page advances on its timer or on a skip press.
// Returns true only when a page was actually drawn; the caller then clears the keys (donor sets bothnewkeys = 0).
function updateTextBox(w: World, tb: TextBox, keys: number): boolean {
  const skipPressed = !tb.noSkip && (keys & SKIP) !== 0;
  const timerDue = tb.nextFrameAt <= w.tick;
  if (tb.dir === 0 || !(timerDue || skipPressed)) return false;

  let f = tb.frame + tb.dir;
  if (f >= tb.frameCount || f < 0) {
    if (!tb.loop) {
      tb.dir = 0;            // hold the last page and stop; no page drawn
      return false;
    }
    f = tb.dir < 0 ? tb.frameCount - 1 : 0;
  }
  tb.frame = f;
  tb.nextFrameAt = w.tick + tb.frameDelay;
  return true;
}

// One logic tick. Frozen actors only hold their timers; the text box removes itself when its sequence ends.
function tickWorld(w: World, keys: number): number {
  let keysLeft = keys;
  for (const a of w.actors) {
    if (!a.alive) continue;
    if (a.kind === "textbox") {
      const tb = a as TextBox;
      if (updateTextBox(w, tb, keysLeft)) keysLeft = 0; // one skip press advances one page
      if (tb.dir === 0) killActor(w, tb);
      continue;
    }
    if (isFrozen(w, a)) {
      holdTimers(a);
      continue;
    }
    // ordinary actor update (movement, attacks, AI) is not modelled here
  }
  w.tick += 1;
  return keysLeft;
}
```

## 5. Lands in

- TARGET `origins/client/dialogue-box.ts` (new module, proposed; the Frankendom layout was not checked here): the client overlay, its page queue, the skip press and the removal after the last page. The one input lock it asks for is a server-side flag on the one player's actions, kept in the server's quest record (see cell 1 for the report-back side).
- Parity-checklist row 14 (HUD): the box is an overlay on the screen. The input-lock part touches row 5 (controls and input), which is not the row named here.
- Reuse tag: rewrite-from-idea (BSD-3-Clause; the code may be adapted, but this sketch is clean-room)
- Brief rule served: camera, HUD and sound are client-only (the box is presentation); server-verified (the server decides the lock, not the client overlay)

## 6. Gaps and risks

- The donor freezes the whole world: every actor, not only the speaker. Frankendom's fights and zones are server-verified, so a text box must never stop the server's clock or the other players. Port the hold to the one player's actions and their cooldowns only.
- Any player may skip, because the donor ORs all players' new keys (openbor.c 51029). Frankendom must choose per dialogue who may skip, and test it.
- One active box: a second spawn replaces the pointer (28735), and the old box keeps moving without the freeze. Frankendom should queue a second dialogue, never replace an open one.
- Timers are held by adding one per held tick against a shared counter. This works only because one loop drives both the holds and the clock. Frankendom should store the remaining time when the lock starts and restore it when the lock ends, which does not depend on the loop order.
- The donor's text box plays animation frames, and its comment says "text/images" (openbor.c 13805). Whether the words come from authored images or from strings was not read (update_frame and the draw path were not read). Frankendom's dialogue text should be data strings whatever the donor does.
- The removal in `kill_entity` is correct only because the victim is marked as not existing first (28798). If the order changes in a port, the box can be re-elected by mistake.
- Global reset: `kill_all` clears the box pointer (28923). A port must clear the lock on zone change, death and disconnect, and test each.
- No quest state, objectives, branching or dialogue tree exists in this donor. The quest side of the topic is covered by cell 1 (CleverRaven-Cataclysm-DDA). Any dialogue-tree idea needs another donor.
