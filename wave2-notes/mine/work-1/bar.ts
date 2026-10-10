// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export class Modifiers {
  private mult = new Map<string, number>();
  set(source: string, value: number | null): void {
    if (value === null) this.mult.delete(source);
    else this.mult.set(source, value);
  }
  apply(base: number): number {
    let v = base;
    for (const m of this.mult.values()) v *= m;
    return v;
  }
}

export function slowPercent(meter: number, health: number, maxHealth: number): number {
  if (meter < 5) return 0;
  const capped = Math.min(meter, health * 0.9);
  return Math.round((capped / maxHealth) * 64) / 64;
}

export function applySlow(mods: Modifiers, reload: Modifiers, percent: number): void {
  if (percent <= 0) { mods.set("slow", null); reload.set("slow", null); return; }
  mods.set("slow", 1 - Math.min(percent, 0.9));
  reload.set("slow", 1 / Math.max(1 - percent * 2, 0.01));
}

export {}
