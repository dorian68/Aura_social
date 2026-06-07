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

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH A — Background BH shader: wide capture zone (inward pull + warmth)
# Target: the BH mode block inside vertexShader template literal
# ═══════════════════════════════════════════════════════════════════════════════

# A1: insert wide pull + swirl AFTER the existing narrow swirlAmt dispatch
OLD_A1 = (
    "                dispX += tanDir.x * swirlAmt;\n"
    "                dispY += tanDir.y * swirlAmt;\n"
)
NEW_A1 = (
    "                dispX += tanDir.x * swirlAmt;\n"
    "                dispY += tanDir.y * swirlAmt;\n"
    # Wide capture zone: extends gravitational pull to 4× accR
    # Only where the narrow Gaussian (fall) is already small → avoids double-counting
    "                float wideR    = max(accR*4.0, 0.001);\n"
    "                float wideFall = exp(-(dist*dist)/(wideR*wideR))*(1.0-fall);\n"
    "                float wideSwirl = swirlStr*0.30*wideFall;\n"
    "                dispX += tanDir.x * wideSwirl;\n"
    "                dispY += tanDir.y * wideSwirl;\n"
    "                float wideAtt  = wStr*0.25*wideFall;\n"
    "                dispX -= radDir.x * wideAtt;\n"
    "                dispY -= radDir.y * wideAtt;\n"
)
assert OLD_A1 in src, "PATCH A1 anchor not found"
src = src.replace(OLD_A1, NEW_A1, 1)
print("A1 OK: wide capture zone swirl+pull added to BG shader")

# A2: replace disturb / z section — add capture warmth, tighten Z depression
OLD_A2 = (
    "                disturb += ringFall*glowB*coreGlow*arcMod*0.12;\n"
    "                disturb -= (1.0-coreGlow)*coreDark*wStr*3.5;\n"
    "                disturb  = max(disturb, 0.0);\n"
    "                z -= wStr*exp(-nd*nd*2.0)*3.5;\n"
)
NEW_A2 = (
    # Capture zone warmth: particles in 0.8×–3.5×accR ring appear subtly brighter
    # (suggests heating as matter falls toward the disk)
    "                float capND   = dist / max(accR*3.5, 0.001);\n"
    "                float capFar  = exp(-capND*capND);\n"
    "                float capCore = smoothstep(0.0, accR*0.8, dist);\n"
    "                disturb += capFar*capCore*wStr*0.85;\n"
    "                disturb += ringFall*glowB*coreGlow*arcMod*0.12;\n"
    "                disturb -= (1.0-coreGlow)*coreDark*wStr*3.5;\n"
    "                disturb  = max(disturb, 0.0);\n"
    # Tighter Z depression — only very near core, so capture zone stays visible
    "                z -= wStr*exp(-nd*nd*5.0)*3.5;\n"
)
assert OLD_A2 in src, "PATCH A2 anchor not found"
src = src.replace(OLD_A2, NEW_A2, 1)
print("A2 OK: capture warmth + tighter Z depression in BG shader")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH B — Accretion ribbon: temperature gradient + organic thickness
# ═══════════════════════════════════════════════════════════════════════════════

# B1: add ribbon turbulence AFTER the formation ff lines
OLD_B1 = (
    "    float ff=1.18-0.18*uBHProgress;\n"
    "    px=uBHCenter.x+(px-uBHCenter.x)*ff;\n"
    "    py=uBHCenter.y+(py-uBHCenter.y)*ff;\n"
)
NEW_B1 = (
    "    float ff=1.18-0.18*uBHProgress;\n"
    "    px=uBHCenter.x+(px-uBHCenter.x)*ff;\n"
    "    py=uBHCenter.y+(py-uBHCenter.y)*ff;\n"
    # Organic ribbon thickness: waviness in Y creates plasma turbulence look
    "    float turb=aOrbitNoise*sin(angle*3.7+uTime*0.45+aOrbitPhase*1.3);\n"
    "    py+=turb*(aLayer<1.5?0.10:0.06)*r;\n"
)
assert OLD_B1 in src, "PATCH B1 anchor not found"
src = src.replace(OLD_B1, NEW_B1, 1)
print("B1 OK: ribbon Y-turbulence added")

# B2: replace fixed colors with temperature gradient
OLD_B2 = (
    "    vec3 c0=vec3(1.00,0.96,0.82);\n"
    "    vec3 c1=vec3(1.00,0.80,0.18);\n"
    "    vec3 c2=vec3(0.90,0.28,0.04);\n"
    "    vColor=aLayer<0.5?c0:(aLayer<1.5?c1:c2);\n"
)
NEW_B2 = (
    "    vec3 c0=vec3(1.00,0.96,0.82);\n"
    # inner ribbon: white-hot at inner edge → amber at outer edge
    "    float rN=clamp((r/uBHAccR-0.45)/1.05,0.0,1.0);\n"
    "    vec3 c1=mix(vec3(1.0,1.0,0.90),vec3(1.0,0.50,0.05),rN*rN);\n"
    # outer ribbon: orange → deep red
    "    float rO=clamp((r/uBHAccR-1.5)/3.0,0.0,1.0);\n"
    "    vec3 c2=mix(vec3(0.95,0.42,0.05),vec3(0.65,0.10,0.02),rO);\n"
    "    vColor=aLayer<0.5?c0:(aLayer<1.5?c1:c2);\n"
)
assert OLD_B2 in src, "PATCH B2 anchor not found"
src = src.replace(OLD_B2, NEW_B2, 1)
print("B2 OK: temperature gradient color (white-hot→amber→orange→red)")

# B3: boost inner ribbon point sizes slightly
OLD_B3 = "    ps=aLayer<0.5?(4.5+aBrightness*4.5):(aLayer<1.5?(16.0+aBrightness*14.0):(8.0+aBrightness*7.0));\n"
NEW_B3 = "    ps=aLayer<0.5?(5.0+aBrightness*5.0):(aLayer<1.5?(20.0+aBrightness*16.0):(9.0+aBrightness*8.0));\n"
assert OLD_B3 in src, "PATCH B3 anchor not found"
src = src.replace(OLD_B3, NEW_B3, 1)
print("B3 OK: inner ribbon points boosted (20-36px)")

# B4: stronger Doppler asymmetry for realistic disk look
OLD_B4 = "    float doppler=0.55+0.45*cos(angle+1.1);\n"
NEW_B4 = "    float doppler=0.45+0.55*cos(angle+1.1);\n"  # more contrast: 0.45→1.0 vs 0.55→1.0 before
assert OLD_B4 in src, "PATCH B4 anchor not found"
src = src.replace(OLD_B4, NEW_B4, 1)
print("B4 OK: stronger Doppler asymmetry")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH C — accUniforms: accR default already 2.0; keep. No change needed.
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Verify ──────────────────────────────────────────────────────────────────
checks = [
    ('wide capture swirl',   'wideSwirlAmt ='),
    # wideSwirlAmt not actually used as var name - check actual string
    ('wide pull',            'wideAtt  = wStr*0.25'),
    ('capture warmth',       'capFar*capCore*wStr'),
    ('tight Z',              'exp(-nd*nd*5.0)'),
    ('ribbon turbulence',    'turb=aOrbitNoise'),
    ('temp gradient inner',  'mix(vec3(1.0,1.0,0.90)'),
    ('temp gradient outer',  'mix(vec3(0.95,0.42,0.05)'),
    ('inner pts 20px',       '20.0+aBrightness*16.0'),
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
