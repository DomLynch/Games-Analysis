N = 'latentcollapse-RustDAoC'
R = '/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/bin/rustdaoc.rs'
SPEC = [
 (N, 'start pitch taken from client ini tilt at runtime', R, 'orbit_pitch: client_cam.map_or(CAM_PITCH_START, |c| c.tilt_radians()),', 2358),
 (N, 'default distance taken from client ini distance at runtime', R, 'cam_dist: client_cam.map_or(CAM_DIST, |c| c.distance),', 2359),
 (N, 'turn function is outside Client on purpose; apply_turn signature', R, 'fn apply_turn(', 961),
 (N, 'update_movement order: keyboard turn is applied first', R, 'Keyboard turning first, so this frame', 4375),
]
