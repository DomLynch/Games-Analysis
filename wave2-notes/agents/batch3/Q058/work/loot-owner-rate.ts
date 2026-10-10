// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface DamageEntry { playerId: string; dmg: number; eligible: boolean; }
interface Owner { playerId: string; damage: number; }

// Loot owners: aggregate per player in log order, bonus the first entry, sort, keep the top three.
function lootOwners(log: DamageEntry[], firstBonusPct: number): Owner[] {
  let total = 0;
  for (const e of log) total += e.dmg;              // every entry counts, eligible or not
  const owners: Owner[] = [];
  for (const e of log) {
    if (!e.eligible) continue;
    const found = owners.find((o) => o.playerId === e.playerId);
    if (found) found.damage += e.dmg;
    else owners.push({ playerId: e.playerId, damage: e.dmg });
  }
  if (owners.length > 0) owners[0].damage += Math.floor((total * firstBonusPct) / 100);
  owners.sort((a, b) => b.damage - a.damage);
  return owners.slice(0, 3);
}

// Permyriad rate: base, then a flat bonus percentage, then the cap rule, then the 1..10000 clamp.
function dropRate(base: number, bonusPct: number, cap: number): number {
  let rate = Math.floor(0.5 + (base * (100 + bonusPct)) / 100);
  if (rate > cap && base < cap) rate = cap;         // cap only clips a base that started below it
  return Math.min(Math.max(rate, 1), 10000);
}

// One roll out of 10000. A drop happens when the roll is below the rate.
function rollDrop(rate: number, roll: number): boolean {
  return roll < rate;
}

export {};
