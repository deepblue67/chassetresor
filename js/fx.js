// Effets visuels : confettis et pluie de pièces.

export function confetti({ count = 140, emojis = null, duration = 2800 } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.className = 'confetti';
  document.body.appendChild(c);
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = c.width = innerWidth * dpr, H = c.height = innerHeight * dpr;
  const ctx = c.getContext('2d');
  const styles = getComputedStyle(document.documentElement);
  const colors = ['--accent', '--accent2', '--bg2'].map(v => styles.getPropertyValue(v).trim()).concat(['#ffffff', '#3dbe7a', '#4d8dff']);
  const parts = Array.from({ length: count }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3,
    y: H * 0.45,
    vx: (Math.random() - 0.5) * 18 * dpr,
    vy: (-Math.random() * 20 - 8) * dpr,
    r: (6 + Math.random() * 8) * dpr,
    rot: Math.random() * 6,
    vr: (Math.random() - 0.5) * 0.4,
    color: colors[Math.floor(Math.random() * colors.length)],
    emoji: emojis && Math.random() < 0.25 ? emojis[Math.floor(Math.random() * emojis.length)] : null,
  }));
  const start = performance.now();
  const frame = now => {
    const t = now - start;
    ctx.clearRect(0, 0, W, H);
    parts.forEach(p => {
      p.vy += 0.55 * dpr;
      p.vx *= 0.99;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t / duration);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.emoji) {
        ctx.font = `${p.r * 2.6}px serif`;
        ctx.fillText(p.emoji, -p.r, p.r);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      }
      ctx.restore();
    });
    if (t < duration) requestAnimationFrame(frame);
    else c.remove();
  };
  requestAnimationFrame(frame);
}
