# Build a per-topic digest of sidecars for brainstorm agents. Usage: python3 digest_topic.py <category> <out.md>
# Run from /private/tmp/p2/wave2-haiku/batch3 (or the repo wave2-notes/agents/batch3). Reads */out/<category>/*.json + deep.md.
import glob,json,os,re,sys
cat,outp=sys.argv[1],sys.argv[2]
rows=[]
for f in sorted(glob.glob(f'*/out/{cat}/*.json')):
    try: j=json.load(open(f))
    except Exception: continue
    note=f[:-5]+'.deep.md'
    t=open(note).read() if os.path.exists(note) else ''
    m=re.search(r'(?:^|\n)#+\s*6[^\n]*\n(.*?)(?:\n#+\s|\Z)',t,re.S)
    gaps=(m.group(1).strip()[:700] if m else '')
    ck=re.search(r'\*\*Errors / corrections:\*\*(.*?)\n\n\*\*Missed',t,re.S)
    rows.append(f"### {j.get('game')} ({j.get('licence_class')}, scope={j.get('camera_scope','-')}, verdict={j.get('verdict')}, depth={j.get('depth')})\nnote: {os.path.abspath(note)}\nbest_idea: {j.get('best_idea')}\ndecision: {j.get('decision')} - {j.get('decision_why')}\nacceptance: {j.get('acceptance')}\ntags: {','.join(j.get('pattern_tags',[]))}\ngaps/risks(excerpt): {gaps}\nchecker: {(ck.group(1).strip()[:500] if ck else '-')}\n")
open(outp,'w').write(f'# Digest: {cat} ({len(rows)} notes)\n\n'+'\n'.join(rows)); print(len(rows))
