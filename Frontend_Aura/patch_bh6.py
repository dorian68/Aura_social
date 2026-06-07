import re, json, base64, gzip

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

ms = re.search(r'<script type="__bundler/manifest">', html)
me = html.find('</script>', ms.end())
manifest = json.loads(html[ms.end():me])
TARGET = '5925d42c-8ddf-483c-bd2a-cfb5ee06edda'
entry = manifest[TARGET]
data = base64.b64decode(entry['data'])
if entry.get('compressed'): data = gzip.decompress(data)
src = data.decode('utf-8')

scene_m = re.search(r'(?:const|let|var)\s+(\w+)\s*=\s*new\s+T\.Scene\s*\(', src)
SV = scene_m.group(1)
print(f"Scene: {SV}")

# ─── PATCH A: full accretion block replacement ─────────────────────────────────
START = "\n    var accMesh=null,accInScene=false,coreInScene=false;\n"
END   = "\n    const api = {"
si = src.find(START)
ei = src.find(END, si)
assert si >= 0, "START not found"
assert ei > si, "END not found"
print(f"Replacing chars {si}–{ei} ({ei-si} chars)")

ACC_VERT = (
    "attribute float aOrbitR;\n"
    "attribute float aOrbitPhase;\n"
    "attribute float aOrbitSpeed;\n"
    "attribute float aOrbitH;\n"
    "attribute float aBrightness;\n"
    "attribute float aOrbitNoise;\n"
    "attribute float aLayer;\n"          # 0=photon ring, 1=inner ribbon, 2=outer ribbon, 3=inflow
    "uniform float uTime;\n"
    "uniform float uBHProgress;\n"
    "uniform vec2  uBHCenter;\n"
    "uniform float uBHAccR;\n"
    "varying float vAlpha;\n"
    "varying vec3  vColor;\n"
    "varying float vGlow;\n"
    "void main(){\n"
    "  float px,py,pz,ps;\n"
    "  if(aLayer>2.5){\n"
    # inflow: spiral inward, continuously cycling
    "    float t=mod(uTime*aOrbitSpeed+aOrbitPhase,1.0);\n"
    "    float r=aOrbitR*(1.0-t*0.88)*uBHAccR;\n"
    "    float ang=aOrbitPhase*6.2832+t*10.0;\n"
    "    px=uBHCenter.x+r*cos(ang);\n"
    "    py=uBHCenter.y+r*sin(ang)*0.04;\n"
    "    pz=0.0;\n"
    "    vAlpha=uBHProgress*aBrightness*(1.0-t*0.80)*0.28;\n"
    "    vColor=vec3(0.95,0.48,0.10);\n"
    "    vGlow=0.05;\n"
    "    ps=2.5+aBrightness*2.5;\n"
    "  } else {\n"
    # orbital layers
    "    float incl=aLayer<0.5?0.45:(aLayer<1.5?0.07:0.04);\n"
    "    float spd=aLayer<0.5?aOrbitSpeed:(aLayer<1.5?aOrbitSpeed*0.55:aOrbitSpeed*0.32);\n"
    "    float angle=aOrbitPhase+uTime*spd;\n"
    "    float noise=aOrbitNoise*sin(angle*3.0+aOrbitPhase*1.5);\n"
    "    float r=(aOrbitR+noise)*uBHAccR;\n"
    "    px=uBHCenter.x+r*cos(angle);\n"
    "    py=uBHCenter.y+r*sin(angle)*incl;\n"
    "    pz=aOrbitH*0.015+r*sin(angle)*(1.0-incl)*0.03;\n"
    "    float ff=1.18-0.18*uBHProgress;\n"
    "    px=uBHCenter.x+(px-uBHCenter.x)*ff;\n"
    "    py=uBHCenter.y+(py-uBHCenter.y)*ff;\n"
    # Doppler brightening (approaching side brighter, receding dimmer)
    "    float doppler=0.55+0.45*cos(angle+1.1);\n"
    "    float layA=aLayer<0.5?0.88:(aLayer<1.5?0.72:0.32);\n"
    "    vAlpha=uBHProgress*aBrightness*doppler*layA;\n"
    # colors: photon ring near-white, inner ribbon hot yellow, outer ribbon orange-red
    "    vec3 c0=vec3(1.00,0.96,0.82);\n"  # photon ring: pale white-gold
    "    vec3 c1=vec3(1.00,0.80,0.18);\n"  # inner ribbon: hot yellow
    "    vec3 c2=vec3(0.90,0.28,0.04);\n"  # outer ribbon: deep orange-red
    "    vColor=aLayer<0.5?c0:(aLayer<1.5?c1:c2);\n"
    "    vGlow=aLayer<0.5?0.55:(aLayer<1.5?0.35:0.12);\n"
    # point sizes — LARGE for ribbon layers to create continuous band
    "    ps=aLayer<0.5?(4.5+aBrightness*4.5):(aLayer<1.5?(16.0+aBrightness*14.0):(8.0+aBrightness*7.0));\n"
    "  }\n"
    "  vec4 mv=modelViewMatrix*vec4(px,py,pz,1.0);\n"
    "  gl_Position=projectionMatrix*mv;\n"
    "  gl_PointSize=ps;\n"
    "}"
)
ACC_FRAG = (
    "varying float vAlpha;\n"
    "varying vec3  vColor;\n"
    "varying float vGlow;\n"
    "void main(){\n"
    "  vec2 uv=gl_PointCoord-0.5;\n"
    "  float d=length(uv);\n"
    "  if(d>0.5) discard;\n"
    "  float g=exp(-d*d*5.0);\n"  # soft falloff for large points
    "  float a=g*vAlpha;\n"
    "  if(a<0.001) discard;\n"
    "  gl_FragColor=vec4(vColor+vGlow*g,a);\n"
    "}"
)

NEW_BLOCK = (
    "\n"
    "    var accMesh=null,accInScene=false,coreInScene=false;\n"
    "    var accUniforms={\n"
    "      uTime:mat.uniforms.uTime,\n"
    "      uBHProgress:{value:0.0},\n"
    "      uBHCenter:{value:new T.Vector2(0,0)},\n"
    "      uBHAccR:{value:2.0},\n"
    "    };\n"
    "    var ACC_VERT=`" + ACC_VERT + "`;\n"
    "    var ACC_FRAG=`" + ACC_FRAG + "`;\n"
    # coreDisk: black occluder, renderOrder=2
    "    var coreDisk=(function(){\n"
    "      var cg=new T.CircleGeometry(1.0,64);\n"
    "      var cm=new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0,depthTest:false,depthWrite:false});\n"
    "      var m=new T.Mesh(cg,cm); m.renderOrder=2; return m;\n"
    "    }());\n"
    "    function accN(){var w=window.innerWidth;return w<768?400:w<1200?900:2000;}\n"
    "    function buildAcc(){\n"
    "      if(accMesh){\n"
    "        if(accInScene){" + SV + ".remove(accMesh);accInScene=false;}\n"
    "        accMesh.geometry.dispose();accMesh.material.dispose();accMesh=null;\n"
    "      }\n"
    "      var n=accN();\n"
    "      var n0=Math.floor(n*0.14);\n"   # photon ring
    "      var n1=Math.floor(n*0.43);\n"   # inner ribbon
    "      var n2=Math.floor(n*0.29);\n"   # outer ribbon
    "      var n3=n-n0-n1-n2;\n"           # inflow
    "      var aR=[],aP=[],aS=[],aH=[],aB=[],aN=[],aL=[];\n"
    # Layer 0: photon ring (visible arc around dark center)
    "      for(var i=0;i<n0;i++){\n"
    "        aR.push(0.90+Math.random()*0.20);\n"
    "        aP.push(Math.random()*6.2832);\n"
    "        aS.push(1.05+Math.random()*0.30);\n"
    "        aH.push((Math.random()-0.5)*0.8);\n"
    "        aB.push(0.70+Math.random()*0.30);\n"
    "        aN.push(Math.random()*0.04);\n"
    "        aL.push(0);\n"
    "      }\n"
    # Layer 1: inner ribbon (hot yellow band, large points → continuous band)
    "      for(var i=0;i<n1;i++){\n"
    "        var u=Math.random();\n"
    "        aR.push(0.45+Math.pow(u,0.5)*1.05);\n"  # biased toward inner edge (hotter)
    "        aP.push(Math.random()*6.2832);\n"
    "        aS.push(0.60+Math.random()*0.40);\n"
    "        aH.push((Math.random()-0.5)*0.4);\n"
    "        aB.push(0.50+Math.random()*0.50);\n"
    "        aN.push(Math.random()*0.06);\n"
    "        aL.push(1);\n"
    "      }\n"
    # Layer 2: outer ribbon (orange-red, extends far beyond screen edges)
    "      for(var i=0;i<n2;i++){\n"
    "        aR.push(1.5+Math.random()*3.0);\n"
    "        aP.push(Math.random()*6.2832);\n"
    "        aS.push(0.25+Math.random()*0.25);\n"
    "        aH.push((Math.random()-0.5)*0.4);\n"
    "        aB.push(0.30+Math.random()*0.55);\n"
    "        aN.push(Math.random()*0.10);\n"
    "        aL.push(2);\n"
    "      }\n"
    # Layer 3: inflow (spiral inward, creates impression of matter being pulled)
    "      for(var i=0;i<n3;i++){\n"
    "        aR.push(1.8+Math.random()*3.5);\n"
    "        aP.push(Math.random());\n"        # repurposed as fall phase 0-1
    "        aS.push(0.06+Math.random()*0.10);\n"
    "        aH.push(0);\n"
    "        aB.push(0.35+Math.random()*0.55);\n"
    "        aN.push(0);\n"
    "        aL.push(3);\n"
    "      }\n"
    "      var geo=new T.BufferGeometry();\n"
    "      var nt=aR.length;\n"
    "      geo.setAttribute('position',    new T.BufferAttribute(new Float32Array(nt*3),3));\n"
    "      geo.setAttribute('aOrbitR',     new T.BufferAttribute(new Float32Array(aR),1));\n"
    "      geo.setAttribute('aOrbitPhase', new T.BufferAttribute(new Float32Array(aP),1));\n"
    "      geo.setAttribute('aOrbitSpeed', new T.BufferAttribute(new Float32Array(aS),1));\n"
    "      geo.setAttribute('aOrbitH',     new T.BufferAttribute(new Float32Array(aH),1));\n"
    "      geo.setAttribute('aBrightness', new T.BufferAttribute(new Float32Array(aB),1));\n"
    "      geo.setAttribute('aOrbitNoise', new T.BufferAttribute(new Float32Array(aN),1));\n"
    "      geo.setAttribute('aLayer',      new T.BufferAttribute(new Float32Array(aL),1));\n"
    "      accMesh=new T.Points(geo,new T.ShaderMaterial({\n"
    "        uniforms:accUniforms,vertexShader:ACC_VERT,fragmentShader:ACC_FRAG,\n"
    "        transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending,\n"
    "      }));\n"
    "      accMesh.renderOrder=1;\n"
    "    }\n"
    "    buildAcc();\n"
    "    window.addEventListener('resize',function(){\n"
    "      var p=accUniforms.uBHProgress.value;\n"
    "      var cx=accUniforms.uBHCenter.value.x,cy=accUniforms.uBHCenter.value.y;\n"
    "      buildAcc();\n"
    "      accUniforms.uBHProgress.value=p;\n"
    "      accUniforms.uBHCenter.value.set(cx,cy);\n"
    "      if(p>0.05&&accMesh){" + SV + ".add(accMesh);accInScene=true;}\n"
    "    });\n"
)

src = src[:si] + NEW_BLOCK + src[ei:]
print("A OK: full accretion rebuild (photon ring + inner ribbon + outer ribbon + inflow)")

# ─── PATCH B: coreDisk radius → 0.85×accR (covers inside photon ring) ─────────
OLD_B = "          var cr=accR*0.50;\n"
NEW_B = "          var cr=accR*0.85;\n"
assert OLD_B in src, "PATCH B not found"
src = src.replace(OLD_B, NEW_B, 1)
print("B OK: coreDisk radius = 0.85 × accR")

# ─── Verify ──────────────────────────────────────────────────────────────────
checks = [
    ('position attr',   "geo.setAttribute('position',    new T.BufferAttribute"),
    ('photon ring',     "0.90+Math.random()*0.20"),
    ('inner ribbon',    "Math.pow(u,0.5)*1.05"),
    ('outer ribbon',    "1.5+Math.random()*3.0"),
    ('inflow',          "aL.push(3)"),
    ('large points',    "16.0+aBrightness*14.0"),
    ('inflow spiral',   "t*10.0"),
    ('coreDisk 0.85',   "accR*0.85"),
    ('depthTest false', "depthTest:false,blending:T.AdditiveBlending"),
    ('4 layers',        "aLayer>2.5"),
]
for label, frag in checks:
    print(f"  [{'OK' if frag in src else 'FAIL'}] {label}")

# ─── Re-encode ────────────────────────────────────────────────────────────────
encoded = gzip.compress(src.encode('utf-8'), compresslevel=9)
manifest[TARGET]['data'] = base64.b64encode(encoded).decode('ascii')
manifest[TARGET]['compressed'] = True
html = html[:ms.end()] + json.dumps(manifest, separators=(',',':')) + html[me:]
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print(f"\nindex.html saved ({len(src)} chars)")
