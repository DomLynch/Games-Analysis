# Recompute the 9 room rectangles from Office.tscn values (centre = Area2D origin + CollisionShape2D position; size as stored).
rooms = {
 "会议室 MeetingRoomArea": (526.5, 516.0, 387, 184),
 "HR办公室 HrOfficeRoomArea": (176, 132.75, 288, 246.5),
 "卫生间 ToiletRoomArea": (480, 54, 296, 84),
 "老板办公室 BossOfficeRoomArea": (944, 516.5, 416, 183),
 "办公室 OfficeRoomArea": (896, 213.5, 512, 405),
 "健身房 GymRoomArea": (479.5, 324.5, 289, 185),
 "茶水间 TeaRoomArea": (480, 166, 312, 116),
 "接待处 ReceptionRoomArea": (176, 516, 288, 184),
 "等候大厅 WaitingHallRoomArea": (176, 341.75, 288, 148.5),
}
def rect(c):
    x,y,w,h = c
    return (x-w/2, y-h/2, x+w/2, y+h/2)
names=list(rooms)
for n in names:
    print(n, [round(v,2) for v in rect(rooms[n])])
print("overlaps:")
for i in range(len(names)):
    for j in range(i+1,len(names)):
        a=rect(rooms[names[i]]); b=rect(rooms[names[j]])
        ox=min(a[2],b[2])-max(a[0],b[0]); oy=min(a[3],b[3])-max(a[1],b[1])
        if ox>0 and oy>0: print("  ",names[i],"<->",names[j], round(ox,2), "x", round(oy,2))
# point-in-rect check for the stored AABB test (pos >= left and <= right, etc.), using centre-of-rect and a corner test
print("sample: centre of each room is inside its own rect and listed first-match:")
for n in names:
    r=rect(rooms[n]); cx=(r[0]+r[2])/2; cy=(r[1]+r[3])/2
    hits=[m for m in names if (lambda q:(q[0]<=cx<=q[2] and q[1]<=cy<=q[3]))(rect(rooms[m]))]
    print("  ",n, "hits:", hits)
