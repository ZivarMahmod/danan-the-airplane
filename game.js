(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const speedEl = document.getElementById('speed');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const overlayTitle = overlay.querySelector('h1');
  const overlayText = overlay.querySelector('p:not(.keys)');

  const W = canvas.width;
  const H = canvas.height;
  const GROUND_Y = H - 50;
  const GRAVITY = 0.6;
  const JUMP_V = -13;
  const BASE_SPEED = 4;

  const STATE = { MENU: 0, PLAY: 1, OVER: 2, PAUSE: 3 };

  let state = STATE.MENU;
  let distance = 0;
  let score = 0;
  let best = +(localStorage.getItem('danan-best') || 0);
  let speedMul = 1;
  let jumps = 0;
  let jumpPulse = 0;
  let obstacles = [];
  let clouds = [];
  let stars = [];
  let groundOffset = 0;
  let spawnTimer = 0;
  let lastFrame = 0;

  bestEl.textContent = best;

  const danan = {
    x: 90,
    y: GROUND_Y,
    w: 48,
    h: 52,
    vy: 0,
    onGround: true,
    propPhase: 0,
    runFrame: 0,
    runTimer: 0,
  };

  function reset() {
    distance = 0;
    score = 0;
    speedMul = 1;
    jumps = 0;
    jumpPulse = 0;
    obstacles = [];
    spawnTimer = 60;
    danan.y = GROUND_Y;
    danan.vy = 0;
    danan.onGround = true;
    updateHUD();
  }

  function initStars() {
    stars = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * (GROUND_Y - 20),
        r: Math.random() * 1.2 + 0.2,
        tw: Math.random() * Math.PI * 2,
      });
    }
  }
  function initClouds() {
    clouds = [];
    for (let i = 0; i < 5; i++) {
      clouds.push({
        x: Math.random() * W,
        y: 30 + Math.random() * 120,
        s: 0.4 + Math.random() * 0.6,
      });
    }
  }
  initStars();
  initClouds();

  function jump() {
    if (state === STATE.MENU) { startGame(); return; }
    if (state === STATE.OVER) { startGame(); return; }
    if (state !== STATE.PLAY) return;
    if (danan.onGround) {
      danan.vy = JUMP_V;
      danan.onGround = false;
      jumps++;
      jumpPulse = 1;
    }
  }

  function startGame() {
    reset();
    state = STATE.PLAY;
    overlay.classList.add('hidden');
  }

  function gameOver() {
    state = STATE.OVER;
    if (score > best) {
      best = score;
      localStorage.setItem('danan-best', best);
      bestEl.textContent = best;
    }
    overlayTitle.textContent = 'Krasch!';
    overlayText.innerHTML = `Du fick <b>${score}</b> poäng på <b>${Math.floor(distance)} m</b> och hoppade <b>${jumps}</b> gånger.<br>Tryck <kbd>Space</kbd> eller knappen för att försöka igen.`;
    startBtn.textContent = 'Spela igen';
    overlay.classList.remove('hidden');
  }

  function togglePause() {
    if (state === STATE.PLAY) {
      state = STATE.PAUSE;
      overlayTitle.textContent = 'Paus';
      overlayText.textContent = 'Tryck P för att fortsätta.';
      startBtn.textContent = 'Fortsätt';
      overlay.classList.remove('hidden');
    } else if (state === STATE.PAUSE) {
      state = STATE.PLAY;
      overlay.classList.add('hidden');
    }
  }

  function spawnObstacle() {
    const types = ['cactus', 'cactus', 'rock', 'tall'];
    const t = types[Math.floor(Math.random() * types.length)];
    let w, h;
    if (t === 'cactus') { w = 18; h = 38; }
    else if (t === 'rock') { w = 30; h = 22; }
    else { w = 22; h = 56; }
    obstacles.push({ x: W + 20, y: GROUND_Y - h, w, h, type: t });
  }

  function updateHUD() {
    scoreEl.textContent = score;
    speedEl.textContent = speedMul.toFixed(1) + 'x';
  }

  function update(dt) {
    if (state !== STATE.PLAY) return;

    const speed = BASE_SPEED * speedMul;

    distance += speed * dt * 0.1;
    const newScore = Math.floor(distance / 20);
    if (newScore > score) {
      score = newScore;
      speedMul = 1 + score * 0.003;
      updateHUD();
    }

    danan.vy += GRAVITY;
    danan.y += danan.vy;
    if (danan.y >= GROUND_Y) {
      danan.y = GROUND_Y;
      danan.vy = 0;
      danan.onGround = true;
    }
    danan.propPhase += dt * 0.8;
    if (danan.onGround) {
      danan.runTimer += dt;
      if (danan.runTimer > 5) { danan.runFrame ^= 1; danan.runTimer = 0; }
    }

    groundOffset = (groundOffset + speed) % 40;
    if (jumpPulse > 0) jumpPulse = Math.max(0, jumpPulse - dt * 0.04);

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnObstacle();
      const minGap = Math.max(60, 110 - score * 1);
      const maxGap = Math.max(100, 200 - score * 1.5);
      spawnTimer = minGap + Math.random() * (maxGap - minGap);
    }

    for (const o of obstacles) o.x -= speed;
    obstacles = obstacles.filter(o => o.x + o.w > -10);

    for (const c of clouds) {
      c.x -= speed * 0.2 * c.s;
      if (c.x < -80) { c.x = W + 80; c.y = 30 + Math.random() * 120; c.s = 0.4 + Math.random() * 0.6; }
    }
    for (const s of stars) s.tw += dt * 0.1;

    const hb = { x: danan.x + 8, y: danan.y - danan.h + 20, w: danan.w - 14, h: danan.h - 22 };
    for (const o of obstacles) {
      if (hb.x < o.x + o.w && hb.x + hb.w > o.x && hb.y < o.y + o.h && hb.y + hb.h > o.y) {
        gameOver();
        return;
      }
    }
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, '#1e1b4b');
    g.addColorStop(0.6, '#312e81');
    g.addColorStop(1, '#7c2d12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, GROUND_Y);

    for (const s of stars) {
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(s.tw));
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
    ctx.beginPath();
    ctx.arc(W - 90, 70, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
    ctx.beginPath();
    ctx.arc(W - 90, 70, 60, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    for (const c of clouds) {
      const r = 14 * c.s;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.arc(c.x + r * 1.1, c.y + 4, r * 0.9, 0, Math.PI * 2);
      ctx.arc(c.x - r, c.y + 4, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGround() {
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 1);
    ctx.lineTo(W, GROUND_Y + 1);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    for (let x = -groundOffset; x < W; x += 40) {
      ctx.fillRect(x, GROUND_Y + 10, 16, 3);
      ctx.fillRect(x + 22, GROUND_Y + 22, 10, 2);
    }
  }

  function px(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  function drawDanan() {
    const baseX = danan.x;
    const topY = danan.y - danan.h;

    ctx.save();
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 3;
    ctx.fillText('DANAN THE AIRPLANE', baseX + danan.w / 2, topY - 14);
    ctx.shadowBlur = 0;
    ctx.restore();

    const propY = topY - 6;
    const propX = baseX + 26;
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(propX - 1, propY, 2, 4);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    const blade = Math.sin(danan.propPhase * 8) * 10;
    ctx.beginPath();
    ctx.moveTo(propX - blade, propY - 1);
    ctx.lineTo(propX + blade, propY - 1);
    ctx.stroke();
    ctx.fillStyle = '#92400e';
    ctx.fillRect(propX - 1, propY - 2, 2, 2);

    const body = '#10b981';
    const shade = '#065f46';
    const belly = '#34d399';

    px(baseX + 22, topY + 6, 22, 16, body);
    px(baseX + 28, topY + 4, 14, 4, body);
    px(baseX + 26, topY + 8, 4, 2, belly);
    px(baseX + 32, topY + 10, 4, 2, belly);
    px(baseX + 38, topY + 7, 2, 2, '#ffffff');
    px(baseX + 39, topY + 8, 1, 1, '#0f172a');
    px(baseX + 36, topY + 12, 6, 2, '#0f172a');
    px(baseX + 22, topY + 22, 26, 14, body);
    px(baseX + 22, topY + 22, 2, 14, shade);
    px(baseX + 26, topY + 28, 14, 4, belly);
    px(baseX + 14, topY + 24, 10, 4, body);
    px(baseX + 6, topY + 22, 10, 6, body);
    px(baseX + 6, topY + 22, 2, 6, shade);
    px(baseX + 2, topY + 26, 6, 4, body);

    px(baseX + 30, topY + 32, 4, 4, shade);
    px(baseX + 34, topY + 32, 4, 4, shade);

    if (danan.onGround) {
      if (danan.runFrame === 0) {
        px(baseX + 26, topY + 36, 6, 12, body);
        px(baseX + 26, topY + 48, 8, 4, shade);
        px(baseX + 38, topY + 36, 6, 6, body);
        px(baseX + 36, topY + 42, 8, 4, body);
        px(baseX + 36, topY + 46, 8, 4, shade);
      } else {
        px(baseX + 26, topY + 36, 6, 6, body);
        px(baseX + 24, topY + 42, 8, 4, body);
        px(baseX + 24, topY + 46, 8, 4, shade);
        px(baseX + 38, topY + 36, 6, 12, body);
        px(baseX + 38, topY + 48, 8, 4, shade);
      }
    } else {
      px(baseX + 26, topY + 36, 6, 8, body);
      px(baseX + 38, topY + 36, 6, 8, body);
      px(baseX + 24, topY + 44, 10, 4, shade);
      px(baseX + 36, topY + 44, 10, 4, shade);
    }

    if (!danan.onGround) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      const shadowScale = Math.max(0.3, 1 - (GROUND_Y - danan.y) / 200);
      ctx.ellipse(baseX + danan.w / 2, GROUND_Y + 4, 22 * shadowScale, 4 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawObstacle(o) {
    if (o.type === 'cactus') {
      ctx.fillStyle = '#15803d';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillRect(o.x - 6, o.y + 10, 6, 14);
      ctx.fillRect(o.x + o.w, o.y + 6, 6, 14);
      ctx.fillStyle = '#166534';
      ctx.fillRect(o.x + 4, o.y + 4, 2, o.h - 8);
    } else if (o.type === 'rock') {
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(o.x, o.y + o.h);
      ctx.lineTo(o.x + 4, o.y + 4);
      ctx.lineTo(o.x + o.w / 2, o.y);
      ctx.lineTo(o.x + o.w - 4, o.y + 6);
      ctx.lineTo(o.x + o.w, o.y + o.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(o.x + 6, o.y + 8, 4, 4);
    } else {
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(o.x + 4, o.y + 8, o.w - 8, 4);
      ctx.fillRect(o.x + 4, o.y + 24, o.w - 8, 4);
      ctx.fillRect(o.x + 4, o.y + 40, o.w - 8, 4);
    }
  }

  function drawJumpCounter() {
    const cx = W / 2;
    const cy = H / 2 - 10;
    const pulse = 1 + jumpPulse * 0.25;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(248, 250, 252, 0.35)';
    ctx.fillText('HOPP', cx, cy - 70);

    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.font = 'bold 140px "Segoe UI", sans-serif';
    const alpha = 0.18 + jumpPulse * 0.5;
    ctx.fillStyle = `rgba(245, 158, 11, ${alpha})`;
    ctx.fillText(String(jumps), 0, 0);

    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(251, 191, 36, ${0.25 + jumpPulse * 0.5})`;
    ctx.strokeText(String(jumps), 0, 0);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawClouds();
    if (state === STATE.PLAY || state === STATE.PAUSE) drawJumpCounter();
    drawGround();
    for (const o of obstacles) drawObstacle(o);
    drawDanan();

    if (state === STATE.PLAY) {
      ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.floor(distance)} m`, W - 16, 24);
      ctx.textAlign = 'left';
    }
  }

  function loop(ts) {
    if (!lastFrame) lastFrame = ts;
    const dtMs = ts - lastFrame;
    lastFrame = ts;
    const dt = Math.min(dtMs / 16.67, 2.5);

    update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      jump();
    } else if (e.code === 'KeyP') {
      togglePause();
    } else if (e.code === 'KeyR') {
      startGame();
    }
  });

  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
  startBtn.addEventListener('click', () => {
    if (state === STATE.PAUSE) togglePause(); else startGame();
  });
})();
