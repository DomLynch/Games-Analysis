// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Area = 'deposit' | 'main';
type Perm = 'bankerOnly' | 'singleMember' | 'publicIfUsable' | 'public';

const CAP: Record<Area, number> = { deposit: 40, main: 200 };
const HALL_DAYS = 90; // server rule default
let rowSeq = 0;

interface BankRow {
  id: number;
  area: Area;
  slot: number;
  itemId: number; // 0 = empty slot
  qty: number;
  donator: string;
  perm: Perm;
  whoFor: string;
}

function emptyRow(area: Area, slot: number): BankRow {
  return { id: 0, area, slot, itemId: 0, qty: 0, donator: '', perm: 'bankerOnly', whoFor: '' };
}

class GuildBank {
  // Slots keyed by "area:slot". A missing key or an itemId of 0 means the slot is free.
  private slots = new Map<string, BankRow>();

  constructor(readonly guildId: number) {}

  private key(area: Area, slot: number): string {
    return area + ':' + slot;
  }

  // First free slot in an area, or null when that area is full.
  private firstFree(area: Area): number | null {
    for (let s = 0; s < CAP[area]; s++) {
      const row = this.slots.get(this.key(area, s));
      if (!row || row.itemId === 0) return s;
    }
    return null;
  }

  isFull(area: Area): boolean {
    return this.firstFree(area) === null;
  }

  // Any member may deposit; the new row stays banker-only until a banker promotes it.
  deposit(itemId: number, qty: number, donator: string): BankRow | null {
    const slot = this.firstFree('deposit');
    if (slot === null) return null;
    rowSeq += 1;
    const row: BankRow = { id: rowSeq, area: 'deposit', slot, itemId, qty, donator, perm: 'bankerOnly', whoFor: '' };
    this.slots.set(this.key('deposit', slot), row);
    return row;
  }

  // A banker moves a deposit row to the main area. The row keeps its id; the deposit slot is emptied.
  promote(depositSlot: number, isBanker: boolean): number | null {
    if (!isBanker) return null;
    const row = this.slots.get(this.key('deposit', depositSlot));
    if (!row || row.itemId === 0) return null;
    const mainSlot = this.firstFree('main');
    if (mainSlot === null) return null;
    this.slots.set(this.key('deposit', depositSlot), emptyRow('deposit', depositSlot));
    this.slots.set(this.key('main', mainSlot), { ...row, area: 'main', slot: mainSlot });
    return mainSlot;
  }

  // Permission is written to an existing main-area row only. Withdraw rules are not modelled (not read in donor).
  setPermission(mainSlot: number, perm: Perm, member: string): void {
    const row = this.slots.get(this.key('main', mainSlot));
    if (!row) return;
    row.perm = perm;
    row.whoFor = perm === 'singleMember' ? member : '';
  }
}

interface HallInstance {
  instanceId: number;
  expiresAtS: number;
}

const hallByGuild = new Map<number, HallInstance>();

// Join a guild's hall: reuse the stored instance, otherwise create one that lasts HALL_DAYS.
export function joinHall(guildId: number, nowS: number, newInstanceId: () => number): HallInstance {
  const known = hallByGuild.get(guildId);
  if (known && known.expiresAtS > nowS) return known;
  const inst: HallInstance = { instanceId: newInstanceId(), expiresAtS: nowS + HALL_DAYS * 86400 };
  hallByGuild.set(guildId, inst);
  return inst;
}

export {};
