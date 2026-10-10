import csv
D='/mnt/frankendom-donors/vthibault-roBrowser/src/'
N='vthibault-roBrowser'
C='copies/vt-Camera.js'
R=[
("orbit step is driven by elapsed ms (lerp), capped at 1",D+'Renderer/Camera.js',294,"Math.min( (tick - this.lastTick) * 0.006, 1.0);",C),
("zoom ceiling = 15 x MAX_ZOOM (altitude span x 10)",D+'Renderer/Camera.js',280,"Math.abs(this.altitudeTo-this.altitudeFrom) * this.MAX_ZOOM );",C),
("zoom floor 2.0",D+'Renderer/Camera.js',281,"Math.max( this.zoomFinal,  2.0 );",C),
("wheel notch changes zoom goal by 15",D+'Renderer/Camera.js',279,"this.zoomFinal += delta * 15;",C),
("pitch clamp lower bound 190",D+'Renderer/Camera.js',235,"Math.max( this.angleFinal[0], 190 );",C),
("pitch clamp upper bound 270",D+'Renderer/Camera.js',236,"Math.min( this.angleFinal[0], 270 );",C),
("shift-drag pitch: dy / screen height x 300",D+'Renderer/Camera.js',234,"/ Mouse.screen.height * 300;",C),
("ctrl-drag zoom: dy / screen height x 150",D+'Renderer/Camera.js',241,"/ Mouse.screen.height * 150;",C),
("drag yaw: dx / screen width x 720 (subtracted)",D+'Renderer/Camera.js',248,"/ Mouse.screen.width * 720;",C),
("yaw goal clamp to rotationFrom..rotationTo",D+'Renderer/Camera.js',260,"this.angleFinal[1] = Math.max( this.angleFinal[1], this.rotationFrom );",C),
("rotationTo constant is +360",D+'Renderer/Camera.js',110,"Camera.rotationTo   =  360;",C),
("double-click window 500 ms",D+'Renderer/Camera.js',204,"if (action.tick + 500 > tick &&",C),
("double-click without modifier resets yaw goal to 0",D+'Renderer/Camera.js',215,"this.angleFinal[1] = 0;",C),
("double-click with shift resets pitch goal to range (240)",D+'Renderer/Camera.js',209,"this.angleFinal[0] = +this.range;",C),
("double-click with ctrl sets zoom goal to 0",D+'Renderer/Camera.js',212,"this.zoomFinal = 0.0;",C),
("wheel and drag both call setZoom/rotate from MapControl",D+'Controls/MapControl.js',214,"Camera.setZoom(delta);",'copies/vt-MapControl.js'),
("right button down starts rotate",D+'Controls/MapControl.js',135,"Camera.rotate( true );",'copies/vt-MapControl.js'),
("update runs once per rendered frame",D+'Renderer/MapRenderer.js',365,"Camera.update( tick );",'copies/vt-MapRenderer.js'),
("frame tick is Date.now() set in the rAF loop",D+'Renderer/Renderer.js',226,"this.tick = Date.now();",'copies/vt-Renderer.js'),
("perspective field of view 15 degrees, near 1, far 1000",D+'Renderer/Renderer.js',191,"mat4.perspective( 15.0, width/height, 1, 1000, Camera.projection );",'copies/vt-Renderer.js'),
("zoom sets the translateZ offset (altitudeFrom - zoom) / 2",D+'Renderer/Camera.js',329,"mat4.translateZ( matrix, (this.altitudeFrom - this.zoom) / 2 );",C),
("pitch and yaw rotations applied after translateZ",D+'Renderer/Camera.js',330,"mat4.rotateX( matrix, matrix, this.angle[0] / 180 * Math.PI );",C),
("yaw rotation applied as rotateY",D+'Renderer/Camera.js',331,"mat4.rotateY( matrix, matrix, this.angle[1] / 180 * Math.PI );",C),
("focus follows target with lerp when smooth",D+'Renderer/Camera.js',304,"this.position[0] += ( -this.target.position[0] - this.position[0] ) * lerp ;",C),
("zoom eases toward goal at lerp x 2",D+'Renderer/Camera.js',315,"( this.zoomFinal - this.zoom ) * lerp * 2.0;",C),
("yaw eases toward goal at lerp x 2",D+'Renderer/Camera.js',319,"( this.angleFinal[1] - this.angle[1] ) * lerp * 2.0;",C),
("pitch starts at 240 degrees",D+'Renderer/Camera.js',154,"this.angle[0]      = 240.0;",C),
("MAX_ZOOM constant is 10",D+'Renderer/Camera.js',100,"Camera.MAX_ZOOM = 10;",C),
("altitudeFrom constant -50",D+'Renderer/Camera.js',107,"Camera.altitudeFrom =  -50;",C),
("altitudeTo constant -65",D+'Renderer/Camera.js',108,"Camera.altitudeTo   =  -65;",C),
("default zoom preference 50",D+'Preferences/Camera.js',20,"zoom:    50.0",'copies/vt-PrefCamera.js'),
("default smooth preference true",D+'Preferences/Camera.js',19,"smooth:  true,",'copies/vt-PrefCamera.js'),
("camera preference saved 3000 ms after the last change",D+'Renderer/Camera.js',181,"Events.setTimeout( save, 3000);",C),
("sprite direction = 8 sectors of 45 degrees from yaw",D+'Renderer/Camera.js',324,"Math.floor( ( this.angle[1] + 22.5 ) / 45 ) % 8;",C),
("mobile pinch zoom step scale x 0.1",D+'Core/Mobile.js',268,"Camera.zoomFinal += scale * 0.1;",'copies/vt-Mobile.js'),
("camera init snaps position to target",D+'Renderer/Camera.js',159,"this.position[0] = -this.target.position[0];",C),
("pitch/yaw angle wrap at +/-180 only when both goal and current cross",D+'Renderer/Camera.js',250,"if (this.angle[1] > 180 && this.angleFinal[1] > 180) {",C),
]
with open('spec-vt.tsv','w') as f:
    f.write('note\tclaim\tdonor_file\tline\tquote\tlocal\n')
    for c,d,l,q,loc in R:
        f.write('\t'.join([N,c,d,str(l),q,loc])+'\n')
print(len(R))
