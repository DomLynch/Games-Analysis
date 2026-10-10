cd /mnt/frankendom-donors/NetHack-NetHack
ls | head -40
echo ---LIC
ls -la | grep -i "licen\|copying" ; head -c 600 dat/license 2>/dev/null; echo
echo ---HINT
wc -l src/vault.c; grep -n "makemon\|rndmonst\|spawn\|respawn" src/vault.c | head -20
echo ---GREP
grep -rn "rn2(u.uevent.udemigod\|rn2( *u.uevent.udemigod\|udemigod ? 25\|rn2(70)\|rn2(50)\|rn2(u.uevent" src/*.c | head -10
grep -rn "^rndmonst\|^makemon(\|^mkclass\|^rndmonnum\|^align_shift\|^mkpet\|^m_initgrp\|^golemhp\|^grow_up\|^mkmonmoney\|^rndmonst" src/*.c | head
