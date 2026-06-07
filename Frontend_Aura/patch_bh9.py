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
# PATCH A — Near-field inward pull: 0.55 → 0.80
# Makes background particles visibly deflected toward the core (gravitational lensing feel)
# ═══════════════════════════════════════════════════════════════════════════════
OLD_A = "                float attAmt   = wStr * fall * coreSupp * 0.55;\n"
NEW_A = "                float attAmt   = wStr * fall * coreSupp * 0.80;\n"
assert OLD_A in src, "PATCH A (attAmt) not found"
src = src.replace(OLD_A, NEW_A, 1)
print("A OK: near-field inward pull 0.55 → 0.80")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH B — Far-field inward pull: 0.25 → 0.45
# Wider capture zone: particles at 2–4× accR curve toward the BH (lensing arc)
# ═══════════════════════════════════════════════════════════════════════════════
OLD_B = "                float wideAtt  = wStr*0.25*wideFall;\n"
NEW_B = "                float wideAtt  = wStr*0.45*wideFall;\n"
assert OLD_B in src, "PATCH B (wideAtt) not found"
src = src.replace(OLD_B, NEW_B, 1)
print("B OK: far-field inward pull 0.25 → 0.45")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH C — Ring swirl: 3.5× → 2.5×
# Reduces pure spin at exact ring radius to leave room for the new orbital shear zone.
# Still produces strong tangential motion at ring, but orbShear (PATCH D) adds the
# broader capture-zone swirl that sells the spiral-into-disk appearance.
# ═══════════════════════════════════════════════════════════════════════════════
OLD_C = "                float swirlAmt = swirlStr*fall*swirlMod + swirlStr*ringFall*3.5;\n"
NEW_C = "                float swirlAmt = swirlStr*fall*swirlMod + swirlStr*ringFall*2.5;\n"
assert OLD_C in src, "PATCH C (swirlAmt) not found"
src = src.replace(OLD_C, NEW_C, 1)
print("C OK: ring swirl 3.5 → 2.5 (balanced by orbShear)")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH D — Orbital shear zone + rim compression (insert after wideAtt dispatch)
#
# orbShear:   Gaussian centered at 2×accR, width=1.5×accR.
#             Adds strong tangential motion in the 1.0–3.0×accR band → particles
#             visibly orbit before falling inward.  No double-counting with the
#             narrow ringFall swirl (orbFall is broad, ringFall is narrow).
#
# rimFall:    Narrow Gaussian just outside 0.92×accR (Gaussian σ≈0.28 field units).
#             Only active when dist > 0.92×accR (step gate).
#
# rimPull:    Extra inward pull at rim.  Compresses particles toward the event
#             horizon border → visual density accumulation / plasma heating at rim.
#             Also used in PATCH E for thermal glow.
# ═══════════════════════════════════════════════════════════════════════════════
OLD_D = (
    "                dispX -= radDir.x * wideAtt;\n"
    "                dispY -= radDir.y * wideAtt;\n"
)
NEW_D = (
    "                dispX -= radDir.x * wideAtt;\n"
    "                dispY -= radDir.y * wideAtt;\n"
    "                float orbCenter = accR * 2.0;\n"
    "                float orbWidth  = max(accR * 1.5, 0.001);\n"
    "                float orbDelta  = dist - orbCenter;\n"
    "                float orbFall   = exp(-(orbDelta*orbDelta)/(orbWidth*orbWidth)) * coreSupp;\n"
    "                float orbShear  = swirlStr * 0.90 * orbFall;\n"
    "                dispX += tanDir.x * orbShear;\n"
    "                dispY += tanDir.y * orbShear;\n"
    "                float rimR      = accR * 0.92;\n"
    "                float rimDelta  = dist - rimR;\n"
    "                float rimFall   = exp(-(rimDelta*rimDelta)/(accR*accR*0.04)) * step(0.0, rimDelta);\n"
    "                float rimPull   = wStr * rimFall * 0.85 * coreSupp;\n"
    "                dispX -= radDir.x * rimPull;\n"
    "                dispY -= radDir.y * rimPull;\n"
)
assert OLD_D in src, "PATCH D (after wideAtt dispatch) not found"
src = src.replace(OLD_D, NEW_D, 1)
print("D OK: orbital shear zone + rim compression inserted")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH E — Disturb: rim thermal glow + progressive absorption
#
# rimFall * glowB * 0.20:
#   Matter compressed at rim heats up → local brightness spike just outside
#   the event horizon.  Connects background particles visually to the plasma disk.
#
# absorb:
#   Progressive darkening from 0.95×accR → 0.80×accR.  Particles dim smoothly
#   before the coreDisk masks them → "absorption" rather than abrupt clipping.
#   smoothstep(a, b, x) is only valid when a < b — verified: 0.80 < 0.95.
# ═══════════════════════════════════════════════════════════════════════════════
OLD_E = (
    "                disturb += capFar*capCore*wStr*0.85;\n"
    "                disturb += ringFall*glowB*coreGlow*arcMod*0.12;\n"
    "                disturb -= (1.0-coreGlow)*coreDark*wStr*3.5;\n"
    "                disturb  = max(disturb, 0.0);\n"
)
NEW_E = (
    "                disturb += capFar*capCore*wStr*0.85;\n"
    "                disturb += ringFall*glowB*coreGlow*arcMod*0.12;\n"
    "                disturb += rimFall * glowB * 0.20;\n"
    "                disturb -= (1.0-coreGlow)*coreDark*wStr*3.5;\n"
    "                float absorb = (1.0 - smoothstep(accR*0.80, accR*0.95, dist)) * coreDark;\n"
    "                disturb -= absorb * 1.4;\n"
    "                disturb  = max(disturb, 0.0);\n"
)
assert OLD_E in src, "PATCH E (disturb section) not found"
src = src.replace(OLD_E, NEW_E, 1)
print("E OK: rim thermal glow + progressive absorption in disturb")

# ─── Verify ──────────────────────────────────────────────────────────────────
checks = [
    ('stronger attAmt',          'wStr * fall * coreSupp * 0.80'),
    ('stronger wideAtt',         'wStr*0.45*wideFall'),
    ('reduced ring spin',        'swirlStr*ringFall*2.5'),
    ('orbital shear zone',       'orbShear  = swirlStr * 0.90 * orbFall'),
    ('rim fall defined',         'rimFall   = exp(-(rimDelta*rimDelta)'),
    ('rim pull defined',         'rimPull   = wStr * rimFall * 0.85'),
    ('rim thermal glow',         'rimFall * glowB * 0.20'),
    ('progressive absorption',   '1.0 - smoothstep(accR*0.80, accR*0.95, dist)'),
]
all_ok = True
for label, frag in checks:
    ok = frag in src
    all_ok = all_ok and ok
    print(f"  [{'OK' if ok else 'FAIL'}] {label}")

if not all_ok:
    print("\nERRORS — NOT saving")
    raise SystemExit(1)

# ─── Re-encode ────────────────────────────────────────────────────────────────
encoded = gzip.compress(src.encode('utf-8'), compresslevel=9)
manifest[TARGET]['data'] = base64.b64encode(encoded).decode('ascii')
manifest[TARGET]['compressed'] = True
html = html[:ms.end()] + json.dumps(manifest, separators=(',', ':')) + html[me:]
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print(f"\nindex.html saved — {len(src)} chars")
