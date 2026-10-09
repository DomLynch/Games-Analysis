import re,os,glob,json,subprocess,sys
OUT='/private/tmp/p2/out'
files=sorted(glob.glob(OUT+'/*/*.deep.md'))
trunk=set(open('/private/tmp/p2/gate/trunk-paths.txt').read().split())
res={}; donors={}; sketches={}
for f in files:
    k=f[len(OUT)+1:]; t=open(f).read(); L=t.split('\n'); p=[]
    cat=k.split('/')[0]
    if not re.match(r'^# .+ \(.+, cell \d+\)$',L[0]): p.append('hdr1')
    m=re.match(r'^Donor: `?(/mnt/frankendom-donors/[^`| ]+)`? \| Licence: .+ \| .+ \| symbol .+',L[2] if len(L)>2 else '')
    if not m: p.append('hdr3')
    else: donors[k]=m.group(1)
    secs=[i for i,l in enumerate(L) if re.match(r'^## [1-6]\.',l)]
    if len(secs)!=6: p.append('sections')
    sec=lambda n:'\n'.join(L[secs[n-1]:(secs[n] if n<6 else len(L))]) if len(secs)==6 else ''
    s4=sec(4); s5=sec(5)
    if 'simplified:' not in s4.lower() and 'simplified' not in s4.lower(): p.append('no-simplified')
    else:
        i=s4.lower().find('simplified'); j=s4.find('```')
        if j>=0 and i>j: p.append('simplified-after-block')
    mb=re.search(r'```(?:ts|typescript)\n(.*?)```',s4,re.S)
    if mb: sketches[k]=mb.group(1)
    else: p.append('no-sketch')
    paths=set([x.rstrip('.,;:)') for x in re.findall(r'(?<![\w/])((?:src|origins|docs|server|public)/[\w./*-]+)',s5)])
    if not paths: p.append('s5-no-target')
    if not re.search(r'\brows?\W{0,4}\d{1,2}\b|feature[- ]map|specs?/|post-K|docs/',s5,re.I): p.append('s5-no-row')
    if re.search(r'row not located|row[^.\n]{0,25}not checked',s5,re.I): p.append('s5-banned')
    unk=[x for x in paths if x not in trunk and not re.search(r'new|does not exist|proposed',s5,re.I)]
    if unk: p.append('s5-unmarked-new:'+','.join(sorted(unk))[:120])
    for x in paths:
        res.setdefault('_targets',{}).setdefault(x,[]).append(k)
    res[k]=p
json.dump({'res':{k:v for k,v in res.items() if k!='_targets'},'donors':donors,'targets':res.get('_targets',{})},open('gate-local.json','w'))
os.makedirs('sk',exist_ok=True)
for k,c in sketches.items():
    open('sk/'+k.replace('/','__').replace('.deep.md','.ts'),'w').write(c+'\nexport {}\n')
bad={k:v for k,v in res.items() if k!='_targets' and v}
print(len(files),'files;',len(bad),'with local problems;',len(sketches),'sketches')
from collections import Counter
print(Counter(x.split(':')[0] for v in bad.values() for x in v))
