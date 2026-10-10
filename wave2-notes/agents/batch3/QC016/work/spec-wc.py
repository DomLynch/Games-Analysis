B='/mnt/frankendom-donors/wowserhq-client/src/'
N='wowserhq-client'
R=[
("script SetCamera is an empty stub returning 0",B+'ui/components/simple/Model.script.ts',33,"export const SetCamera = () => {",'copies/wc-Model.script.ts'),
("SetCamera body returns 0 (stub)",B+'ui/components/simple/Model.script.ts',34,"  return 0;",'copies/wc-Model.script.ts'),
("orthographic projection for layers is a TODO",B+'gfx/Screen.ts',91,"// TODO: Ortho projection",'copies/wc-Screen.ts'),
("layer viewport switch by flag (not camera)",B+'gfx/Screen.ts',82,"this.setViewport(0, 1, 0, 1, 0, 1);",'copies/wc-Screen.ts'),
("UI root camera setup is a TODO",B+'ui/components/UIRoot.ts',130,"// TODO: Camera setup screen projection",'copies/wc-UIRoot.ts'),
]
with open('spec-wc.tsv','w') as f:
    f.write('note\tclaim\tdonor_file\tline\tquote\tlocal\n')
    for c,d,l,q,loc in R:
        f.write('\t'.join([N,c,d,str(l),q,loc])+'\n')
print(len(R))
