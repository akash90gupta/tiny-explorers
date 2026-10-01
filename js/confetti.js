// Lightweight confetti on a full-screen canvas.

const canvas = document.getElementById('confetti');
const c2d = canvas.getContext('2d');
const COLORS = ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93', '#FF8FAB', '#FF924C'];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let parts = [];
let running = false;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
resize();

function spawn(x, y, vx, vy) {
  parts.push({
    x, y, vx, vy,
    w: 6 + Math.random() * 8,
    h: 8 + Math.random() * 10,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: COLORS[(Math.random() * COLORS.length) | 0],
    life: 1,
    round: Math.random() < 0.35,
  });
}

function loop() {
  c2d.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
  for (const p of parts) {
    p.vy += 0.25;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.r += p.vr;
    p.life -= 0.006;
    c2d.save();
    c2d.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
    c2d.translate(p.x, p.y);
    c2d.rotate(p.r);
    c2d.fillStyle = p.color;
    if (p.round) { c2d.beginPath(); c2d.arc(0, 0, p.w / 2, 0, Math.PI * 2); c2d.fill(); }
    else c2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    c2d.restore();
  }
  if (parts.length) requestAnimationFrame(loop);
  else { running = false; c2d.clearRect(0, 0, innerWidth, innerHeight); }
}

function start() {
  if (!running) { running = true; requestAnimationFrame(loop); }
}

export function burst(x, y, count = 30) {
  const n = reduced ? Math.ceil(count / 4) : count;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 4 + Math.random() * 7;
    spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - 5);
  }
  start();
}

export function rain(count = 140) {
  const n = reduced ? 30 : count;
  for (let i = 0; i < n; i++) spawn(Math.random() * innerWidth, -20 - Math.random() * innerHeight * 0.6, (Math.random() - 0.5) * 3, Math.random() * 2);
  start();
}
