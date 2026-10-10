OUT='/private/tmp/p2/wave2-haiku/batch3/QC003/receipts.tsv'
D='/mnt/frankendom-donors/KsanaDock-Microverse/'
CC=D+'script/CameraController.gd'; CM=D+'script/CharacterManager.gd'; LIC=D+'LICENSE'
N='KsanaDock-Microverse'
R=[
("follow speed export 5.0",CC,3,"@export var follow_speed: float = 5.0"),
("follow zoom 1.5 when following a character",CC,5,"@export var character_zoom: float = 1.5"),
("map zoom 0.8 default",CC,4,"@export var zoom_level: float = 0.8"),
("drag speed 1.0",CC,6,"@export var drag_speed: float = 1.0"),
("wheel zoom step 0.1",CC,7,"@export var zoom_speed: float = 0.1"),
("zoom minimum 0.5",CC,8,"@export var min_zoom: float = 0.5"),
("zoom maximum 2.0",CC,9,"@export var max_zoom: float = 2.0"),
("start position fixed at 576,320",CC,22,"position = Vector2(576, 320)"),
("manual mode lerps position with follow_speed * delta",CC,33,"position = position.lerp(manual_position, follow_speed * delta)"),
("manual mode lerps zoom with follow_speed * delta",CC,34,"zoom = zoom.lerp(Vector2(manual_zoom, manual_zoom), follow_speed * delta)"),
("follow mode lerps position to target",CC,37,"position = position.lerp(target.position, follow_speed * delta)"),
("follow mode lerps zoom to character zoom",CC,39,"zoom = zoom.lerp(Vector2(character_zoom, character_zoom), follow_speed * delta)"),
("map mode returns to original position",CC,42,"position = position.lerp(original_position, follow_speed * delta)"),
("map mode returns to zoom_level",CC,43,"zoom = zoom.lerp(Vector2(zoom_level, zoom_level), follow_speed * delta)"),
("right drag starts; stores start position",CC,53,"camera_start_position = position"),
("right drag stores current zoom as manual zoom",CC,55,"manual_zoom = zoom.x"),
("drag converts pixels to world by zoom",CC,64,"var world_delta = mouse_delta / zoom.x * drag_speed"),
("drag sets manual position from start",CC,65,"manual_position = camera_start_position - world_delta"),
("drag switches to manual mode",CC,66,"is_manual_mode = true"),
("wheel up zooms in by zoom_speed",CC,72,"zoom_camera(zoom_speed)"),
("space restores view",CC,78,"if event is InputEventKey and event.pressed and event.keycode == KEY_SPACE:"),
("zoom clamp between min and max",CC,84,"var new_zoom = clamp(current_zoom + delta_zoom, min_zoom, max_zoom)"),
("zoom in manual mode writes manual_zoom",CC,88,"manual_zoom = new_zoom"),
("zoom in follow mode writes character_zoom",CC,91,"character_zoom = new_zoom"),
("zoom in map mode writes zoom_level",CC,94,"zoom_level = new_zoom"),
("restore view leaves manual mode",CC,98,"is_manual_mode = false"),
("restore with no target snaps to original position",CC,104,"position = original_position"),
("follow_character sets target",CC,109,"target = character"),
("follow_character leaves manual mode only when given a character",CC,110,"is_manual_mode = false  # 退出手动模式"),
("character manager calls follow on select",CM,103,"camera.follow_character(character)"),
("character manager calls follow with null on deselect",CM,87,"camera.follow_character(null)"),
("MIT licence copyright line",LIC,3,"Copyright (c) 2025 KsanaDock"),
]
rows=[]
for claim,f,line,q in R:
    q=q.strip()
    if not (15<=len(q)<=90): print('LEN',len(q),claim,q)
    rows.append([N,claim,f,str(line),q])
with open(OUT,'a') as fh:
    for r in rows:
        assert all('\t' not in c for c in r)
        fh.write('\t'.join(r)+'\n')
print('appended',len(rows))
