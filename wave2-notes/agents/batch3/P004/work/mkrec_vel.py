import csv
OUT = "/private/tmp/p2/wave2-haiku/batch3/P004/receipts.tsv"
NOTE = "veloren-veloren"
C = "/mnt/frankendom-donors/veloren-veloren/voxygen/src/scene/camera.rs"
S = "/mnt/frankendom-donors/veloren-veloren/voxygen/src/scene/mod.rs"
SE = "/mnt/frankendom-donors/veloren-veloren/voxygen/src/session/mod.rs"
ST = "/mnt/frankendom-donors/veloren-veloren/common/state/src/state.rs"
LIC = "/mnt/frankendom-donors/veloren-veloren/LICENSE"
rows = [
 ("licence name", "licence is GPL version 3", LIC, 1, "GNU GENERAL PUBLIC LICENSE"),
 ("licence version", "licence version 3", LIC, 2, "Version 3, 29 June 2007"),
 ("first person interp", "first-person interpolation time is 0.1 s", C, 11, "const FIRST_PERSON_INTERP_TIME: f32 = 0.1;"),
 ("third person interp", "third-person interpolation time is 0.1 s", C, 12, "const THIRD_PERSON_INTERP_TIME: f32 = 0.1;"),
 ("orientation rate", "orientation eases at rate 15 per second times dt", C, 14, "const LERP_ORI_RATE: f32 = 15.0;"),
 ("clipping range", "terrain clipping mode applies between 2 and 20", C, 15, "const CLIPPING_MODE_RANGE: Range<f32> = 2.0..20.0;"),
 ("min zoom", "minimum zoom is 0.1", C, 16, "pub const MIN_ZOOM: f32 = 0.1;"),
 ("default third person dist", "third-person default distance is 10", C, 321, "CameraMode::ThirdPerson => 10.0,"),
 ("pitch clamp on set", "set_orientation clamps pitch with 0.0001 margin", C, 65, "ori.y.clamp(-PI / 2.0 + 0.0001, PI / 2.0 - 0.0001)"),
 ("opaque occlusion", "occlusion uses opaque voxels", C, 357, "self.compute_dependents_full(terrain, |block| block.is_opaque())"),
 ("near policy switch", "near policy used when target distance is under 20", C, 368, "if self.tgt_dist < CLIPPING_MODE_RANGE.end {"),
 ("near frustum at target", "near policy computes frustum at the target distance", C, 392, "let local_dependents = self.compute_dependents_helper(self.tgt_dist);"),
 ("frustum padding", "frustum corners are padded by 0.6", C, 404, "transformed + 0.6 * (fwd.cross(*padding) + fwd.cross(*padding).cross(fwd))"),
 ("behind padding ray", "one extra ray goes behind the camera by dist plus 0.5", C, 406, "(self.focus - self.forward() * (self.dist + 0.5))"),
 ("ray from focus", "rays are cast from the focus point", C, 409, ".ray(self.focus, pos)"),
 ("ray iteration cap", "ray casts stop after 500 iterations", C, 411, ".max_iter(500)"),
 ("ray hit clamps distance", "a hit clamps the distance to the target distance", C, 415, "(d, Ok(Some(_))) => f32::min(d, self.tgt_dist),"),
 ("minimum of rays", "the smallest distance over all rays is kept", C, 421, ".reduce(f32::min)"),
 ("switch to far policy", "a distance under 2 switches to the far policy", C, 426, "if dist < CLIPPING_MODE_RANGE.start {"),
 ("collision snaps in", "the current distance drops at once to a smaller collision distance", C, 429, "if self.dist >= dist {"),
 ("collision assignment", "the collision distance is written to the current distance", C, 430, "self.dist = dist;"),
 ("far policy ray", "far policy casts from the focus back along the view", C, 451, "let (start, end) = (self.focus - self.forward() * self.dist, self.focus);"),
 ("far policy hit", "far policy hit gives distance minus d minus 0.03", C, 460, "(d, Ok(Some(_))) => f32::min(self.dist - d - 0.03, self.dist),"),
 ("view translation", "the view is translated back by dist", C, 474, "* Mat4::translation_3d(-Vec3::unit_z() * dist)"),
 ("fixate scales rotation", "rotation input is scaled by fixate", C, 518, "let delta = delta * self.fixate;"),
 ("pitch clamp on rotate", "rotate_by clamps pitch with 0.001 margin", C, 522, "self.tgt_ori.y = (self.tgt_ori.y + delta.y).clamp(-PI / 2.0 + 0.001, PI / 2.0 - 0.001);"),
 ("zoom floor", "third-person zoom has a floor of 2", C, 540, "self.tgt_dist = (self.tgt_dist + delta).max(2.0);"),
 ("min third person", "third-person minimum is 2.35 times scale", C, 554, "const MIN_THIRD_PERSON: f32 = 2.35;"),
 ("switch to first person", "zooming under the minimum switches to first person", C, 557, "if t < MIN_THIRD_PERSON * scale {"),
 ("switch back to third", "leaving first person sets third-person distance to the minimum", C, 565, "self.tgt_dist = MIN_THIRD_PERSON * scale;"),
 ("frame time note", "the source says the timing is frame-time dependent", C, 581, "This is horribly frame time dependent, but so is most of the game"),
 ("distance lerp delta", "delta is the difference of the time value", C, 582, "let delta = self.last_time.replace(time).map_or(0.0, |t| time - t);"),
 ("distance lerp factor", "distance and fov ease by 0.65 times delta over interp time", C, 587, "0.65 * (delta as f32) / self.interp_time(),"),
 ("first person focus rate", "first-person focus eases twice as fast", C, 614, "* if matches!(self.mode, CameraMode::FirstPerson) {"),
 ("orientation ease", "orientation eases with lerp_angle at rate times dt", C, 630, "lerp_angle(self.ori.x, self.tgt_ori.x, LERP_ORI_RATE * dt),"),
 ("orientation clamp", "eased orientation is clamped and wrapped", C, 637, "self.ori = clamp_and_modulate(ori);"),
 ("first person shown at dist", "first person is reported only below distance 0.5", C, 742, "CameraMode::FirstPerson if self.dist < 0.5 => CameraMode::FirstPerson,"),
 ("shortest arc", "lerp_angle picks the wrap with the smallest difference", C, 802, "min_by_key(|offs: &&f32| ((a - (b + *offs)).abs() * 1000.0) as i32)"),
 ("angle lerp", "lerp_angle lerps toward the chosen wrap", C, 804, "Lerp::lerp(a, b + *offs, rate)"),
 ("scene frame tick", "scene maintain ticks the camera with dt and the game time", S, 759, "update(scene_data.state.get_time(), dt, scene_data.mouse_smoothing);"),
 ("scene dt source", "scene dt is the ECS delta time", S, 557, "let dt = ecs.fetch::<DeltaTime>().0;"),
 ("scene camera matrices", "matrices are rebuilt each scene frame after the tick", S, 762, "self.camera.compute_dependents(&scene_data.state.terrain());"),
 ("zoom step", "zoom step grows with current distance", S, 450, "delta * (0.05 + self.camera.get_distance() * 0.01) / (1.0 - delta * 0.01),"),
 ("session drives scene", "session calls scene maintain each frame unless paused", SE, 2249, "self.scene.maintain("),
 ("client clock dt", "session tick takes the client clock game dt", SE, 1625, "match self.tick(global_state.clock.game_dt(), global_state, &mut outcomes) {"),
 ("state time advance", "state time advances by dt times time scale", ST, 870, "self.ecs.write_resource::<Time>().0 += dt.as_secs_f64() * time_scale;"),
 ("state delta cap", "DeltaTime is capped by MAX_DELTA_TIME", ST, 877, "(dt.as_secs_f32() * time_scale as f32).min(MAX_DELTA_TIME);"),
 ("max delta constant", "MAX_DELTA_TIME is 1.0 second", ST, 57, "const MAX_DELTA_TIME: f32 = 1.0;"),
]
with open(OUT, "a", newline="") as f:
    w = csv.writer(f, delimiter="\t", quoting=csv.QUOTE_NONE, escapechar=None, lineterminator="\n", quotechar="\x00")
    for _k, claim, path, line, quote in rows:
        assert "\t" not in quote and "\t" not in claim
        w.writerow([NOTE, claim, path, str(line), quote])
print("appended", len(rows))
