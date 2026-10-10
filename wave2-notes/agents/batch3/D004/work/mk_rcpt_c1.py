import csv
D="/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/"
N="latentcollapse-RustDAoC"
rows=[
("clip_sample_time is the render-time sample clock","caer-render/src/lib.rs",973,"pub fn clip_sample_time("),
("standing rate is clip.rate over duration","caer-render/src/lib.rs",984,"clip.rate.max(0.001) / d"),
("moving rate is speed over stride","caer-render/src/lib.rs",982,"f32::from(speed) / stride_units"),
("stride branch needs stride and speed above zero","caer-render/src/lib.rs",981,"let rate = if stride_units > 0.0 && speed > 0 {"),
("sample time wraps on the clip duration, phase added before rate","caer-render/src/lib.rs",986,"((anim_time + phase * d) * rate * d % d).abs()"),
("per-entity phase is golden-ratio fract of object_id","caer-render/src/lib.rs",559,"let phase = (f32::from(v.object_id) * 0.618_034).fract();"),
("render call site samples each skinned instance","caer-render/src/lib.rs",691,"let t = sample(clip, su, *speed, *phase);"),
("preworld idle uses the same clock","caer-render/src/bin/rustdaoc.rs",1424,"caer_render::preworld_idle_t(&r.clip, anim_time)"),
("clip_for_state picks the clip and stride per locomotion state","caer-render/src/entities.rs",295,"pub fn clip_for_state(&self, state: Loco)"),
("run falls back to walk when no run clip","caer-render/src/entities.rs",298,"Loco::Run => match (&self.run, &self.walk) {"),
("walk falls back to run when no walk clip","caer-render/src/entities.rs",303,"Loco::Walk => match (&self.walk, &self.run) {"),
("run threshold is wire speed 100","caer-render/src/entities.rs",284,"const RUN_SPEED: u16 = 100;"),
("state_for_motion maps back and strafe to their own clips","caer-render/src/entities.rs",335,"pub fn state_for_motion(speed: u16, motion: Motion) -> Loco {"),
("load_clip attaches the table playback rate to the clip","caer-render/src/entities.rs",900,"fn load_clip(&self, cref: &caer_assets::anims::AnimClipRef)"),
("load_clip reads rate_scale from the table row","caer-render/src/entities.rs",906,"let r = cref.rate_scale();"),
("missing rate falls back to 1.0","caer-render/src/entities.rs",907,"clip.rate = if r > 0.0 { r } else { 1.0 };"),
("Clip.rate doc: clip-seconds per real second","caer-assets/src/nif.rs",2114,"Clip-seconds to advance per real second"),
("Clip.duration is authored key timeline","caer-assets/src/nif.rs",2111,"Length of the key timeline in seconds, in AUTHORED time"),
("rate_scale is fps over base_fps","caer-assets/src/anims.rs",143,"self.fps / self.base_fps"),
("rate_scale definition","caer-assets/src/anims.rs",141,"pub fn rate_scale(&self) -> f32 {"),
("base_fps falls back to fps when zero or missing","caer-assets/src/anims.rs",220,".unwrap_or(fps);"),
("loop flag parsed from the type column","caer-assets/src/anims.rs",224,".is_some_and(|s| s.trim().eq_ignore_ascii_case("),
("clamp clips are not looping in the unit test","caer-assets/src/anims.rs",454,"a `clamp` clip plays once and holds"),
("clip lookup returns none for id zero","caer-assets/src/anims.rs",306,"if id == 0 {"),
("clip lookup reads the clip table by id","caer-assets/src/anims.rs",309,"self.clips.get(&id)"),
("BLEND_SECONDS is ours, 0.2 s","caer-render/src/entities.rs",192,"pub const BLEND_SECONDS: f32 = 0.2;"),
("blend constant is not in the client data","caer-render/src/entities.rs",189,"This value is ours, not the client's."),
("Blend Time column is zero in all rows","caer-render/src/entities.rs",190,"`0` in all 3,938 populated rows"),
("tick_anim starts a cross-fade on a state change","caer-render/src/entities.rs",842,"pub fn tick_anim(&mut self, object_id: u16, want: Loco, now: f32)"),
("cross-fade source is the state on screen","caer-render/src/entities.rs",853,"st.prev = Some(st.cur);"),
("blend_weight returns none when nothing blends","caer-render/src/entities.rs",209,"pub fn blend_weight(&self, now: f32) -> Option<f32> {"),
("blend completes at BLEND_SECONDS minus slack","caer-render/src/entities.rs",224,"if elapsed >= BLEND_SECONDS - DONE_SLACK {"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/D004/receipts.tsv","w",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n")
    w.writerow(["note","claim","donor_file","line","quote"])
    for claim,path,line,q in rows:
        w.writerow([N,claim,D+path,line,q])
print(len(rows),"rows")
