"""Blender headless: kit-bash a Frost Revenant-style boss on our knight (shared 65-bone rig).

Adds icy spikes and a helm crest as separate pieces bound rigidly to bones (they animate with the rig),
removes the maul, tints the body cool, exports a glb with all animations.

Usage: blender -b -P kitbash.py -- KNIGHT.glb OUT.glb
"""

import json
import struct
import sys

import bpy
from mathutils import Matrix, Vector

src, out = sys.argv[sys.argv.index("--") + 1 :]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)

arm = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]
body = bpy.data.objects["CreatureBody"]

# Remove maul (WeaponDrawn and its meshes) and the stray helper sphere.
for o in list(bpy.data.objects):
    if o.name.startswith("Mesh_") or o.name in ("WeaponDrawn", "Icosphere"):
        bpy.data.objects.remove(o, do_unlink=True)

ice = bpy.data.materials.new("FrostIce")
ice.use_nodes = True
bsdf = ice.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.62, 0.82, 0.95, 1.0)
bsdf.inputs["Roughness"].default_value = 0.25
bsdf.inputs["Emission Color"].default_value = (0.25, 0.55, 0.9, 1.0)
bsdf.inputs["Emission Strength"].default_value = 0.6


def bone_world(name):
    b = arm.data.bones[name]
    return arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local, b


def add_spike(bone, pos, direction, length, radius):
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=radius, radius2=0.0, depth=length, location=pos)
    s = bpy.context.active_object
    quat = direction.normalized().to_track_quat("Z", "Y")
    s.rotation_euler = quat.to_euler()
    s.location = pos + direction.normalized() * (length / 2)
    s.data.materials.append(ice)
    bpy.context.view_layer.update()
    b = arm.data.bones[bone]
    s.parent = arm
    s.parent_type = "BONE"
    s.parent_bone = bone
    s.matrix_parent_inverse = (arm.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))).inverted()
    return s


pieces = []
scale = 1.0
# Shoulder spikes: three per side, fanning up and outward.
for side in ("l", "r"):
    head, tail, b = bone_world("clavicle_" + side)
    sign = 1.0 if tail.x >= 0 else -1.0
    base = tail + Vector((sign * 0.06, 0, 0.05))
    for i, (ox, oz, ln) in enumerate([(0.55, 0.85, 0.34), (0.95, 0.35, 0.28), (0.15, 1.0, 0.26)]):
        pieces.append(add_spike("clavicle_" + side, base + Vector((0, (i - 1) * 0.07, 0)), Vector((sign * ox, 0, oz)), ln, 0.05))
    # Forearm spikes: two per side along the outside of the lower arm.
    h2, t2, b2 = bone_world("lowerarm_" + side)
    mid = (h2 + t2) / 2
    for k, f in enumerate((0.0, 0.3)):
        p = h2 + (t2 - h2) * (0.35 + f) + Vector((0, 0.05, 0.04))
        pieces.append(add_spike("lowerarm_" + side, p, Vector((sign * 0.3, 0.5, 0.9)), 0.2, 0.035))

# Helm crest: tall fin and two side shards on the head bone.
hh, ht, hb = bone_world("Head")
top = Vector((hh.x, hh.y, ht.z + 0.02))
pieces.append(add_spike("Head", top + Vector((0, 0.0, 0.0)), Vector((0, 0.0, 1.0)), 0.5, 0.045))
pieces.append(add_spike("Head", top + Vector((0.05, 0, -0.03)), Vector((0.9, 0, 0.5)), 0.22, 0.03))
pieces.append(add_spike("Head", top + Vector((-0.05, 0, -0.03)), Vector((-0.9, 0, 0.5)), 0.22, 0.03))

print("PIECES", len(pieces), "head tail z", round(ht.z, 3), "clavicle_l tail", tuple(round(v, 3) for v in bone_world("clavicle_l")[1]))

bpy.ops.object.select_all(action="DESELECT")
for o in [arm, body] + pieces:
    o.select_set(True)
tmp = out + ".tmp.glb"
bpy.ops.export_scene.gltf(filepath=tmp, export_format="GLB", use_selection=True, export_animations=True, export_animation_mode="ACTIONS", export_skins=True)

# Cool frost tint on the body material (factor multiplies the texture).
data = open(tmp, "rb").read()
jlen = struct.unpack_from("<I", data, 12)[0]
js = json.loads(data[20 : 20 + jlen])
rest = data[20 + jlen :]
tinted = 0
for m in js.get("materials", []):
    if m.get("name") == "KnightSurface":
        m.setdefault("pbrMetallicRoughness", {})["baseColorFactor"] = [0.62, 0.8, 1.0, 1.0]
        tinted += 1
jb = json.dumps(js).encode()
jb += b" " * (-len(jb) % 4)
body_bytes = struct.pack("<II", len(jb), 0x4E4F534A) + jb + rest
open(out, "wb").write(struct.pack("<III", 0x46546C67, 2, 12 + len(body_bytes)) + body_bytes)
print("DONE", out, "tinted", tinted, "actions", len(bpy.data.actions))
