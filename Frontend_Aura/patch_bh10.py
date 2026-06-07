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

print(f"Bundle decoded: {len(src)} chars")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH A — ACC_VERT Doppler contrast: 0.45+0.55 → 0.70+0.30
#
# Before: range [-0.10, 1.00] — dark side goes negative (black), bright side ×∞ brighter
# After:  range [0.40, 1.00]  — dark side never fully black, ratio max 2.5×
# Prevents the disk's visual centroid from appearing far from the geometric center.
# ═══════════════════════════════════════════════════════════════════════════════
OLD_A = "    float doppler=0.45+0.55*cos(angle+1.1);\n"
NEW_A = "    float doppler=0.70+0.30*cos(angle+1.1);\n"
assert OLD_A in src, "PATCH A (ACC_VERT doppler) not found"
src = src.replace(OLD_A, NEW_A, 1)
print("A OK: ACC_VERT Doppler 0.45+0.55 → 0.70+0.30 (ratio ∞ → 2.5×)")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH B — FB_VERT Doppler contrast: 0.38+0.62 → 0.65+0.35
#
# Before: range [-0.24, 1.00] — front band dark side completely black (most extreme)
# After:  range [0.30, 1.00]  — dark side dim but present, ratio 3.3×
# frontBandMesh renders IN FRONT of the core so its Doppler dominates visual perception.
# This is the most impactful fix for the perceived center offset.
# ═══════════════════════════════════════════════════════════════════════════════
OLD_B = "  float doppler=0.38+0.62*cos(angle+1.1);\n"
NEW_B = "  float doppler=0.65+0.35*cos(angle+1.1);\n"
assert OLD_B in src, "PATCH B (FB_VERT doppler) not found"
src = src.replace(OLD_B, NEW_B, 1)
print("B OK: FB_VERT Doppler 0.38+0.62 → 0.65+0.35 (ratio ∞ → 3.3×)")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH C — BG shader arcMod: reduce amplitude + slow rotation
#
# Before: 0.65 + 0.35×cos(...×uTime*0.35) — range [0.30, 1.00], ratio 3.3×, rotates fast
# After:  0.80 + 0.20×cos(...×uTime*0.18) — range [0.60, 1.00], ratio 1.67×, slower
#
# arcMod creates dual rotating bright lobes in the background glow.
# Reducing amplitude prevents these lobes from shifting the visual centroid.
# Halving rotation speed reduces the distracting "spinning brightness" effect.
# ═══════════════════════════════════════════════════════════════════════════════
OLD_C = "                float arcMod   = 0.65 + 0.35*cos(bhAngle*2.0 + uTime*0.35);\n"
NEW_C = "                float arcMod   = 0.80 + 0.20*cos(bhAngle*2.0 + uTime*0.18);\n"
assert OLD_C in src, "PATCH C (arcMod) not found"
src = src.replace(OLD_C, NEW_C, 1)
print("C OK: arcMod 0.65+0.35 → 0.80+0.20, rotation ×0.35→×0.18")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH D — BG fragment shader: warm tint for captured matter
#
# Adds a warm color blend (amber-gold) proportional to vDisturb.
# vDisturb is highest near the BH (capture warmth + rim glow contributions).
# Effect: background particles shift from cool green → warm gold as they approach
# the disk zone, creating visual continuity:
#   AuraFieldBg green → captured matter amber → plasma orange (accMesh)
#
# Blend weight max 0.35 — subtle, preserves the green identity of the background.
# Target color vec3(0.92, 0.70, 0.18) = warm amber, midpoint between lime and orange.
# ═══════════════════════════════════════════════════════════════════════════════
OLD_D = "col = mix(col, vec3(0.86,1.0,0.62), clamp(vLine + vDisturb, 0.0, 1.0));"
NEW_D = ("col = mix(col, vec3(0.86,1.0,0.62), clamp(vLine + vDisturb, 0.0, 1.0));\n"
         "col = mix(col, vec3(0.92,0.70,0.18), clamp(vDisturb*1.2, 0.0, 1.0)*0.35);")
assert OLD_D in src, "PATCH D (warm tint) not found"
src = src.replace(OLD_D, NEW_D, 1)
print("D OK: warm tint added (green→amber near BH, max 35% blend)")

# ═══════════════════════════════════════════════════════════════════════════════
# PATCH E — Background displacement cap: 1.2 → 1.5 field units
#
# All bh9 forces (orbShear, rimPull, attAmt×0.80, wideAtt×0.45) were hitting the
# 1.2 field unit ceiling and being wasted.
# Moving to 1.5 allows 25% more displacement — orbital shear and rim compression
# become visible without risking wild artifacts.
# Conservative step: will move to 1.8 after visual review.
# ═══════════════════════════════════════════════════════════════════════════════
OLD_E = "if(dLen > 1.2){ float sc=1.2/max(dLen,0.001); dispX*=sc; dispY*=sc; }"
NEW_E = "if(dLen > 1.5){ float sc=1.5/max(dLen,0.001); dispX*=sc; dispY*=sc; }"
assert OLD_E in src, "PATCH E (displacement cap) not found"
src = src.replace(OLD_E, NEW_E, 1)
print("E OK: displacement cap 1.2 → 1.5 field units")

# ─── Verify ──────────────────────────────────────────────────────────────────
checks = [
    ('ACC doppler 0.70+0.30',  '0.70+0.30*cos(angle+1.1)'),
    ('FB doppler 0.65+0.35',   '0.65+0.35*cos(angle+1.1)'),
    ('arcMod reduced',         '0.80 + 0.20*cos(bhAngle*2.0 + uTime*0.18)'),
    ('warm tint in frag',      'vec3(0.92,0.70,0.18)'),
    ('cap raised to 1.5',      'if(dLen > 1.5){ float sc=1.5/max(dLen,0.001)'),
    # Ensure old values gone
    ('old doppler ACC gone',   '0.45+0.55*cos(angle+1.1)'),
    ('old doppler FB gone',    '0.38+0.62*cos(angle+1.1)'),
    ('old arcMod gone',        '0.65 + 0.35*cos(bhAngle'),
    ('old cap gone',           'if(dLen > 1.2)'),
]
all_ok = True
for label, frag in checks:
    if label.startswith('old'):
        ok = frag not in src
        status = 'GONE' if ok else 'STILL PRESENT (FAIL)'
    else:
        ok = frag in src
        status = 'OK' if ok else 'FAIL'
    all_ok = all_ok and ok
    print(f"  [{status}] {label}")

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
