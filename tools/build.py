# 版の印を index.html / sw.js / version.json にそろえて打つ
import io,re,json,datetime,sys,os
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','')
b=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime('%Y%m%d-%H%M%S')
s=io.open(D+'index.html',encoding='utf-8').read()
s,n=re.subn(r'var BUILD="[^"]*";','var BUILD="%s";'%b,s); assert n==1
io.open(D+'index.html','w',encoding='utf-8').write(s)
w=io.open(D+'sw.js',encoding='utf-8').read()
w,n=re.subn(r'var C="taut-[^"]*";','var C="taut-%s";'%b,w); assert n==1
io.open(D+'sw.js','w',encoding='utf-8').write(w)
io.open(D+'version.json','w',encoding='utf-8').write(json.dumps({"build":b,"version":"1.0"}))
print('build',b)
