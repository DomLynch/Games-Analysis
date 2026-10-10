N = 'latentcollapse-RustDAoC'
R = '/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/bin/rustdaoc.rs'
LIB = '/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/lib.rs'
SPEC = [
 (N, 'mouse SENS constant 0.005 (rad per pixel)', R, 'const SENS: f32 = 0.005;'),
 (N, 'mouse right-drag branch zeroes orbit on every motion event', R, 'Without the reset, a left-drag orbit persists forever'),
 (N, 'pinned turn: DAoC fixes the camera while right is held', R, 'DAoC fixes the CAMERA while it is down'),
 (N, 'product client is the player camera; free-fly is the inspector', LIB, 'player-anchored camera, no editor chrome. This is the thing that becomes the drop-in client.'),
]
