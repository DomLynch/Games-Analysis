// test harness for the sketch (not part of the note)
import { debitParty, countAvailable } from "./exult-party-debit";
const mk = () => [
  { id: "avatar", stacks: [{ shape: "coin", qty: 3, locked: false }] },
  { id: "npc", stacks: [{ shape: "coin", qty: 4, locked: false }, { shape: "coin", qty: 9, locked: true }] },
];
const a = mk();
console.log("count", countAvailable(a, "coin")); // expect 7 (locked stack excluded in sketch)
console.log("refuse 8:", debitParty(a, "coin", 8), "left", countAvailable(a, "coin")); // false, 7
console.log("pay 5:", debitParty(a, "coin", 5), "left", countAvailable(a, "coin"));   // true, 2
console.log("avatar stacks", JSON.stringify(a[0].stacks)); // avatar's 3 drained first -> [] 
