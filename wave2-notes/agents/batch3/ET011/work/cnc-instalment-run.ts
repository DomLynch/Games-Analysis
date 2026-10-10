import { startCraft, tickCraft, abandonCraft } from "./cnc-instalment";
// Run: price 1000, bias 1, build 1080 ticks -> rate 10. Ledger 300 credits.
const ledger = { credits: 300 };
const c = startCraft(1000, 1, 1080, ledger, true);
let log: string[] = [];
let t = 0;
while (t < 400 && c.stage < 108 && !c.suspended) {
  const r = tickCraft(c, ledger);
  t++;
  if (r === "paid" || r === "done") log.push(`t${t}:${r} stage=${c.stage} paid=${c.price - c.balance} credits=${ledger.credits}`);
  if (r === "waiting" && c.stage > 0 && c.timer === c.rate && log.length < 60) log.push(`t${t}:stall stage=${c.stage} credits=${ledger.credits}`);
  if (ledger.credits < 0) { log.push("NEGATIVE"); break; }
  if (t > 3000) break;
}
console.log(log.slice(0, 40).join("\n"));
console.log("end tick", t, "stage", c.stage, "balance", c.balance, "credits", ledger.credits, "suspended", c.suspended);
// Cancel test on a fresh job
const l2 = { credits: 1000 };
const c2 = startCraft(1000, 1, 1080, l2, true);
for (let i = 0; i < 1000; i++) tickCraft(c2, l2);
console.log("cancel test: stage", c2.stage, "balance", c2.balance, "credits before", l2.credits);
const refund = abandonCraft(c2, l2);
console.log("refund", refund, "credits after", l2.credits, "paid+refund", (c2.price - 0) );
