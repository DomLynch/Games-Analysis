import csv
OUT='/private/tmp/p2/wave2-haiku/batch3/QC003/receipts.tsv'
D='/mnt/frankendom-donors/openmw/'
CAM=D+'apps/openmw/mwrender/camera.cpp'; HPP=D+'apps/openmw/mwrender/camera.hpp'
TP=D+'files/data/scripts/omw/camera/third_person.lua'; CL=D+'files/data/scripts/omw/camera/camera.lua'
ST=D+'files/data/scripts/omw/camera/settings.lua'; LIC=D+'LICENSE'
N='openmw'
R=[
("camera update takes frame duration and paused flag",CAM,132,"void Camera::update(float duration, bool paused)"),
("focal offset is updated each frame",CAM,145,"updateFocalPointOffset(duration);"),
("updatePosition computes the camera position",CAM,160,"void Camera::updatePosition()"),
("camera sphere radius 5 units",CAM,172,"constexpr float cameraObstacleLimit = 5.0f;"),
("focal sphere radius 10 units",CAM,173,"constexpr float focalObstacleLimit = 10.f;"),
("focal point = tracked point + focal offset",CAM,179,"osg::Vec3d focal = mTrackedPosition + focalOffset;"),
("focal offset raised 10 units to avoid ceiling clip",CAM,180,"focalOffset.z() += 10.f;"),
("focal point pulled back when offset is blocked",CAM,186,"rayCasting->castSphere(focal - focalOffset, focal, focalObstacleLimit, mCollisionType);"),
("focal point moved back by blocked fraction",CAM,191,"focal += focalOffset * std::max(-1.0, adjustmentCoef);"),
("camera distance starts at preferred distance",CAM,196,"mCameraDistance = mPreferredCameraDistance;"),
("camera offset backwards by distance",CAM,199,"osg::Vec3d offset = orient * osg::Vec3d(0.f, -mCameraDistance, 0.f);"),
("camera pulled in when sphere cast hits geometry",CAM,201,"= rayCasting->castSphere(focal, focal + offset, cameraObstacleLimit, mCollisionType);"),
("camera distance set to hit point plus normal",CAM,204,"mCameraDistance = (result.mHitPos + result.mHitNormal * cameraObstacleLimit"),
("camera position = focal + offset",CAM,208,"mPosition = focal + offset;"),
("tracked height 124 units",CAM,63,", mHeight(124.f)"),
("tracked position adds height scaled",CAM,97,"res.z() += mHeight * mHeightScale;"),
("focal horizontal offset rotated by yaw",CAM,104,"offset.x() = mFocalPointCurrentOffset.x() * cos(mYaw);"),
("focal vertical offset is the y component",CAM,106,"offset.z() = mFocalPointCurrentOffset.y();"),
("setFocalPointTargetOffset definition",CAM,247,"void Camera::setFocalPointTargetOffset(const osg::Vec2d& v)"),
("new target leaves previous influence at 1",CAM,251,"mPreviousTransitionInfluence = 1.0f;"),
("updateFocalPointOffset definition",CAM,254,"void Camera::updateFocalPointOffset(float duration)"),
("no-op for zero duration",CAM,256,"if (duration <= 0)"),
("first update snaps to target",CAM,259,"if (mSkipFocalPointTransition)"),
("snap sets current to target",CAM,264,"mFocalPointCurrentOffset = mFocalPointTargetOffset;"),
("carry-over of unfinished transition",CAM,269,"if (mPreviousTransitionInfluence > 0)"),
("carry-over influence decays by duration times coef",CAM,275,"= std::max(0.f, mPreviousTransitionInfluence - duration * mFocalPointTransitionSpeedCoef);"),
("closer target moves faster: 1 + 5/len",CAM,283,"double coef = duration * (1.0 + 5.0 / delta.length()) * mFocalPointTransitionSpeedCoef"),
("step clamped to the full delta",CAM,285,"mFocalPointCurrentOffset += delta * std::min(coef, 1.0);"),
("transition speed recorded for carry-over",CAM,293,"mFocalPointTransitionSpeed = (mFocalPointCurrentOffset - oldOffset) / duration;"),
("setPitch definition",CAM,323,"void Camera::setPitch(float angle, bool force)"),
("pitch limited to just under 90 degrees",CAM,326,"float limit = static_cast<float>(osg::PI_2) - epsilon;"),
("deferred rotation eases with dt",CAM,389,"delta = std::min(delta, (delta + 1.f) * 3 * dt);"),
("instant transition clears deferred rotation",CAM,425,"mSkipFocalPointTransition = true;"),
("shoulder target offset setter in header",HPP,47,"void setFocalPointTargetOffset(const osg::Vec2d& v);"),
("preferred distance setter in header",HPP,92,"void setPreferredCameraDistance(float v) { mPreferredCameraDistance = v; }"),
("third person base distance 192",TP,16,"baseDistance = 192,"),
("combat focal offset (0, 15)",TP,27,"local combatOffset = util.vector2(0, 15)"),
("switch limit 120 units",TP,59,"local limitToSwitch = 120"),
("switch back limit 300 units",TP,60,"local limitToSwitchBack = 300"),
("side rays at 90 degrees from yaw",TP,63,"camera.getYaw() + math.rad(90)"),
("forward side rays at 30 degrees",TP,65,"camera.getYaw() + math.rad(30)"),
("switch to right shoulder when left is blocked",TP,71,"if distLeft < limitToSwitch and distRight > limitToSwitchBack then"),
("default shoulder from sign of offset x",TP,38,"(shoulderOffset.x > 0 and STATE.RightShoulder)"),
("distance = base + pitch term + speed term",TP,82,"return (M.baseDistance + math.max(camera.getPitch(), 0) * 50"),
("speed term saturates with speed squared",TP,83,"+ smoothedSpeedSqr / (smoothedSpeedSqr + 300 * 300) * zoomOutWhenMoveCoef)"),
("combat transition speed 5.0",TP,114,"camera.setFocalTransitionSpeed(5.0)"),
("vanity transition speed 0.2",TP,110,"camera.setFocalTransitionSpeed(0.2)"),
("default transition speed 1.0",TP,116,"camera.setFocalTransitionSpeed(1.0)"),
("right shoulder offset applied",TP,120,"camera.setFocalPreferredOffset(rightShoulderOffset)"),
("combat offset applied",TP,124,"camera.setFocalPreferredOffset(combatOffset)"),
("no over-shoulder: offset zero",TP,139,"camera.setFocalPreferredOffset(util.vector2(0, 0))"),
("distance may grow at most dt times (100 + base)",TP,158,"local maxIncrease = dt * (100 + M.baseDistance)"),
("distance drops at once, rises rate-limited",TP,160,"M.preferredDistance, camera.getThirdPersonDistance() + maxIncrease))"),
("speed soft cap speed/(1+speed/500)",CL,132,"speed = speed / (1 + speed / 500)"),
("smoothed speed moves at most 300 per second",CL,133,"local maxDelta = 300 * dt"),
("smoothed speed approach",CL,134,"smoothedSpeed = smoothedSpeed + util.clamp(speed - smoothedSpeed, -maxDelta, maxDelta)"),
("minimum zoom distance 30",CL,137,"local minDistance = 30"),
("zoom in past minimum switches to first person",CL,147,"if delta > 0 and third_person.baseDistance == minDistance and"),
("zoom changes base distance clamped",CL,152,"third_person.baseDistance = util.clamp(third_person.baseDistance - delta - obstacleDelta"),
("vanity yaw drift 3 degrees per second",CL,125,"camera.setYaw(camera.getYaw() + math.rad(3) * dt)"),
("third person update each frame",CL,236,"third_person.update(dt, smoothedSpeed)"),
("default max distance 800",ST,43,"floatSetting('', 'maxDistance', 800)"),
("default view over shoulder off",ST,44,"boolSetting('', 'viewOverShoulder', false)"),
("default shoulder offset x 30",ST,45,"floatSetting('', 'shoulderOffsetX', 30)"),
("default shoulder offset y -10",ST,46,"floatSetting('', 'shoulderOffsetY', -10)"),
("default zoom-out-when-moving 20",ST,48,"floatSetting('', 'zoomOutWhenMoveCoef', 20)"),
("licence GPL version 3 header",LIC,2,"Version 3, 29 June 2007"),
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
