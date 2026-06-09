"""
bh36 — spacetime tear/rupture on BH formation

Visual narrative:
  1. Pre-crack (prog 0.20):  weak ripple — fabric first straining
  2. Pre-crack (prog 0.30):  stronger ripple — straining harder
  3. SNAP (prog 0.38):       5 burst ripples + uTear=1.0 spike
       - 5 radial crack-lines scatter backgroundPoints outward
       - Bright cream-white flash along crack lines
       - Omnidirectional scatter bubble
  4. Decay (prog 0.38→1.0):  uTear decays ~0.028/frame (~0.5s),
       BH settles, accretion disk forms normally

Changes to the bundle (backgroundPoints shader + API):
  PATCH A — Add uTear uniform to ShaderMaterial uniforms
  PATCH B — Add uniform float uTear to vertex shader declaration
  PATCH C — Add tear displacement/crack code in vertex shader
  PATCH D — Add uTear to fragment shader + white flash effect
  PATCH E — Add setTear(val) to API

Changes to hero-distort.js are done separately (see main edit).
"""
import re, json, base64, gzip

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

ms = re.search(r'<script type="__bundler/manifest">', html)
me = html.find('</script>', ms.end())
manifest = json.loads(html[ms.end():me])
TARGET = '5925d42c-8ddf-483c-bd2a-cfb5ee06edda'
entry = manifest[TARGET]
data = base64.b64decode(entry['data'])
if entry.get('compressed'):
    data = gzip.decompress(data)
src = data.decode('utf-8')
print(f'Bundle decoded: {len(src)} chars')

# ============================================================================
# PATCH A — Add uTear uniform to ShaderMaterial uniforms object
# ============================================================================
OLD_UNIF = (
    'uWellsB:{value:[new T.Vector4(0,0,0,0), new T.Vector4(0,0,0,0), '
    'new T.Vector4(0,0,0,0)]} },'
)
NEW_UNIF = (
    'uWellsB:{value:[new T.Vector4(0,0,0,0), new T.Vector4(0,0,0,0), '
    'new T.Vector4(0,0,0,0)]}, uTear:{value:0} },'
)
assert OLD_UNIF in src, 'PATCH A anchor not found'
src = src.replace(OLD_UNIF, NEW_UNIF, 1)
print('OK A: uTear uniform added')

# ============================================================================
# PATCH B — Add uniform float uTear to vertex shader declaration
# ============================================================================
OLD_DECL = (
    'uniform vec4 uWells[3]; uniform vec4 uWellsA[3]; uniform vec4 uWellsB[3];\n'
    '        varying float vH; varying float vLine; varying float vDisturb;'
)
NEW_DECL = (
    'uniform vec4 uWells[3]; uniform vec4 uWellsA[3]; uniform vec4 uWellsB[3]; uniform float uTear;\n'
    '        varying float vH; varying float vLine; varying float vDisturb;'
)
assert OLD_DECL in src, 'PATCH B anchor not found'
src = src.replace(OLD_DECL, NEW_DECL, 1)
print('OK B: uTear declared in vertex shader')

# ============================================================================
# PATCH C — Tear displacement in vertex shader (after Schwarzschild line)
# ============================================================================
OLD_SCHW = 'z -= wStr*0.55/max(dist+accR, 0.3);\n              } else {'
NEW_SCHW = (
    'z -= wStr*0.55/max(dist+accR, 0.3);\n'
    '                // TEAR: spacetime rupture — radial crack burst on BH formation\n'
    '                if(uTear>0.001){\n'
    '                    float crackA=pow(max(0.0,cos(bhAngle*5.0+seed*6.2832)),4.0);\n'
    '                    float tearZone=exp(-dist/(accR*2.5));\n'
    '                    float burstCrack=uTear*crackA*tearZone*6.0;\n'
    '                    float burstOmni=uTear*tearZone*2.8;\n'
    '                    dispX+=radDir.x*(burstCrack+burstOmni);\n'
    '                    dispY+=radDir.y*(burstCrack+burstOmni);\n'
    '                    disturb+=burstCrack*2.8;\n'
    '                    disturb-=(1.0-crackA)*tearZone*uTear*1.5;\n'
    '                }\n'
    '              } else {'
)
assert OLD_SCHW in src, 'PATCH C anchor not found'
src = src.replace(OLD_SCHW, NEW_SCHW, 1)
print('OK C: tear displacement code inserted')

# ============================================================================
# PATCH D — Fragment shader: uTear uniform + white crack flash + alpha boost
# ============================================================================
OLD_FRAG_UNIF = 'uniform float uAlpha, uEnergy;'
NEW_FRAG_UNIF = 'uniform float uAlpha, uEnergy, uTear;'
assert OLD_FRAG_UNIF in src, 'PATCH D-a anchor not found'
src = src.replace(OLD_FRAG_UNIF, NEW_FRAG_UNIF, 1)

OLD_FRAG_COL = (
    'col = mix(col, vec3(0.92,0.70,0.18), clamp(vDisturb*1.2, 0.0, 1.0)*0.35);\n'
    '          float aa'
)
NEW_FRAG_COL = (
    'col = mix(col, vec3(0.92,0.70,0.18), clamp(vDisturb*1.2, 0.0, 1.0)*0.35);\n'
    '          float tearFlash=clamp(vDisturb*uTear,0.0,1.0);\n'
    '          col=mix(col,vec3(1.0,0.95,0.85),tearFlash*0.85);\n'
    '          float aa'
)
assert OLD_FRAG_COL in src, 'PATCH D-b anchor not found'
src = src.replace(OLD_FRAG_COL, NEW_FRAG_COL, 1)

OLD_AA = 'float aa = a * ((0.5 + crest*0.9) + vLine*1.3 + vDisturb*1.6) * uAlpha'
NEW_AA = 'float aa = a * ((0.5 + crest*0.9) + vLine*1.3 + vDisturb*(1.6+uTear*2.5)) * uAlpha'
assert OLD_AA in src, 'PATCH D-c anchor not found'
src = src.replace(OLD_AA, NEW_AA, 1)
print('OK D: fragment shader updated with uTear + crack flash')

# ============================================================================
# PATCH E — Add setTear(val) to API (before addRipple)
# ============================================================================
OLD_RIPPLE = '      addRipple(fx, fy, amp) {'
NEW_RIPPLE = (
    '      setTear(val) { mat.uniforms.uTear.value = val || 0; },\n'
    '      addRipple(fx, fy, amp) {'
)
assert OLD_RIPPLE in src, 'PATCH E anchor not found'
src = src.replace(OLD_RIPPLE, NEW_RIPPLE, 1)
print('OK E: setTear() API method added')

# ── Verify ──────────────────────────────────────────────────────────────────
checks = [
    ('uTear uniform',       'uTear:{value:0}'),
    ('uTear vert decl',     'uniform float uTear;'),
    ('tear block',          'if(uTear>0.001){'),
    ('crackA rays',         'float crackA=pow(max(0.0,cos(bhAngle*5.0+seed*6.2832)),4.0);'),
    ('burstCrack',          'float burstCrack=uTear*crackA*tearZone*6.0;'),
    ('dispX tear',          'dispX+=radDir.x*(burstCrack+burstOmni);'),
    ('frag uTear decl',     'uniform float uAlpha, uEnergy, uTear;'),
    ('tearFlash',           'float tearFlash=clamp(vDisturb*uTear,0.0,1.0);'),
    ('white crack flash',   'col=mix(col,vec3(1.0,0.95,0.85),tearFlash*0.85);'),
    ('aa boost',            'vDisturb*(1.6+uTear*2.5)'),
    ('setTear api',         'setTear(val) { mat.uniforms.uTear.value = val || 0; },'),
    # regression guards
    ('uWellsB intact',      'uWellsB:{value:[new T.Vector4(0,0,0,0)'),
    ('addRipple intact',    'addRipple(fx, fy, amp) {'),
    ('toField intact',      'toField(clientX, clientY) {'),
    ('rimMesh ro 1',        'rimMesh.renderOrder=1;'),
    ('accMesh uniforms',    'uniforms:accUniforms,'),
]
all_ok = True
for label, frag in checks:
    ok = frag in src
    tag = 'OK' if ok else 'FAIL'
    print(f'  [{tag}] {label}')
    all_ok = all_ok and ok

if not all_ok:
    print('\nERRORS — NOT saving')
    raise SystemExit(1)

encoded = gzip.compress(src.encode('utf-8'), compresslevel=9)
manifest[TARGET]['data'] = base64.b64encode(encoded).decode('ascii')
manifest[TARGET]['compressed'] = True
html = html[:ms.end()] + json.dumps(manifest, separators=(',', ':')) + html[me:]
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print(f'\nindex.html saved — {len(src)} chars')
