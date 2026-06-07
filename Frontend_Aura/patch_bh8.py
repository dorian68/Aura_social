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
print(f"Scene variable: {SV}")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH A — coreDisk opacity 0.94 → 1.0 (event horizon fully opaque)
# ═══════════════════════════════════════════════════════════════════════════════
OLD_A = "coreDisk.material.opacity=Math.min(0.94,prog*1.4);"
NEW_A = "coreDisk.material.opacity=Math.min(1.0,prog*1.8);"
assert OLD_A in src, f"PATCH A not found"
src = src.replace(OLD_A, NEW_A, 1)
print("A OK: coreDisk opacity → 1.0")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH B — inner ribbon start radius 0.45 → 0.88 (no particles inside core)
# ═══════════════════════════════════════════════════════════════════════════════
OLD_B = "aR.push(0.45+Math.pow(u,0.5)*1.05);"
NEW_B = "aR.push(0.88+Math.pow(u,0.5)*0.62);"
assert OLD_B in src, "PATCH B not found"
src = src.replace(OLD_B, NEW_B, 1)
print("B OK: inner ribbon start → 0.88 (range 0.88–1.50)")

OLD_B2 = "float rN=clamp((r/uBHAccR-0.45)/1.05,0.0,1.0);"
NEW_B2 = "float rN=clamp((r/uBHAccR-0.88)/0.62,0.0,1.0);"
assert OLD_B2 in src, "PATCH B2 (rN normalization) not found"
src = src.replace(OLD_B2, NEW_B2, 1)
print("B2 OK: temperature gradient rN normalization updated")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH C — frontBandMesh: equatorial plasma band at renderOrder=3
#            Renders AFTER coreDisk, so it appears IN FRONT of the black core.
# ═══════════════════════════════════════════════════════════════════════════════

# C1 — declare state vars
OLD_C1 = "var accMesh=null,accInScene=false,coreInScene=false;"
NEW_C1 = ("var accMesh=null,accInScene=false,coreInScene=false;\n"
           "    var frontBandMesh=null,frontBandInScene=false;")
assert OLD_C1 in src, "PATCH C1 not found"
src = src.replace(OLD_C1, NEW_C1, 1)
print("C1 OK: frontBandMesh vars declared")

# C2 — FB_VERT shader, inserted after ACC_FRAG variable definition.
#       incl=0.03: nearly flat orbit → horizontal plasma band.
#       aOrbitH: per-particle vertical offset → band has organic thickness.
#       sizeMod: randomised per-particle size → avoids "pearl necklace" pattern.
#       vGlow: reused by ACC_FRAG which does vec4(vColor+vGlow*g, a).
FB_VERT = (
    "attribute float aOrbitR;\n"
    "attribute float aOrbitPhase;\n"
    "attribute float aOrbitSpeed;\n"
    "attribute float aBrightness;\n"
    "attribute float aOrbitNoise;\n"
    "attribute float aOrbitH;\n"
    "uniform float uTime;\n"
    "uniform float uBHProgress;\n"
    "uniform vec2  uBHCenter;\n"
    "uniform float uBHAccR;\n"
    "varying float vAlpha;\n"
    "varying vec3  vColor;\n"
    "varying float vGlow;\n"
    "void main(){\n"
    "  float angle=aOrbitPhase+uTime*aOrbitSpeed;\n"
    "  float turb=aOrbitNoise*sin(angle*3.7+aOrbitPhase*1.3+uTime*0.4);\n"
    "  float r=(aOrbitR+turb)*uBHAccR;\n"
    "  float px=uBHCenter.x+r*cos(angle);\n"
    "  float py=uBHCenter.y+r*sin(angle)*0.03+aOrbitH*0.007*uBHAccR;\n"
    "  float ff=1.18-0.18*uBHProgress;\n"
    "  px=uBHCenter.x+(px-uBHCenter.x)*ff;\n"
    "  py=uBHCenter.y+(py-uBHCenter.y)*ff;\n"
    "  float doppler=0.38+0.62*cos(angle+1.1);\n"
    "  float rN=clamp((r/uBHAccR-0.85)/1.65,0.0,1.0);\n"
    "  vColor=mix(vec3(1.0,0.97,0.85),vec3(0.98,0.38,0.04),rN*rN);\n"
    "  vGlow=mix(0.55,0.08,rN);\n"
    "  float sizeMod=0.60+0.40*abs(sin(aOrbitPhase*7.3+aOrbitR*11.1));\n"
    "  float ps=(24.0+aBrightness*22.0)*sizeMod;\n"
    "  vAlpha=uBHProgress*aBrightness*doppler*(0.68+0.32*abs(sin(angle*2.1+aOrbitPhase)));\n"
    "  vec4 mv=modelViewMatrix*vec4(px,py,0.0,1.0);\n"
    "  gl_Position=projectionMatrix*mv;\n"
    "  gl_PointSize=ps;\n"
    "}"
)

# Anchor on the last unique line of the ACC_FRAG shader + closing backtick+semicolon
ACC_FRAG_END = "gl_FragColor=vec4(vColor+vGlow*g,a);\n}`;\n"
pos = src.find(ACC_FRAG_END)
assert pos >= 0, "ACC_FRAG end anchor not found"
insert_pos = pos + len(ACC_FRAG_END)
FB_VERT_VAR = "    var FB_VERT=`" + FB_VERT + "`;\n"
src = src[:insert_pos] + FB_VERT_VAR + src[insert_pos:]
print("C2 OK: FB_VERT shader inserted after ACC_FRAG")

# C3 — build frontBandMesh at the end of buildAcc(), before closing brace.
#       35% of total particle count → ~700 particles on desktop.
#       nfb particles: r from 0.85–2.50, incl=0.03, large overlapping points.
OLD_C3 = "      accMesh.renderOrder=1;\n    }\n    buildAcc();\n"
NEW_C3 = (
    "      accMesh.renderOrder=1;\n"
    "      if(frontBandMesh){\n"
    "        if(frontBandInScene){" + SV + ".remove(frontBandMesh);frontBandInScene=false;}\n"
    "        frontBandMesh.geometry.dispose();frontBandMesh.material.dispose();frontBandMesh=null;\n"
    "      }\n"
    "      var nfb=Math.floor(n*0.35);\n"
    "      var fbR=[],fbP=[],fbS=[],fbB=[],fbN=[],fbH=[];\n"
    "      for(var i=0;i<nfb;i++){\n"
    "        var u2=Math.random();\n"
    "        fbR.push(0.85+Math.pow(u2,0.50)*1.65);\n"
    "        fbP.push(Math.random()*6.2832);\n"
    "        fbS.push(0.40+Math.random()*0.50);\n"
    "        fbB.push(0.55+Math.random()*0.45);\n"
    "        fbN.push(Math.random()*0.10);\n"
    "        fbH.push((Math.random()-0.5)*2.0);\n"
    "      }\n"
    "      var fbGeo=new T.BufferGeometry();\n"
    "      fbGeo.setAttribute('position',    new T.BufferAttribute(new Float32Array(nfb*3),3));\n"
    "      fbGeo.setAttribute('aOrbitR',     new T.BufferAttribute(new Float32Array(fbR),1));\n"
    "      fbGeo.setAttribute('aOrbitPhase', new T.BufferAttribute(new Float32Array(fbP),1));\n"
    "      fbGeo.setAttribute('aOrbitSpeed', new T.BufferAttribute(new Float32Array(fbS),1));\n"
    "      fbGeo.setAttribute('aBrightness', new T.BufferAttribute(new Float32Array(fbB),1));\n"
    "      fbGeo.setAttribute('aOrbitNoise', new T.BufferAttribute(new Float32Array(fbN),1));\n"
    "      fbGeo.setAttribute('aOrbitH',     new T.BufferAttribute(new Float32Array(fbH),1));\n"
    "      frontBandMesh=new T.Points(fbGeo,new T.ShaderMaterial({\n"
    "        uniforms:accUniforms,vertexShader:FB_VERT,fragmentShader:ACC_FRAG,\n"
    "        transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending,\n"
    "      }));\n"
    "      frontBandMesh.renderOrder=3;\n"
    "    }\n"
    "    buildAcc();\n"
)
assert OLD_C3 in src, "PATCH C3 (end of buildAcc) not found"
src = src.replace(OLD_C3, NEW_C3, 1)
print("C3 OK: frontBandMesh built inside buildAcc")

# C4 — show/hide frontBandMesh in setBHProgress (after coreDisk lines)
OLD_C4 = (
    "        if(prog>0.05&&!coreInScene){" + SV + ".add(coreDisk);coreInScene=true;}\n"
    "        else if(prog<=0.05&&coreInScene){" + SV + ".remove(coreDisk);coreInScene=false;}\n"
)
NEW_C4 = (
    "        if(prog>0.05&&!coreInScene){" + SV + ".add(coreDisk);coreInScene=true;}\n"
    "        else if(prog<=0.05&&coreInScene){" + SV + ".remove(coreDisk);coreInScene=false;}\n"
    "        if(prog>0.05&&!frontBandInScene&&frontBandMesh){" + SV + ".add(frontBandMesh);frontBandInScene=true;}\n"
    "        else if(prog<=0.05&&frontBandInScene&&frontBandMesh){" + SV + ".remove(frontBandMesh);frontBandInScene=false;}\n"
)
assert OLD_C4 in src, "PATCH C4 (setBHProgress coreDisk lines) not found"
src = src.replace(OLD_C4, NEW_C4, 1)
print("C4 OK: frontBandMesh show/hide in setBHProgress")

# C5 — clean up frontBandMesh in clearWell(0)
OLD_C5 = (
    "            coreDisk.material.opacity=0;\n"
    "            if(coreInScene){" + SV + ".remove(coreDisk);coreInScene=false;}\n"
)
NEW_C5 = (
    "            coreDisk.material.opacity=0;\n"
    "            if(coreInScene){" + SV + ".remove(coreDisk);coreInScene=false;}\n"
    "            if(frontBandInScene&&frontBandMesh){" + SV + ".remove(frontBandMesh);frontBandInScene=false;}\n"
)
assert OLD_C5 in src, "PATCH C5 (clearWell coreDisk lines) not found"
src = src.replace(OLD_C5, NEW_C5, 1)
print("C5 OK: frontBandMesh cleanup in clearWell")

# C6 — restore frontBandMesh after resize rebuild
OLD_C6 = (
    "      if(p>0.05&&accMesh){" + SV + ".add(accMesh);accInScene=true;}\n"
    "    });\n"
)
NEW_C6 = (
    "      if(p>0.05&&accMesh){" + SV + ".add(accMesh);accInScene=true;}\n"
    "      if(p>0.05&&frontBandMesh){" + SV + ".add(frontBandMesh);frontBandInScene=true;}\n"
    "    });\n"
)
assert OLD_C6 in src, "PATCH C6 (resize handler accMesh restore) not found"
src = src.replace(OLD_C6, NEW_C6, 1)
print("C6 OK: frontBandMesh restored on resize")

# ─── Verify ──────────────────────────────────────────────────────────────────
checks = [
    ('coreDisk opacity 1.0',    'Math.min(1.0,prog*1.8)'),
    ('inner ribbon 0.88',       '0.88+Math.pow(u,0.5)*0.62'),
    ('rN updated',              'r/uBHAccR-0.88)/0.62'),
    ('frontBandMesh var',       'frontBandMesh=null,frontBandInScene=false'),
    ('FB_VERT flat orbit',      'sin(angle)*0.03+aOrbitH'),
    ('FB_VERT sizeMod',         'sizeMod=0.60+0.40*abs(sin'),
    ('frontBand renderOrder 3', 'frontBandMesh.renderOrder=3'),
    ('frontBand in setBH',      '!frontBandInScene&&frontBandMesh'),
    ('frontBand in clearWell',  'frontBandInScene&&frontBandMesh'),
    ('frontBand in resize',     'p>0.05&&frontBandMesh'),
]
all_ok = True
for label, frag in checks:
    ok = frag in src
    all_ok = all_ok and ok
    print(f"  [{'OK' if ok else 'FAIL'}] {label}")

if not all_ok:
    print("\nERRORS — NOT saving index.html")
    raise SystemExit(1)

# ─── Re-encode ────────────────────────────────────────────────────────────────
encoded = gzip.compress(src.encode('utf-8'), compresslevel=9)
manifest[TARGET]['data'] = base64.b64encode(encoded).decode('ascii')
manifest[TARGET]['compressed'] = True
html = html[:ms.end()] + json.dumps(manifest, separators=(',', ':')) + html[me:]
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print(f"\nindex.html saved — {len(src)} chars in bundle")
