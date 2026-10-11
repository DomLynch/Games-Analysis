"""Blender headless: fit a TRELLIS A-pose mesh onto our 65-bone knight rig and export with all animations.

Steps: normalise height, decimate, pose our arms out to match the A-pose, copy skin weights from our body
(posed), bring the mesh back to the rest pose through the weights, bind, export.

Usage: blender -b -P fit_tmax.py -- TMAX.glb KNIGHT.glb OUT.glb [ARM_DEG] [HEIGHT] [TRIS]
"""

import math
import sys

import bpy
from mathutils import Matrix, Vector

a = sys.argv[sys.argv.index("--") + 1 :]
tmax, knight, out = a[0], a[1], a[2]
ARM = float(a[3]) if len(a) > 3 else 25.0
HEIGHT = float(a[4]) if len(a) > 4 else 2.35
TRIS = int(a[5]) if len(a) > 5 else 46000
EMIT = int(a[6]) if len(a) > 6 else 0
MAULX = float(a[7]) if len(a) > 7 else 1.5

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=knight)
arm = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]
body = bpy.data.objects["CreatureBody"]
for o in list(bpy.data.objects):
    if o.name == "Icosphere":
        bpy.data.objects.remove(o, do_unlink=True)
weapon = [o for o in bpy.data.objects if o.name == "WeaponDrawn" or o.name.startswith("Mesh_")]
wd = bpy.data.objects.get("WeaponDrawn")
if wd is not None:
    wd.scale = wd.scale * (HEIGHT / 2.12) * MAULX
arm.data.pose_position = "REST"
for pb in arm.pose.bones:
    pb.rotation_mode = "QUATERNION"
    pb.rotation_quaternion = (1, 0, 0, 0)
    pb.location = (0, 0, 0)
    pb.scale = (1, 1, 1)
if arm.animation_data:
    arm.animation_data.action = None

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=tmax)
new = [o for o in bpy.data.objects if o not in before]
meshes = [o for o in new if o.type == "MESH"]
print("TMAX objects", [(o.name, o.type) for o in new], "faces", sum(len(m.data.polygons) for m in meshes))
for o in new:
    if o.type != "MESH":
        for c in list(o.children):
            c.parent = None
        bpy.data.objects.remove(o, do_unlink=True)

bpy.ops.object.select_all(action="DESELECT")
for m in meshes:
    m.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
mesh = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def bbox(o):
    cs = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return Vector(map(min, *cs)), Vector(map(max, *cs))


lo, hi = bbox(mesh)
s = HEIGHT / (hi.z - lo.z)
mesh.scale = (s, s, s)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
lo, hi = bbox(mesh)
mesh.location = Vector((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2 + 0.0, -lo.z + 0.03))
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
print("TMAX bbox", tuple(round(v, 3) for v in bbox(mesh)[0]), tuple(round(v, 3) for v in bbox(mesh)[1]))

# Decimate to the phone budget (UVs and texture kept).
n0 = len(mesh.data.polygons)
dec = mesh.modifiers.new("dec", "DECIMATE")
dec.ratio = min(1.0, TRIS / max(n0, 1))
bpy.context.view_layer.objects.active = mesh
bpy.ops.object.modifier_apply(modifier="dec")
print("DECIMATE", n0, "->", len(mesh.data.polygons))

# Shrink textures to 2048.
for img in bpy.data.images:
    if img.size[0] > 2048:
        img.scale(2048, 2048)


# Optional glow: build an emission map from the bright orange pixels of the base colour map.
if EMIT:
    import numpy as np

    for mat in mesh.data.materials:
        if not mat or not mat.use_nodes:
            continue
        bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        links = bsdf.inputs["Base Color"].links if bsdf else []
        if not links or links[0].from_node.type != "TEX_IMAGE":
            continue
        base = links[0].from_node.image
        w, h = base.size
        px = np.empty(w * h * 4, dtype=np.float32)
        base.pixels.foreach_get(px)
        px = px.reshape(-1, 4)
        r, g, b = px[:, 0], px[:, 1], px[:, 2]
        mask = (r > 0.15) & (r > g * 1.3) & (b < 0.6 * r)
        em = np.zeros_like(px)
        if EMIT == 2:
            glow = np.stack([np.full_like(r, 0.55), np.minimum(g / np.maximum(r, 1e-4) * 0.1, 0.03), np.full_like(r, 0.015)], axis=1)
        else:
            glow = np.stack([np.ones_like(r), np.minimum(g / np.maximum(r, 1e-4) * 1.4, 0.55), np.full_like(r, 0.04)], axis=1)
        em[:, :3] = glow * mask[:, None]
        em[:, 3] = 1.0
        lift = np.clip(px[:, :3] * 2.6, 0.0, 1.0)
        if EMIT == 2:
            lift[:, 1] = lift[:, 1]
            crim = px[:, :3].copy()
            crim[:, 0] *= 0.55
            crim[:, 1] *= 0.12
            crim[:, 2] *= 0.3
            px[:, :3] = np.where(mask[:, None], crim, lift)
        else:
            px[:, :3] = np.where(mask[:, None], px[:, :3], lift)
        base.pixels.foreach_set(px.reshape(-1))
        base.update()
        eimg = bpy.data.images.new("emit", w, h)
        eimg.pixels.foreach_set(em.reshape(-1))
        tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = eimg
        mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = 0.9 if EMIT == 2 else 3.0
        print("EMISSION", mat.name, "glow pixels", int(mask.sum()), "of", w * h)

# Pose our arms out to match the A-pose (rotate about the shoulder around the front-back axis).
arm.data.pose_position = "POSE"
bpy.context.view_layer.update()
for side in ("l", "r"):
    pb = arm.pose.bones["upperarm_" + side]
    head = arm.matrix_world @ pb.head
    hand = arm.matrix_world @ arm.pose.bones["hand_" + side].head
    sgn = 1.0 if hand.x >= head.x else -1.0
    rot = Matrix.Rotation(-sgn * math.radians(ARM), 4, "Y")
    M = Matrix.Translation(head) @ rot @ Matrix.Translation(-head)
    pb.matrix = M @ pb.matrix
    bpy.context.view_layer.update()

# Copy skin weights from the posed body to the mesh.
for g in body.vertex_groups:
    mesh.vertex_groups.new(name=g.name)
dt = mesh.modifiers.new("wt", "DATA_TRANSFER")
dt.object = body
dt.use_vert_data = True
dt.data_types_verts = {"VGROUP_WEIGHTS"}
dt.vert_mapping = "POLYINTERP_NEAREST"
dt.layers_vgroup_select_src = "ALL"
dt.layers_vgroup_select_dst = "NAME"
bpy.context.view_layer.objects.active = mesh
bpy.ops.object.modifier_apply(modifier="wt")
print("WEIGHTS groups", len(mesh.vertex_groups))

# Bind in the A-pose, then return to the rest pose through the weights and apply.
am = mesh.modifiers.new("arm", "ARMATURE")
am.object = arm
bpy.ops.object.select_all(action="DESELECT")
mesh.select_set(True)
for pb in arm.pose.bones:
    pb.rotation_quaternion = (1, 0, 0, 0)
    pb.location = (0, 0, 0)
    pb.scale = (1, 1, 1)
arm.data.pose_position = "REST"
bpy.context.view_layer.update()
bpy.context.view_layer.objects.active = mesh
bpy.ops.object.modifier_apply(modifier="arm")
am = mesh.modifiers.new("arm", "ARMATURE")
am.object = arm
mesh.parent = arm
arm.data.pose_position = "POSE"

bpy.data.objects.remove(body, do_unlink=True)
bpy.ops.object.select_all(action="DESELECT")
arm.select_set(True)
mesh.select_set(True)
for o in weapon:
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=out,
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_animation_mode="ACTIONS",
    export_skins=True,
    export_image_format="JPEG",
    export_image_quality=88,
)
print("DONE", out, "actions", len(bpy.data.actions))
