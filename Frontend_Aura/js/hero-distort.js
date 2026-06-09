/* ============================================================
   AURA — Spacetime distortion v10.0 (orbital accretion disk)

   BH lifecycle: inactive → forming → active → handoff → inactive

   AuraFieldBg:
     backgroundPoints  = spacetime fabric (lensing, Z depression, core dark)
     accretionPoints   = orbital particle disk (same scene, same canvas)

   No canvas overlay. No AuraSectionFX. No dissolution canvas.
   ============================================================ */
(function () {
  'use strict';

  /* ── LIFECYCLE CONSTANTS ────────────────────────────────────────── */
  var ACTIVATION_THRESHOLD = 0.35;
  var RESET_THRESHOLD      = 0.08;
  var NEXT_INF_THRESHOLD   = 0.25;
  var FORMATION_SPEED      = 0.007; // 0→1 in ~2.4s at 60fps
  var HANDOFF_SPEED        = 0.012; // 1→0 in ~1.4s
  var MIN_ACTIVE_MS        = 1200;

  /* ── INFLUENCER MAP ─────────────────────────────────────────────── */
  var INFLUENCERS = [
    { sel: '[data-fx="well"]', idx: 0, xFrac: 0.74, yFrac: 0.46,
      str: 6.0, radPx: 380, isBH: true,
      extra: { swirlStr: 0.05, accR: 2.0, accT: 0.16,
               glowBoost: 5.0, ringPull: 3.2, maxDisp: 2.2, coreDark: 1.8 } },
    { sel: '[data-fx="node"]',       idx: 1, xFrac: 0.26, yFrac: 0.50, str: 1.0, radPx: 200 },
    { sel: '[data-fx="trajectory"]', idx: 2, xFrac: 0.70, yFrac: 0.60, str: 0.8, radPx: 170 },
    { sel: '#loyalty',               idx: -1, xFrac: 0.28, yFrac: 0.55, str: 0,  radPx: 0   },
  ];
  var BH_INF = INFLUENCERS[0];

  /* ── BH STATE MACHINE ───────────────────────────────────────────── */
  var bhState            = 'inactive'; // inactive | forming | active | handoff
  var activationProgress = 0;
  var activeStartTime    = 0;
  var bhCurrentRatio     = 0;
  var bhRatioLow         = true;

  /* ── SCROLL DIRECTION ───────────────────────────────────────────── */
  var scrollDir   = 'down';
  var lastScrollY = 0;

  /* ── DOM STATE ──────────────────────────────────────────────────── */
  var bhSection      = null;
  var raf            = null;
  var bundleSwapped  = false;
  var resizeAttached = false;
  var observers      = [];

  /* ================================================================
     FIELD API
     ================================================================ */
  function api() { return window.__auraFieldBg || null; }

  function pxToFieldRadius(inf) {
    var a = api();
    if (!a) return 2.0;
    var cx = inf.xFrac * window.innerWidth;
    var cy = inf.yFrac * window.innerHeight;
    var fc0 = a.toField(cx, cy);
    var fc1 = a.toField(cx + inf.radPx, cy);
    return Math.abs(fc1.x - fc0.x);
  }

  function sstep(e0, e1, x) {
    var t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }

  /* Drive both the background grid deformation AND the orbital disk. */
  function applyBHProgress(prog) {
    var a = api();
    if (!a) return;
    var e    = BH_INF.extra;
    var mob  = window.innerWidth < 768;
    var xFrac = mob ? 0.50 : BH_INF.xFrac;
    var yFrac = mob ? 0.38 : BH_INF.yFrac;
    var radPx = mob ? 160  : BH_INF.radPx;
    var accR  = mob ? 0.85 : e.accR;
    var cx   = xFrac * window.innerWidth;
    var cy   = yFrac * window.innerHeight;
    var fc   = a.toField(cx, cy);
    var fc1  = a.toField(cx + radPx, cy);
    var rad  = Math.abs(fc1.x - fc.x);

    /* Background grid: lensing + Z depression + core dark */
    a.setWell(0, fc.x, fc.y, BH_INF.str * prog, rad);
    if (a.setWellExtra) {
      a.setWellExtra(0,
        e.swirlStr  * sstep(0.35, 1.00, prog),
        accR, e.accT,
        e.glowBoost * sstep(0.45, 1.00, prog),
        e.ringPull  * sstep(0.25, 0.75, prog),
        e.maxDisp,
        e.coreDark  * sstep(0.10, 0.45, prog)
      );
    }

    /* Orbital accretion disk */
    if (a.setBHProgress) {
      a.setBHProgress(sstep(0.20, 0.80, prog), fc.x, fc.y, accR);
    }
  }

  /* Non-BH influencer: ratio-driven well (unchanged logic). */
  function applyInfluencer(inf, ratio) {
    var a = api();
    if (inf.idx <= 0 || !a) return;
    if (ratio <= 0) { a.clearWell(inf.idx); return; }
    var cx = inf.xFrac * window.innerWidth;
    var cy = inf.yFrac * window.innerHeight;
    var fc = a.toField(cx, cy);
    var rad = pxToFieldRadius(inf);
    a.setWell(inf.idx, fc.x, fc.y, inf.str * Math.min(1, ratio), rad);
  }

  /* ================================================================
     BH STATE TRANSITIONS
     ================================================================ */
  function tryArm(ratio) {
    if (bhState !== 'inactive')         return;
    if (!bhRatioLow)                    return;
    if (scrollDir !== 'down')           return;
    if (ratio < ACTIVATION_THRESHOLD)   return;
    bhState = 'forming';
    bhRatioLow = false;
  }

  function tryHandoff(now) {
    if (bhState !== 'active')                    return;
    if (now - activeStartTime < MIN_ACTIVE_MS)   return;
    bhState = 'handoff';
  }

  function onBHRatio(ratio, now) {
    bhCurrentRatio = ratio;
    if (ratio < RESET_THRESHOLD && bhState === 'inactive') bhRatioLow = true;
    tryArm(ratio);
    if (ratio === 0) {
      if (bhState === 'active')  tryHandoff(now);
      if (bhState === 'forming') bhState = 'handoff';
    }
  }

  function onNextInfluencerActive(now) { tryHandoff(now); }

  /* ================================================================
     INTERSECTION OBSERVERS
     ================================================================ */
  function buildThresholds(n) {
    var t = [];
    for (var i = 0; i <= n; i++) t.push(i / n);
    return t;
  }

  function setupObservers() {
    observers.forEach(function (o) { o.disconnect(); });
    observers = [];

    INFLUENCERS.forEach(function (inf) {
      var el = document.querySelector(inf.sel);
      if (!el) return;

      if (inf.isBH) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            onBHRatio(e.intersectionRatio, performance.now());
          });
        }, { threshold: buildThresholds(20) });
        io.observe(el);
        observers.push(io);

      } else {
        var io2 = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            var ratio = e.intersectionRatio;
            applyInfluencer(inf, ratio);
            if (inf.idx < 0 && ratio > 0.1 && api()) {
              var fc = api().toField(
                inf.xFrac * window.innerWidth,
                inf.yFrac * window.innerHeight
              );
              api().addRipple(fc.x, fc.y, 1.2);
            }
            if (inf.idx > 0 && ratio >= NEXT_INF_THRESHOLD) {
              onNextInfluencerActive(performance.now());
            }
          });
        }, { threshold: buildThresholds(20) });
        io2.observe(el);
        observers.push(io2);
      }
    });
  }

  /* ================================================================
     MAIN LOOP
     ================================================================ */
  function tick() {
    raf = null;
    var now = performance.now();

    if (bhState === 'forming') {
      activationProgress = Math.min(1, activationProgress + FORMATION_SPEED);
      if (activationProgress >= 1) { bhState = 'active'; activeStartTime = now; }

    } else if (bhState === 'handoff') {
      activationProgress = Math.max(0, activationProgress - HANDOFF_SPEED);
      if (activationProgress <= 0) {
        bhState = 'inactive';
        bhRatioLow = bhCurrentRatio < RESET_THRESHOLD;
        var a = api();
        if (a) a.clearWell(0);
      }
    }

    if (activationProgress > 0) applyBHProgress(activationProgress);

    /* Section content fades as BH forms, returns during handoff */
    if (bhSection) {
      if (bhState === 'forming') {
        bhSection.style.opacity = Math.max(0.15, 1 - activationProgress * 0.85).toString();
      } else if (bhState === 'active') {
        bhSection.style.opacity = '0.15';
      } else if (bhState === 'handoff') {
        bhSection.style.opacity = (0.15 + (1 - activationProgress) * 0.85).toString();
      } else {
        bhSection.style.opacity = '';
      }
    }

    raf = requestAnimationFrame(tick);
  }

  /* ================================================================
     SCROLL DIRECTION
     ================================================================ */
  function attachScrollDir() {
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      scrollDir = (y >= lastScrollY) ? 'down' : 'up';
      lastScrollY = y;
    }, { passive: true });
  }

  /* ================================================================
     BOOTSTRAP
     ================================================================ */
  function resetAll() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    observers.forEach(function (o) { o.disconnect(); });
    observers = [];
    var a = api();
    if (a) { a.clearWell(0); a.clearWell(1); a.clearWell(2); }
    bhState = 'inactive';
    activationProgress = 0;
    bhRatioLow = true;
    bhCurrentRatio = 0;
    activeStartTime = 0;
    bhSection = null;
  }

  function initialize() {
    resetAll();

    if (!resizeAttached) {
      attachScrollDir();
      resizeAttached = true;
    }

    function afterField() {
      lastScrollY = window.scrollY;
      bhSection = document.querySelector(BH_INF.sel);
      if (!bhSection) {
        var tries = 0;
        var ti = setInterval(function () {
          bhSection = document.querySelector(BH_INF.sel);
          if (bhSection || ++tries > 60) clearInterval(ti);
        }, 150);
      }
      setupObservers();
      raf = requestAnimationFrame(tick);
    }

    var fieldTries = 0;
    (function waitForField() {
      if (window.__auraFieldBg) {
        afterField();
      } else if (fieldTries++ < 50) {
        setTimeout(waitForField, 80);
      } else {
        afterField();
      }
    }());
  }

  var docObs = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      if (muts[i].target === document && muts[i].removedNodes.length) {
        bundleSwapped = true;
        docObs.disconnect();
        setTimeout(initialize, 350);
        return;
      }
    }
  });
  docObs.observe(document, { childList: true });

  window.addEventListener('load', function () {
    setTimeout(function () { if (!bundleSwapped) initialize(); }, 200);
  });

}());
