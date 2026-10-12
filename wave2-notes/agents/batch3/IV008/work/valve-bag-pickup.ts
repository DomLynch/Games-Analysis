// Clean-room shape of a carry bag with duplicate-to-ammo pickup, partial take and a slot rule.
const MAX_WEAPONS = 48; // donor shareddefs.h:118
const MAX_WEAPON_SLOTS = 6; // donor shareddefs.h:115 (HUD buckets, not a carry limit)

interface Gun { id: string; slot: number; ammoType: string; }
interface Pickup { gun: Gun; clip: number; }

class Bag {
  private guns: Array<Gun | null> = new Array<Gun | null>(MAX_WEAPONS).fill(null);
  private clips = new Map<string, number>();
  private ammo = new Map<string, number>();

  constructor(private carryMax: Map<string, number>) {}

  // donor GiveAmmo: add = min(count, max - have); returns the amount actually taken
  giveAmmo(count: number, ammoType: string): number {
    if (count <= 0) return 0;
    const have = this.ammo.get(ammoType) ?? 0;
    const add = Math.min(count, (this.carryMax.get(ammoType) ?? 0) - have);
    if (add < 1) return 0;
    this.ammo.set(ammoType, have + add);
    return add;
  }

  private hasAnyAmmo(g: Gun): boolean {
    return (this.clips.get(g.id) ?? 0) > 0 || (this.ammo.get(g.ammoType) ?? 0) > 0;
  }

  // returns true when the world pickup is consumed (removed)
  bump(p: Pickup): boolean {
    // 1. duplicate: move what fits to the bag; the pickup keeps the remainder
    const owned = this.guns.find((g) => g !== null && g.id === p.gun.id);
    if (owned) {
      const taken = this.giveAmmo(p.clip, owned.ammoType);
      if (taken === 0) return false;
      p.clip -= taken;
      return p.clip <= 0;
    }
    // 2. slot rule: an occupied slot refuses unless the held gun is empty; then swap it out
    const idx = this.guns.findIndex((g) => g !== null && g.slot === p.gun.slot);
    if (idx >= 0) {
      const held = this.guns[idx];
      if (held === null || this.hasAnyAmmo(held)) return false;
      this.guns[idx] = p.gun; // fix: donor leaves the empty gun in the array (see note)
      this.clips.set(p.gun.id, p.clip);
      return true;
    }
    // 3. free space: first empty index (donor Weapon_Equip)
    const free = this.guns.indexOf(null);
    if (free < 0) return false;
    this.guns[free] = p.gun;
    this.clips.set(p.gun.id, p.clip);
    return true;
  }
}

export {};
