(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = document.querySelectorAll('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    revealItems.forEach(item => observer.observe(item));
  } else revealItems.forEach(item => item.classList.add('is-visible'));

  const heroGlow = document.querySelector('.hero-glow');
  if (heroGlow && !reduceMotion) {
    heroGlow.addEventListener('pointermove', event => {
      const rect = heroGlow.getBoundingClientRect();
      heroGlow.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
      heroGlow.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
    });
    heroGlow.addEventListener('pointerleave', () => {
      heroGlow.style.setProperty('--pointer-x', '50%');
      heroGlow.style.setProperty('--pointer-y', '35%');
    });
  }

  // Shift the ambient background palette and light position as sections enter view.
  const sections = [...document.querySelectorAll('main > section')];
  const sceneStops = [165, 190, 218, 265, 300, 145];
  if (!reduceMotion && sections.length) {
    const setScene = (index) => {
      const hue = sceneStops[index % sceneStops.length];
      document.documentElement.style.setProperty('--scene-hue', hue);
      document.documentElement.style.setProperty('--scene-x', `${18 + ((index * 23) % 66)}%`);
      document.documentElement.style.setProperty('--scene-y', `${12 + ((index * 17) % 64)}%`);
    };
    const sceneObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setScene(sections.indexOf(entry.target));
      });
    }, { threshold: 0.28 });
    sections.forEach(section => sceneObserver.observe(section));

    let ticking = false;
    const updateScrollAtmosphere = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      document.documentElement.style.setProperty('--scroll-progress', progress.toFixed(3));
      // Gentle parallax on the ambient light, independent of content movement.
      document.documentElement.style.setProperty('--scene-y', `${12 + progress * 66}%`);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { window.requestAnimationFrame(updateScrollAtmosphere); ticking = true; }
    }, { passive: true });
    updateScrollAtmosphere();
  }

  const canTilt = !reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (canTilt) document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.transform = `perspective(900px) rotateX(${(0.5-y)*3.5}deg) rotateY(${(x-0.5)*3.5}deg)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
})();

// Cursor-reactive starfield with subtle CAD wireframe connections.
(() => {
  const canvas = document.getElementById('engineering-cosmos');
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let width = 0, height = 0, dpr = 1, scroll = window.scrollY || 0;
  let particles = [];
  const pointer = { x: -1000, y: -1000, tx: -1000, ty: -1000 };
  const count = () => Math.min(115, Math.max(48, Math.floor((width * height) / 14500)));
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = Array.from({ length: count() }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      ox: Math.random() * width, oy: Math.random() * height,
      r: Math.random() * 1.5 + .35, drift: Math.random() * .45 + .12,
      phase: Math.random() * Math.PI * 2
    }));
  };
  const move = e => { pointer.tx = e.clientX; pointer.ty = e.clientY; };
  if (finePointer) window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerleave', () => { pointer.tx = -1000; pointer.ty = -1000; }, { passive: true });
  window.addEventListener('scroll', () => { scroll = window.scrollY || 0; }, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  resize();
  let frame = 0;
  const draw = () => {
    frame++;
    pointer.x += (pointer.tx - pointer.x) * .075;
    pointer.y += (pointer.ty - pointer.y) * .075;
    ctx.clearRect(0, 0, width, height);
    const hue = 175 + (Math.sin(scroll * .0013) + 1) * 62;
    const parallax = (scroll * .035) % (height + 100);
    const pts = particles;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.x = (p.ox + Math.sin(frame * .006 + p.phase) * 14 + width) % width;
      p.y = (p.oy - parallax * p.drift + height + 100) % (height + 100) - 50;
      const dx = p.x - pointer.x, dy = p.y - pointer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 145 && dist > 0) {
        const force = (145 - dist) / 145 * (finePointer ? 24 : 0);
        p.x += dx / dist * force; p.y += dy / dist * force;
      }
      const glow = dist < 180 ? .75 : .34;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue + (i % 30)}, 88%, 76%, ${glow})`; ctx.fill();
      // Short neighboring links form a restrained technical mesh.
      for (let j = i + 1; j < Math.min(i + 5, pts.length); j++) {
        const q = pts[j]; const lx = p.x - q.x, ly = p.y - q.y;
        const ld = Math.hypot(lx, ly);
        if (ld < 125) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `hsla(${hue}, 82%, 68%, ${(1 - ld / 125) * .14})`;
          ctx.lineWidth = .65; ctx.stroke();
        }
      }
    }
    // Cursor halo and faint orbital rings, like a CAD targeting reticle.
    if (finePointer && pointer.x > -100) {
      const pulse = 1 + Math.sin(frame * .045) * 3;
      ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 38 + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 90%, 72%, .18)`; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 54 + pulse, -.6, .6);
      ctx.strokeStyle = `hsla(${hue + 45}, 90%, 72%, .13)`; ctx.stroke();
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
})();
