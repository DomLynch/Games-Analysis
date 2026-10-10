# latentcollapse-RustDAoC (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/combat.rs` | Licence: GPL-3.0-or-later (LICENSE file; caer-render/Cargo.toml `license.workspace = true`) | Rust (egui) | symbol `FloatingTexts::tick` / `draw_floating` and `CombatLog::push`

Checked: Read `combat.rs` 1-420 and 420-632 (module header, parser, log, floating numbers, draw code, tests in part); not read: `combat.rs` 633-667 (a CombatAnimation test). Callers read in `caer-render/src/bin/rustdaoc.rs`: 5100-5160 (chat messages into the log, `floaters.tick`), 5664-5720 (pending damage anchored and spawned, with jitter), 5776-5790 (draw order and the dev-egui gate). Order inside one frame: `drain_into` (4862) -> log push and pending damage (5108-5110) -> `floaters.tick(dt)` (5156) -> spawn pending damage (5684-5693) -> draw (5782). The hint file `hud.rs` is the HUD panels, not this mechanism (only grepped). Confidence: high on lifetime, rise, fade, sizes and log window (read and tied to callers). Medium on the exact on-screen result (drawn through egui; not run). camera_scope: not a camera cell.

## 1. Mechanism

- Two HUD mechanisms in one file, both client-side. (A) Floating combat numbers: each hit becomes a floater that spawns at a screen anchor, rises and fades for 1.5 s, then is removed. (B) A bounded combat log: the last 200 system lines are kept, and 8 are shown, with paging back into history.
- Where the hits come from (this donor's choice, not ours): the server does not send structured hit numbers to this client, so the damage number is parsed from the system text line (`parse_damage`, `combat.rs` 113-149). The donor says so itself: "a wrong number floating over the screen is worse than no number" (combat.rs 105-106, the doc comment on `parse_damage`). Structured CombatAnimation 0xBC is the second, preferred source (`spawn_combat_anim`, 290-306).
- Order inside one frame (`rustdaoc.rs` frame, 4837 on):
  1. Every 0xAF message is pushed into the log (5108-5109). `push` drops the client-directive type 0x64, keeps the newest 200 lines (193-194), and returns a parsed `Damage` only for combat-class lines (196-197). Each parsed damage goes to `pending_damage` (5110).
  2. `floaters.tick(dt)` adds `dt` to every floater's age and removes any at age 1.5 s or more (5156; 308-314).
  3. Pending damage is spawned with an anchor (5684-5693): incoming hits at the player's own screen point, outgoing hits at the target's projected nameplate point (5664-5683). The x position is nudged by `(n % 3 - 1) * 22` px, where `n` is the number of live floaters before this push. The y position is not nudged.
  4. Drawing (5780-5790): nameplates and floaters are drawn when the HUD is shown (5781-5782). The log, the quickbar and the HUD panels are drawn only inside a further `dev_egui_enabled()` check (5783-5790).
- Per floater, at draw time (`draw_floating`, 379-): `t = age / 1.5` clamped to 0..1 (382). Opacity is 1 until t = 0.5, then falls linearly to 0 (384). Screen y = anchor y minus `48 * t` px (385). Size: critical 21, incoming non-critical 18, outgoing non-critical 16 (398-400 and the match after). Critical text is the number followed by `!` (406).
- Per log line, at draw time: `recent()` shows the 8 lines ending `scroll_back` lines before the newest (`CombatLog::recent`). `page_up` and `page_down` move the window by 8 lines, clamped to history (`page_up` / `page_down`).

## 2. Key functions

- `parse_damage`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/combat.rs` 113-149. Text parser: requires the line to end in "damage!", takes the last " for ", detects "an additional " as a critical, reads the digits, reads an optional "(+N)" or "(-N)", and sets `incoming` from the "You " prefix.
- `CombatLog::push`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/combat.rs` 184-201 (drops type 0x64; appends; trims to 200; parses only combat-class lines).
- `FloatingTexts::spawn` and `tick`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/combat.rs` 276-287 and 308-314 (`spawn_combat_anim` at 290-306).
- `draw_floating`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/combat.rs` 379-423 (opacity, rise, size, critical marker).
- Spawn with jitter (caller): `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/bin/rustdaoc.rs` 5684-5693.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Floating number lifetime, then retire when age reaches the lifetime | `FLOAT_LIFETIME` 1.5 s (combat.rs 260) |
| Number drifts up over its whole life | `FLOAT_RISE` 48 px (combat.rs 262); the rise is `48 * t` |
| Fade only over the back half, so the number stays readable when it matters | opacity 1 for t up to 0.5, then linear to 0 (combat.rs 384) |
| Crit and incoming read larger, so a second number is self-explaining | sizes 21 / 18 / 16 px (combat.rs 398-400) |
| Horizontal jitter so a flurry does not stack into one smear | three slots: offsets -22, 0, +22 px (rustdaoc.rs 5693) |
| Bounded log, oldest falls off | 200 lines (combat.rs 170); 8 visible (combat.rs 172) |
| Page back in history by one window | 8 lines per page (`page_up` / `page_down`) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (age then retire on tick; anchor with a jitter computed from the live count before the push; opacity and rise computed at draw time; the log trims oldest and keeps a scroll-back window). It omits the text parser (the sketch takes structured hits, as Frankendom will), the 0xAF classification and the 0x64 directive filter, the 0xBC CombatAnimation path, the egui drawing and colours, the dev-egui gate, and the target projection (the caller supplies the anchor). The jitter, the three-slot cycle and the per-frame order are the donor's.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const FLOAT_LIFETIME = 1.5;   // s: a floating number lives this long
const FLOAT_RISE = 48;        // px: how far it drifts up over its whole life
const LOG_CAPACITY = 200;     // lines kept in the log
const LOG_VISIBLE = 8;        // lines shown at once

interface Hit { amount: number; incoming: boolean; critical: boolean; }
interface Floater { hit: Hit; anchor: [number, number]; age: number; }

class FloaterStack {
  private items: Floater[] = [];

  // anchor: our own screen point for incoming hits, the target's screen point for outgoing ones.
  spawn(hit: Hit, anchor: [number, number]): void {
    const n = this.items.length;                 // live count BEFORE this push
    const jitter = ((n % 3) - 1) * 22;           // three x slots, cycling with the live count
    this.items.push({ hit, anchor: [anchor[0] + jitter, anchor[1]], age: 0 });
  }

  tick(dt: number): void {
    for (const f of this.items) f.age += dt;
    this.items = this.items.filter(f => f.age < FLOAT_LIFETIME);
  }

  draw(): Array<{ text: string; x: number; y: number; alpha: number; size: number }> {
    return this.items.map(f => {
      const t = Math.min(Math.max(f.age / FLOAT_LIFETIME, 0), 1);
      // Full opacity for the first half of the life, then a linear fade to zero.
      const alpha = Math.min(Math.max(1 - Math.max(t - 0.5, 0) / 0.5, 0), 1);
      const size = f.hit.critical ? 21 : f.hit.incoming ? 18 : 16;
      const text = f.hit.critical ? `${f.hit.amount}!` : String(f.hit.amount);
      return { text, x: f.anchor[0], y: f.anchor[1] - FLOAT_RISE * t, alpha, size };
    });
  }
}

class CombatLog {
  private lines: string[] = [];
  private scrollBack = 0;

  push(line: string): void {
    this.lines.push(line);
    while (this.lines.length > LOG_CAPACITY) this.lines.shift();
  }

  recent(): string[] {
    const end = Math.max(this.lines.length - this.scrollBack, 0);
    const start = Math.max(end - LOG_VISIBLE, 0);
    return this.lines.slice(start, end);
  }

  pageUp(): void {
    this.scrollBack = Math.min(this.scrollBack + LOG_VISIBLE, Math.max(this.lines.length - LOG_VISIBLE, 0));
  }

  pageDown(): void {
    this.scrollBack = Math.max(this.scrollBack - LOG_VISIBLE, 0);
  }
}
```

Typecheck: `tsc --noEmit --strict --target es2020` on the VPS, file with `export {}` appended, exit 0.

## 5. Lands in

- TARGET `src/fight/combat-text.ts` (new, client-side HUD view). It takes structured hit events from the engine and never parses text. Proposed for both the Pit and zones.
- Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the HUD reads engine hit events; HUD is client-only, the engine never reads it).

Best transferable idea: Show each hit as its own short-lived number that rises a fixed distance over 1.5 s, stays opaque for half its life, then fades, with crits larger and marked, so a flurry reads as separate hits rather than one smear.

Decision (proposed): adapt - take the lifetime, rise, half-life fade, crit size and mark, and the bounded log window, but reject the text scraping (we have structured hit events) and replace the three-slot jitter with a per-target slot allocator, because three x-offsets stack a many-on-one flurry at the same height.

Acceptance: a server test asserts a floater is spawned only from an authoritative hit event, never from log text; a browser check shows five hits on one target in one second as five numbers, each rising 48 px and gone after 1.5 s, crits in larger type with a "!", and a 250-line log keeps 200 lines with 8 shown.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the described mechanism, not translated.
- The donor parses damage out of chat text because it has no structured damage packets for this path. The donor itself says a wrong number is worse than none. We must not copy the parser; our numbers come from the engine.
- Jitter is three x-offsets with no y-offset and no collision check. In a many-on-one fight, floaters at the same anchor and the same height overlap (the donor does not handle this). Our slot allocator is a gap we must design.
- No cap on the number of live floaters. Only the 1.5 s lifetime limits them, so a fight with very many hits creates many items at once (`FloatingTexts` 266-270 has no limit).
- Draw order: floaters are drawn in a closure gated by `show_hud`, and the log, quickbar and HUD panels only inside the dev-egui gate (rustdaoc.rs 5783-5790). A production HUD must not depend on the dev gate.
- Incoming and outgoing use direction, not entity id (`Damage` has no object id, combat.rs header). For many enemies we cannot say which enemy hit us from this donor.
- Font sizes and the 0.5 fade point are hard-coded in the draw function (combat.rs 384, 398-400), not data. Frankendom should make them data with these defaults.
- `hud.rs` (510 lines) was only grepped. Not read: the HUD panels and their layout.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one engine; HUD client-only; kills and hits server-verified)
