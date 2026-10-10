// test harness for the sketch (not part of the note)
import * as V from "./src";
const g = { buy: 1.5, sell: 0.25, sellOld: 0 };
const items: Record<string, V.Item> = { sword: { base: 100, priceSell: 0, quest: false }, key: { base: 100, priceSell: 0, quest: true } };
const mkV = (): V.Vendor => ({ buyRatio: 0, sellRatio: 0, sellOldRatio: 0, stock: ["sword"], buyback: [null, null], resetPending: true });
const mkBag = (room: boolean) => { const got: string[] = []; return { got, hasRoom: () => room, add: (i: string, q: number) => { got.push(i + "x" + q); } }; };
// buy price: base x global 1.5 once = 150 (donor applies the buy ratio twice: 225, see note)
console.log("buy unit", V.buyPrice(items.sword, g, mkV()), "expect 150");
// sell to vendor: floor(100*1.5*0.25)=37
const w = { coins: 0 }; const v = mkV();
console.log("sell ok", V.sellToVendor(w, v, items, g, "sword", 1), "coins", w.coins, "expect 37");
console.log("quest refused", V.sellToVendor({ coins: 0 }, v, items, g, "key", 1), "expect false");
console.log("buyback slot", JSON.stringify(v.buyback[0]), "fresh");
// buy back while fresh: 37
const wb = { coins: 37 }; const bag = mkBag(true);
console.log("buyback fresh ok", V.buyBack(wb, bag, v, g, items, 0), "coins", wb.coins, "got", bag.got, "expect true 0");
// refuse with no room: no coins taken, slot kept
const v2 = mkV(); V.sellToVendor({ coins: 0 }, v2, items, g, "sword", 1);
const wn = { coins: 500 };
console.log("no room refused", V.buyBack(wn, mkBag(false), v2, g, items, 0), "coins", wn.coins, "slot kept", v2.buyback[0] !== null, "expect false 500 true");
// reload with keep and sellOld 0.5: fresh flag cleared; price = floor(100*1.5*0.5)=75 (rises above payout 37)
const g2 = { buy: 1.5, sell: 0.25, sellOld: 0.5 };
V.onFirstOpen(v2, true);
console.log("after reload flag", v2.buyback[0]?.canBuyback, "price", V.buybackPrice(items.sword, false, g2, v2), "expect false 75");
// keep=false clears buyback
const v3 = mkV(); V.sellToVendor({ coins: 0 }, v3, items, g, "sword", 1); V.onFirstOpen(v3, false);
console.log("clear on load", v3.buyback[0], "expect null");
// buyback full eviction: 2 slots full, third sale drops first
const v4 = mkV(); V.sellToVendor({ coins: 0 }, v4, items, g, "sword", 1); V.sellToVendor({ coins: 0 }, v4, items, g, "sword", 2);
V.sellToVendor({ coins: 0 }, v4, items, g, "sword", 3);
console.log("eviction qtys", v4.buyback.map(s => s ? s.qty : null), "expect [2,3]");
