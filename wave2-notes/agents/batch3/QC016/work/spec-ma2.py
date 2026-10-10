S='/mnt/frankendom-donors/MrAntares-roBrowserLegacy/src/'
N='MrAntares-roBrowserLegacy'
C='copies/ma-Camera.js'
R=[
("quake from meteor effect starts 600 ms after the effect start",S+'DB/Effects/EffectTable.js',3158,"const start = Params.Inst.startTick + 600;",'copies/ma-EffectTable.js'),
("effect calls setQuake with the start tick only (default duration)",S+'DB/Effects/EffectTable.js',3159,"Camera.setQuake(start);",'copies/ma-EffectTable.js'),
("occluder fade is driven by the models, opaque pass then query (models)",S+'Renderer/Map/Models.js',242,"OccluderFade.renderQuery(gl, _program.uniform, () => drawMeshes(gl)",'copies/ma-Models.js'),
("occluder fade is driven by the models, opaque pass then query (animated)",S+'Renderer/Map/AnimatedModels.js',772,"OccluderFade.renderQuery(gl, _program.uniform, () => drawModels(gl)",'copies/ma-AnimatedModels.js'),
("state change calls updateState after each drag or wheel write",S+'Renderer/Camera.js',412,"this.updateState();",C),
("state chooser function",S+'Renderer/Camera.js',436,"static updateState() {",C),
("third person enabled from player config, default false",S+'Renderer/Camera.js',269,"Camera.enable3RDPerson = Configs.get('ThirdPersonCamera', false);",C),
("first person enabled from player config, default false",S+'Renderer/Camera.js',270,"Camera.enable1STPerson = Configs.get('FirstPersonCamera', false);",C),
("outdoor zoom ceiling config CameraMaxZoomOut",S+'Renderer/Camera.js',271,"Camera.MAX_ZOOM = Configs.get('CameraMaxZoomOut', C_MAX_ZOOM);",C),
("zoom floor 0 when first person is enabled",S+'Renderer/Camera.js',287,"this.MIN_ZOOM = 0;",C),
("zoom floor 0.2 when third person is enabled",S+'Renderer/Camera.js',289,"this.MIN_ZOOM = 0.2;",C),
("state floor set from enable flags (first, third, else iso)",S+'Renderer/Camera.js',291,"this.MIN_ZOOM = C_MIN_ZOOM;",C),
("altitude span default before init",S+'Renderer/Camera.js',119,"static altitudeRange = 15;",C),
("indoor init goal: pitch 230 and yaw -40",S+'Renderer/Camera.js',300,"this.angleFinal[0] = 230;",C),
("outdoor init zoom goal from preference, fallback 125",S+'Renderer/Camera.js',303,"this.zoomFinal = Preferences.zoom || 125;",C),
("focus height lift added to the look-at point",S+'Renderer/Camera.js',544,"_position[1] = this.position[2] + zOffset;",C),
("camera translated by focus after pitch and yaw",S+'Renderer/Camera.js',546,"mat4.translate(matrix, matrix, _position);",C),
("focus stored for the occluder fade",S+'Renderer/Camera.js',547,"vec3.negate(this.focus, _position);",C),
("distance from translateZ with zoom",S+'Renderer/Camera.js',538,"mat4.translateZ(matrix, (this.altitudeFrom - this.zoom) / 2);",C),
("quake zoom kick uses zoom amount and jitter",S+'Renderer/Camera.js',250,"this.zoom += ((Math.random() * 5 - 2.5) / 10 + this.quakes[i].zoomQuake)",C),
("quake pitch kick uses pitch amount and smaller jitter",S+'Renderer/Camera.js',253,"this.angle[0] += ((Math.random() * 5 - 2.5) / 15 + this.quakes[i].latitudeQuake)",C),
("inactive quakes removed by splice inside the loop",S+'Renderer/Camera.js',260,"this.quakes.splice(i, 1);",C),
("occluder begin frame computes the eye from the model view",S+'Renderer/Map/OccluderFade.js',136,"static beginFrame(gl, modelView, tick) {",'copies/ma-OccluderFade.js'),
("occluder fade uses the eye from the inverse model view",S+'Renderer/Map/OccluderFade.js',138,"_eye[0] = _inverse[12];",'copies/ma-OccluderFade.js'),
("first frame has no time step",S+'Renderer/Map/OccluderFade.js',142,"const dt = _lastTick ? Math.min(tick - _lastTick, 100) : 0;",'copies/ma-OccluderFade.js'),
("query result is polled in begin frame",S+'Renderer/Map/OccluderFade.js',154,"const occluded = _queryHit[QUERY.MODELS] || _queryHit[QUERY.ANIMATED];",'copies/ma-OccluderFade.js'),
("no new query while the slot is pending",S+'Renderer/Map/OccluderFade.js',251,"if (!OccluderFade.isActive() || _queryPending[slot]) {",'copies/ma-OccluderFade.js'),
("query draws with colour writes off",S+'Renderer/Map/OccluderFade.js',260,"gl.colorMask(false, false, false, false);",'copies/ma-OccluderFade.js'),
("opaque pass mode from strength",S+'Renderer/Map/OccluderFade.js',221,"static opaqueMode() {",'copies/ma-OccluderFade.js'),
("alpha opaque pass discards faded fragments",N+'x',76,"if (uOccluderFadeMode == 2) {",S+'Renderer/Effects/Shaders/GLSL/OccluderFade.glsl'),
("alpha opaque pass discards faded fragments (value)",S+'Renderer/Effects/Shaders/GLSL/OccluderFade.glsl',77,"return fade < 0.01;",S+'Renderer/Effects/Shaders/GLSL/OccluderFade.glsl'),
("query mode test on radius and cut",S+'Renderer/Effects/Shaders/GLSL/OccluderFade.glsl',64,"return c.x < uOccluderFadeRadius && c.y < -0.5;",S+'Renderer/Effects/Shaders/GLSL/OccluderFade.glsl'),
("occluder cut plane note: behind the focus never fades",S+'Renderer/Effects/Shaders/GLSL/OccluderFade.glsl',27,"// cut by a vertical plane through the focus (so a raised camera never fades",S+'Renderer/Effects/Shaders/GLSL/OccluderFade.glsl'),
]
with open('spec-ma2.tsv','w') as f:
    f.write('note\tclaim\tdonor_file\tline\tquote\tlocal\n')
    for c,d,l,q,loc in R:
        if loc.startswith('/mnt'): loc='copies/ma-OccluderFade.glsl'
        f.write('\t'.join([N,c,d,str(l),q,loc])+'\n')
print(len(R))
