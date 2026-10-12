# keldaanCommunity-pokemonAutoChess (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/pokemon-sprite.ts` (lazy per-species residency, lines 308-356 and 1713-1800) | Licence: GPL-3.0 (read: LICENSE file, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | TypeScript (Phaser 4 client) | symbol `lazyLoadAnimations` / `unloadAnimations` / `loadCompressedAtlas`

Checked: Read `lazyLoadAnimations` (308-338), `unloadAnimations` (341-356), `loadCompressedAtlas` (1713-1800), `resetSpriteCounts` (73-75), `unloadPokemonAnimations` (animation-manager.ts 150-190). Callers read: `pokemon-sprite.ts` 279 (create) and 398 (destroy), `board-manager.ts` 1097-1115 (evolution), `battle-manager.ts` 676-700 (evolution). Not read: the body of `createPokemonAnimations` (animation-manager.ts 65 onward) and Phaser's multiatlas internals. Scope: the note is about the client; the engine is not involved. Confidence: high on the ref-count and unload order (read all of it); medium on the failure path (inferred from the branch order, not run). The "no texture is ever freed" claim rests on a grep of `app/public/src` for `textures.remove`, `removeTexture` and `textures.destroy` (no hits); the grep was not run over the whole donor.

## 1. Mechanism

- Each board sprite asks for its species' animations when it is created, or when its species changes (evolution). Residency is ref-counted per key `species/tint` in one module-level map (`spriteCountPerPokemon`, pokemon-sprite.ts 71).
- Order of steps on acquire (`lazyLoadAnimations`, 308-338):
  (a) read the count for the key (320).
  (b) if the count is 0 and the scene has an animation manager: if the species texture is not yet in the texture manager, start its atlas load and create animations after it resolves (322-324); if the texture exists, create the animations at once (326).
  (c) if the count is above 0: if the loader is busy, wait for its "complete" event and then create the animations (329-330); otherwise create them now (332).
  (d) increment and store the count (335-337). The increment happens after the branch; in the atlas path the count is stored before the atlas finishes loading.
- Atlas load (`loadCompressedAtlas`, 1713-1800): one promise per species index, shared by every caller (1717-1718). The atlas JSON stores each frame as an array of ten numbers (source size, trimmed rect, frame rect), and a recursive walk turns those arrays into Phaser frames (1733-1765). The texture registers under the species name on the `addtexture` event (1795-1799), and the entry is then deleted (1797).
- Error path: `onError` resolves the same promise and deletes the entry (1721-1725), so a later caller can retry. The caller's `.then(loadAnimations)` (324) still runs after an error. Whether `createPokemonAnimations` tolerates a missing texture was not read.
- Fallback texture: after the load, the sprite uses the species texture if it exists, otherwise the "0000" texture (282). The "0000" atlas is preloaded at loading-manager.ts 129.
- Release (`unloadAnimations`, 341-356): decrement, floored at zero (348). When the count reaches zero, remove the animation definitions for that key (349-353). `unloadPokemonAnimations` (animation-manager.ts 150-190) removes idle, walk, sleep, eat, hop, attack, ability, emote and hurt animations for each direction, and removes them through `this.game.anims.remove(` (184). Nothing removes the texture.
- Callers: create (pokemon-sprite.ts 279), destroy (398 calls `this.unloadAnimations(`), evolution in the board (board-manager.ts 1097-1108: unload the old index, then lazy-load the new one) and in battles (battle-manager.ts 682-691, same pattern). Scene preload clears every count (game-scene.ts 109 calls `resetSpriteCounts()`, which clears the map and the atlas request cache, 73-75).
- Tick or timer: none. The mechanism is event-driven and costs nothing per frame.

## 2. Key functions

- `lazyLoadAnimations`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/pokemon-sprite.ts` 308-338. Ref-count up; loads the atlas once per species; creates the animations once per key.
- `unloadAnimations`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/pokemon-sprite.ts` 341-356. Ref-count down, floored at zero; removes animations at zero.
- `loadCompressedAtlas`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/pokemon-sprite.ts` 1713-1800. Shared in-flight request per species; compact frame table; registers the texture.
- `unloadPokemonAnimations`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/animation-manager.ts` 150-190. Removes animation definitions only.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Ref-count per key, floor at zero | `min(0)` returns `Math.max(minimum, value)` (app/utils/number.ts 1-4, receipt line 4); the name is misleading, the behaviour is a floor at 0 |
| One shared in-flight load per asset | none (a promise cache, 1717-1720) |
| Missing-texture fallback | texture key `"0000"` (pokemon-sprite.ts 282; preloaded at loading-manager.ts 129) |
| Asset HTTP timeout | 5000 ms (loading-manager.ts 43, "help avoiding failed loading of assets when server is overloaded") |
| Delay before background music preload | 5000 ms (loading-manager.ts 38) |
| Frame-rate cap (also seen, see section 6) | `MAX_CONFIG_FPS = 144` (preferences.ts 7); stored default `MAX_CONFIG_FPS + 1` = "uncapped" (preferences.ts 84); `setFPSLimit(0)` when above the cap (game-container.ts 335) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's shape (first holder creates, last holder removes, count floored at zero, one atlas promise per species). It omits Phaser, the texture keys, the frame-table walk, the timeouts, the scene-start reset and the music preload. It reorders or adds three things the donor does not do: (1) it frees the atlas when the species has no holder left (`dropAtlas`; the donor frees only animations); (2) it re-checks the count after the atlas await before creating animations, so a release during the load does not leave animations behind; (3) a failed atlas load is forgotten so a later acquire retries, and an acquire after a failure creates no animations.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Tint = "normal" | "shiny";

interface AssetIO {
  // loads the species atlas; resolves false when the file is missing or fails to load
  loadAtlas(species: string): Promise<boolean>;
  makeAnims(species: string, tint: Tint): void;
  dropAnims(species: string, tint: Tint): void;
  dropAtlas(species: string): void;
}

export class CreatureResidency {
  private refs = new Map<string, number>(); // key: species/tint
  private anims = new Set<string>();
  private atlas = new Map<string, Promise<boolean>>();

  constructor(private io: AssetIO) {}

  // one atlas load per species, shared by every caller; a failed load is forgotten so a later acquire retries
  private loadAtlas(species: string): Promise<boolean> {
    let p = this.atlas.get(species);
    if (!p) {
      p = this.io.loadAtlas(species).then((ok) => {
        if (!ok) this.atlas.delete(species);
        return ok;
      });
      this.atlas.set(species, p);
    }
    return p;
  }

  // ref-count up; the first holder of a key creates its animations once the atlas is ready.
  // resolves false when the caller should show the fallback texture instead.
  async acquire(species: string, tint: Tint): Promise<boolean> {
    const key = `${species}/${tint}`;
    this.refs.set(key, (this.refs.get(key) ?? 0) + 1);
    const ok = await this.loadAtlas(species);
    // re-check the count after the await: a release may have happened while the atlas loaded
    if (ok && (this.refs.get(key) ?? 0) > 0 && !this.anims.has(key)) {
      this.io.makeAnims(species, tint);
      this.anims.add(key);
    }
    return ok;
  }

  // ref-count down, floored at zero. Last holder of a key drops its animations;
  // when no tint of the species is held any more, the atlas is dropped too.
  release(species: string, tint: Tint): void {
    const key = `${species}/${tint}`;
    const n = Math.max(0, (this.refs.get(key) ?? 0) - 1);
    this.refs.set(key, n);
    if (n === 0 && this.anims.delete(key)) this.io.dropAnims(species, tint);
    const stillHeld = (["normal", "shiny"] as Tint[]).some(
      (t) => (this.refs.get(`${species}/${t}`) ?? 0) > 0
    );
    if (!stillHeld) {
      this.atlas.delete(species);
      this.io.dropAtlas(species);
    }
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/RP013-creature-residency.ts`: exit 0.

## 5. Lands in

- TARGET `origins/client/creature-residency.ts` (client only; the engine never reads it). Parity-checklist row 7 (creature actor/clips). The animation side of row 7 is the clips a creature needs to be on screen; the residency is what decides when those clips exist.
- today: not read in Frankendom by this pass (no Frankendom file opened).
- Reuse tag: adapt-from-idea (GPL-3.0; clean-room, shape only)
- Brief rule served: client-only rendering (the engine is untouched); the zones-as-data rule applies to which species a zone loads (not in this donor).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; no line of the donor is copied.
- The donor frees animation definitions only. The atlas texture stays in the texture manager for the whole scene, and nothing in `app/public/src` removes it. Frankendom must free the atlas on last release, or memory grows with every species a player sees. The sketch adds `dropAtlas` for this.
- Failure path (inferred, not run): after a failed atlas load, the first caller still runs `loadAnimations` (324), and a later caller with a count above zero skips the load (329-332). Whether `createPokemonAnimations` tolerates a missing texture was not read. The sketch returns false and creates no animations.
- Release during a load (inferred from the order of 324 and 335-337): the donor's deferred `loadAnimations` can run for a sprite that has already been destroyed. The sketch checks the count after the await.
- The count is module-global and only cleared at scene start (73-75; game-scene.ts 109). If a Frankendom zone change skips `release`, counts stay above zero and the atlas is never dropped. Zone exit must release every holder.
- Also seen (fold-in, rendering): the frame-rate setting. The donor stores "uncapped" as cap + 1 (preferences.ts 84) and passes 0 to Phaser for unlimited (game-container.ts 335). On phones, a cap below the display refresh is the safer default; this is a quality setting (parity row 16), not part of the residency mechanism.
- Also seen: the heat-haze shader is gated on WebGL and on a user toggle (weather-manager.ts 224-225). No culling or draw-call budgeting was found: a grep of `app/public/src/game` for `cull`, `inView`, `worldView` and `batch` was capped at 30 lines, and the first hits were recorder batching and a tooltip position (pokemon-sprite.ts 361), so this is a sample, not a full search.

Reuse tag: adapt-from-idea (GPL-3.0; clean-room, shape only)
Brief rule served: client-only rendering; engine untouched; no per-frame cost in the donor.

Best transferable idea: Load a creature's atlas and animation set on first sight in a zone, ref-count it per species and tint, and free it when the last instance leaves, with a missing-texture fallback so a bad asset never blanks the scene.
Decision (proposed): adapt - keep first-holder-loads and last-holder-frees per species+tint, and add the texture free and the post-await count check the donor lacks; Frankendom loads creature clips per zone, so per-zone residency fits the zones-as-data ruling.
Acceptance: a client test spawns three creatures of one species, despawns all three, and asserts that the animation keys and the atlas are gone; a fourth spawn reloads the atlas exactly once.
