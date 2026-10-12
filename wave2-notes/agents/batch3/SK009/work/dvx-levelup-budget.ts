// Licence: Sustainable Use License 1.0 (donor, restricted: non-commercial use only). Clean-room sketch of the mechanism shape only; not a translation of the donor lines.
type AttrKey = "str" | "mag" | "dex" | "vit";

interface Attr {
  base: number; // points spent so far (the donor's _pBase* fields)
  max: number;  // class cap for this attribute
}

interface ClassData {
  lvlLife: number;  // max life gained per level (data)
  lvlMana: number;  // max mana gained per level (data)
  chrLife: number;  // max life per point of Vitality (data)
  chrMana: number;  // max mana per point of Magic (data)
}

interface Hero {
  level: number;
  xp: number;        // cumulative experience, never reset
  unspent: number;   // stat points waiting to be spent
  attrs: Record<AttrKey, Attr>;
  hpMaxBase: number;
  hpMax: number;
  hp: number;
  manaMaxBase: number;
  manaMax: number;
  mana: number;
  noMana: boolean;   // item flag that stops mana refill
}

const MAX_LEVEL = 50;
const POINTS_PER_LEVEL = 5;        // engine constant (donor player.cpp:2395)
const MP_XP_DIVISOR = 20;          // multiplayer cap: a twentieth of the next threshold
const MP_XP_PER_LEVEL = 200;       // multiplayer cap: 200 x current level

// Points that can still be spent: sum of (max - base) over the four attributes.
export function headroom(h: Hero): number {
  let total = 0;
  for (const key of Object.keys(h.attrs) as AttrKey[]) {
    total += h.attrs[key].max - h.attrs[key].base;
  }
  return total;
}

// Level up by one. Budget: 5 points, capped so unspent never exceeds the headroom left to spend into.
export function levelUp(h: Hero, cls: ClassData): void {
  h.level = Math.min(h.level + 1, MAX_LEVEL);
  const room = headroom(h);
  h.unspent = Math.min(h.unspent + POINTS_PER_LEVEL, room);

  h.hpMaxBase += cls.lvlLife;
  h.hpMax = h.hpMaxBase;
  h.hp = h.hpMax;                  // level-up refills current life

  h.manaMaxBase += cls.lvlMana;
  h.manaMax = h.manaMaxBase;
  if (!h.noMana) {
    h.mana = h.manaMax;            // refill unless the NoMana flag is set
  }
}

// One kill's XP. levelGap = monster level minus hero level. Only the local hero's ledger is touched.
export function awardXp(
  h: Hero,
  cls: ClassData,
  amount: number,
  thresholds: number[],          // cumulative XP at which each level ends (data table)
  levelGap: number,
  multiplayer: boolean,
  maxXp: number,
): void {
  let gain = Math.max(0, Math.floor(amount * (1 + levelGap / 10))); // +10% per level above you, 0 floor
  if (multiplayer) {
    const nextThreshold = thresholds[h.level - 1];
    gain = Math.min(gain, Math.floor(nextThreshold / MP_XP_DIVISOR), MP_XP_PER_LEVEL * h.level);
  }
  gain = Math.min(gain, maxXp - h.xp);
  h.xp += gain;

  while (h.level < MAX_LEVEL && h.xp >= thresholds[h.level - 1]) {
    levelUp(h, cls);
  }
}

// Spend points on one attribute. Capped by the unspent budget and by the attribute's own headroom.
export function spend(h: Hero, cls: ClassData, key: AttrKey, want: number): number {
  const a = h.attrs[key];
  const n = Math.max(0, Math.min(want, h.unspent, a.max - a.base));
  a.base += n;
  h.unspent -= n;

  if (key === "vit") {
    const d = n * cls.chrLife;     // Vitality adds life immediately, to max, base and current
    h.hpMaxBase += d;
    h.hpMax += d;
    h.hp += d;
  } else if (key === "mag") {
    const d = n * cls.chrMana;     // Magic adds mana immediately, to max, base and current unless noMana
    h.manaMaxBase += d;
    h.manaMax += d;
    if (!h.noMana) {
      h.mana += d;
    }
  }
  return n;
}

export {};
