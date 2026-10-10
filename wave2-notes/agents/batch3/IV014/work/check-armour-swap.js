// Behaviour check for quake2-armour-swap.ts (compiled JS is loaded and its functions are returned).
const fs = require("fs");
const src = fs.readFileSync("/tmp/iv014-js/quake2-armour-swap.js", "utf8");
const api = new Function("exports", src + "\nreturn { pickupArmour, pickupShard, absorb };")({});

const a = { tier: "combat", points: 100 };
const ra = api.pickupArmour(a, "body");
console.log("combat 100 + body -> taken", ra, "tier", a.tier, "points", a.points, "(expect true body 175)");

const b = { tier: "body", points: 150 };
const rb = api.pickupArmour(b, "combat");
console.log("body 150 + combat -> taken", rb, "tier", b.tier, "points", b.points, "(expect true body 187)");

const c = { tier: "body", points: 200 };
const rc = api.pickupArmour(c, "combat");
console.log("body 200 + combat -> taken", rc, "points", c.points, "(expect false, 200)");

const d = { tier: "body", points: 200 };
const rd = api.pickupShard(d);
console.log("body 200 + shard -> taken", rd, "points", d.points, "(expect false, 200; donor would give 202)");

const e = { tier: null, points: 0 };
const re = api.pickupArmour(e, "jacket");
console.log("empty + jacket -> taken", re, "tier", e.tier, "points", e.points, "(expect true jacket 25)");

const f = { tier: "body", points: 10 };
const dmg = api.absorb(f, 10);
console.log("body 10 points, hit 10 -> saved", dmg, "points left", f.points, "(expect 8 saved, 2 left)");
