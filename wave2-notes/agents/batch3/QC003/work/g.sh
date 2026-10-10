#!/bin/bash
# usage: g.sh <donor_file_abs> <fixed string> ... ; prints line:text for each match (fixed string)
f="$1"; shift
for s in "$@"; do grep -n -F -- "$s" "$f" | head -3 | sed "s|^|[$s] |"; done
