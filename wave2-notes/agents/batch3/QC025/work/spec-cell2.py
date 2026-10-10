N = 'esponges-daoc-web'
V = '/mnt/frankendom-donors/esponges-daoc-web/web/viewer.js'
CB = '/mnt/frankendom-donors/esponges-daoc-web/web/combat.js'
LIC = '/mnt/frankendom-donors/esponges-daoc-web/LICENSE'
H = '/mnt/frankendom-donors/esponges-daoc-web/web/index.html'
SPEC = [
 (N, 'camera mode comment: orbit chase camera and free-fly', V, '// Two modes: an orbit camera chasing the character, and the original'),
 (N, 'chase camera heading is character plus offset', V, "// The chase camera's heading is the character's plus an offset: A and D"),
 (N, 'orbit state initial values', V, 'const orbit = { yaw: Math.PI, off: 0, pitch: 0.30, dist: 320 };'),
 (N, 'turn rate 2.8 rad per second', V, 'const TURN = 2.8;'),
 (N, 'camera return rate 3 per second', V, 'const CAM_RETURN = 3;'),
 (N, 'vertical FOV pi/3', V, 'const FOV = Math.PI / 3;'),
 (N, 'frame dt capped at 0.1 s', V, 'const dt = Math.min(0.1, (now - last) / 1000);'),
 (N, 'A and D turn the character itself', V, 'player.yaw += turn * TURN * dt;'),
 (N, 'camera heading = character yaw + offset', V, 'orbit.yaw = player.yaw + orbit.off;'),
 (N, 'offset wrapped to -pi..pi', V, 'orbit.off = ((orbit.off + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;'),
 (N, 'swung camera eases back only while moving', V, 'orbit.off *= Math.max(0, 1 - CAM_RETURN * dt);'),
 (N, 'comment: moving brings a swung camera back round behind', V, '// Moving brings a camera swung aside back round behind.'),
 (N, 'look-at point: ground plus fraction of model height', V, 'target = [player.x, playerGround + char.height * char.scale * 0.62, player.y];'),
 (N, 'look direction from yaw and pitch', V, 'const look = [Math.sin(orbit.yaw) * op, -os, -Math.cos(orbit.yaw) * op];'),
 (N, 'eye = target minus look times dist (sphere)', V, 'target[0] - look[0] * orbit.dist,'),
 (N, 'comment: chase camera never sinks into hillside', V, '// Never let the chase camera sink into the hillside behind.'),
 (N, 'eye floor: ground under eye plus 40', V, 'const floor = groundAt(eye[0], eye[2]) + 40;'),
 (N, 'eye lifted to floor vertically (not a pull-in)', V, 'if (eye[1] < floor) eye[1] = floor;'),
 (N, 'near plane 15 in follow mode, 20 in free fly', V, 'const near = followMode ? 15 : 20;'),
 (N, 'far plane 160000', V, 'const far = 160000;'),
 (N, 'right drag swings camera offset (0.005 per pixel)', V, 'orbit.off -= e.movementX * 0.005;'),
 (N, 'pitch drag 0.004 per pixel clamped -0.35..1.25', V, 'orbit.pitch = Math.max(-0.35, Math.min(1.25, orbit.pitch + e.movementY * 0.004));'),
 (N, 'wheel zoom factors 1.12 and 0.89, dist clamp 90..4000', V, 'orbit.dist = Math.max(90, Math.min(4000, orbit.dist * (e.deltaY > 0 ? 1.12 : 0.89)));'),
 (N, 'right button starts drag in follow mode', V, 'if (e.button === 2 || (e.button === 0 && !followMode)) dragging = true;'),
 (N, 'comment: right drag turns camera and nothing else', V, 'turns the camera and nothing else; in free-fly either button looks'),
 (N, 'groundAt samples the heightmap triangle split', V, 'if (tx + ty <= 1) return h00 + (h10 - h00) * tx + (h01 - h00) * ty;'),
 (N, 'target selection ranks by distance, penalised behind the camera', CB, 'return distance(player, n) * (off > Math.PI / 2 ? 4 : 1);'),
 (N, 'comment: Tab picks nearest in front of camera', CB, '// targetNext picks the nearest living NPC in front of the camera, or the'),
 (N, 'Tab target range 3000', CB, 'const TARGET_RANGE = 3000;'),
 (N, 'licence: MIT', LIC, 'MIT License'),
 (N, 'licence copyright line', LIC, 'Copyright (c) 2026 Fernando González Tostado'),
 (N, 'in-page key help lists right-drag and wheel', H, 'right-drag = look around · wheel = zoom'),
]
