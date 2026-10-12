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
    if (this.stack.includes(ctx)) return;      // duplicate: ignored (the donor logs an error here)
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
