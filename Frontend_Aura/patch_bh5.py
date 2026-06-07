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

# ─── PATCH A: add missing `position` attribute to accretion geometry ──────────
# Three.js needs geo.attributes.position.count to determine vertex count for draw call
OLD_A = (
    "      geo.setAttribute('aOrbitR',     new T.BufferAttribute(new Float32Array(aR),1));\n"
)
NEW_A = (
    # dummy position attribute — shader ignores it, but Three.js needs it to issue the draw call
    "      geo.setAttribute('position',    new T.BufferAttribute(new Float32Array(n*3),3));\n"
    "      geo.setAttribute('aOrbitR',     new T.BufferAttribute(new Float32Array(aR),1));\n"
)
assert OLD_A in src, "PATCH A anchor not found"
src = src.replace(OLD_A, NEW_A, 1)
print("A OK: position attribute added to accretion geometry")

# ─── PATCH B: depthTest:false on accMesh so it renders above bg depth buffer ─
OLD_B = (
    "      accMesh=new T.Points(geo,new T.ShaderMaterial({\n"
    "        uniforms:accUniforms,vertexShader:ACC_VERT,fragmentShader:ACC_FRAG,\n"
    "        transparent:true,depthWrite:false,blending:T.AdditiveBlending,\n"
    "      }));\n"
)
NEW_B = (
    "      accMesh=new T.Points(geo,new T.ShaderMaterial({\n"
    "        uniforms:accUniforms,vertexShader:ACC_VERT,fragmentShader:ACC_FRAG,\n"
    "        transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending,\n"
    "      }));\n"
)
assert OLD_B in src, "PATCH B anchor not found"
src = src.replace(OLD_B, NEW_B, 1)
print("B OK: depthTest:false on accMesh material")

# ─── PATCH C: increase point sizes — currently 1.8-4.3px, now 4-10px ─────────
OLD_C = (
    "  float ps=aRingLayer<0.5?(1.8+aBrightness*1.5):"
    "(aRingLayer<1.5?(1.5+aBrightness*2.4):(0.8+aBrightness*1.5));\n"
)
NEW_C = (
    "  float ps=aRingLayer<0.5?(4.0+aBrightness*6.0):"
    "(aRingLayer<1.5?(3.0+aBrightness*5.0):(1.5+aBrightness*3.0));\n"
)
assert OLD_C in src, "PATCH C anchor not found"
src = src.replace(OLD_C, NEW_C, 1)
print("C OK: point sizes boosted (inner 4-10px, main 3-8px, outer 1.5-4.5px)")

# ─── PATCH D: boost vAlpha — raise floor from 0.30 to 0.50 arcMod ────────────
OLD_D = "  float arcMod =0.30+0.70*abs(sin(angle*arcFreq+uTime*arcSpd+aOrbitPhase*0.5));\n"
NEW_D = "  float arcMod =0.50+0.50*abs(sin(angle*arcFreq+uTime*arcSpd+aOrbitPhase*0.5));\n"
assert OLD_D in src, "PATCH D anchor not found"
src = src.replace(OLD_D, NEW_D, 1)
print("D OK: arcMod floor raised to 0.50 (particles never go dark)")

# ─── PATCH E: lower discard threshold so faint outer halo shows ───────────────
OLD_E = "  if(a<0.004) discard;\n"
NEW_E = "  if(a<0.001) discard;\n"
assert OLD_E in src, "PATCH E anchor not found"
src = src.replace(OLD_E, NEW_E, 1)
print("E OK: discard threshold lowered to 0.001")

# ─── Verify ──────────────────────────────────────────────────────────────────
checks = [
    ('position attr', "geo.setAttribute('position',    new T.BufferAttribute"),
    ('depthTest:false', "depthTest:false,blending:T.AdditiveBlending"),
    ('point sizes',  "4.0+aBrightness*6.0"),
    ('arcMod floor', "0.50+0.50*abs"),
    ('discard',      "if(a<0.001) discard"),
]
for label, frag in checks:
    ok = frag in src
    print(f"  [{('OK' if ok else 'FAIL')}] {label}")

# ─── Re-encode ────────────────────────────────────────────────────────────────
encoded = gzip.compress(src.encode('utf-8'), compresslevel=9)
manifest[TARGET]['data'] = base64.b64encode(encoded).decode('ascii')
manifest[TARGET]['compressed'] = True
html = html[:ms.end()] + json.dumps(manifest, separators=(',',':')) + html[me:]
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print(f"\nindex.html saved ({len(src)} chars)")
