import { stepSpring, eyeSpring } from "./cubyz-eye-spring-check";
// frame-rate independence: one 1/30 step vs two 1/60 steps, for the three real cases
for (const k of [3333.33, 258.06, 30*30/4 + 1e-3, 30*30/4 - 50]) {
  const a = { pos: 0.1, vel: 0.5, k, lambda: 30 };
  const b = { pos: 0.1, vel: 0.5, k, lambda: 30 };
  stepSpring(a, 1/30);
  stepSpring(b, 1/60); stepSpring(b, 1/60);
  console.log("k", k.toFixed(2), "one-step pos", a.pos.toExponential(9), "two-step pos", b.pos.toExponential(9), "diff", Math.abs(a.pos-b.pos).toExponential(2));
}
const s = eyeSpring(1.55); console.log("z k", s.k.toFixed(3), "x k", eyeSpring(0.12).k.toFixed(3));
// settle time for the x axis from pos 0.1: time for |pos| < 1e-3
const x = eyeSpring(0.12); x.pos = 0.1; let t = 0; while (Math.abs(x.pos) > 1e-3 && t < 5) { stepSpring(x, 1/240); t += 1/240; }
console.log("x settle to 1e-3 (s)", t.toFixed(3));
const z = eyeSpring(1.55); z.pos = 0.1; t = 0; while (Math.abs(z.pos) > 1e-3 && t < 5) { stepSpring(z, 1/240); t += 1/240; }
console.log("z settle to 1e-3 (s)", t.toFixed(3));
