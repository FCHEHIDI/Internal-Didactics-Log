/**
 * fractal-bg.js
 * IDL — Internal Didactics Log
 *
 * Neural Lattice Noise renderer — animated canvas background.
 * Visual reference: global_site_bg_prompt.txt · Variant 4
 *   "Fine white neural-network-like lattice on pure black.
 *    Nodes pulse faintly, edges blur at distance into fractal noise."
 */
(function () {
  'use strict';

  const canvas = document.getElementById('fractal-bg');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const CFG = {
    nodeCount:   72,
    maxDist:     190,
    speed:       0.16,
    nodeRadius:  1.3,
    lineOpacity: 0.10,
    nodeOpacity: 0.20,
    color:       '240,240,240',    // --white base
    accentColor: '163,228,176',    // --phosphor, used for nearby nodes
    accentDist:  80,               // distance at which accent kicks in
  };

  let nodes = [];
  let raf;
  let w, h;

  /* ── Resize ────────────────────────────────────────────────── */
  function resize() {
    w = canvas.width  = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  /* ── Seed nodes ────────────────────────────────────────────── */
  function seed() {
    nodes = Array.from({ length: CFG.nodeCount }, () => ({
      x:  Math.random() * w,
      y:  Math.random() * h,
      vx: (Math.random() - 0.5) * CFG.speed,
      vy: (Math.random() - 0.5) * CFG.speed,
    }));
  }

  /* ── Frame ─────────────────────────────────────────────────── */
  function frame() {
    ctx.clearRect(0, 0, w, h);

    /* Move nodes */
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }

    /* Draw edges */
    const maxDistSq   = CFG.maxDist   * CFG.maxDist;
    const accentDistSq = CFG.accentDist * CFG.accentDist;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dSq = dx * dx + dy * dy;

        if (dSq >= maxDistSq) continue;

        const proximity = 1 - dSq / maxDistSq;
        const alpha     = proximity * CFG.lineOpacity;

        /* Phosphor accent for very close nodes */
        const col = dSq < accentDistSq
          ? CFG.accentColor
          : CFG.color;

        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.strokeStyle = `rgba(${col},${alpha.toFixed(3)})`;
        ctx.lineWidth   = 0.5;
        ctx.stroke();
      }
    }

    /* Draw nodes */
    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, CFG.nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${CFG.color},${CFG.nodeOpacity})`;
      ctx.fill();
    }

    raf = requestAnimationFrame(frame);
  }

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    resize();
    seed();
    frame();
  }

  /* Debounced resize handler */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      cancelAnimationFrame(raf);
      resize();
      seed();
      frame();
    }, 200);
  });

  /* Pause when tab is hidden, resume on visibility */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      frame();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
