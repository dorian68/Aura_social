# Black Hole Rendering System Map

> Audit produced after bh8 + bh9. No code was changed to produce this document.
> All values are from the live bundle (UUID `5925d42c-8ddf-483c-bd2a-cfb5ee06edda` in `Frontend_Aura/index.html`) and `Frontend_Aura/js/hero-distort.js`.

---

## 1. Component Inventory

### 1.1 backgroundPoints

| Field | Value |
|---|---|
| Name | backgroundPoints (internally `grid`) |
| Type | `THREE.Points` |
| Material | Custom `THREE.ShaderMaterial` (BG_VERT + BG_FRAG) |
| File | Inline in gzip bundle |
| renderOrder | 0 (default — drawn first) |
| Coordinate space | Field units = Three.js world units |
| Canvas | Single WebGL canvas (`renderer.domElement`) |
| Visible when | Always (alpha driven by `uAlpha`, `uEnergy`) |
| Controlled by | `mat.uniforms.uTime`, `uWells[]`, `uWellsA[]`, `uWellsB[]` |
| Purpose | Spacetime fabric — the "green mesh" background |
| Center dependency | `uWells[0].xy` for BH gravity (field units) |
| Particle positions | Fixed noise grid `aXY` — particles DO NOT simulate, they are **displaced** from fixed positions |
| Max displacement | **HARDCODED at 1.2 field units** in BG_VERT before `gl_Position` |

### 1.2 accMesh

| Field | Value |
|---|---|
| Name | accMesh |
| Type | `THREE.Points` |
| Material | Custom `THREE.ShaderMaterial` (ACC_VERT + ACC_FRAG) |
| File | Inline in gzip bundle, built by `buildAcc()` |
| renderOrder | **1** (drawn after background, before coreDisk) |
| Coordinate space | Field units (same as background) |
| Canvas | Same WebGL canvas |
| Visible when | `prog > 0.05` (added/removed from scene) |
| Controlled by | `accUniforms` — `uTime`, `uBHProgress`, `uBHCenter`, `uBHAccR` |
| Purpose | Orbital accretion disk — the glow visible BEHIND the core |
| Center dependency | `uBHCenter` (field units) |

**Layer breakdown (post bh6+bh7+bh8):**

| Layer | aLayer | Count | r range (× accR) | incl | Speed | Role |
|---|---|---|---|---|---|---|
| Photon ring | 0 | 14% of n | 0.90 – 1.10 | 0.45 | 1.05–1.35 | Bright arc around core |
| Inner ribbon | 1 | 43% of n | **0.88 – 1.50** | 0.07 | 0.33–0.55 | Hot yellow band |
| Outer ribbon | 2 | 29% of n | 1.5 – 4.5 | 0.04 | 0.08–0.16 | Orange-red halo |
| Inflow | 3 | 14% of n | 1.8 – 5.3 | ~0 | 0.06–0.16 | Spiraling infall |

Desktop n = 2000. Mobile n = 400. Tablet n = 900.

### 1.3 coreDisk

| Field | Value |
|---|---|
| Name | coreDisk |
| Type | `THREE.Mesh` with `THREE.CircleGeometry(1.0, 64)` |
| Material | `THREE.MeshBasicMaterial({ color:0x000000, transparent:true, depthTest:false, depthWrite:false })` |
| File | Inline in gzip bundle |
| renderOrder | **2** (drawn after accMesh, before frontBandMesh) |
| Coordinate space | Field units (world units) |
| Canvas | Same WebGL canvas |
| Visible when | `prog > 0.05` (opacity driven by `Math.min(1.0, prog*1.8)`) |
| Purpose | Fully opaque black event horizon mask — blocks everything at renderOrder<2 |
| Center dependency | `coreDisk.position.set(cx, cy, 0.01)` — field units, same source as `uBHCenter` |
| Radius | `0.85 × accR` (scale applied via `coreDisk.scale.set(cr, cr, 1)`) |
| Z offset | `+0.01` (negligible perspective effect at camera distance 11) |

### 1.4 frontBandMesh

| Field | Value |
|---|---|
| Name | frontBandMesh |
| Type | `THREE.Points` |
| Material | Custom `THREE.ShaderMaterial` (FB_VERT + ACC_FRAG) |
| File | Inline in gzip bundle, built inside `buildAcc()` |
| renderOrder | **3** (drawn LAST — appears in front of coreDisk) |
| Coordinate space | Field units |
| Canvas | Same WebGL canvas |
| Visible when | `prog > 0.05` |
| Purpose | Equatorial plasma band crossing in front of the black core |
| Center dependency | `uBHCenter` (same uniform as accMesh) |
| Particle count | 35% of n ≈ 700 on desktop |
| r range | 0.85 – 2.50 × accR |
| incl | 0.03 (nearly flat — appears as horizontal line) |

---

## 2. Render Order Stack

```
Frame rendering order:
┌─────────────────────────────────────────────────────────────┐
│ renderOrder 0  backgroundPoints   (field grid, additive-ish)│
│ renderOrder 1  accMesh            (orbital disk, BEHIND core)│
│ renderOrder 2  coreDisk           (black mask, opacity=1.0) │
│ renderOrder 3  frontBandMesh      (plasma, IN FRONT of core) │
└─────────────────────────────────────────────────────────────┘
```

All objects have `depthTest:false`, so render order is purely by `renderOrder` value — no Z-fighting.

**What the coreDisk masks:** everything at renderOrder 0 and 1 (background + accMesh).  
**What passes through the coreDisk mask:** frontBandMesh (renderOrder 3), because it renders after the mask.

---

## 3. Coordinate Centers

### 3.1 The `toPlane()` function (exact source)

```javascript
const VISH = 11 * Math.tan((50 * Math.PI / 180) / 2);  // ≈ 5.129 field units

function toPlane(clientX, clientY) {
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;
  const ndcx = clientX / w * 2 - 1;        // [-1, +1], left→right
  const ndcy = -(clientY / h * 2 - 1);     // [-1, +1], bottom→top (Y FLIPPED)
  const halfH = VISH;                       // 5.129
  const halfW = VISH * (w / h);            // aspect-corrected
  return [ndcx * halfW, ndcy * halfH];
}
```

`toField(px, py)` simply wraps this: `return { x, y } = toPlane(px, py)`.

### 3.2 Camera projection — matches toPlane exactly

```javascript
const camera = new T.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 0, 11);
// On resize: camera.aspect = w/h; camera.updateProjectionMatrix();
```

At z=0 (the particle plane):
- Visible half-height = `11 × tan(25°)` = **VISH ≈ 5.129 field units**
- Visible half-width = `VISH × (w/h)` — matches `toPlane` exactly

**The `toPlane()` formula is the exact inverse of the camera projection onto z=0.** No discrepancy.

### 3.3 BH position in field units

For a 1920×1080 viewport with `xFrac=0.74, yFrac=0.46`:

```
clientX = 0.74 × 1920 = 1421
clientY = 0.46 × 1080 = 497

ndcx = 1421/1920 × 2 − 1 = +0.480
ndcy = −(497/1080 × 2 − 1) = +0.080

halfW = 5.129 × (1920/1080) = 9.119

fc.x = 0.480 × 9.119 ≈ +4.38 field units   (right of center)
fc.y = 0.080 × 5.129 ≈ +0.41 field units   (slightly above center)
```

The BH is positioned 4.38 field units to the right and 0.41 field units above the scene origin.

### 3.4 Center alignment table

| Component | Center variable | Value | Coordinate space | Source |
|---|---|---|---|---|
| backgroundPoints gravity | `uWells[0].xy` | `(fc.x, fc.y)` | Field units | `setWell(0, fc.x, fc.y, ...)` |
| accMesh orbit | `uBHCenter` | `(fc.x, fc.y)` | Field units | `uBHCenter.value.set(cx, cy)` |
| frontBandMesh orbit | `uBHCenter` (shared) | `(fc.x, fc.y)` | Field units | Same uniform |
| coreDisk visual | `coreDisk.position` | `(fc.x, fc.y, 0.01)` | Field units | `coreDisk.position.set(cx, cy, 0.01)` |
| DOM trigger | `[data-fx="well"]` | `xFrac=0.74, yFrac=0.46` | Viewport fraction | hero-distort.js INFLUENCERS |

**All four components receive `fc.x, fc.y` from the same single `toField(cx, cy)` call inside `applyBHProgress()`.** The data-level center is already a single source of truth.

### 3.5 Are all layers using the exact same center?

**YES — at the data level.** No misalignment in the coordinate math.

However, **visual misalignment is real** — see Section 9.

---

## 4. Coordinate System Flow

```
hero-distort.js: scroll/intersection triggers applyBHProgress(prog)
         │
         ├─ cx = BH_INF.xFrac × window.innerWidth        (viewport pixels)
         ├─ cy = BH_INF.yFrac × window.innerHeight        (viewport pixels)
         │
         ├─ fc = a.toField(cx, cy)                        (field units)
         │       = toPlane(cx, cy)
         │       = [ndcx × VISH×(W/H),  ndcy × VISH]
         │       where VISH = 11 × tan(25°) ≈ 5.129
         │
         ├─ a.setWell(0, fc.x, fc.y, str, rad)
         │       → uWells[0].set(fc.x, fc.y, str, rad)    (background gravity center)
         │
         └─ a.setBHProgress(sstep(0.20,0.80,prog), fc.x, fc.y, accR=2.0)
                 → uBHCenter.set(fc.x, fc.y)               (accMesh/frontBand orbit center)
                 → coreDisk.position.set(fc.x, fc.y, 0.01) (visual core center)
                 → coreDisk.scale.set(0.85×accR, 0.85×accR, 1)
```

**`setWellExtra` also called with:** `swirlStr=4.8, accR=2.0, accT=0.16, glowBoost=5.0, ringPull=3.5, maxDisp=2.2, coreDark=1.8`

These flow into `uWellsA[0]` and `uWellsB[0]` and are read in the BG_VERT shader.

**Field units = Three.js world units.** The `aXY` attribute of backgroundPoints and the `px,py` computed in ACC_VERT and FB_VERT are all in the same space — no coordinate transform needed.

---

## 5. Radii and Physical Zones

All values in field units. `accR = 2.0` field units.

| Zone name | Radius (field units) | Radius (× accR) | Used by | Visual meaning |
|---|---|---|---|---|
| Core suppression inner | 0 – 0.70 | 0 – 0.35 | BG shader `coreSupp` | No inward pull at exact center |
| Progressive absorption | 1.60 – 1.90 | 0.80 – 0.95 | BG shader `absorb` | Particles dim before hitting mask |
| **coreDisk visual** | **0 – 1.70** | **0 – 0.85** | coreDisk geometry | Fully opaque black circle |
| rimR compression | ~1.84 (center) | ~0.92 | BG shader `rimFall` | Extra inward pull + thermal glow |
| Photon ring (L0) | 1.80 – 2.20 | 0.90 – 1.10 | accMesh L0 | Bright arc around core edge |
| **Inner ribbon** (L1) | **1.76 – 3.00** | **0.88 – 1.50** | accMesh L1 | Hot yellow band (starts just outside mask) |
| accretion ring center | 2.00 | 1.00 | BG `ringFall` (accT=0.16) | Density / swirl peak for background |
| frontBand inner | 1.70 | 0.85 | frontBandMesh | Starts at core edge |
| frontBand outer | 5.00 | 2.50 | frontBandMesh | Outer edge |
| Outer ribbon (L2) | 3.00 – 9.00 | 1.5 – 4.5 | accMesh L2 | Orange-red halo |
| Orbital shear zone | 1.00 – 7.00 | 0.5 – 3.5 | BG `orbShear` | Tangential boost in mid-field |
| Inflow (L3) | 3.60 – 10.6 | 1.8 – 5.3 | accMesh L3 | Spiraling matter |
| Capture zone | 0 – 8.00 | 0 – 4.0 | BG `wideAtt`+`wideFall` | Far-field inward pull |
| BH well radius | ~20 field units | ~10 | BG `wRad` from `radPx=380` | Gaussian fall-off of all BH forces |

**Does the visual black core radius match the event horizon radius used in particle physics?**

**PARTIAL MISMATCH:**
- Visual coreDisk edge: `0.85 × accR = 1.70 field units`
- BG shader core suppression starts at: `0.35 × accR = 0.70` (much smaller)
- BG shader `coreGlow` ramps from 0 to 1 over `0 → 0.55×accR = 1.10`
- BG shader `absorb` zone: `0.80–0.95 × accR = 1.60–1.90` (straddles the visual edge)
- rimR compression: `0.92 × accR = 1.84` (just OUTSIDE the visual edge)
- Photon ring L0 starts at `0.90 × accR = 1.80` (just OUTSIDE the visual edge)

The `absorb` progressive darkening zone (1.60–1.90) correctly straddles the visual core edge (1.70), which is intentional — particles dim before hitting the mask. ✓  
The `rimR` and photon ring both start just outside the core edge. ✓

---

## 6. AuraFieldBg Particle Physics

### 6.1 Fundamental Architecture Constraint

> **Critical:** The background particle system is a **displacement field**, not a particle simulation.

Each background particle has a **fixed base position** `(x, y)` from the `aXY` attribute (a noise-based grid baked at startup). Every frame, the vertex shader computes `(dispX, dispY)` based on the current well forces, then positions the particle at `(x + dispX, y + dispY)`.

Particles do NOT have velocity, momentum, or history. They return to their base positions if all forces are removed. The "flow" the viewer sees is the PATTERN of the displacement field, not actual particle trajectories.

**Consequence:** no matter how strong the gravitational forces are, background particles cannot truly "orbit" — they oscillate around their base positions within a maximum radius of **1.2 field units** (hardcoded clamp in BG_VERT).

### 6.2 Force-by-Zone (current state after bh9)

```
Zone                  dist range (field)   Forces applied
──────────────────────────────────────────────────────────────────────────
Far capture           4 – 20 units         wideAtt × 0.45: inward pull
                                           wideSwirl × 0.30: tangential twist
                                           orbShear: moderate tangential

Orbital shear         1 – 7 units          orbShear (Gaussian, center=4.0):
                                           extra tangential, makes particles
                                           appear to orbit in capture zone

Main well zone        0 – 6 units          attAmt × 0.80: strong inward
(Gaussian, σ≈20)                           swirlAmt: broad tangential + ring boost

Ring accumulation     dist ≈ 2.0 ± 0.16   ringFall: pushes toward ring from both sides
(accT=0.16)                               ringFall × 2.5 × swirlStr: strong swirl at ring

Rim compression       dist ≈ 1.84+         rimFall: extra inward pull (Gaussian, σ≈0.28)
(outside rimR=0.92×accR)                  rimPull × 0.85: compresses particles to rim

Progressive absorb    1.60 – 1.90          absorb: extra brightness subtraction
                                           (1−smoothstep(0.80,0.95,dist)×coreDark×1.4)

Core mask             0 – 1.70             coreDisk covers all — particles behind mask
                                           are invisible regardless of displacement
```

### 6.3 Individual Force Breakdown

| Force | Formula | Changes XY? | Changes Z? | Changes brightness? | Centered on BH? |
|---|---|---|---|---|---|
| near-field pull | `attAmt = wStr×fall×coreSupp×0.80` | YES (radial in) | NO | NO | YES `wc=uWells[0].xy` |
| ring pull | `rpAmt = ringPull×ringFall×fall` | YES (toward ring) | NO | NO | YES |
| ring swirl | `swirlStr×ringFall×2.5` | YES (tangential) | NO | NO | YES |
| broad swirl | `swirlStr×fall×swirlMod` | YES (tangential) | NO | NO | YES |
| wide pull | `wStr×0.45×wideFall` | YES (radial in) | NO | NO | YES |
| wide swirl | `swirlStr×0.30×wideFall` | YES (tangential) | NO | NO | YES |
| orbital shear | `swirlStr×0.90×orbFall` | YES (tangential) | NO | NO | YES |
| rim compression | `wStr×rimFall×0.85×coreSupp` | YES (radial in) | NO | NO | YES |
| capture warmth | `capFar×capCore×wStr×0.85` | NO | NO | YES (`+disturb`) | YES |
| ring glow | `ringFall×glowB×coreGlow×arcMod×0.12` | NO | NO | YES (`+disturb`) | YES |
| rim thermal | `rimFall×glowB×0.20` | NO | NO | YES (`+disturb`) | YES |
| core darkening | `(1−coreGlow)×coreDark×wStr×3.5` | NO | NO | YES (`−disturb`) | YES |
| progressive absorb | `(1−smoothstep(0.80,0.95,dist))×coreDark×1.4` | NO | NO | YES (`−disturb`) | YES |
| Z depression | `wStr×exp(−nd²×5.0)×3.5` | NO | YES (in) | NO | YES |

**All forces are centered on `uWells[0].xy` = `wc = vec2(x,y) − delta`.  
`delta = vec2(x,y) − wc` where `wc = uWells[0].xy`.** ✓

### 6.4 Current weaknesses

| Weakness | Cause | Impact |
|---|---|---|
| Displacement cap 1.2 | Hardcoded `if(dLen > 1.2)` | Even with bh9 forces, particles can't move more than 1.2 field units from base. Strong forces are wasted. |
| No particle history | Displacement field architecture | Particles cannot accumulate orbital momentum — they snap back on well removal |
| swirlMod time noise | `0.7 + 0.3×sin(uTime×1.5 + ...)` | Creates an asymmetric, pulsating distortion that shifts the visual center-of-mass over time |
| arcMod 2-lobe | `0.65 + 0.35×cos(bhAngle×2.0 + uTime×0.35)` | Creates rotating dual bright spots in background that shift visual centroid |

---

## 7. Accretion Disk System

### 7.1 Component roles

| Component | Points or mesh? | Behind or in front of core? | Same center? | Same radius scale? |
|---|---|---|---|---|
| Photon ring (L0) | Points (4-10px) | BEHIND (renderOrder=1) | YES — uBHCenter | YES — uBHAccR |
| Inner ribbon (L1) | Points (20-36px, large) | BEHIND (renderOrder=1) | YES | YES |
| Outer ribbon (L2) | Points (9-17px) | BEHIND (renderOrder=1) | YES | YES |
| Inflow (L3) | Points (2-5px, tiny) | BEHIND (renderOrder=1) | YES | YES |
| frontBandMesh | Points (14-46px, large) | IN FRONT (renderOrder=3) | YES | YES |

All disk components are **discrete particles rendered as gl_Points**, not continuous ribbon geometry. The "continuous plasma" appearance depends on particles being large enough to overlap.

### 7.2 Disk formation factor `ff`

Both ACC_VERT and FB_VERT apply:
```glsl
float ff = 1.18 - 0.18 * uBHProgress;  // 1.18 at prog=0, 1.0 at prog=1
px = uBHCenter.x + (px - uBHCenter.x) * ff;
py = uBHCenter.y + (py - uBHCenter.y) * ff;
```

At full activation (prog=1.0): ff=1.0 — particles at exact calculated radius.  
During formation (prog=0.0): ff=1.18 — particles 18% further out, contracting inward as the BH forms.

This is cosmetic (disk formation animation). **It is consistent between accMesh and frontBandMesh** since both share the same formula and `uBHProgress` uniform.

### 7.3 The disk is not one coherent phenomenon

The disk consists of:
1. **accMesh** (renderOrder=1): 4 overlapping particle layers orbiting at different inclinations — produces the glow visible BEHIND and AROUND the core
2. **frontBandMesh** (renderOrder=3): a separate flat orbit that appears to pass IN FRONT of the core

These are visually unified by sharing `uBHCenter` and `uBHAccR`, but they are separate `THREE.Points` objects with separate materials. The "continuity" between them is a visual impression, not shared geometry.

---

## 8. Event Horizon / Core Mask

### How it is drawn

`coreDisk` = `THREE.Mesh` with `CircleGeometry(1.0, 64)`:
- Model space: unit circle (radius 1)
- World space: scaled to `0.85 × accR = 1.70` field units radius via `scale.set(0.85×accR, 0.85×accR, 1)`
- Position: `(fc.x, fc.y, 0.01)` — same field coordinates as all other centers
- Material: `MeshBasicMaterial({ color:0x000000, transparent:true, opacity:1.0 (at full prog) })`
- `depthTest: false, depthWrite: false`
- `renderOrder: 2`

### Does it truly mask everything?

YES for renderOrder ≤ 1 (backgroundPoints + accMesh). Because it renders last among those layers with `depthTest:false`.

**NOT for frontBandMesh** (renderOrder=3) — this is intentional by design. frontBandMesh renders after coreDisk and is meant to be visible in front of it.

### What has the right to pass in front of the core

Only `frontBandMesh` (renderOrder=3). This is the architectural definition of the "front band."

The logical split:
```
BEHIND  (renderOrder ≤ 1): photon ring, inner/outer ribbon, inflow, background grid
MASK    (renderOrder = 2): coreDisk — black, opaque, event horizon visual
IN FRONT (renderOrder = 3): frontBandMesh — equatorial plasma band crossing the face
```

### Radius alignment

| Layer | Inner edge (× accR) | Outer edge | Core edge |
|---|---|---|---|
| coreDisk mask | — | **0.85** | **← this** |
| rimR compression | 0.92 (outside) | ~1.20 | outside core ✓ |
| Photon ring (L0) | **0.90** | 1.10 | outside core ✓ |
| Inner ribbon (L1) | **0.88** | 1.50 | outside core ✓ |
| frontBandMesh | **0.85** | 2.50 | at core edge |

The inner ribbon and photon ring both start just outside the core mask (0.88 and 0.90 vs 0.85). There is a small gap of **0.03–0.05 × accR** (≈ 6–10px at typical screen sizes) between the core mask edge and the nearest accretion particles. This is intentional to prevent particles from leaking inside.

---

## 9. Suspected Center Misalignment — Analysis

### Verdict: Data misalignment = NONE

After tracing every center from source to shader:
- All components receive `fc.x, fc.y` from the **same `toField()` call** in `applyBHProgress()`
- `toPlane()` uses the exact camera parameters (z=11, FOV=50°) — no inverse projection error
- Y-axis flip is correct (`ndcy = -(clientY/h × 2 − 1)`)
- Aspect ratio is consistent between `toPlane` and the camera

### Verdict: Visual misalignment = REAL, but from optics not math

The perceived "center offset" between the black core and the gravitational distortion pattern has several causes:

**Cause 1: Doppler asymmetry (strongest)**

ACC_VERT: `doppler = 0.45 + 0.55×cos(angle + 1.1)` → bright side is **2.2× brighter** than dark side  
FB_VERT: `doppler = 0.38 + 0.62×cos(angle + 1.1)` → bright side is **2.6× brighter** than dark side

The `+1.1` phase means the brightest point of the disk is at angle ≈ −63° (upper-left or lower-right depending on convention). The dark side at angle ≈ 117° is nearly invisible. This creates an asymmetric disk where the visual centroid of brightness is significantly off from the geometric center.

The frontBandMesh (renderOrder=3, in front of core) has the most extreme Doppler ratio (2.6×). Because it renders in front of the black circle, the eye naturally focuses on it — pulling the perceived "center" of the whole effect toward the bright side.

**Cause 2: Rotating background brightness (arcMod)**

`arcMod = 0.65 + 0.35×cos(bhAngle×2.0 + uTime×0.35)` creates a **rotating 2-lobe brightness pattern** in the background. As time passes, this lobe rotates, periodically shifting the visual centroid of the background distortion.

**Cause 3: swirlMod time noise**

`swirlMod = 0.7 + 0.3×sin(uTime×1.5 + dist×0.8 + seed×6.2832)` creates per-particle swirl oscillation. This makes the background distortion pattern pulse asymmetrically, and at any given moment, one arc is brighter/denser than the other.

**Cause 4: Displacement architecture cap**

Background particles are clamped to 1.2 field units displacement from their base positions. The visual "density ring" from clamped particles forms around the BH at a radius determined by which base positions are closest to the BH. If the BH is at a position where the noise grid is not uniform, the density ring appears off-center.

| Source | Misalignment? | Severity | Fix |
|---|---|---|---|
| `toField()` math | NO | — | None needed |
| `toPlane()` formula | NO | — | None needed |
| Y-axis convention | NO | — | None needed |
| Doppler asymmetry | YES (optical) | HIGH | Reduce doppler contrast or adjust phase |
| arcMod rotating lobes | YES (optical) | MEDIUM | Slow rotation speed or reduce amplitude |
| Displacement cap | YES (optical) | LOW | Raise cap or switch architecture |
| coreDisk z=0.01 offset | YES | NEGLIGIBLE (<1px) | None needed |

---

## 10. Proposed Debug Mode (not implemented)

To visually verify center alignment, a debug overlay can be added to the Three.js scene.

**Implementation approach:**
- A new `THREE.Group` named `debugBHGroup`, added to the scene only when `window.__auraDebugBH = true`
- Contents:
  - Red cross-hair at `(fc.x, fc.y)` — the data center (should be same for all layers)
  - White circle with radius `0.85 × accR` — coreDisk boundary
  - Cyan circle with radius `0.92 × accR` — rimR compression zone
  - Yellow circle with radius `1.0 × accR` — accretion ring center
  - Blue circle with radius `1.0 × accR` from `uWells[0].xy` — background gravity center
  - Green circle with radius `uBHAccR × 0.90` — photon ring inner edge

**Toggle:** `window.__auraDebugBH = true` → next `applyBHProgress` call rebuilds group.

**Expected finding:** All circles will be concentric (same center), confirming data alignment. The visual asymmetry from Doppler/arcMod will be visible as the PARTICLE PATTERN offset from the geometric circles.

I will implement this if you validate, without touching any existing rendering code.

---

## 11. Unified BlackHoleModel — Target Architecture

### Current state (layered but not unified)

```javascript
// hero-distort.js
a.setWell(0, fc.x, fc.y, str, rad);          // → uWells[0]
a.setWellExtra(0, swirlStr, accR, accT, ...); // → uWellsA[0], uWellsB[0]
a.setBHProgress(prog, fc.x, fc.y, accR);      // → uBHCenter, uBHAccR, coreDisk

// Three separate API calls, all passing fc.x, fc.y independently
// The same value is repeated across 3 calls — not a single source of truth at the JS level
// (though at the GLSL level they all end up in the right uniforms)
```

### Proposed unified model

```javascript
// Single object, single update call
const BlackHoleModel = {
  center:               { x: 0, y: 0 },   // field units — SINGLE SOURCE
  eventHorizonRadius:   0,                 // = 0.85 × accR, world units
  innerRimRadius:       0,                 // = 0.92 × accR
  photonRingRadius:     0,                 // = 0.95 × accR (center of L0 orbit)
  accretionRadius:      2.0,              // = accR (field units)
  captureRadius:        0,                // = wRad from pxToFieldRadius
  wellStrength:         0,                // = wStr
  progress:             0,                // 0→1 BH activation
  swirlStr:             4.8,
  ringPull:             3.5,
  accT:                 0.16,
  glowBoost:            5.0,
  coreDark:             1.8,
};

// Single update function — all components get same values from one call
function applyBlackHoleModel(model) {
  // background
  a.setWell(0, model.center.x, model.center.y, model.wellStrength, model.captureRadius);
  a.setWellExtra(0, model.swirlStr, model.accretionRadius, model.accT,
                    model.glowBoost, model.ringPull, 2.2, model.coreDark);
  // orbital disk + core mask
  a.setBHProgress(model.progress, model.center.x, model.center.y, model.accretionRadius);
}
```

### Migration path from current state

Current state is **already functionally correct** — all centers use `fc.x, fc.y` from the same call. The formal refactor to `BlackHoleModel` is a structural improvement but does not fix visual issues.

Migration steps:
1. Collect all BH parameters into a `bh` object in hero-distort.js
2. Replace the 3 separate `a.setWell / a.setWellExtra / a.setBHProgress` calls with one `applyBlackHoleModel(bh)` call
3. No GLSL shader changes needed — uniforms stay the same

---

## 12. Self-assessment — bh9 review questions

### Q: Do particles far from the BH show a visible inward curve?

**Answer: Partially.**  
Evidence: `wideAtt × 0.45` creates inward pull in the annular zone 1.0–4.0 × wRad (≈ 2–80 field units, very wide). But background particles have a 1.2 field unit displacement cap. Particles whose base positions are far from the BH (>3 field units) can only be shifted 1.2 units toward it — a subtle lean, not a dramatic curve.  
Weakness: The cap prevents dramatic far-field effects.  
Next fix: Raise displacement cap from 1.2 to 1.8–2.0, or accept the architectural limitation.

### Q: Is there a zone where particles look like they're orbiting?

**Answer: Partially — at the ring zone, yes; in the capture zone, debatable.**  
Evidence: `swirlAmt` at ring radius ≈ 16+ field units tangential displacement. Capped to 1.2. So the tangential displacement at ring shows as a strong swirl pattern. The new `orbShear` adds tangential motion in the 1–7 field unit zone.  
Weakness: Because displacement is capped and particles snap back, the "orbit" looks like a frozen swirl pattern, not actual rotation.  
Next fix: Architectural change to a simulation-based particle layer for the capture zone, or accept the artistic compromise.

### Q: Does the rim at the core border look denser/hotter?

**Answer: In the shader, yes — in practice, hard to distinguish from the photon ring glow.**  
Evidence: `rimFall × glowB × 0.20` adds brightness at 0.92 × accR. `rimPull` compresses particles there.  
Weakness: The rim compression and the photon ring (L0 at 0.90–1.10 × accR) overlap visually. The distinction between "background rim glow" and "accMesh photon ring" may be lost.  
Next fix: Reduce photon ring inclination from 0.45 to 0.25 to make it more ring-shaped and distinct; or increase rim thermal weight.

### Q: Do particles dim progressively before disappearing?

**Answer: Yes, in the shader logic.**  
Evidence: `absorb = (1 − smoothstep(0.80, 0.95, dist)) × coreDark × 1.4` dims particles in the 1.60–1.90 field unit zone. The coreDisk then fully masks them at 1.70.  
Weakness: The absorption zone (0.80–0.95 × accR) partially OVERLAPS the coreDisk edge (0.85 × accR). Particles between 1.60–1.70 field units are dimmed AND masked. The visible dimming only occurs between 1.70–1.90 field units (outside the mask).  
Assessment: Working as intended. The fade-in region is narrow but present.

### Q: Is there a visual sense that the background feeds into the plasma disk?

**Answer: Not yet convincingly.**  
Evidence: All forces point the same center and are correctly tuned. But the displacement-field architecture creates a "frozen swirl" pattern rather than actual inflow.  
Weakness: The background particles and the accMesh particles are visually separate objects. The green background color is distinct from the yellow/orange disk. There is no color transition from background to disk.  
Next fix: The most impactful change would be color-tinting the background disturb contribution near the BH — shifting background particles toward warm colors (orange/white) as they approach the disk zone, making them visually merge with the accMesh.

### Q: Is the core still fully black?

**Answer: YES — opacity=1.0 from bh8, no regression.**

---

## 13. Risk Register

| Risk | Severity | Status | Mitigation |
|---|---|---|---|
| toPlane Y-axis inversion | HIGH | RESOLVED — correct Y flip confirmed | No action needed |
| coreDisk / BH center mismatch | HIGH | RESOLVED — same source `fc.x, fc.y` | Formal refactor to BlackHoleModel optional |
| Background displacement cap (1.2) | MEDIUM | ACTIVE — limits all bh9 forces | Raise cap to 1.8 in next patch |
| Doppler visual centroid shift | MEDIUM | ACTIVE — 2.6× brightness ratio | Reduce Doppler contrast, adjust phase |
| Disk looks like discrete points (frontBand) | MEDIUM | ACTIVE — depends on particle overlap | Monitor visually; add more particles if needed |
| arcMod rotating lobes shift visual centroid | LOW | ACTIVE | Reduce amplitude from 0.35 to 0.15 |
| accMesh and background color disconnected | LOW | ACTIVE | Color-match warm zone near disk |
| No formal BlackHoleModel | LOW | ACTIVE | Refactor opportunity, not a bug |

---

## 14. Recommended Next Steps

### P0 — Already done
- ✅ coreDisk opacity=1.0 (bh8)
- ✅ front/back render order separation (bh8)
- ✅ Inner ribbon starts outside core (bh8)

### P1 — Next patch (bh10)

**Raise displacement cap from 1.2 to 1.8** — the single change with the highest ROI. All bh9 forces are being capped. This will immediately make orbital shear, rim compression, and capture zone visible at their intended strength.

Target line in BG_VERT:
```glsl
if(dLen > 1.2){  →  if(dLen > 1.8){
```

**Reduce Doppler contrast** to prevent extreme visual centroid shift:
- ACC_VERT: `0.45 + 0.55×cos` → `0.55 + 0.45×cos` (ratio 2.0× → 1.8×)
- FB_VERT: `0.38 + 0.62×cos` → `0.50 + 0.50×cos` (ratio 2.6× → 2.0×)

**Warm the background near the disk** — shift disturb color toward orange near BH for visual continuity.

### P2

**arcMod amplitude reduction**: `0.65 + 0.35×cos` → `0.75 + 0.25×cos` — less rotating brightness shift.

**Formal BlackHoleModel refactor** in hero-distort.js — cleaner code, no visual change.

### P3

**Optional: Simulation-based capture particles** — a third `THREE.Points` layer (`captureMesh`) using a lightweight particle simulation (position + velocity updated per-frame via CPU or compute shader), showing actual inward-spiraling matter. This would solve the "displacement field limitation" permanently but requires significant new code.
