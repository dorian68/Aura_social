/* ============================================================
   AURA — Hero particle figures (canvas), v3 — REAL RELATIVISTIC PHYSICS
   The three figures are now grounded in actual equations:

     'lens'   — GRAVITATIONAL LENSING (General Relativity).
                Photons follow null geodesics deflected by a point mass.
                Light deflection  α = 4GM/(c²b) = 2·Rₛ/b  (Einstein, 1915),
                where Rₛ = 2GM/c² is the Schwarzschild radius and b the
                impact parameter. Rays focus on the optic axis at the
                Einstein radius θ_E = √(2·Rₛ·D); inside the photon sphere
                (r < 1.5·Rₛ) light is captured → the black-hole shadow.

     'vortex' — BLACK-HOLE ACCRETION DISK.
                Matter on Keplerian orbits:  v(r) = √(GM/r),  ω(r) ∝ r^(−3/2)
                (inner gas orbits faster). Inner edge at the ISCO, r = 3·Rₛ.
                Relativistic Doppler beaming: the side rotating toward us is
                brighter & bluer, flux ∝ δ³ with δ = 1/[γ(1 − β·cosθ)].
                Central shadow + photon ring at ≈2.6·Rₛ.

     'wave'   — GRAVITATIONAL WAVES from a compact binary inspiral.
                Quadrupole radiation. The orbit decays (Kepler + GW losses):
                a(t) ∝ (t_c − t)^(1/4), so the frequency "chirps" upward,
                f_gw = 2·f_orb ∝ a^(−3/2), and the strain grows h ∝ a^(−1).
                A lattice of free-falling test masses is displaced by the
                transverse-traceless strain (retarded time t − R/c):
                δx = ½(h₊·x + hₓ·y),  δy = ½(hₓ·x − h₊·y).

   The motion is therefore a genuine physical field, not decorative noise.
   One figure is chosen at random on each page load.
   ============================================================ */
(function () {
  const LIME = [176, 240, 70];
  const YEL  = [214, 248, 82];
  const HOT  = [244, 255, 196];   // near-white hot core / blueshift
  const COOL = [196, 214, 188];   // cool white-ish
  const DIM  = [96, 120, 60];     // dim / redshift
  const RED  = [150, 96, 54];     // strong redshift (receding / deep well)

  const TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, t) { t = clamp(t, 0, 1); return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
  function rgba(c, a) { return 'rgba(' + (c[0]|0) + ',' + (c[1]|0) + ',' + (c[2]|0) + ',' + a + ')'; }

  class HeroFigure {
    constructor(canvas, mode) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.mode = mode;
      this.t = 0;
      this.intro = 0;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.running = true;
      this.reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.binPhase = 0;   // accumulated orbital phase for the GW binary
      this.resize();
      this._onResize = () => this.resize();
      window.addEventListener('resize', this._onResize);
      this.build();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      this.w = Math.max(320, r.width);
      this.h = Math.max(320, r.height);
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (this.built) this.build();
    }
    destroy() { this.running = false; window.removeEventListener('resize', this._onResize); }

    build() {
      this.built = true;
      const scale = clamp(this.w / 760, 0.6, 1.15);
      if (this.mode === 'lens') this.buildLens(scale);
      else if (this.mode === 'vortex') this.buildVortex(scale);
      else this.buildWave(scale);
    }

    /* ============================================================
       LENS — gravitational lensing of a background light field.
       We integrate photon trajectories as null geodesics in the weak
       field of a point mass. Each photon keeps |v| = c (light speed is
       invariant) and only its DIRECTION bends; the transverse kick per
       step is Rₛ/r², whose path integral gives the GR deflection 2Rₛ/b.
       ============================================================ */
    buildLens(scale) {
      const { w, h } = this;
      this.cx = w * 0.5;
      this.cy = h * 0.5;
      this.Rs = clamp(Math.min(w, h) * 0.024, 6, 26);          // Schwarzschild radius (px)
      const half = w * 0.5;
      this.thetaE = Math.sqrt(2 * this.Rs * half);             // Einstein radius θ_E = √(2·Rₛ·D)
      this.photonSphere = 1.5 * this.Rs;                       // capture radius (black-hole shadow)

      // ---- integrate a fan of parallel light rays coming from the left ----
      const nRays = Math.round(78 * scale);
      const bMax = h * 0.52;
      this.rays = [];
      const x0 = this.cx - half - 4, x1 = this.cx + half + 4;
      const maxSteps = Math.round((x1 - x0) * 2.2) + 60;
      for (let i = 0; i < nRays; i++) {
        const b = (i / (nRays - 1) - 0.5) * 2 * bMax;          // impact parameter
        let x = x0, y = this.cy + b, vx = 1, vy = 0;
        const pts = []; let captured = false, steps = 0, maxBend = 0;
        while (x < x1 && steps < maxSteps) {
          const rx = x - this.cx, ry = y - this.cy;
          const r2 = rx * rx + ry * ry, r = Math.sqrt(r2);
          if (r < this.photonSphere) { captured = true; break; }
          const a = this.Rs / (r2 * r);                        // |accel| = Rₛ/r², directed toward mass
          vx -= rx * a; vy -= ry * a;
          const sp = Math.hypot(vx, vy); vx /= sp; vy /= sp;   // renormalise: photons travel at c
          maxBend = Math.max(maxBend, a);
          x += vx; y += vy; steps++;
          if (steps % 4 === 0) { pts.push(x, y); }
        }
        this.rays.push({ pts, captured, b, bend: maxBend, len: pts.length / 2 });
      }

      // ---- distant background sources (galaxies) that twinkle ----
      this.stars = [];
      const ns = Math.round(120 * scale);
      for (let i = 0; i < ns; i++) {
        const seed = (i * 9301 + 49297) % 233280, rnd = seed / 233280;
        this.stars.push({ x: ((i * 73) % 100) / 100, y: ((i * 31 + 17) % 100) / 100, ph: rnd * TAU, sz: 0.5 + rnd });
      }
    }
    drawLens(ctx) {
      const { w, h, t, intro, cx, cy, Rs, thetaE } = this;
      ctx.globalCompositeOperation = 'lighter';

      // ---- faint background source field ----
      for (const s of this.stars) {
        const x = s.x * w, y = s.y * h;
        const tw = 0.04 + 0.04 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.ph));
        ctx.fillStyle = rgba(COOL, tw * intro);
        ctx.beginPath(); ctx.arc(x, y, s.sz * 0.7, 0, TAU); ctx.fill();
      }

      // ---- lensed light rays: faint geodesic + bright photons flowing along it ----
      const flow = this.reduce ? 0 : (t * 26) % 12;
      for (const ray of this.rays) {
        const P = ray.pts, n = ray.len;
        if (n < 2) continue;
        // brightness scales with how strongly this ray was bent (rays grazing the mass)
        const bendN = clamp(ray.bend * 9000, 0, 1);
        // static geodesic trace
        for (let k = 0; k < n; k++) {
          const x = P[k * 2], y = P[k * 2 + 1];
          const rr = Math.hypot(x - cx, y - cy);
          const near = clamp(1 - rr / (thetaE * 1.4), 0, 1);
          const a = (0.012 + near * 0.05 + bendN * 0.04) * intro;
          if (a < 0.012) continue;
          const col = near > 0.6 ? mix(YEL, HOT, (near - 0.6) / 0.4) : mix(LIME, YEL, near / 0.6);
          ctx.fillStyle = rgba(col, a);
          ctx.beginPath(); ctx.arc(x, y, 0.6 + near * 0.7, 0, TAU); ctx.fill();
        }
        // bright photons streaming along the ray
        for (let p = (ray.captured ? 0 : 0); p < n; p += 12) {
          const k = Math.floor((p + flow)) % n;
          const x = P[k * 2], y = P[k * 2 + 1];
          if (x == null) continue;
          const rr = Math.hypot(x - cx, y - cy);
          const near = clamp(1 - rr / (thetaE * 1.2), 0, 1);
          let a = (0.14 + near * 0.55 + bendN * 0.25) * intro;
          if (ray.captured && k > n - 14) a *= clamp((n - k) / 14, 0, 1);   // fade into the shadow
          const col = near > 0.62 ? mix(YEL, HOT, (near - 0.62) / 0.38) : mix(LIME, YEL, near / 0.62);
          ctx.fillStyle = rgba(col, clamp(a, 0, 1));
          ctx.beginPath(); ctx.arc(x, y, 0.7 + near * 1.5, 0, TAU); ctx.fill();
        }
      }

      // ---- Einstein ring (where rays from infinity focus on the optic axis) ----
      const ringPulse = 0.85 + 0.15 * Math.sin(t * 1.4);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = rgba(HOT, 0.10 * intro * ringPulse);
      ctx.beginPath(); ctx.arc(cx, cy, thetaE, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba(YEL, 0.18 * intro * ringPulse);
      ctx.beginPath(); ctx.arc(cx, cy, thetaE, 0, TAU); ctx.stroke();

      // ---- photon ring + black-hole shadow ----
      this.coreGlow(ctx, cx, cy, Rs * 1.1, 1.0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(4,7,6,1)';
      ctx.beginPath(); ctx.arc(cx, cy, this.photonSphere, 0, TAU); ctx.fill();   // shadow (no light escapes)
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = rgba(HOT, 0.5 * intro);                                  // photon ring
      ctx.beginPath(); ctx.arc(cx, cy, this.photonSphere * 1.02, 0, TAU); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    /* ============================================================
       VORTEX — relativistic accretion disk around a black hole.
       Particles ride Keplerian orbits (ω ∝ r^(−3/2)) between the ISCO
       (r = 3·Rₛ) and an outer radius. The disk is inclined, so it reads
       as an ellipse; the line-of-sight component of each orbital velocity
       drives relativistic Doppler beaming (approaching side brighter/bluer,
       receding side dimmer/redder). A lensed image of the far side arcs
       over the top of the shadow.
       ============================================================ */
    buildVortex(scale) {
      const { w, h } = this;
      this.cx = w * 0.5;
      this.cy = h * 0.5;
      this.Rs = clamp(Math.min(w, h) * 0.05, 10, 34);
      this.isco = 3 * this.Rs;                       // innermost stable circular orbit
      this.rOut = Math.min(w, h) * 0.46;
      this.incl = 1.16;                              // disk inclination (rad, ~66°)
      this.GM = 30000;                               // sets orbital timescale (px³/step²)
      this.cDisk = Math.sqrt(this.GM / this.isco) * 1.25; // ref. speed for β = v/c_disk

      const n = Math.round(2600 * scale);
      this.parts = [];
      for (let i = 0; i < n; i++) {
        const s1 = ((i * 12.9898) % 1 + 1) % 1;
        const s2 = ((i * 78.233) % 1 + 1) % 1;
        const s3 = ((i * 37.719) % 1 + 1) % 1;
        // bias population toward the hot inner disk (∝ r^-1)
        const r = this.isco + (this.rOut - this.isco) * Math.pow(s1, 1.7);
        this.parts.push({ r, phi: s2 * TAU, jit: (s3 - 0.5) * 0.16, sq: s3 < 0.22 });
      }
    }
    drawVortex(ctx) {
      const { w, h, t, intro, cx, cy, Rs, isco, GM, cDisk, incl } = this;
      const ci = Math.cos(incl), si = Math.sin(incl);
      const dt = this.reduce ? 0 : 1;
      const shadowR = 2.6 * Rs;                      // apparent shadow (photon capture)

      // advance Keplerian phases:  dφ/dt = ω(r) = √(GM/r³)
      for (const p of this.parts) {
        p.phi += Math.sqrt(GM / (p.r * p.r * p.r)) * dt;
      }

      const drawParticle = (p, front) => {
        const cphi = Math.cos(p.phi), sphi = Math.sin(p.phi);
        const x = cx + p.r * cphi;
        const y = cy + p.r * sphi * ci + p.r * p.jit * 2;     // foreshortened by inclination
        // orbital velocity (counter-clockwise): tangential, v = √(GM/r)
        const v = Math.sqrt(GM / p.r);
        // line-of-sight velocity → Doppler beaming.  v_los>0 ⇒ approaching
        const vlos = v * cphi * si;
        const beta = clamp(vlos / cDisk, -0.7, 0.7);
        const doppler = Math.pow((1 + beta) / (1 - beta), 1.5);   // δ³-style boost
        // gravitational + Doppler colour: hot/blue inner & approaching, red receding
        const rad = clamp((p.r - isco) / (this.rOut - isco), 0, 1);
        const baseT = clamp(1 - rad, 0, 1);                       // inner = hotter
        let col;
        if (beta > 0) col = mix(mix(YEL, HOT, baseT), HOT, beta);          // blueshift → white-hot
        else          col = mix(mix(LIME, YEL, baseT), RED, -beta * 1.1);  // redshift → dim red
        let bright = (0.05 + baseT * 0.5) * doppler * (front ? 1 : 0.6) * intro;
        bright = clamp(bright, 0, 1);
        if (bright < 0.02) return;
        const size = (0.5 + baseT * 1.2) * (front ? 1 : 0.85);
        ctx.fillStyle = rgba(col, bright);
        if (p.sq) ctx.fillRect(x, y, size * 1.4, size * 1.4);
        else { ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill(); }

        // lensed image of the far side, arced over the top of the shadow (Interstellar look)
        if (!front && p.r < isco * 2.4) {
          const yl = cy - Math.abs(p.r * sphi) * ci * 0.5 - shadowR * 0.7;
          const al = bright * 0.5;
          if (al > 0.02) {
            ctx.fillStyle = rgba(col, al);
            ctx.beginPath(); ctx.arc(x, yl, size * 0.9, 0, TAU); ctx.fill();
          }
        }
      };

      ctx.globalCompositeOperation = 'lighter';
      // back half first (behind the hole), then shadow, then front half occludes
      for (const p of this.parts) if (Math.sin(p.phi) >= 0) drawParticle(p, false);

      // central shadow + photon ring
      this.coreGlow(ctx, cx, cy, Rs * 1.3, 1.0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(3,6,5,1)';
      ctx.beginPath(); ctx.arc(cx, cy, shadowR, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 2;
      ctx.strokeStyle = rgba(HOT, 0.55 * intro);
      ctx.beginPath(); ctx.arc(cx, cy, shadowR * 1.03, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba(YEL, 0.25 * intro);
      ctx.beginPath(); ctx.arc(cx, cy, shadowR * 1.12, 0, TAU); ctx.stroke();

      for (const p of this.parts) if (Math.sin(p.phi) < 0) drawParticle(p, true);
      ctx.globalCompositeOperation = 'source-over';
    }

    /* ============================================================
       WAVE — gravitational waves from a binary inspiral.
       The orbit shrinks (a ∝ (t_c−t)^¼) so the GW frequency chirps up
       and the strain grows. A lattice of free test masses is displaced by
       the transverse-traceless strain evaluated at retarded time:
         h₊ = H·cos ψ,  hₓ = H·sin ψ,   ψ = 2Φ − k·R   (outgoing ripple)
         δx = ½(h₊·x + hₓ·y),   δy = ½(hₓ·x − h₊·y)
       Each mass traces a tiny ellipse; together they form expanding rings.
       ============================================================ */
    buildWave(scale) {
      const { w, h } = this;
      this.cx = w * 0.5;
      this.cy = h * 0.5;
      this.maxR = Math.hypot(w, h) * 0.5;
      // polar lattice of free-falling test masses
      this.nodes = [];
      const rings = Math.round(34 * scale);
      for (let ri = 1; ri <= rings; ri++) {
        const R = (ri / rings) * this.maxR;
        const per = Math.max(8, Math.round((R / this.maxR) * 120 * scale));
        for (let a = 0; a < per; a++) {
          const th = (a / per) * TAU;
          this.nodes.push({ R, th, x: Math.cos(th) * R, y: Math.sin(th) * R });
        }
      }
      this.aMax = Math.min(w, h) * 0.16;     // initial binary separation (px)
      this.cycle = 7.2;                      // t-units per inspiral→merger→reset
    }
    drawWave(ctx) {
      const { w, h, t, intro, cx, cy } = this;
      ctx.globalCompositeOperation = 'lighter';

      // --- inspiral clock: p∈[0,1), a(t) ∝ (1−p)^¼ shrinks to the merger ---
      const p = this.reduce ? 0.35 : (t % this.cycle) / this.cycle;
      const a = Math.max(this.aMax * 0.06, this.aMax * Math.pow(1 - p, 0.25));
      // Kepler: Ω ∝ a^(−3/2); integrate the orbital phase
      const Omega = 0.06 * Math.pow(this.aMax / a, 1.5);
      this.binPhase += this.reduce ? 0 : Omega;
      const psiBin = 2 * this.binPhase;                 // GW phase = 2 × orbital phase
      const k = 0.018 * Math.pow(this.aMax / a, 0.9);   // wavenumber rises with frequency (chirp)
      const h0 = 16 * (this.aMax / a);                  // strain amplitude grows as a shrinks
      const merger = clamp((p - 0.92) / 0.08, 0, 1);    // flash near coalescence

      // --- displace each test mass by the TT strain (retarded-time ripple) ---
      for (const nd of this.nodes) {
        const env = Math.exp(-nd.R / (this.maxR * 0.62));    // 1/R-like falloff
        const psi = psiBin - k * nd.R;                       // outgoing wavefront
        const H = (h0 / (1 + nd.R * 0.03)) * env;
        const hp = H * Math.cos(psi);                        // h₊
        const hx = H * Math.sin(psi);                        // hₓ
        const dx = 0.5 * (hp * nd.x / 40 + hx * nd.y / 40);  // δx = ½(h₊x + hₓy)
        const dy = 0.5 * (hx * nd.x / 40 - hp * nd.y / 40);  // δy = ½(hₓx − h₊y)
        const x = cx + nd.x + dx;
        const y = cy + nd.y + dy;
        const strain = Math.hypot(dx, dy);
        let bright = (0.05 + clamp(strain * 0.16, 0, 0.9)) * (0.4 + env) * intro;
        bright = clamp(bright, 0, 1);
        if (bright < 0.025) continue;
        const hotn = clamp(strain * 0.12, 0, 1);
        const col = hotn > 0.5 ? mix(YEL, HOT, (hotn - 0.5) / 0.5) : mix(LIME, YEL, hotn / 0.5);
        const size = 0.6 + hotn * 1.6;
        ctx.fillStyle = rgba(col, bright);
        ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill();
      }

      // --- the two inspiraling compact objects ---
      const ci = 0.55;   // view tilt
      for (let s = -1; s <= 1; s += 2) {
        const bx = cx + s * a * Math.cos(this.binPhase);
        const by = cy + s * a * Math.sin(this.binPhase) * ci;
        this.coreGlow(ctx, bx, by, (4 + 6 * (this.aMax / a) * 0.12), 1.0, 1, 1);
        ctx.fillStyle = rgba(HOT, 0.9 * intro);
        ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, TAU); ctx.fill();
      }
      // merger flash
      if (merger > 0) this.coreGlow(ctx, cx, cy, Math.min(w, h) * 0.10 * merger, merger, 1.4, 1.4);

      ctx.globalCompositeOperation = 'source-over';
    }

    /* shared bright core glow (elliptical) — tight & sharp */
    coreGlow(ctx, x, y, R, k, sx, sy) {
      const pulse = (Math.sin(this.t * 2) * 0.08 + 1);
      R *= pulse * this.intro * (k || 1);
      if (R <= 0) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sx || 1, sy || 1);
      let g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.2);
      g.addColorStop(0, rgba(HOT, 0.55 * this.intro));
      g.addColorStop(0.16, rgba(YEL, 0.26 * this.intro));
      g.addColorStop(0.45, rgba(LIME, 0.07 * this.intro));
      g.addColorStop(1, rgba(LIME, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, R * 2.2, 0, TAU); ctx.fill();
      ctx.restore();
    }

    loop() {
      if (!this.running) return;
      this.t += 0.01;
      this.intro = Math.min(1, this.intro + 0.02);
      const ctx = this.ctx;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(6,10,8,0.30)';   // trail fade
      ctx.fillRect(0, 0, this.w, this.h);
      if (this.mode === 'lens') this.drawLens(ctx);
      else if (this.mode === 'vortex') this.drawVortex(ctx);
      else this.drawWave(ctx);
      if (this.reduce) { this.running = false; return; }   // single static frame
      requestAnimationFrame(this.loop);
    }
  }

  const MODES = ['wave', 'lens', 'vortex'];
  window.AuraHero = {
    MODES,
    randomMode() { return MODES[Math.floor(Math.random() * MODES.length)]; },
    mount(canvas, mode) {
      if (window.__auraFig) window.__auraFig.destroy();
      window.__auraFig = new HeroFigure(canvas, mode || this.randomMode());
      return window.__auraFig;
    }
  };
})();
