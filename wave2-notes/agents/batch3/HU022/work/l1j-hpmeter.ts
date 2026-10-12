// Licence: GPL-2.0-or-later (donor headers: "either version 2, or (at your option) any later version"; COPYING is v2). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const RATIO_SCALE = 100; // donor: percent

export interface Unit { id: number; hp: number; maxHp: number; }

export interface MeterFrame {
  recipientId: number; // who sees the frame
  subjectId: number;   // whose frame it is
  hidden: boolean;     // explicit flag; the donor encodes "hide" as 0xFF in the ratio byte
  percent: number;     // 0..100, meaningful when hidden is false
}

// Fix: never 0 while alive (the donor floors, so 1 of 300 reads as 0 and looks dead); no divide by zero.
export function ratioPercent(hp: number, maxHp: number): number {
  if (maxHp <= 0) return RATIO_SCALE;               // donor ctor guard: an unset max reads as full
  if (hp <= 0) return 0;
  const floored = Math.floor((RATIO_SCALE * hp) / maxHp);
  return Math.min(RATIO_SCALE, Math.max(1, floored));
}

// Event-driven: called on each hp change. One frame per party member, including the subject itself.
export function onHpChanged(subject: Unit, party: Unit[]): MeterFrame[] {
  const percent = ratioPercent(subject.hp, subject.maxHp);
  return party.map((m) => ({ recipientId: m.id, subjectId: subject.id, hidden: false, percent }));
}

// Join: each side learns the other's current ratio (the newcomer is not yet in `members`).
export function onJoin(newcomer: Unit, members: Unit[]): MeterFrame[] {
  const out: MeterFrame[] = [];
  for (const m of members) {
    out.push({ recipientId: m.id, subjectId: newcomer.id, hidden: false, percent: ratioPercent(newcomer.hp, newcomer.maxHp) });
    out.push({ recipientId: newcomer.id, subjectId: m.id, hidden: false, percent: ratioPercent(m.hp, m.maxHp) });
  }
  return out;
}

// Leave: both sides hide each other's frame.
export function onLeave(leaver: Unit, members: Unit[]): MeterFrame[] {
  const out: MeterFrame[] = [];
  for (const m of members) {
    out.push({ recipientId: m.id, subjectId: leaver.id, hidden: true, percent: 0 });
    out.push({ recipientId: leaver.id, subjectId: m.id, hidden: true, percent: 0 });
  }
  return out;
}

export {};
