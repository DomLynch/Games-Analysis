// clean-room sketch: hidden (internal) items, weapon ammo weight, and a two-sided checked barter. Written from the described mechanism, not a translation.
type Item = {
  kind: number;          // proto id
  weight: number;        // proto weight per unit
  hidden: boolean;       // proto extended flag: internal item
  ammoRounds: number;    // rounds loaded in a weapon (0 if none)
  ammoBoxSize: number;   // rounds per box (0 if the weapon takes no box ammo)
  ammoBoxWeight: number; // weight of one box
};

type Entry = { item: Item; qty: number };

type Holder = {
  entries: Entry[];
  carry: number;         // carry cap (creatures only)
};

const OK = 0;
const ERR_CARRY_BUYER = -1;
const ERR_CARRY_SELLER = -2;
const ERR_OFFER = -3;

// Hidden items weigh zero; loaded ammo weighs ceil(rounds / box size) boxes, even on a hidden weapon.
function itemWeight(it: Item): number {
  let w = it.hidden ? 0 : it.weight;
  if (it.ammoBoxSize > 0 && it.ammoRounds > 0) {
    w += it.ammoBoxWeight * Math.ceil(it.ammoRounds / it.ammoBoxSize);
  }
  return w;
}

function holderWeight(h: Holder): number {
  let w = 0;
  for (const e of h.entries) w += itemWeight(e.item) * e.qty;
  return w;
}

// Loot screen: hidden items are set aside for the session and put back at exit.
function setAsideHidden(target: Holder, box: Holder): void {
  const keep: Entry[] = [];
  for (const e of target.entries) {
    if (e.item.hidden) box.entries.push(e);
    else keep.push(e);
  }
  target.entries = keep;
}

function returnHidden(box: Holder, target: Holder): void {
  target.entries.push(...box.entries.splice(0));
}

// On death, hidden items are destroyed rather than looted.
function destroyHiddenOnDeath(h: Holder): void {
  h.entries = h.entries.filter((e) => !e.item.hidden);
}

// Two-sided barter. Every check runs before anything moves, and each refusal has its own reason.
// buyerGets = the incoming table, sellerGets = the offer. The seller is a party member (carry checked) or not (offer value checked).
function barter(
  buyer: Holder,
  seller: Holder,
  offer: Holder,
  incoming: Holder,
  sellerIsParty: boolean,
  offerValueOk: boolean,
): number {
  if (holderWeight(incoming) > buyer.carry - holderWeight(buyer)) return ERR_CARRY_BUYER;
  if (sellerIsParty) {
    if (holderWeight(offer) > seller.carry - holderWeight(seller)) return ERR_CARRY_SELLER;
  } else if (offer.entries.length === 0 || !offerValueOk) {
    return ERR_OFFER;
  }
  buyer.entries.push(...incoming.entries.splice(0));
  seller.entries.push(...offer.entries.splice(0));
  return OK;
}

export {};
