// Licence: MIT (donor: Daggerfall Unity). Clean-room sketch of the idea, not a line-by-line translation.
// Fix applied: the donor copies the zeroed default fields when its pool is empty; here an empty pool gives the slot a seed from its own key.

type ServiceType = 'temple' | 'tavern' | 'bank' | 'guildHall' | 'armorer' | 'generalStore';

interface ServicePoolItem {
  type: ServiceType;
  nameSeed: number;
  faction: number;
  quality: number;
  used: boolean;
}

interface HubSlot {
  key: number;                 // stable slot key, e.g. packed block x, block y, record index
  type: ServiceType;           // the service this slot asks for
  nameSeed?: number;
  faction?: number;
  quality?: number;
  filledFrom?: 'pool' | 'fallback';
}

// Fill slots one at a time, in the order the caller gives (layout order).
// Each pool item is used at most once. An exhausted pool does not copy zeros:
// the slot gets a seed from its own key and the shortfall is reported.
function fillHubSlots(
  slots: HubSlot[],
  pool: ServicePoolItem[],
  report: (msg: string) => void,
): void {
  for (const slot of slots) {
    const item = pool.find(p => !p.used && p.type === slot.type);
    if (item === undefined) {
      slot.nameSeed = slot.key;
      slot.faction = 0;
      slot.quality = 0;
      slot.filledFrom = 'fallback';
      report(`pool exhausted for ${slot.type} at slot ${slot.key}`);
      continue;
    }
    item.used = true;
    slot.nameSeed = item.nameSeed;
    slot.faction = item.faction;
    slot.quality = item.quality;
    slot.filledFrom = 'pool';
  }
}

export {};
