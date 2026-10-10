#!/bin/bash
# usage: find_lines.sh <file> <quote>...  prints file:line for each exact (fixed-string) match
f="$1"; shift
for q in "$@"; do
  printf '%s\t' "$q"; grep -nF -- "$q" "$f" | cut -d: -f1 | tr '\n' ' '; echo
done
