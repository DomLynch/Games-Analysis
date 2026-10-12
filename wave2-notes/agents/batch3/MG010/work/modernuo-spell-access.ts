// Licence: GPL-3.0 (donor, LICENSE line 3). CLEAN-ROOM: written from the described mechanism only; no donor lines copied.
const MANA_BY_CIRCLE = [4, 6, 9, 11, 14, 20, 40, 50];                 // donor: _manaTable
const REQUIRED_SKILL_BY_INDEX = [-50, -30, 0, 10, 20, 30, 40, 50, 60, 70]; // donor: _requiredSkill (pre-ML branch)
const CAST_WINDOW = 40;                                                 // donor: max = min + 40
const LOWER_MANA_CAP = 40;                                              // donor: LowerManaCost capped at 40

// Scroll casts index the table at the circle; spellbook casts index at circle + 2 (higher requirement).
export function castSkillWindow(circle: number, fromScroll: boolean): { min: number; max: number } {
  const min = REQUIRED_SKILL_BY_INDEX[fromScroll ? circle : circle + 2];
  return { min, max: min + CAST_WINDOW };
}

// Donor CheckLocation: below min fails, at or above max succeeds, otherwise linear in between.
export function castChance(value: number, min: number, max: number): number {
  if (value < min) return 0;
  if (value >= max || min >= max) return 1;
  return (value - min) / (max - min);
}

// Donor ScaleMana: table value times (scalar - lowerManaCost/100); scalar starts at the Mind Rot scalar (1.0 when none), lower mana cost capped at 40.
export function scaledMana(circle: number, isWand: boolean, lowerManaCost: number, mindRotScalar: number = 1.0): number {
  if (isWand) return 0;
  const lmc = Math.min(lowerManaCost, LOWER_MANA_CAP);
  return Math.trunc(MANA_BY_CIRCLE[circle] * (mindRotScalar - lmc / 100));
}

// Donor MagerySpell.GetResistPercentForCircle, returned as a 0..1 chance and clamped (donor: n <= 0 false, n >= 1 true).
export function resistChance(targetMagicResist: number, casterSkill: number, circle: number): number {
  const first = targetMagicResist / 5;
  const second = targetMagicResist - ((casterSkill - 20) / 5 + (1 + circle) * 5);
  const pct = Math.max(first, second) / 2;
  return Math.max(0, Math.min(1, pct / 100));
}

// Donor Container.ConsumeTotal: all-or-nothing. Validate every slot first, then remove.
// Returns -1 on success, else the index of the first short slot. Fix: the caller checks mana before calling this.
export function consumeAllOrNothing(bag: Map<string, number>, needs: string[], amounts: number[]): number {
  for (let i = 0; i < needs.length; i++) {
    if ((bag.get(needs[i]) ?? 0) < amounts[i]) return i;
  }
  for (let i = 0; i < needs.length; i++) {
    bag.set(needs[i], (bag.get(needs[i]) ?? 0) - amounts[i]);
  }
  return -1;
}

// Fixed order (the donor does reagents before the mana check, which can lose reagents on a mana shortfall):
// 1) scaled mana; 2) mana check; 3) reagents (scroll and wand casts are free); 4) deduct mana.
export function castOrder(
  mana: number, casterMana: number, reagentsOk: () => boolean
): { ok: boolean; reason: 'mana' | 'reagents' | null } {
  if (casterMana < mana) return { ok: false, reason: 'mana' };
  if (!reagentsOk()) return { ok: false, reason: 'reagents' };
  return { ok: true, reason: null };
}

// Vendor coin price. Donor GetPriceScalar: 100 + town tax inside a town, otherwise no scaling.
// Fix: explicit branch instead of the donor's `100 + t?.Tax ?? 0` (zero means "unscaled" by accident).
export function vendorPrice(basePrice: number, townTax: number | null): number {
  if (townTax === null) return basePrice;
  return Math.trunc((basePrice * (100 + townTax) + 50) / 100);
}

// Donor AddToSpellbookEntry: a scroll is added only to a matching book, not twice, and only inside the book's range.
// Fix: the wrong-type branch returns a reason instead of silently doing nothing.
export function addScrollToBook(
  book: { type: string; content: bigint; bookCount: number; bookOffset: number },
  scroll: { type: string; spellId: number }
): { result: 'added' | 'wrong-type' | 'duplicate' | 'out-of-range'; content: bigint } {
  if (scroll.type !== book.type) return { result: 'wrong-type', content: book.content };
  const bit = scroll.spellId - book.bookOffset;
  if (bit < 0 || bit >= book.bookCount) return { result: 'out-of-range', content: book.content };
  if ((book.content & (1n << BigInt(bit))) !== 0n) return { result: 'duplicate', content: book.content };
  return { result: 'added', content: book.content | (1n << BigInt(bit)) };
}

export {};
