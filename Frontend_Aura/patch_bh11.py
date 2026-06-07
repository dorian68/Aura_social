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
print(f"Bundle decoded: {len(src)} chars, scene var: {SV}")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH A — debug vars + capture state + helper functions
#
# Appended after: var frontBandMesh=null,frontBandInScene=false;
#
# Adds:
#   debugGroup, debugCache* — for window.__auraDebugBH overlay
#   captureMesh, captureInScene, capParticles, capLastT — capture simulation
#   dbgLine(), dbgCircle() — Three.js line primitives for debug overlay
#   updateDebugGroup() — rebuilds overlay only when params change (no perf cost)
# ═══════════════════════════════════════════════════════════════════════════════
OLD_A = "    var frontBandMesh=null,frontBandInScene=false;"
NEW_A = OLD_A + (
    "\n"
    "    var debugGroup=null,debugCacheX=null,debugCacheY=null,debugCacheR=null;\n"
    "    var captureMesh=null,captureInScene=false;\n"
    "    var capParticles=[],capLastT=0;\n"
    "    function dbgLine(x0,y0,x1,y1,col){\n"
    "      var g=new T.BufferGeometry();\n"
    "      g.setAttribute('position',new T.BufferAttribute(new Float32Array([x0,y0,0.3,x1,y1,0.3]),3));\n"
    "      var m=new T.LineSegments(g,new T.LineBasicMaterial({color:col,depthTest:false}));\n"
    "      m.renderOrder=10;return m;\n"
    "    }\n"
    "    function dbgCircle(cx,cy,r,col){\n"
    "      var N=80,pts=new Float32Array(N*3);\n"
    "      for(var i=0;i<N;i++){var a=i/N*6.2832;pts[i*3]=cx+r*Math.cos(a);pts[i*3+1]=cy+r*Math.sin(a);pts[i*3+2]=0.3;}\n"
    "      var g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pts,3));\n"
    "      var m=new T.Line(g,new T.LineBasicMaterial({color:col,depthTest:false}));m.renderOrder=10;return m;\n"
    "    }\n"
    "    function updateDebugGroup(cx,cy,accR){\n"
    "      if(!window.__auraDebugBH){\n"
    "        if(debugGroup){" + SV + ".remove(debugGroup);debugGroup=null;}\n"
    "        debugCacheX=debugCacheY=debugCacheR=null;return;\n"
    "      }\n"
    "      if(cx===undefined||accR===undefined)return;\n"
    "      if(debugGroup&&Math.abs(cx-debugCacheX)<0.001&&Math.abs(cy-debugCacheY)<0.001\n"
    "         &&Math.abs(accR-debugCacheR)<0.001)return;\n"
    "      if(debugGroup)" + SV + ".remove(debugGroup);\n"
    "      debugGroup=new T.Group();var s=accR*0.12;\n"
    "      debugGroup.add(dbgLine(cx-s,cy,cx+s,cy,0xff2222));debugGroup.add(dbgLine(cx,cy-s,cx,cy+s,0xff2222));\n"
    "      debugGroup.add(dbgLine(cx-s*.75,cy,cx+s*.75,cy,0x2288ff));debugGroup.add(dbgLine(cx,cy-s*.75,cx,cy+s*.75,0x2288ff));\n"
    "      debugGroup.add(dbgLine(cx-s*.50,cy,cx+s*.50,cy,0x22ff88));debugGroup.add(dbgLine(cx,cy-s*.50,cx,cy+s*.50,0x22ff88));\n"
    "      debugGroup.add(dbgLine(cx-s*.30,cy,cx+s*.30,cy,0xffff22));debugGroup.add(dbgLine(cx,cy-s*.30,cx,cy+s*.30,0xffff22));\n"
    "      debugGroup.add(dbgCircle(cx,cy,accR*0.85,0xffffff));\n"
    "      debugGroup.add(dbgCircle(cx,cy,accR*0.92,0xff8800));\n"
    "      debugGroup.add(dbgCircle(cx,cy,accR*1.00,0x00ffff));\n"
    "      debugGroup.add(dbgCircle(cx,cy,accR*3.50,0x4488ff));\n"
    "      " + SV + ".add(debugGroup);\n"
    "      debugCacheX=cx;debugCacheY=cy;debugCacheR=accR;\n"
    "    }\n"
)
assert OLD_A in src, "PATCH A anchor not found"
src = src.replace(OLD_A, NEW_A, 1)
print("A OK: debug vars + helper functions inserted")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH B — setBHProgress: captureMesh lazy-build + show/hide + debug call
#
# setBHProgress ends with the frontBandMesh lines then `      },` (6 spaces).
# Insert before that closing `},`:
#   - Build captureMesh on first activation (when captureMesh===null)
#   - Show/hide captureMesh based on prog threshold (same logic as other meshes)
#   - Call updateDebugGroup every frame (no-op when __auraDebugBH is false)
# ═══════════════════════════════════════════════════════════════════════════════
OLD_B = (
    "        else if(prog<=0.05&&frontBandInScene&&frontBandMesh){"
    + SV + ".remove(frontBandMesh);frontBandInScene=false;}\n"
    "      },"
)
NEW_B = (
    "        else if(prog<=0.05&&frontBandInScene&&frontBandMesh){"
    + SV + ".remove(frontBandMesh);frontBandInScene=false;}\n"
    "        if(prog>0.05&&!captureMesh){buildCaptureMesh();}\n"
    "        if(prog>0.05&&!captureInScene&&captureMesh){"
    + SV + ".add(captureMesh);captureInScene=true;}\n"
    "        else if(prog<=0.05&&captureInScene&&captureMesh){"
    + SV + ".remove(captureMesh);captureInScene=false;}\n"
    "        updateDebugGroup(cx,cy,accR);\n"
    "      },"
)
assert OLD_B in src, "PATCH B anchor not found — check setBHProgress end"
src = src.replace(OLD_B, NEW_B, 1)
print("B OK: captureMesh show/hide + debug call in setBHProgress")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH C — clearWell(0): remove captureMesh from scene
#
# clearWell's if(i===0) block (12 spaces indentation) removes all BH meshes.
# frontBandMesh cleanup is at 12 spaces; insert captureMesh cleanup after it.
# ═══════════════════════════════════════════════════════════════════════════════
OLD_C = (
    "            if(frontBandInScene&&frontBandMesh){"
    + SV + ".remove(frontBandMesh);frontBandInScene=false;}\n"
)
NEW_C = OLD_C + (
    "            if(captureInScene&&captureMesh){"
    + SV + ".remove(captureMesh);captureInScene=false;}\n"
)
assert OLD_C in src, "PATCH C anchor not found — check clearWell(0)"
src = src.replace(OLD_C, NEW_C, 1)
print("C OK: captureMesh cleanup in clearWell(0)")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH D — resize handler: rebuild captureMesh at new resolution
#
# Only rebuilds if captureMesh already exists (BH was previously activated).
# This avoids wasted geometry when user hasn't scrolled to BH yet.
# ═══════════════════════════════════════════════════════════════════════════════
OLD_D = (
    "      if(p>0.05&&frontBandMesh){" + SV + ".add(frontBandMesh);frontBandInScene=true;}\n"
    "    });\n"
)
NEW_D = (
    "      if(p>0.05&&frontBandMesh){" + SV + ".add(frontBandMesh);frontBandInScene=true;}\n"
    "      if(captureMesh){buildCaptureMesh();if(p>0.05){"
    + SV + ".add(captureMesh);captureInScene=true;}}\n"
    "    });\n"
)
assert OLD_D in src, "PATCH D anchor not found — check resize handler"
src = src.replace(OLD_D, NEW_D, 1)
print("D OK: captureMesh rebuild in resize handler")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH E — Insert capture simulation before `const api = {`
#
# Inserts inside the AuraFieldBg closure (after buildAcc/resize, before api):
#   CAP_VERT  — vertex shader: temperature-driven color + point size
#   CAP_FRAG  — fragment shader: soft Gaussian disk
#   spawnCap  — spawn from 3 directional source zones, not a uniform circle
#   updateCaptureParticles — CPU physics: 4-zone model per frame
#   buildCaptureMesh — geometry setup, called lazily from setBHProgress
# ═══════════════════════════════════════════════════════════════════════════════

CAP_VERT_GLSL = (
    "attribute float aCapTemp;\n"
    "attribute float aCapAlpha;\n"
    "uniform float uBHProgress;\n"
    "varying float vCapAlpha;\n"
    "varying vec3  vCapColor;\n"
    "void main(){\n"
    "  float t=aCapTemp;\n"
    "  vCapColor=t<0.5\n"
    "    ?mix(vec3(0.70,0.85,0.70),vec3(0.98,0.85,0.28),t*2.0)\n"
    "    :mix(vec3(0.98,0.85,0.28),vec3(0.98,0.42,0.05),(t-0.5)*2.0);\n"
    "  vCapAlpha=aCapAlpha*uBHProgress;\n"
    "  float ps=2.5+t*5.5+aCapAlpha*2.0;\n"
    "  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);\n"
    "  gl_PointSize=ps;\n"
    "}"
)

CAP_FRAG_GLSL = (
    "varying float vCapAlpha;\n"
    "varying vec3  vCapColor;\n"
    "void main(){\n"
    "  vec2 uv=gl_PointCoord-0.5;float d=length(uv);\n"
    "  if(d>0.5)discard;\n"
    "  float a=exp(-d*d*6.0)*vCapAlpha;\n"
    "  if(a<0.003)discard;\n"
    "  gl_FragColor=vec4(vCapColor,a);\n"
    "}"
)

# spawnCap — 3 source zones (directional flux, not uniform circle)
# Zone A (50%): left/lower-left  — 190°-250°, dist 3-5× accR
# Zone B (35%): upper-right      — 20°-70°,   dist 2.8-4.5× accR
# Zone C (15%): far right        — 340°-360°,  dist 4-6× accR
# Initial velocity: gentle inward drift + tangential noise
SPAWN_CAP = (
    "    function spawnCap(p){\n"
    "      var bhx=accUniforms.uBHCenter.value.x,bhy=accUniforms.uBHCenter.value.y;\n"
    "      var accR=accUniforms.uBHAccR.value||2.0;\n"
    "      var zones=[\n"
    "        {a0:3.30,a1:4.36,r0:3.0,r1:5.0,w:0.50},\n"
    "        {a0:0.35,a1:1.22,r0:2.8,r1:4.5,w:0.35},\n"
    "        {a0:5.94,a1:6.28,r0:4.0,r1:6.0,w:0.15}\n"
    "      ];\n"
    "      var rnd=Math.random(),zone=zones[0],cum=0;\n"
    "      for(var z=0;z<zones.length;z++){cum+=zones[z].w;if(rnd<cum){zone=zones[z];break;}}\n"
    "      var ang=zone.a0+Math.random()*(zone.a1-zone.a0);\n"
    "      var r=(zone.r0+Math.random()*(zone.r1-zone.r0))*accR;\n"
    "      p.px=bhx+r*Math.cos(ang);p.py=bhy+r*Math.sin(ang);\n"
    "      var speed=0.01+Math.random()*0.05;\n"
    "      var ddx=bhx-p.px,ddy=bhy-p.py,invD=1/Math.sqrt(ddx*ddx+ddy*ddy);\n"
    "      p.vx=ddx*invD*speed+(Math.random()-0.5)*0.02;\n"
    "      p.vy=ddy*invD*speed+(Math.random()-0.5)*0.02;\n"
    "      p.life=0.6+Math.random()*0.4;p.temperature=0;p.alpha=0;p.age=1;\n"
    "    }\n"
)

# updateCaptureParticles — 4-zone physics model
#
# Forces use rim Gaussian (peaks at rN=0.92) + capture factor (capF):
#   grav  = 0.08/rN² + 0.15×rimG         — radial inward (gravity + rim infall)
#   orb   = 0.04×capF/rN + 0.12×rimG     — tangential CCW (orbital + rim lock)
#   ret   = max(0.04, 0.50 - 0.46×rimG - 0.15×capF) — per-second vel retention
#
# Far zone (rN>3.5): grav≈0.006, orb≈0, ret=0.50 → slow inward drift
# Capture (rN 1.5-3.5): building pull + orbital begins
# Orbital (rN 1.0-1.5): spiral tightens
# Rim (rN≈0.92): rimG≈1 → grav=0.23, orb=0.16, ret=0.04 → orbit lock + heavy drag
# Horizon (rN<0.85): kill → respawn next frame
UPDATE_CAP = (
    "    function updateCaptureParticles(now){\n"
    "      if(!captureMesh||!captureInScene)return;\n"
    "      var dt=capLastT>0?Math.min((now-capLastT)/1000,0.05):0.016;\n"
    "      capLastT=now;\n"
    "      var bhx=accUniforms.uBHCenter.value.x,bhy=accUniforms.uBHCenter.value.y;\n"
    "      var accR=accUniforms.uBHAccR.value;\n"
    "      var eHR=accR*0.85;\n"
    "      var posArr=captureMesh.geometry.attributes.position.array;\n"
    "      var tempArr=captureMesh.geometry.attributes.aCapTemp.array;\n"
    "      var alphaArr=captureMesh.geometry.attributes.aCapAlpha.array;\n"
    "      var n=capParticles.length;\n"
    "      for(var i=0;i<n;i++){\n"
    "        var p=capParticles[i];\n"
    "        if(p.life<=0){\n"
    "          spawnCap(p);\n"
    "          posArr[i*3]=p.px;posArr[i*3+1]=p.py;posArr[i*3+2]=0;\n"
    "          tempArr[i]=0;alphaArr[i]=0;continue;\n"
    "        }\n"
    "        var dx=p.px-bhx,dy=p.py-bhy;\n"
    "        var dist=Math.sqrt(dx*dx+dy*dy);\n"
    "        if(dist<eHR){p.life=0;alphaArr[i]=0;continue;}\n"
    "        var inv=1/Math.max(dist,0.001);\n"
    "        var rx=-dx*inv,ry=-dy*inv,tx=-ry,ty=rx;\n"
    "        var rN=dist/accR;\n"
    "        var rimD=rN-0.92,rimG=Math.exp(-rimD*rimD/0.008);\n"
    "        var capF=Math.max(0,Math.min(1,(3.5-rN)/2.0));\n"
    "        var grav=0.08/Math.max(rN*rN,0.5)+0.15*rimG;\n"
    "        var orb=0.04*capF/Math.max(rN,0.8)+0.12*rimG;\n"
    "        p.vx+=(rx*grav+tx*orb)*dt;\n"
    "        p.vy+=(ry*grav+ty*orb)*dt;\n"
    "        var ret=Math.max(0.04,0.50-0.46*rimG-0.15*capF);\n"
    "        p.vx*=Math.pow(ret,dt);p.vy*=Math.pow(ret,dt);\n"
    "        var ms=Math.max(0.5,2.0-1.2*rimG);\n"
    "        var spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy);\n"
    "        if(spd>ms){p.vx*=ms/spd;p.vy*=ms/spd;}\n"
    "        p.px+=p.vx*dt;p.py+=p.vy*dt;\n"
    "        var dx2=p.px-bhx,dy2=p.py-bhy,dist2=Math.sqrt(dx2*dx2+dy2*dy2);\n"
    "        var rN2=dist2/accR;\n"
    "        var tgt=Math.max(0,1.0-(rN2-0.85)*2.5);\n"
    "        p.temperature+=(tgt-p.temperature)*3.0*dt;\n"
    "        p.temperature=Math.max(0,Math.min(1,p.temperature));\n"
    "        p.life-=(0.015+0.20*p.temperature)*dt;\n"
    "        p.age++;\n"
    "        if(dist2<eHR){p.alpha=0;p.life=0;}\n"
    "        else{\n"
    "          var ehF=Math.min(1,(dist2-eHR)/(accR*0.15));\n"
    "          p.alpha=Math.max(0,ehF*Math.min(1,p.life*3.0)*0.70);\n"
    "        }\n"
    "        posArr[i*3]=p.px;posArr[i*3+1]=p.py;posArr[i*3+2]=0;\n"
    "        tempArr[i]=p.temperature;alphaArr[i]=p.alpha;\n"
    "      }\n"
    "      captureMesh.geometry.attributes.position.needsUpdate=true;\n"
    "      captureMesh.geometry.attributes.aCapTemp.needsUpdate=true;\n"
    "      captureMesh.geometry.attributes.aCapAlpha.needsUpdate=true;\n"
    "    }\n"
)

BUILD_CAP = (
    "    function buildCaptureMesh(){\n"
    "      if(captureMesh){\n"
    "        if(captureInScene){" + SV + ".remove(captureMesh);captureInScene=false;}\n"
    "        captureMesh.geometry.dispose();captureMesh.material.dispose();captureMesh=null;\n"
    "      }\n"
    "      var n=window.innerWidth<768?90:(window.innerWidth<1200?180:300);\n"
    "      while(capParticles.length<n){\n"
    "        capParticles.push({px:0,py:0,vx:0,vy:0,life:0,temperature:0,alpha:0,age:0});\n"
    "      }\n"
    "      capParticles.length=n;\n"
    "      for(var i=0;i<n;i++){spawnCap(capParticles[i]);capParticles[i].life=Math.random();}\n"
    "      var geo=new T.BufferGeometry();\n"
    "      geo.setAttribute('position', new T.BufferAttribute(new Float32Array(n*3),3));\n"
    "      geo.setAttribute('aCapTemp',  new T.BufferAttribute(new Float32Array(n),1));\n"
    "      geo.setAttribute('aCapAlpha', new T.BufferAttribute(new Float32Array(n),1));\n"
    "      captureMesh=new T.Points(geo,new T.ShaderMaterial({\n"
    "        uniforms:{uBHProgress:accUniforms.uBHProgress},\n"
    "        vertexShader:CAP_VERT,fragmentShader:CAP_FRAG,\n"
    "        transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending\n"
    "      }));\n"
    "      captureMesh.renderOrder=1;\n"
    "    }\n"
)

CAP_BLOCK = (
    "    var CAP_VERT=`" + CAP_VERT_GLSL + "`;\n"
    "    var CAP_FRAG=`" + CAP_FRAG_GLSL + "`;\n"
    + SPAWN_CAP
    + UPDATE_CAP
    + BUILD_CAP
)

OLD_E = "\n    const api = {"
NEW_E = "\n" + CAP_BLOCK + "\n    const api = {"
assert OLD_E in src, "PATCH E anchor not found"
src = src.replace(OLD_E, NEW_E, 1)
print("E OK: CAP_VERT + CAP_FRAG + spawnCap + updateCaptureParticles + buildCaptureMesh inserted")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH F — animation loop: hook updateCaptureParticles before renderer.render
#
# Inserts before the unique renderer.render(scene, camera) call.
# Preserves exact indentation of the surrounding code.
# ═══════════════════════════════════════════════════════════════════════════════
render_call = "renderer.render(scene, camera);"
render_idx = src.find(render_call)
assert render_idx > 0, "PATCH F: renderer.render(scene, camera) not found"
line_start = src.rfind('\n', 0, render_idx) + 1
prefix = src[line_start:render_idx]
hook_line = "updateCaptureParticles(performance.now());\n" + prefix
src = src[:render_idx] + hook_line + src[render_idx:]
print("F OK: updateCaptureParticles hooked before renderer.render")

# ─── Verify all patches ───────────────────────────────────────────────────────
checks = [
    # bh11a debug
    ('debug vars present',          'debugGroup=null,debugCacheX=null'),
    ('dbgLine function',            'function dbgLine(x0,y0,x1,y1,col)'),
    ('dbgCircle function',          'function dbgCircle(cx,cy,r,col)'),
    ('updateDebugGroup function',   'window.__auraDebugBH'),
    ('debug crosses (4 colours)',   '0xff2222'),
    ('debug circles (4 radii)',     'accR*3.50,0x4488ff'),
    # bh11b capture
    ('CAP_VERT shader',             'attribute float aCapTemp'),
    ('CAP_FRAG shader',             'gl_PointCoord-0.5;float d=length(uv)'),
    ('spawnCap zones',              'a0:3.30,a1:4.36'),
    ('zone B',                      'a0:0.35,a1:1.22'),
    ('zone C',                      'a0:5.94,a1:6.28'),
    ('rim Gaussian',                'rimD=rN-0.92,rimG=Math.exp(-rimD*rimD/0.008)'),
    ('capture factor',              'capF=Math.max(0,Math.min(1,(3.5-rN)/2.0))'),
    ('gravity formula',             'grav=0.08/Math.max(rN*rN,0.5)+0.15*rimG'),
    ('orbital formula',             'orb=0.04*capF/Math.max(rN,0.8)+0.12*rimG'),
    ('retention drag',              'ret=Math.max(0.04,0.50-0.46*rimG-0.15*capF)'),
    ('temperature update',          'tgt=Math.max(0,1.0-(rN2-0.85)*2.5)'),
    ('life decay',                  '0.015+0.20*p.temperature'),
    ('alpha fade at horizon',       'ehF=Math.min(1,(dist2-eHR)/(accR*0.15))'),
    ('needsUpdate set',             'aCapAlpha.needsUpdate=true'),
    ('buildCaptureMesh present',    'function buildCaptureMesh()'),
    ('captureMesh renderOrder 1',   'captureMesh.renderOrder=1'),
    # Integration
    ('setBHProgress lazy build',    'prog>0.05&&!captureMesh){buildCaptureMesh()'),
    ('setBHProgress show capture',  'prog>0.05&&!captureInScene&&captureMesh'),
    ('setBHProgress debug call',    'updateDebugGroup(cx,cy,accR)'),
    ('clearWell capture cleanup',   'captureInScene&&captureMesh)'),
    ('resize rebuild',              'if(captureMesh){buildCaptureMesh()'),
    ('render loop hook',            'updateCaptureParticles(performance.now())'),
    # Ensure existing code untouched
    ('coreDisk opacity intact',     'Math.min(1.0,prog*1.8)'),
    ('frontBandMesh still present', 'frontBandMesh.renderOrder=3'),
    ('accMesh still present',       'accMesh.renderOrder=1'),
    ('bh10 warm tint intact',       'vec3(0.92,0.70,0.18)'),
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
