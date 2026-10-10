cd /mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game
grep -n "^int map_load_in_game\|^static int map_age_dead_critters\|^int map_leave_map" map.cc
for spec in "map.cc 1080 1104" "actions.cc 399 440" "actions.cc 1190 1240" "map.cc 1108 1240" "object.cc 1962 2010" "item.cc 441 520"; do
  set -- $spec
  awk -v f=$1 -v a=$2 -v b=$3 'NR>=a && NR<=b && /^}/ {print f" closes at "NR; exit}' $1
done
cd /mnt/frankendom-donors/exult-exult
for spec in "combat.cc 862 1000" "combat.cc 1402 1450" "combat.cc 688 800" "combat.cc 1520 1540" "combat.cc 1554 1700"; do
  set -- $spec
  awk -v f=$1 -v a=$2 -v b=$3 'NR>=a && NR<=b && /^}/ {print f" closes at "NR; exit}' $1
done
