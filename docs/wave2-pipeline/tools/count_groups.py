#!/usr/bin/env python3
"""Count donor-reading groups: DONE (result.tsv in working folder or repo backup), INFLIGHT (folder without result.tsv), NOTSTARTED.
Run: python3 count_groups.py   (needs ~/Developer/Games-Analysis; working folder /private/tmp/p2/wave2-haiku/batch3 may be missing after a wipe)"""
import os, glob, re
from collections import Counter
R = os.path.expanduser('~/Developer/Games-Analysis'); B = '/private/tmp/p2/wave2-haiku/batch3'
q = glob.glob(R + '/docs/wave2-pipeline/queue/cells-*.tsv') + glob.glob(R + '/docs/wave2-pipeline/queue/donors-*.tsv')
ids = sorted(os.path.basename(f).split('-', 1)[1][:-4] for f in q)
early = {'P', 'Q', 'QC', 'U', 'V', 'D', 'ZW', 'PG', 'ET', 'HELD'}  # waves 1-3, all done
done, inflight, notstarted = [], [], []
for i in ids:
    p = re.match(r'[A-Z]+', i).group(0)
    if p in early: done.append(i)
    elif os.path.exists(f'{B}/{i}/result.tsv') or os.path.exists(f'{R}/wave2-notes/agents/batch3/{i}/result.tsv'): done.append(i)
    elif os.path.isdir(f'{B}/{i}'): inflight.append(i)
    else: notstarted.append(i)
print('TOTAL', len(ids), 'DONE', len(done), f'({100*len(done)/len(ids):.1f}%)', 'INFLIGHT', len(inflight), 'NOTSTARTED', len(notstarted))
print('INFLIGHT:', ' '.join(inflight))
print('NOTSTARTED by prefix:', dict(Counter(re.match(r'[A-Z]+', i).group(0) for i in notstarted)))
print('NOTSTARTED:', ' '.join(notstarted))
