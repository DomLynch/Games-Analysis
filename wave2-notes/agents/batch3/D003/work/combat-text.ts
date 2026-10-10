// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const FLOAT_LIFETIME = 1.5;   // s: a floating number lives this long
const FLOAT_RISE = 48;        // px: how far it drifts up over its whole life
const LOG_CAPACITY = 200;     // lines kept in the log
const LOG_VISIBLE = 8;        // lines shown at once

interface Hit { amount: number; incoming: boolean; critical: boolean; }
interface Floater { hit: Hit; anchor: [number, number]; age: number; }

class FloaterStack {
  private items: Floater[] = [];

  // anchor: our own screen point for incoming hits, the target's screen point for outgoing ones.
  spawn(hit: Hit, anchor: [number, number]): void {
    const n = this.items.length;                 // live count BEFORE this push
    const jitter = ((n % 3) - 1) * 22;           // three x slots, cycling with the live count
    this.items.push({ hit, anchor: [anchor[0] + jitter, anchor[1]], age: 0 });
  }

  tick(dt: number): void {
    for (const f of this.items) f.age += dt;
    this.items = this.items.filter(f => f.age < FLOAT_LIFETIME);
  }

  draw(): Array<{ text: string; x: number; y: number; alpha: number; size: number }> {
    return this.items.map(f => {
      const t = Math.min(Math.max(f.age / FLOAT_LIFETIME, 0), 1);
      // Full opacity for the first half of the life, then a linear fade to zero.
      const alpha = Math.min(Math.max(1 - Math.max(t - 0.5, 0) / 0.5, 0), 1);
      const size = f.hit.critical ? 21 : f.hit.incoming ? 18 : 16;
      const text = f.hit.critical ? `${f.hit.amount}!` : String(f.hit.amount);
      return { text, x: f.anchor[0], y: f.anchor[1] - FLOAT_RISE * t, alpha, size };
    });
  }
}

class CombatLog {
  private lines: string[] = [];
  private scrollBack = 0;

  push(line: string): void {
    this.lines.push(line);
    while (this.lines.length > LOG_CAPACITY) this.lines.shift();
  }

  recent(): string[] {
    const end = Math.max(this.lines.length - this.scrollBack, 0);
    const start = Math.max(end - LOG_VISIBLE, 0);
    return this.lines.slice(start, end);
  }

  pageUp(): void {
    this.scrollBack = Math.min(this.scrollBack + LOG_VISIBLE, Math.max(this.lines.length - LOG_VISIBLE, 0));
  }

  pageDown(): void {
    this.scrollBack = Math.max(this.scrollBack - LOG_VISIBLE, 0);
  }
}
