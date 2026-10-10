import json
OE="/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/"
d={
 "game":"OpenEnroth-OpenEnroth","category":"camera","cell":14,"verdict":"STRONG","depth":"full",
 "donor_path":OE+"Engine/Graphics/Camera.cpp",
 "licence":"LGPL-3.0 (GNU LESSER GENERAL PUBLIC LICENSE, Version 3, per LICENSE file; no per-file header in Camera.cpp)",
 "licence_class":"copyleft",
 "target_module":"src/fight/camera.ts","parity_row":11,
 "pattern_tags":["new:rigid-offset-camera","variable-step","new:discrete-turn-fallback","new:pitch-clamp","new:state-jitter","new:shake-decay"],
 "data_fields":[
  {"name":"back_offset","donor_constant":"25 (_yawGranularity)","unit":"units","where":"engine constant","donor_ref":OE+"Party.cpp:66"},
  {"name":"eye_height","donor_constant":"160 (config party_eye_level)","unit":"units","where":"engine constant","donor_ref":OE+"Application/GameConfig.h:223"},
  {"name":"turn_rate","donor_constant":"90 deg/s (_yawRotationSpeed)","unit":"units","where":"engine constant","donor_ref":OE+"Party.cpp:68"},
  {"name":"ticks_per_real_second","donor_constant":"128","unit":"ticks","where":"engine constant","donor_ref":OE+"Core/Time/Duration.h:28"},
  {"name":"turn_step_fallback","donor_constant":"0 (turn_speed default; >0 means fixed step per input)","unit":"units","where":"engine constant","donor_ref":OE+"Application/GameConfig.h:634"},
  {"name":"look_step","donor_constant":"25 (vertical_turn_speed)","unit":"units","where":"engine constant","donor_ref":OE+"Application/GameConfig.h:638"},
  {"name":"look_clamp","donor_constant":"plus or minus 128 units (22.5 deg)","unit":"units","where":"engine constant","donor_ref":OE+"Engine/Graphics/Indoor.cpp:1460"},
  {"name":"fov_outdoor","donor_constant":"75 deg","unit":"units","where":"engine constant","donor_ref":OE+"Engine/Graphics/Camera.h:77"},
  {"name":"fov_indoor","donor_constant":"60 deg","unit":"units","where":"engine constant","donor_ref":OE+"Engine/Graphics/Camera.h:79"},
  {"name":"clip_near","donor_constant":"32","unit":"units","where":"engine constant","donor_ref":OE+"Application/GameConfig.h:432"},
  {"name":"clip_far","donor_constant":"16192","unit":"units","where":"engine constant","donor_ref":OE+"Application/GameConfig.h:431"},
  {"name":"jitter_units_per_update","donor_constant":"plus or minus 8 (randomInSegment, range semantics not read)","unit":"units","where":"engine constant","donor_ref":OE+"Engine/Spells/Spells.cpp:859"},
  {"name":"jitter_timer_ticks","donor_constant":"256 (set at cast)","unit":"ticks","where":"engine constant","donor_ref":OE+"Engine/Spells/CastSpellInfo.cpp:2900"}
 ],
 "best_idea":"A camera rig that sits a fixed distance behind the hero along the facing at eye height, turns at a set rate per real second, and clamps look-up to about 22 degrees.",
 "decision":"adapt",
 "decision_why":"The fixed back offset at eye height, the per-second turn rate with a fixed-step fallback and the look clamp are the rig shape a third-person follow camera needs; the donor is first-person with no smoothing or collision, and its armageddon jitter writes the party's real facing, so that part is rejected.",
 "decision_status":"proposed",
 "acceptance":"Client test: holding turn for 1 s changes view yaw by 90 degrees, look-up stops at 22.5 degrees, and the view stays 25 units behind the hero at eye height; a server test asserts that a camera shake leaves the hero's facing and position unchanged.",
 "camera_scope":"world"
}
out="/private/tmp/p2/wave2-haiku/batch3/QC009/out/camera/OpenEnroth-OpenEnroth.json"
open(out,"w").write(json.dumps(d,indent=1,ensure_ascii=False)+"\n")
json.load(open(out)); print("json ok")
