#!/bin/bash
# usage: tsc-run.sh <local.ts>
f="$1"; b=$(basename "$f")
scp -o BatchMode=yes -o ConnectTimeout=8 -i ~/.ssh/binance_futures_tool "$f" root@49.12.7.18:/tmp/ < /dev/null
ssh -o BatchMode=yes -o ConnectTimeout=8 -i ~/.ssh/binance_futures_tool root@49.12.7.18 "cd /tmp && export PATH=\$HOME/.local/bin:\$PATH && npx -p typescript tsc --noEmit --strict --target es2020 /tmp/$b; echo TSC_EXIT=\$?" < /dev/null
