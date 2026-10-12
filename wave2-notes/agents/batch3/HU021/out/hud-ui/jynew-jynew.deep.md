# jynew-jynew (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameCore/InputLogics/Core/Context/InputContextManager.cs` | Licence: restricted (README.md line 291 says the code is MIT, but the project LICENSE line 8 says "The use of any resources or code of this project is not permitted unless authorized", and README line 291 says the community asset licence overrides MIT; clean-room, shape only) | C# (Unity) | symbol `InputContextManager`

Checked: Read in full: `InputContextManager.cs` (142 lines), `Jyx2Input_UIContext.cs` (80 lines), `Jyx2_PlayerInput.cs` (287 lines). Read in part: `Jyx2InputContextBase.cs` 17-24; `Jyx2_UIManager.cs` 79-135 and 228-320; `Jyx2_UIBase.cs` 80-100; `Translator.cs` 1-80 and 200-243; `TranslatorDef/TranslationStruct.cs` (full); `TranslateAttacher/TextAttacher.cs` (full); `TranslatorDef/TranslationUtility.cs` 30-60 and 80-100. Callers, by grep: `AddInputContext` is called from `Jyx2InputContextBase.cs:19` (every UI context), `Jyx2_PlayerInput.cs:46`, `DebugPanel.cs:49` and `BattleboxHelper.cs:58`. `IsTopVisibleUI` and `isOnTop` have no callers in `Scripts/`, `LuaScripts/` or `Mods/` (checked by grep; `isOnTop` is only defined at `Jyx2_UIBase.cs:92`). Camera scope: not a camera cell. Confidence high on the input stack and its focus memory. Not read: `Jyx2_Input.OnUpdate` (global keys, runs under any context), the body of `BattleActionUIPanel.cs` (477 lines; method list only), `MainUIPanel.cs` compass and map name (method list only), `BigMapLocationNameDrawer.cs` (method list only), the decoded string-table blob.

## 1. Mechanism

- A stack of input contexts decides which one reads the keys. The top of the stack is the only context that gets `OnUpdate`. The player context is one entry on it; each open panel is another.
- Order of steps, per frame (`InputContextManager.Update`, line 131):
  (a) If the loading panel is open, nothing runs (line 133 checks `IsLoading`, which is line 33).
  (b) Global input runs (`Jyx2_Input.OnUpdate`, not read).
  (c) If there is a top context and its `CanUpdate` is true (line 136), only that context runs `OnUpdate`.
- Entering: each UI context is a component that inherits `Jyx2InputContextBase`. Its `OnEnable` calls `AddInputContext(this)` (base line 19), and its `OnDisable` calls `RemoveInputContext(this)` (base line 24). The stack therefore follows whether the panel's object is active.
- `AddInputContext` (line 63): a duplicate is refused with an error (67-69); the outgoing top stores its focus (before the insert, only if it is a UI context); the new context goes on top, or at index 0 (the bottom) when `insertToHead` is true (lines 77-79); a new UI context selects its control (TrySelectMyUIObject); if the outgoing top was the player context, the player-input-change event fires with `false`.
- `RemoveInputContext` (line 96): the removed context stores its focus only if it is the current top UI context (line 115); it is removed from the list (line 103); if the new top is the player context, the change event fires with `true`; then the new top selects its control (line 110).
- Inside a UI context (`Jyx2Input_UIContext.cs`): `TrySelectMyUIObject` returns early when the panel is in manual-select mode and the call is not forced (line 53). Otherwise it selects the remembered control if that control is still active and is not already selected (line 55); otherwise the first-select control if it is active (the next lines, not quoted). `TryStoreLastSelect` clears the memory when nothing is selected, and remembers the selection only when it is a child of this panel (lines 74-76).
- Guard: a UI context's `CanUpdate` is `IsValidFrame` (line 23), and `OnEnable` sets the enable frame to `Time.frameCount + 1` (line 29). So a panel reads input only from the next frame on: one key press cannot run the new panel and the old one on the same frame.
- Controller change (`OnControllerChange`, line 48): mouse changes are ignored (line 52); when the top is a UI context with no valid selection, it selects its default.
- Tick: none. Everything runs from Unity `Update`, per rendered frame.

## 2. Key functions

- `InputContextManager.Update`: `.../Core/Context/InputContextManager.cs` from line 131 (loading check 133, top update 136; end not checked).
- `InputContextManager.AddInputContext`: same file, from line 63 (duplicate 67-69, bottom insert 77-79, select on the new top after the insert; end not checked).
- `InputContextManager.RemoveInputContext`: same file, from line 96 (remove 103, select 110; end not checked).
- `InputContextManager.TryStoreLastSelectObject`: same file, the check at line 115 (only when the context is the top).
- `Jyx2Input_UIContext.TrySelectMyUIObject`: `.../Core/Context/UI/Jyx2Input_UIContext.cs` from line 52 (manual 53, remembered 55; the first-select lines not quoted).
- `Jyx2Input_UIContext.TryStoreLastSelect`: same file, child check line 74, store line 76.
- `Jyx2InputContextBase` enable and disable: `.../Core/Context/Jyx2InputContextBase.cs` lines 17-24.

Line ranges above say where a function starts; the exact closing lines were not checked. Every line number quoted in the receipts file was verified by the receipt verifier.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Only the top of a stack receives input; panels push on open and pop on close | No numbers: list depth is unbounded (not capped in code) |
| A new context reads input from the next frame on (one-frame guard) | `Time.frameCount + 1` (theirs, Jyx2Input_UIContext.cs 29) |
| Focus is remembered per panel and restored when the panel is top again | No timer; the memory is the last selected object while it is inside the panel (theirs, Jyx2Input_UIContext.cs 74-76) |
| Loading screen pauses all input | Panel name "LoadingPanel" compared by string (theirs, InputContextManager.cs 33) |
| Gamepad selection falls back to a default control | Default control set in the editor (`m_FirstSelect`, not a number) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the paused check first, then the top only, then the one-frame guard, then the update. It fixes three donor defects: the bottom insert is named for what it does (`pushToBottom`), focus is remembered on every removal and not only when the removed context is the top, and the one-frame guard applies to every context kind (the donor sets it on the player context but never reads it there, see section 6). It omits the global input call, the player-input change event, the loading panel lookup (replaced by a `paused` flag), the controller-change fallback, the manual-select flag, and the validity check on remembered and first controls (the donor checks that the control is still active; the sketch leaves that to the caller). The duplicate check replaces the donor's logged error with a silent return.

```ts
// Licence: restricted (donor: project LICENSE forbids use of code without authorisation). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface InputContext {
  id: string;
  kind: "player" | "panel";
  enabledFrame: number;        // the context reads input only from this frame on (one-frame guard)
  firstFocus: string | null;   // default control when the panel opens
  lastFocus: string | null;    // control remembered when the panel was last left
  focus: string | null;        // current control (panels only)
  onUpdate(frame: number): void;
}

export class InputStack {
  // The last element is the top. Only the top receives input.
  private stack: InputContext[] = [];
  paused = false;              // e.g. a loading screen is up: no context updates at all

  top(): InputContext | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  // A panel opens on top. The outgoing top keeps its focus; the new panel starts from its remembered control.
  push(ctx: InputContext, frame: number): void {
    if (this.stack.includes(ctx)) return;      // duplicate: ignored
    this.rememberFocus(this.top());
    ctx.enabledFrame = frame + 1;
    this.stack.push(ctx);
    if (ctx.kind === "panel") this.restoreFocus(ctx);
  }

  // The world/player context goes to the bottom, under every panel.
  // Fix: the donor's insertToHead flag does this, and the name reads backwards; this name says what happens.
  pushToBottom(ctx: InputContext, frame: number): void {
    if (this.stack.includes(ctx)) return;
    ctx.enabledFrame = frame + 1;
    this.stack.unshift(ctx);
  }

  // Remove from anywhere. Fix: focus is remembered on every removal, not only when the removed context is on top.
  remove(ctx: InputContext): void {
    const i = this.stack.indexOf(ctx);
    if (i < 0) return;
    this.rememberFocus(ctx);
    this.stack.splice(i, 1);
    const t = this.top();
    if (t !== null && t.kind === "panel") this.restoreFocus(t);
  }

  // Once per client frame: only the top context, and nothing while paused.
  update(frame: number): void {
    const t = this.top();
    if (this.paused || t === null) return;
    if (frame < t.enabledFrame) return;        // the same key cannot reach two contexts in one frame
    t.onUpdate(frame);
  }

  private rememberFocus(ctx: InputContext | null): void {
    if (ctx !== null && ctx.kind === "panel") ctx.lastFocus = ctx.focus;
  }

  private restoreFocus(ctx: InputContext): void {
    ctx.focus = ctx.lastFocus ?? ctx.firstFocus;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/hu021-jynew-panel-focus.ts (with `export {};`): exit 0.

## 5. Lands in

- TARGET `src/fight/panelFocus.ts` (new, client only): one input stack for the fight HUD, the menus, the bag and the debug panel. Only the top panel gets keys; each panel remembers its last control. Parity-checklist row 14 (HUD).
- today: not read (current Frankendom client menus and keys were not opened for this note).
- Reuse tag: rewrite-from-idea (restricted licence; clean-room only)
- Brief rule served: HUD and input are client-only; the stack never decides a hit, a kill or a fight state, and fight commands still go to the server.

Best transferable idea: Keep one input stack where only the top panel reads keys, and remember each panel's last control so closing a panel returns focus to where the player left it.
Decision (proposed): adapt - take the stack and the per-panel focus memory; name the bottom insert for what it does, remember focus on every removal, and use one gate (the stack) rather than the donor's two.
Acceptance: With the fight HUD open, a menu pushed over it takes the arrow keys and the fight ignores them; closing the menu returns the keys to the fight and puts focus back on the control the player last used (a client test pushes, moves focus, pops and asserts focus restored, with no key handled on the push frame).

## 6. Gaps and risks

- Restricted licence: clean-room only. The donor's own licence text (LICENSE line 8) forbids use without authorisation, so no line of this code may be copied.
- Defect 1, the name `insertToHead` is misleading: `true` inserts at index 0, the bottom of the stack (InputContextManager.cs 77-79). Fix: a name for what it does (the sketch's `pushToBottom`).
- Defect 2, focus is stored only when the removed context is the current top (InputContextManager.cs 115). Removing a panel from under another loses its focus. Fix: remember on every removal (sketch `remove`).
- Defect 3, two gates exist for the same job. The layer rule `Jyx2_UIManager.IsTopVisibleUI` (87-116) is defined, but its only path, `isOnTop()` (Jyx2_UIBase.cs 92-95), has no callers in `Scripts/`, `LuaScripts/` or `Mods/`. The live gate is the input stack. Fix: keep one gate; delete the unused rule or wire it in.
- Defect 4, the player context sets the one-frame guard (Jyx2_PlayerInput.cs 47) and defines `IsValidFrame` (line 16), but its `CanUpdate` is only `Jyx2_Input.IsPlayerContext` (line 14), so the guard is never read there. Fix: apply the guard to every context kind (sketch does this).
- Gap, controls are not validated on restore: the donor restores a remembered control only if it is still active (`IsLastSelectValid`, Jyx2Input_UIContext.cs 55). The sketch has no validity callback; Frankendom needs one, because a fight HUD control can disappear while a panel is open.
- Gap, lock-on and input buffer: none in this stack. The donor has no lock-on and no input buffer on this path (the one-frame guard is not a buffer). `BattleActionUIPanel.cs` has a skill range selector and hit-range preview (method names 147 and 190, not read in full).
- Touch UX, seen and not written up: `Jyx2_PlayerInput.cs` switches mobile between click-to-walk and an on-screen joystick (`IsClickControlEnable` 270-275, `IsJoystickControlEnable` 282-285); keyboard axes win over the joystick when both move (lines 183-189). That belongs to controls (parity row 5), not this note.
- Minimap and world map, seen and not written up: `MainUIPanel.ShowCompass` (line 45) and `RefreshNameMapName` (line 89); `BigMapLocationNameDrawer.cs` draws location names on the world map (120 lines, method list only).
- String table and localisation (the cell asked for it, described here):
  - The translator is `3rd/i18n` (`Translator.cs`, `TranslatorDef/TranslationStruct.cs`, `TranslateAttacher/TextAttacher.cs`). The string table is one Unity asset per language: `Assets/3rd/i18n/Editor/koreaTranslator.asset`, a 53-line YAML wrapper around one hex `SerializedBytes` blob of 47206 bytes. The entries are inside the blob; I did not decode the blob.
  - Grammar: a dictionary keyed by the source text (`Translator.cs` 90). Each entry has three fields, `token` (where the text was first seen, e.g. the object path and attacher name), `content` (the source text) and `translation` (`TranslationStruct.cs` 39). An empty translation means untranslated, and the source text is shown.
  - Count: by a byte search of the blob, the token prefix (the Chinese word for "from") appears 105 times; 103 of those tokens name TextAttacher and 2 name DropdownAttacher. This approximates the entry count (each entry has one token); it is not a decoded count.
  - Language is a two-letter ISO 639-1 flag enum (`TranslationUtility.cs` 83), chosen in settings (`GameSettingManager.cs` 418).
  - Export: `Convert2Json` writes `<lang>.json` to the output folder (`Translator.cs` 64-70) and `ReadFromJson` reads it back. No exported JSON was found in `Resources`, `StreamingAssets` or `Mods` (narrow search, depth 4).
  - Lookup: `GetContent` (`TranslationUtility.cs` 35) calls `GetOrRegTranslation` (in `Translator.cs`, read at lines 216-240). A missing key returns the source text and logs a warning (line 230); with collection on, it adds the key with an empty translation and logs a different warning (lines 216-226). A present key with an empty translation returns the source text.
  - Gap for Frankendom: the key is the English source text, so editing a source string orphans its translation. Use stable string keys in the Frankendom table.
  - Defect: with collection off, the warning on line 230 fires on every lookup of a missing key, because the key is never added. Fix: a set of warned keys, or collect by default in development builds.
- Not read: `MainUIPanel` compass and map-name bodies, `BattleActionUIPanel` bodies, the decoded string-table blob, the rest of `TranslationUtility.cs` (1228 lines).
