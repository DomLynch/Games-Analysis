N = 'latentcollapse-RustDAoC'
R = '/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/bin/rustdaoc.rs'
LIB = '/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/lib.rs'
SPEC = [
 (N, 'mouse right-drag code zeroes orbit (per motion event, inside turning branch)', R, 'self.cam_orbit = 0.0;', 7978),
 (N, 'product client is the player camera; free-fly is the inspector', LIB, 'a player-anchored camera, no editor chrome', 6),
]
