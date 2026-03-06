<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>NEON PLINKO VIP</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
/* ══════════════════════════════════════════════════════
   ROOT VARIABLES & RESET (Tetap Sesuai Permintaan)
══════════════════════════════════════════════════════ */
:root{
  --pink:#ff0077; --blue:#0055ff; --yellow:#f5e642; --bg:#02030d;
  --gp:0 0 8px rgba(255,0,119,.65),0 0 24px rgba(255,0,119,.22);
  --gb:0 0 8px rgba(0,85,255,.65),0 0 24px rgba(0,85,255,.22);
  --gy:0 0 8px rgba(245,230,66,.65),0 0 24px rgba(245,230,66,.22);
  --bp:rgba(255,0,119,.35); --bb:rgba(0,85,255,.35); --by:rgba(245,230,66,.35);
  --header-h: 56px; --board-h: 240px; --slot-h: 40px; --ctrl-h: 220px;
}
*{ box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
html{ height:100%; width:100%; }
body{
  width:100%; overflow:hidden; display:grid;
  grid-template-rows: var(--header-h) var(--board-h) var(--slot-h) 1fr;
  background:var(--bg); color:#dde0f0; font-family:'Outfit',sans-serif;
}
body::after{
  content:''; position:fixed; inset:0; pointer-events:none; z-index:0;
  background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.014) 3px,rgba(0,0,0,.014) 4px);
}

/* MODAL & HEADER */
#modal-overlay{ display:none; position:fixed; inset:0; background:rgba(0,0,0,.72); backdrop-filter:blur(6px); z-index:9998; }
#neon-modal{
  display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
  background:linear-gradient(160deg,#07091d,#0b0d24); border-radius:22px; z-index:9999;
  padding:26px 22px; text-align:center; min-width:270px; max-width:310px; width:86%;
  border:1px solid var(--bp); box-shadow:var(--gp); animation:mpop .3s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes mpop{ from{opacity:0;transform:translate(-50%,-50%) scale(.7)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
.modal-btn{ margin-top:15px; padding:9px 24px; border-radius:50px; cursor:pointer; background:transparent; border:1px solid var(--bp); color:var(--pink); }

.header{ grid-row:1; z-index:10; padding:9px 14px; background:rgba(2,3,13,.96); border-bottom:1px solid rgba(0,85,255,.28); display:flex; align-items:center; justify-content:space-between; }
.header-item{ display:flex; flex-direction:column; align-items:center; cursor:pointer; min-width:50px; }
.balance-box{ flex:1; margin:0 10px; background:rgba(0,0,0,.55); border:1px solid var(--bp); border-radius:20px; padding:5px 16px; text-align:center; box-shadow:var(--gp); }
#display-saldo{ font-family:'Cinzel Decorative',serif; font-size:15px; font-weight:900; color:#fff; text-shadow:var(--gp); }

/* BOARD & SLOTS */
#board-wrapper{ grid-row:2; position:relative; overflow:hidden; background:#010209; }
#plinko-canvas{ position:absolute; top:0; left:0; display:block; }
#floating-score{ position:absolute; top:6px; right:7px; background:rgba(2,3,13,.9); border:1px solid var(--bb); border-radius:11px; padding:5px 9px; z-index:50; min-width:88px; }
.score-entry{ font-size:9.5px; font-weight:700; color:var(--yellow); border-bottom:1px solid rgba(255,255,255,.07); padding:3px 0; text-align:center; }

.multiplier-row{ grid-row:3; display:flex; justify-content:center; align-items:center; gap:4px; padding:0 12px; }
.slot{ flex:1; height:30px; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:900; border-radius:8px; transition:.2s; }
.slot.active{ transform:scale(1.1); filter:brightness(1.8); box-shadow:0 0 15px #fff; }
.s-high{ background:linear-gradient(135deg,var(--pink),#cc0044); color:#fff; }
.s-mid { background:linear-gradient(135deg,var(--yellow),#b8a800); color:#000; }
.s-low { background:linear-gradient(135deg,var(--blue),#0022bb); color:#fff; }

/* CONTROLS */
.controls{ grid-row:4; z-index:10; padding:8px 16px 0; background:rgba(2,3,13,.97); border-top:1px solid rgba(0,85,255,.28); display:flex; flex-direction:column; gap:7px; }
.mode-row{ display:flex; gap:8px; }
.btn-mode{ flex:1; background:transparent; padding:9px 4px; border-radius:12px; font-size:10px; font-weight:700; cursor:pointer; color:#fff; border:1px solid rgba(255,255,255,0.1); }
.btn-mode.active{ border-color:var(--pink); background:rgba(255,0,119,0.1); }
.bet-row{ display:flex; align-items:center; gap:10px; background:rgba(0,0,0,.35); border:1px solid rgba(0,85,255,.2); border-radius:50px; padding:5px 10px; }
.bet-btn{ width:36px; height:36px; font-size:22px; cursor:pointer; background:transparent; border:none; color:var(--pink); }
#current-bet{ font-family:'Cinzel Decorative',serif; font-size:18px; font-weight:900; color:var(--yellow); }
.btn-play{ width:100%; padding:14px; border-radius:50px; cursor:pointer; font-family:'Cinzel Decorative',serif; font-size:13px; font-weight:900; background:linear-gradient(90deg,var(--pink),var(--blue)); color:#fff; border:none; }
.btn-play.stop-mode{ background:var(--yellow); color:#000; }
.nav-bottom{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; padding:10px 0; }
.nav-btn{ display:flex; flex-direction:column; align-items:center; padding:9px 0; border-radius:14px; text-decoration:none; font-size:8.5px; border:1px solid rgba(255,255,255,0.1); color:#fff; }
</style>
</head>
<body>

<audio id="snd-hit" src="https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3" preload="none"></audio>
<audio id="snd-win" src="https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3" preload="none"></audio>
<audio id="snd-error" src="https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3" preload="none"></audio>
<audio id="snd-click" src="https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3" preload="none"></audio>

<div id="modal-overlay" onclick="closeModal()"></div>
<div id="neon-modal">
  <div id="modal-title">⚠️ PERHATIAN</div>
  <div id="modal-msg"></div>
  <button class="modal-btn" onclick="closeModal()">OK</button>
</div>

<div class="header">
  <div class="header-item" onclick="location.href='profil.html'">
    <i class="fa-solid fa-circle-user" style="color:var(--yellow);"></i>
    <span>PROFIL</span>
  </div>
  <div class="balance-box">
    <div style="font-size:7px;opacity:0.5">SALDO UTAMA</div>
    <div id="display-saldo">IDR 0</div>
  </div>
  <div style="width:50px"></div>
</div>

<div id="board-wrapper">
  <canvas id="plinko-canvas"></canvas>
  <div id="floating-score"><div id="score-list"></div></div>
</div>

<div class="multiplier-row" id="slot-row"></div>

<div class="controls">
  <div class="mode-row">
    <button class="btn-mode active" id="m-normal" onclick="setSpeedMode('normal')">🎯 NORMAL</button>
    <button class="btn-mode" id="m-turbo" onclick="setSpeedMode('turbo')">⚡ TURBO</button>
    <button class="btn-mode" id="m-auto" onclick="toggleAuto()">🔄 AUTO: OFF</button>
  </div>

  <div class="bet-row">
    <button class="bet-btn" onclick="changeBet(-1)"><i class="fa-solid fa-circle-minus"></i></button>
    <div style="flex:1;text-align:center">
      <div style="font-size:7px;opacity:0.5">TARUHAN</div>
      <div id="current-bet">400</div>
    </div>
    <button class="bet-btn" onclick="changeBet(1)"><i class="fa-solid fa-circle-plus"></i></button>
  </div>
  <div id="bet-lock-hint" style="font-size:8px;color:var(--yellow);display:none;text-align:center">🔒 Stop AUTO untuk mengubah taruhan</div>

  <button class="btn-play" id="main-btn" onpointerdown="onPlayDown(event)" onpointerup="onPlayUp(event)">
    <i class="fa-solid fa-play" id="play-icon"></i>&nbsp;<span id="play-label">PLAY BALL</span>
  </button>

  <div class="nav-bottom">
    <a href="withdraw.html" class="nav-btn">WITHDRAW</a>
    <a href="deposit.html" class="nav-btn">DEPOSIT</a>
    <a href="reward.html" class="nav-btn">REWARD</a>
  </div>
</div>

<script src="global.js"></script>

<script>
/* ════════════════════════════════════════════════════════════
   ENGINE OPTIMIZED - FIX FLYING & SYNC
   ════════════════════════════════════════════════════════════ */
const ROWS = 10;
const MULTS = [10, 3, 1.5, 0.5, 0.2, 0.2, 0.5, 1.5, 3, 10];
const BETS = [400, 800, 1000, 1200, 1600, 2000, 4000, 8000, 10000, 20000];
const BALL_R = 6.0;
const PEG_R = 4.0;
const PH = {
  normal: { grav: 0.25, fric: 0.98, bounce: 0.45, autoMs: 700 },
  turbo: { grav: 0.45, fric: 0.96, bounce: 0.35, autoMs: 250 }
};

let canvas, ctx, DPR=1, BW=0, BH=0;
let pegs=[], balls=[], slotW=0;
let speedMode='normal', isAuto=false, autoTimer=null;
let betIdx=0, raf=null;
let _saldo = Math.max(0, parseFloat(localStorage.getItem('user_saldo')||0));

// ── CORE LOGIC ──
const _renderS = () => {
  document.getElementById('display-saldo').textContent = 'IDR ' + Math.floor(_saldo).toLocaleString('id-ID');
  localStorage.setItem('user_saldo', _saldo);
};

const addS = delta => { _saldo = Math.max(0, _saldo + delta); _renderS(); };

function fixLayout() {
  const H = window.innerHeight;
  const boardH = Math.max(200, H - 340);
  document.documentElement.style.setProperty('--board-h', boardH + 'px');
  document.body.style.height = H + 'px';
  return boardH;
}

function setupCanvas() {
  const wrap = document.getElementById('board-wrapper');
  canvas = document.getElementById('plinko-canvas');
  ctx = canvas.getContext('2d');
  DPR = window.devicePixelRatio || 1;
  BW = wrap.offsetWidth; BH = wrap.offsetHeight;
  canvas.width = BW * DPR; canvas.height = BH * DPR;
  canvas.style.width = BW + 'px'; canvas.style.height = BH + 'px';
  ctx.scale(DPR, DPR);
  buildPegs(); buildSlots();
}

function buildPegs() {
  pegs = [];
  const spacingX = (BW * 0.9) / ROWS;
  const spacingY = (BH * 0.85) / ROWS;
  for(let r=0; r<ROWS; r++){
    const count = r + 2;
    const rowW = (count - 1) * spacingX;
    const startX = (BW - rowW) / 2;
    for(let c=0; c<count; c++) pegs.push({ x: startX + c * spacingX, y: 30 + r * spacingY, glow: 0 });
  }
}

function buildSlots() {
  const row = document.getElementById('slot-row');
  row.innerHTML = ''; slotW = BW / MULTS.length;
  MULTS.forEach((m, i) => {
    const s = document.createElement('div');
    s.className = `slot ${m >= 3 ? 's-high' : m >= 1 ? 's-mid' : 's-low'}`;
    s.id = 'slot-' + i; s.textContent = m + 'x'; row.appendChild(s);
  });
}

// ── PHYSICS (FIX FLYING) ──
function gameLoop() {
  ctx.clearRect(0,0,BW,BH);
  pegs.forEach(p => {
    p.glow = Math.max(0, p.glow - 0.05);
    ctx.beginPath(); ctx.arc(p.x, p.y, PEG_R + p.glow*2, 0, Math.PI*2);
    ctx.fillStyle = p.glow > 0 ? '#fff' : '#444c80'; ctx.fill();
  });

  const ph = PH[speedMode];
  for (let i = balls.length - 1; i >= 0; i--) {
    let b = balls[i];
    b.vy += ph.grav; b.vx *= ph.fric; b.x += b.vx; b.y += b.vy;

    // Smooth Guidance to Target (Agar tidak melayang/acak di akhir)
    if (b.serverSlotIdx !== null) {
      let targetX = (b.serverSlotIdx + 0.5) * slotW;
      let progress = b.y / BH;
      if (progress > 0.4) { // Mulai arahkan setelah melewati tengah
        b.vx += (targetX - b.x) * (progress * 0.02);
      }
    }

    // Peg Collision
    pegs.forEach(p => {
      let dx = b.x - p.x, dy = b.y - p.y, d = Math.sqrt(dx*dx + dy*dy);
      if (d < BALL_R + PEG_R) {
        let nx = dx/d, ny = dy/d;
        b.x = p.x + nx * (BALL_R + PEG_R); b.y = p.y + ny * (BALL_R + PEG_R);
        let dot = b.vx * nx + b.vy * ny;
        b.vx = (b.vx - 2 * dot * nx) * ph.bounce + (Math.random()-0.5);
        b.vy = Math.abs(b.vy - 2 * dot * ny) * ph.bounce;
        if(b.vy < 1) b.vy = 1.5; // Pastikan bola jatuh, tidak melayang
        p.glow = 1; snd('hit');
      }
    });

    // Wall
    if (b.x < BALL_R || b.x > BW-BALL_R) b.vx *= -0.5;

    // Draw Ball
    ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI*2);
    ctx.fillStyle = '#ff0077'; ctx.shadowBlur = 10; ctx.shadowColor = '#ff0077'; ctx.fill();
    ctx.shadowBlur = 0;

    // Landed
    if (b.y > BH) {
      onBallLand(b);
      balls.splice(i, 1);
    }
  }
  raf = requestAnimationFrame(gameLoop);
}

function onBallLand(b) {
  let idx = Math.floor(b.x / slotW);
  idx = Math.min(MULTS.length-1, Math.max(0, b.serverSlotIdx !== null ? b.serverSlotIdx : idx));
  
  const mult = MULTS[idx];
  const win = Math.floor(b.bet * mult);
  
  // Update Saldo Sesuai Perkalian
  addS(win);
  
  // Efek Slot Berkedip Sesuai Bola
  const el = document.getElementById('slot-' + idx);
  if(el) {
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 500);
  }

  const list = document.getElementById('score-list');
  const entry = document.createElement('div');
  entry.className = 'score-entry';
  entry.innerHTML = `<span style="color:${mult>=1?'var(--yellow)':'var(--blue)'}">${mult}x</span> | IDR ${win}`;
  list.prepend(entry);
  if(list.children.length > 5) list.lastChild.remove();
  if(mult >= 1) snd('win');
}

function spawnBall() {
  const bet = BETS[betIdx];
  if (_saldo < bet) { showModal("Saldo Kurang!"); stopAuto(); return; }
  
  const snapshotSaldo = _saldo;
  addS(-bet); // Kurangi bet di awal

  const ball = { 
    x: BW/2 + (Math.random()-0.5)*20, y: -10, 
    vx: (Math.random()-0.5)*2, vy: 2, 
    bet: bet, serverSlotIdx: null 
  };
  balls.push(ball);

  // Sync dengan Server/API (Gunakan data server untuk hasil akhir)
  const SCRIPT_URL = window.SCRIPT_URL || ""; 
  fetch(SCRIPT_URL + "?data=" + encodeURIComponent(JSON.stringify({
    action: 'game_play', username: localStorage.getItem('username'), bet: bet, saldoAwal: snapshotSaldo
  })))
  .then(r => r.json())
  .then(res => {
    if(res.result === 'SUCCESS') {
      // Cari index slot yang memiliki multiplier sama dengan hasil server
      const possibleIndices = [];
      MULTS.forEach((m, i) => { if(m === res.target_multiplier) possibleIndices.push(i); });
      ball.serverSlotIdx = possibleIndices[Math.floor(Math.random()*possibleIndices.length)];
    }
  }).catch(e => {
    // Jika gagal connect, biarkan jatuh random (fallback aman)
  });
}

// ── UI HELPERS ──
function setSpeedMode(m) {
  speedMode = m; snd('click');
  document.getElementById('m-normal').classList.toggle('active', m==='normal');
  document.getElementById('m-turbo').classList.toggle('active', m==='turbo');
}
function changeBet(d) {
  if(isAuto) return;
  betIdx = Math.max(0, Math.min(BETS.length-1, betIdx + d));
  document.getElementById('current-bet').textContent = BETS[betIdx].toLocaleString('id-ID');
  snd('click');
}
function toggleAuto() {
  isAuto = !isAuto;
  document.getElementById('m-auto').classList.toggle('active', isAuto);
  document.getElementById('m-auto').textContent = isAuto ? '🔄 AUTO: ON' : '🔄 AUTO: OFF';
  document.getElementById('bet-lock-hint').style.display = isAuto ? 'block' : 'none';
  if(isAuto) { spawnBall(); autoTimer = setInterval(spawnBall, PH[speedMode].autoMs); }
  else clearInterval(autoTimer);
}
function onPlayDown(e) { if(!isAuto) spawnBall(); snd('click'); }
function onPlayUp(e) {}
function closeModal() { document.getElementById('neon-modal').style.display='none'; document.getElementById('modal-overlay').style.display='none'; }
function showModal(msg) { document.getElementById('modal-msg').textContent = msg; document.getElementById('neon-modal').style.display='block'; document.getElementById('modal-overlay').style.display='block'; }
function snd(t) { try { let a = document.getElementById('snd-'+t); a.currentTime=0; a.play(); } catch(e){} }

document.addEventListener('DOMContentLoaded', () => {
  fixLayout(); setupCanvas(); _renderS(); gameLoop();
});
window.addEventListener('resize', () => { fixLayout(); setupCanvas(); });
</script>
</body>
</html>
