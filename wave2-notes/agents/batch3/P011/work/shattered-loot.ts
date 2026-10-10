// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Deck {
  left: number[];   // copies left per index; a deck with nothing left is restocked from full
  full: number[];
}

interface Monster {
  maxLvl: number;   // no drops at all once the hero is more than 2 levels above this
  chance: number;   // base chance per kill
  rolls: number;    // pity steps for this kill: 1 normal, 5 mini-boss, 15 boss
}

interface Hero {
  level: number;
  wealth: number;          // wealth bonus level; 0 = no bonus drops
  pity: number;            // counts down per kill; a bonus drop fires at 0 or below
  equipCountdown: number;  // bonus drops left before the next equipment drop
}

type Rand = () => number;
type RangeRoll = (min: number, max: number) => number;

// Picks an index by weight. A deck with nothing left is restocked first, then drawn.
function drawFromDeck(deck: Deck, rand: Rand): number {
  let total = deck.left.reduce((a, w) => a + Math.max(0, w), 0);
  if (total <= 0) {
    deck.left = deck.full.slice();
    total = deck.left.reduce((a, w) => a + Math.max(0, w), 0);
  }
  if (total <= 0) return -1;
  let r = rand() * total;
  for (let i = 0; i < deck.left.length; i++) {
    const w = Math.max(0, deck.left[i]);
    if (r < w) {
      deck.left[i] -= 1;
      return i;
    }
    r -= w;
  }
  return -1;
}

// One kill, in donor order. The level gate returns before any roll, so the pity counter does not move either.
function onKill(
  hero: Hero,
  mon: Monster,
  baseDeck: Deck,
  consDeck: Deck,
  rand: Rand,
  rollRange: RangeRoll,
  pickBase: (i: number) => string,
  pickConsumable: (i: number) => string,
  pickEquip: () => string,
): string[] {
  const drops: string[] = [];
  if (hero.level > mon.maxLvl + 2) return drops;

  // base roll: chance scaled by the wealth multiplier 1.2 per wealth level
  const mult = Math.pow(1.2, hero.wealth);
  if (rand() < mon.chance * mult) {
    const i = drawFromDeck(baseDeck, rand);
    if (i >= 0) drops.push(pickBase(i));
  }

  // pity counter: each kill counts down by its rolls; every time it reaches 0 or below, one bonus drop
  if (hero.wealth > 0) {
    hero.pity -= mon.rolls;
    while (hero.pity <= 0) {
      if (hero.equipCountdown <= 0) {
        drops.push(pickEquip());
        hero.equipCountdown += rollRange(5, 10);
      } else {
        const i = drawFromDeck(consDeck, rand);
        if (i >= 0) drops.push(pickConsumable(i));
        hero.equipCountdown -= 1;
      }
      hero.pity += rollRange(0, 20);
    }
  }
  return drops;
}

export {};
