import bpy, sys, math, mathutils
glb, out = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
mn=mathutils.Vector((1e9,)*3); mx=mathutils.Vector((-1e9,)*3)
for o in objs:
    for c in o.bound_box:
        w=o.matrix_world@mathutils.Vector(c)
        mn=mathutils.Vector(map(min,mn,w)); mx=mathutils.Vector(map(max,mx,w))
ctr=(mn+mx)/2; size=max((mx-mn).length,0.001)
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); bpy.context.scene.collection.objects.link(cam)
cam.location=ctr+mathutils.Vector((size*0.9,-size*1.3,size*0.55)); 
d=ctr-cam.location; cam.rotation_euler=d.to_track_quat('-Z','Y').to_euler()
bpy.context.scene.camera=cam; cam.data.lens=50
sun=bpy.data.objects.new('sun',bpy.data.lights.new('sun','SUN')); sun.data.energy=4; sun.rotation_euler=(0.9,0.2,0.6); bpy.context.scene.collection.objects.link(sun)
w=bpy.data.worlds.new('w'); w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(0.25,0.27,0.3,1); w.node_tree.nodes['Background'].inputs[1].default_value=1.0
bpy.context.scene.world=w
s=bpy.context.scene; s.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
s.render.resolution_x=900; s.render.resolution_y=900; s.render.filepath=out
bpy.ops.render.render(write_still=True)
print('RENDERED',out)
