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
assert scene_m, "Scene not found"
SV = scene_m.group(1)
print(f"Scene: {SV}")

# ─── PATCH A: Replace entire accretion setup block ────────────────────────────
START = "\n    var accMesh=null,accInScene=false;\n"
END   = "\n    const api = {"
si = src.find(START)
ei = src.find(END, si)
assert si >= 0, f"START not found: {repr(src[si-30:si+50])}"
assert ei > si, f"END not found after si={si}"
print(f"Block: chars {si}–{ei} ({ei-si} chars replaced)")

ACC_VERT = (
    "attribute float aOrbitR;\n"
    "attribute float aOrbitPhase;\n"
    "attribute float aOrbitSpeed;\n"
    "attribute float aOrbitH;\n"
    "attribute float aBrightness;\n"
    "attribute float aOrbitNoise;\n"
    "attribute float aRingLayer;\n"
    "uniform float uTime;\n"
    "uniform float uBHProgress;\n"
    "uniform vec2  uBHCenter;\n"
    "uniform float uBHAccR;\n"
    "uniform float uBHInclination;\n"
    "varying float vAlpha;\n"
    "varying vec3  vColor;\n"
    "void main(){\n"
    "  float angle=aOrbitPhase+uTime*aOrbitSpeed;\n"
    "  float noise=aOrbitNoise*sin(angle*3.0+aOrbitPhase*2.0);\n"
    "  float r=(aOrbitR+noise)*uBHAccR;\n"
    "  float incl=uBHInclination;\n"
    "  float px=uBHCenter.x+r*cos(angle);\n"
    "  float py=uBHCenter.y+r*sin(angle)*incl;\n"
    "  float pz=aOrbitH*0.04+r*sin(angle)*(1.0-incl)*0.08;\n"
    "  float ff=1.30-0.30*uBHProgress;\n"
    "  px=uBHCenter.x+(px-uBHCenter.x)*ff;\n"
    "  py=uBHCenter.y+(py-uBHCenter.y)*ff;\n"
    "  float arcFreq=aRingLayer<0.5?2.5:(aRingLayer<1.5?1.5:1.0);\n"
    "  float arcSpd =aRingLayer<0.5?0.38:(aRingLayer<1.5?0.22:0.12);\n"
    "  float arcMod =0.30+0.70*abs(sin(angle*arcFreq+uTime*arcSpd+aOrbitPhase*0.5));\n"
    "  float layerA =aRingLayer<0.5?1.0:(aRingLayer<1.5?0.90:0.30);\n"
    "  vAlpha=uBHProgress*aBrightness*arcMod*layerA;\n"
    "  vec3 c0=vec3(1.0,0.52,0.05);\n"
    "  vec3 c1=vec3(0.92,0.78,0.20);\n"
    "  vec3 c2=vec3(0.55,0.80,0.30);\n"
    "  vColor=aRingLayer<0.5?c0:(aRingLayer<1.5?c1:c2);\n"
    "  float ps=aRingLayer<0.5?(1.8+aBrightness*1.5):(aRingLayer<1.5?(1.5+aBrightness*2.4):(0.8+aBrightness*1.5));\n"
    "  vec4 mv=modelViewMatrix*vec4(px,py,pz,1.0);\n"
    "  gl_Position=projectionMatrix*mv;\n"
    "  gl_PointSize=ps;\n"
    "}"
)
ACC_FRAG = (
    "varying float vAlpha;\n"
    "varying vec3  vColor;\n"
    "void main(){\n"
    "  vec2 uv=gl_PointCoord-0.5;\n"
    "  float d=length(uv);\n"
    "  if(d>0.5) discard;\n"
    "  float g=exp(-d*d*9.0);\n"
    "  float a=g*vAlpha;\n"
    "  if(a<0.004) discard;\n"
    "  gl_FragColor=vec4(vColor+0.25*g,a);\n"
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
    "      uBHInclination:{value:0.45},\n"
    "    };\n"
    "    var ACC_VERT=`" + ACC_VERT + "`;\n"
    "    var ACC_FRAG=`" + ACC_FRAG + "`;\n"
    # Dark occluder disk — same scene, renderOrder=2 (paints black over core)
    "    var coreDisk=(function(){\n"
    "      var cg=new T.CircleGeometry(1.0,64);\n"
    "      var cm=new T.MeshBasicMaterial({\n"
    "        color:0x000000,transparent:true,opacity:0,depthTest:false,depthWrite:false\n"
    "      });\n"
    "      var m=new T.Mesh(cg,cm);\n"
    "      m.renderOrder=2;\n"
    "      return m;\n"
    "    }());\n"
    "    function accN(){var w=window.innerWidth;return w<768?280:w<1200?600:1200;}\n"
    "    function buildAcc(){\n"
    "      if(accMesh){\n"
    "        if(accInScene){" + SV + ".remove(accMesh);accInScene=false;}\n"
    "        accMesh.geometry.dispose();accMesh.material.dispose();accMesh=null;\n"
    "      }\n"
    "      var n=accN(),geo=new T.BufferGeometry();\n"
    "      var aR=[],aP=[],aS=[],aH=[],aB=[],aN=[],aL=[];\n"
    "      for(var i=0;i<n;i++){\n"
    "        var roll=Math.random(),r,spd,br,layer;\n"
    "        if(roll<0.21){\n"
    # inner hot ring — fast, bright, orange-amber
    "          r=0.55+Math.random()*0.15;spd=1.15+Math.random()*0.20;\n"
    "          br=0.65+Math.random()*0.35;layer=0;\n"
    "        } else if(roll<0.76){\n"
    # main ring — medium, gold
    "          r=0.75+Math.random()*0.35;spd=0.88+Math.random()*0.25;\n"
    "          br=0.40+Math.random()*0.60;layer=1;\n"
    "        } else {\n"
    # outer halo — slow, dim, lime
    "          r=1.15+Math.random()*0.35;spd=0.65+Math.random()*0.20;\n"
    "          br=0.15+Math.random()*0.35;layer=2;\n"
    "        }\n"
    "        aR.push(r);aP.push(Math.random()*6.2832);aS.push(spd);\n"
    "        aH.push((Math.random()-0.5)*2);aB.push(br);\n"
    "        aN.push(Math.random()*0.12);aL.push(layer);\n"
    "      }\n"
    "      geo.setAttribute('aOrbitR',     new T.BufferAttribute(new Float32Array(aR),1));\n"
    "      geo.setAttribute('aOrbitPhase', new T.BufferAttribute(new Float32Array(aP),1));\n"
    "      geo.setAttribute('aOrbitSpeed', new T.BufferAttribute(new Float32Array(aS),1));\n"
    "      geo.setAttribute('aOrbitH',     new T.BufferAttribute(new Float32Array(aH),1));\n"
    "      geo.setAttribute('aBrightness', new T.BufferAttribute(new Float32Array(aB),1));\n"
    "      geo.setAttribute('aOrbitNoise', new T.BufferAttribute(new Float32Array(aN),1));\n"
    "      geo.setAttribute('aRingLayer',  new T.BufferAttribute(new Float32Array(aL),1));\n"
    "      accMesh=new T.Points(geo,new T.ShaderMaterial({\n"
    "        uniforms:accUniforms,vertexShader:ACC_VERT,fragmentShader:ACC_FRAG,\n"
    "        transparent:true,depthWrite:false,blending:T.AdditiveBlending,\n"
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
print("A OK: inclination=0.45, 3 layers, 1200/600/280 ptcls, coreDisk occluder")

# ─── PATCH B: setBHProgress — add coreDisk positioning ───────────────────────
OLD_B = (
    "      setBHProgress(prog,cx,cy,accR){\n"
    "        accUniforms.uBHProgress.value=prog;\n"
    "        if(cx!==undefined) accUniforms.uBHCenter.value.set(cx,cy);\n"
    "        if(accR!==undefined) accUniforms.uBHAccR.value=accR;\n"
    "        if(prog>0.05&&!accInScene&&accMesh){" + SV + ".add(accMesh);accInScene=true;}\n"
    "        else if(prog<=0.05&&accInScene&&accMesh){" + SV + ".remove(accMesh);accInScene=false;}\n"
    "      },"
)
NEW_B = (
    "      setBHProgress(prog,cx,cy,accR){\n"
    "        accUniforms.uBHProgress.value=prog;\n"
    "        if(cx!==undefined) accUniforms.uBHCenter.value.set(cx,cy);\n"
    "        if(accR!==undefined){\n"
    "          accUniforms.uBHAccR.value=accR;\n"
    "          var cr=accR*0.50;\n"
    "          coreDisk.scale.set(cr,cr,1);\n"
    "        }\n"
    "        if(cx!==undefined) coreDisk.position.set(cx,cy,0.01);\n"
    "        coreDisk.material.opacity=Math.min(0.94,prog*1.4);\n"
    "        if(prog>0.05&&!accInScene&&accMesh){" + SV + ".add(accMesh);accInScene=true;}\n"
    "        else if(prog<=0.05&&accInScene&&accMesh){" + SV + ".remove(accMesh);accInScene=false;}\n"
    "        if(prog>0.05&&!coreInScene){" + SV + ".add(coreDisk);coreInScene=true;}\n"
    "        else if(prog<=0.05&&coreInScene){" + SV + ".remove(coreDisk);coreInScene=false;}\n"
    "      },"
)
assert OLD_B in src, "PATCH B anchor not found"
src = src.replace(OLD_B, NEW_B, 1)
print("B OK: setBHProgress → coreDisk opacity + position")

# ─── PATCH C: clearWell(0) — hide coreDisk ────────────────────────────────────
OLD_C = (
    "          if(i===0){\n"
    "            accUniforms.uBHProgress.value=0;\n"
    "            if(accInScene&&accMesh){" + SV + ".remove(accMesh);accInScene=false;}\n"
    "            coreDisk.material.opacity=0;\n"
    "            if(coreInScene){" + SV + ".remove(coreDisk);coreInScene=false;}\n"
    "          }\n"
)
# Check if clearWell already has coreDisk handling
if "coreDisk.material.opacity=0" in src:
    print("C: clearWell already has coreDisk handling, skip")
else:
    OLD_C_OLD = (
        "          if(i===0){accUniforms.uBHProgress.value=0;"
        "if(accInScene&&accMesh){" + SV + ".remove(accMesh);accInScene=false;}}\n"
    )
    NEW_C_NEW = (
        "          if(i===0){\n"
        "            accUniforms.uBHProgress.value=0;\n"
        "            if(accInScene&&accMesh){" + SV + ".remove(accMesh);accInScene=false;}\n"
        "            coreDisk.material.opacity=0;\n"
        "            if(coreInScene){" + SV + ".remove(coreDisk);coreInScene=false;}\n"
        "          }\n"
    )
    assert OLD_C_OLD in src, f"PATCH C anchor not found"
    src = src.replace(OLD_C_OLD, NEW_C_NEW, 1)
    print("C OK: clearWell(0) → coreDisk hidden")

# ─── Verify ───────────────────────────────────────────────────────────────────
for kw in ['coreDisk','coreInScene','aRingLayer','0.45','1200','setBHProgress',
           'CircleGeometry','MeshBasicMaterial','renderOrder=2']:
    print(f"  {kw}: {kw in src}")

# ─── Re-encode ────────────────────────────────────────────────────────────────
encoded = gzip.compress(src.encode('utf-8'), compresslevel=9)
manifest[TARGET]['data'] = base64.b64encode(encoded).decode('ascii')
manifest[TARGET]['compressed'] = True
html = html[:ms.end()] + json.dumps(manifest, separators=(',',':')) + html[me:]
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print(f"\nindex.html saved ({len(src)} chars in AuraFieldBg)")
