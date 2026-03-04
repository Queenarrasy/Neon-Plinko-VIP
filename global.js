/**
 * ============================================================
 *  GLOBAL.JS — NEON PLINKO VIP
 *  Pusat koneksi semua halaman ke Google Sheets (Apps Script)
 *  Versi: 2.0 | Multi-device, Real-time Sync
 * ============================================================
 */

// ─── CONFIG ─────────────────────────────────────────────────
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec";
const SYNC_INTERVAL_MS   = 8000;   // sync saldo otomatis setiap 8 detik
const SESSION_CHECK_MS   = 15000;  // cek session setiap 15 detik
const USDT_RATE_CACHE_MS = 300000; // cache kurs USDT 5 menit

// ─── UTILITIES ──────────────────────────────────────────────
function getUsername() {
  return localStorage.getItem('username') || null;
}
function getSaldo() {
  return parseFloat(localStorage.getItem('user_saldo') || 0);
}
function setSaldo(val) {
  const v = parseFloat(val) || 0;
  localStorage.setItem('user_saldo', v);
  _broadcastSaldo(v);
}
function fmtIDR(val) {
  return 'IDR ' + Math.floor(val).toLocaleString('id-ID');
}
function fmtDate(d) {
  if (!d) d = new Date();
  if (!(d instanceof Date)) d = new Date(d);
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

// ─── SERVER CALL ─────────────────────────────────────────────
async function apiCall(payload) {
  // Coba GET dulu (kompatibel dengan WebView/cors)
  try {
    const url = SCRIPT_URL + '?data=' + encodeURIComponent(JSON.stringify(payload));
    const r = await fetch(url, { redirect: 'follow' });
    const t = await r.text();
    try { const j = JSON.parse(t); if (j && j.result !== undefined) return j; } catch(e) {}
  } catch(e) {}
  // Fallback POST
  try {
    const r2 = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
    const t2 = await r2.text();
    return JSON.parse(t2);
  } catch(e) {
    return { result: 'ERROR', message: 'Koneksi gagal. Cek internet.' };
  }
}

// ─── SALDO SYNC (broadcast ke semua elemen #display-saldo) ───
function _broadcastSaldo(val) {
  const v = parseFloat(val) || 0;
  document.querySelectorAll('#display-saldo, #wd-balance').forEach(el => {
    el.textContent = fmtIDR(v);
  });
}

// ─── AUTO SYNC SALDO DARI SERVER ─────────────────────────────
let _syncInterval = null;
function startSaldoSync() {
  if (_syncInterval) clearInterval(_syncInterval);
  _syncInterval = setInterval(async () => {
    const u = getUsername();
    if (!u) return;
    try {
      const res = await apiCall({ action: 'get_saldo', username: u });
      if (res.result === 'SUCCESS' && res.saldo !== undefined) {
        setSaldo(res.saldo);
        // simpan juga data profil terbaru jika tersedia
        if (res.tier) localStorage.setItem('user_tier', res.tier);
        if (res.winrate) localStorage.setItem('user_winrate', res.winrate);
        if (res.maxWinLimit) localStorage.setItem('user_maxWinLimit', res.maxWinLimit);
        if (res.sessionMinutes) localStorage.setItem('user_sessionMinutes', res.sessionMinutes);
        if (res.status) localStorage.setItem('user_status', res.status);
      }
    } catch(e) {}
  }, SYNC_INTERVAL_MS);
}
function stopSaldoSync() {
  if (_syncInterval) clearInterval(_syncInterval);
  _syncInterval = null;
}

// ─── SESSION ONLINE/OFFLINE ──────────────────────────────────
async function setOnline() {
  const u = getUsername();
  if (!u) return;
  try { await apiCall({ action: 'set_status', username: u, status: 'ONLINE' }); } catch(e) {}
}
async function setOffline() {
  const u = getUsername();
  if (!u) return;
  try { await apiCall({ action: 'set_status', username: u, status: 'OFFLINE' }); } catch(e) {}
}
// Tandai offline saat tab ditutup
window.addEventListener('beforeunload', setOffline);
window.addEventListener('visibilitychange', () => {
  if (document.hidden) setOffline(); else setOnline();
});

// ─── LOGOUT ──────────────────────────────────────────────────
async function userLogout() {
  await setOffline();
  stopSaldoSync();
  const keep = ['username']; // jangan hapus semua agar debug mudah
  localStorage.clear();
  window.location.href = 'index.html';
}

// ─── UPDATE UI UNIVERSAL ─────────────────────────────────────
function updateUI(data) {
  if (data.saldo !== undefined) setSaldo(data.saldo);
}

// ─── PROFIL PAGE ─────────────────────────────────────────────
async function initProfil() {
  const u = getUsername();
  if (!u) { location.href = 'index.html'; return; }

  // Tampilkan data cache dulu
  document.getElementById('profile-username').textContent = u;
  document.getElementById('display-saldo').textContent = fmtIDR(getSaldo());

  // Fetch data lengkap dari server
  const res = await apiCall({ action: 'get_profile', username: u });
  if (res.result !== 'SUCCESS') return;

  const d = res.data;
  document.getElementById('profile-username').textContent  = d.username  || u;
  document.getElementById('profile-tier').textContent      = d.tier       || 'MEMBER';
  document.getElementById('display-saldo').textContent     = fmtIDR(d.saldo || 0);
  document.getElementById('profile-fullname').textContent  = d.namaLengkap || '—';
  document.getElementById('profile-phone').textContent     = d.phone       || '—';
  document.getElementById('profile-bank').textContent      = d.bank        || '—';
  document.getElementById('profile-rek').textContent       = d.nomorRekening || '—';
  document.getElementById('total-depo').textContent        = fmtIDR(d.totalDepo  || 0);
  document.getElementById('total-wd').textContent          = fmtIDR(d.totalWD    || 0);
  document.getElementById('profile-refcode').textContent   = d.refCode     || '—';

  // Simpan ke cache lokal
  setSaldo(d.saldo || 0);
  localStorage.setItem('user_tier', d.tier || 'MEMBER');
  localStorage.setItem('_cache_bank', d.bank || '');
  localStorage.setItem('_cache_rekening', d.nomorRekening || '');
  localStorage.setItem('_cache_refCode', d.refCode || '');
  localStorage.setItem('user_fullname', d.namaLengkap || '');
}

// ─── WITHDRAW PAGE ───────────────────────────────────────────
async function initWithdraw() {
  const u = getUsername();
  if (!u) { location.href = 'index.html'; return; }

  // Isi data rekening dari cache
  document.getElementById('wd-account-name').value = localStorage.getItem('user_fullname') || '';
  document.getElementById('wd-account-num').value  = localStorage.getItem('_cache_rekening') || '';
  document.getElementById('wd-method').value       = localStorage.getItem('_cache_bank') || '';
  document.getElementById('wd-balance').textContent = fmtIDR(getSaldo());

  // Fetch fresh dari server
  const res = await apiCall({ action: 'get_profile', username: u });
  if (res.result === 'SUCCESS') {
    const d = res.data;
    document.getElementById('wd-account-name').value  = d.namaLengkap     || '';
    document.getElementById('wd-account-num').value   = d.nomorRekening   || '';
    document.getElementById('wd-method').value        = d.bank            || '';
    document.getElementById('wd-balance').textContent = fmtIDR(d.saldo    || 0);
    setSaldo(d.saldo || 0);
  }

  loadWdHistory();
  startSaldoSync();
}

async function processWithdraw() {
  const u       = getUsername();
  const amount  = parseInt(document.getElementById('wd-amount').value);
  const name    = document.getElementById('wd-account-name').value;
  const rekNo   = document.getElementById('wd-account-num').value;
  const bank    = document.getElementById('wd-method').value;

  if (!amount || isNaN(amount)) {
    return showModal('⚠️', 'PERHATIAN', 'Masukkan nominal penarikan!', 'error');
  }
  if (amount < 50000) {
    return showModal('🚫', 'DITOLAK', 'Minimal penarikan IDR 50.000', 'error');
  }
  if (getSaldo() < amount) {
    return showModal('❌', 'SALDO KURANG', 'Saldo tidak mencukupi untuk penarikan ini.', 'error');
  }

  const btn = document.querySelector('.btn-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }

  const res = await apiCall({
    action: 'withdraw',
    username: u,
    namaLengkap: name,
    bank: bank,
    rekening: rekNo,
    jumlah: amount,
    tanggal: fmtDate()
  });

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>&nbsp; Ajukan Penarikan'; }

  if (res.result === 'SUCCESS') {
    setSaldo(res.newSaldo);
    document.getElementById('wd-balance').textContent = fmtIDR(res.newSaldo);
    document.getElementById('wd-amount').value = '';
    showModal('✅', 'BERHASIL', 'Pengajuan penarikan terkirim!\nSaldo akan dikurangi otomatis.', 'success');
    loadWdHistory();
  } else {
    showModal('❌', 'GAGAL', res.message || 'Gagal mengajukan penarikan.', 'error');
  }
}

async function loadWdHistory() {
  const u = getUsername();
  const container = document.getElementById('wd-history');
  if (!container) return;
  container.innerHTML = '<div class="hist-loading"><i class="fa-solid fa-spinner fa-spin"></i> Memuat...</div>';

  const res = await apiCall({ action: 'get_withdraw_history', username: u });
  if (res.result !== 'SUCCESS' || !res.data || res.data.length === 0) {
    container.innerHTML = '<div class="hist-empty">Belum ada riwayat penarikan.</div>';
    return;
  }

  container.innerHTML = '';
  res.data.forEach((item, i) => {
    const isLatest = (i === 0 && item.status === 'PROSES');
    const statusClass = item.status === 'BERHASIL' ? 'status-sukses'
                      : item.status === 'GAGAL'    ? 'status-gagal'
                      : 'status-proses';
    const div = document.createElement('div');
    div.className = 'history-item' + (isLatest ? ' latest' : '');
    div.innerHTML = `
      ${isLatest ? '<div class="badge-new">TERBARU</div>' : ''}
      <div class="hist-top">
        <span class="hist-label"><i class="fa-solid fa-money-bill-transfer"></i> WITHDRAW</span>
        <span class="status-badge ${statusClass}">${item.status}</span>
      </div>
      <div class="hist-amount">${fmtIDR(item.jumlah)}</div>
      <div class="hist-time">
        <i class="fa-regular fa-clock"></i> ${item.tanggal}
        &nbsp;·&nbsp; ${item.bank || ''}
      </div>
    `;
    container.appendChild(div);
  });
}

// ─── DEPOSIT PAGE ────────────────────────────────────────────
let _usdtRate = 16000; // default fallback rate
let _usdtRateFetchedAt = 0;

async function fetchUsdtRate() {
  const now = Date.now();
  if (now - _usdtRateFetchedAt < USDT_RATE_CACHE_MS) return _usdtRate;
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=idr');
    const j = await r.json();
    _usdtRate = j.tether?.idr || 16000;
    _usdtRateFetchedAt = now;
    return _usdtRate;
  } catch(e) { return _usdtRate; }
}

async function initDeposit() {
  const u = getUsername();
  if (!u) { location.href = 'index.html'; return; }
  loadDepoHistory();
  // Ambil kurs USDT dan tampilkan
  const rate = await fetchUsdtRate();
  const rateEl = document.getElementById('usdt-rate-info');
  if (rateEl) rateEl.textContent = 'Kurs: 1 USDT ≈ IDR ' + rate.toLocaleString('id-ID') + ' (fee $2 sudah dipotong)';
}

async function submitDeposit(method) {
  const u = getUsername();
  let amountRaw, amountIDR = 0, amountCrypto = '';

  if (method === 'QRIS') {
    amountRaw = parseInt(document.getElementById('depo-amount').value);
    if (!amountRaw || isNaN(amountRaw)) { alert('Masukkan nominal terlebih dahulu!'); return; }
    if (amountRaw < 20000) { alert('Minimal deposit QRIS IDR 20.000!'); return; }
    amountIDR = amountRaw;
  } else {
    amountRaw = parseFloat(document.getElementById('usdtAmount').value);
    if (!amountRaw || isNaN(amountRaw)) { alert('Masukkan nominal USDT!'); return; }
    if (amountRaw < 10) { alert('Minimal deposit USDT $10!'); return; }
    const rate = await fetchUsdtRate();
    const received = (amountRaw - 2) * rate; // potong fee $2
    amountCrypto   = Math.floor(received) + ' (' + amountRaw + ')';
    amountIDR      = 0;
  }

  const res = await apiCall({
    action: 'deposit',
    username: u,
    method: method,
    nominalIDR: amountIDR,
    nominalCrypto: amountCrypto,
    tanggal: fmtDate()
  });

  if (res.result === 'SUCCESS') {
    alert(method === 'QRIS'
      ? 'Deposit berhasil dikirim! Menunggu konfirmasi admin.'
      : 'Permintaan deposit USDT terkirim. Silakan konfirmasi ke admin WhatsApp.');
    loadDepoHistory();
  } else {
    alert('Gagal: ' + (res.message || 'Coba lagi.'));
  }
}

async function loadDepoHistory() {
  const u = getUsername();
  const container = document.querySelector('.history-box');
  if (!container) return;
  container.innerHTML = 'Memuat riwayat...';

  const res = await apiCall({ action: 'get_deposit_history', username: u });
  if (res.result !== 'SUCCESS' || !res.data || res.data.length === 0) {
    container.innerHTML = 'Belum ada riwayat transaksi.';
    return;
  }

  let html = '';
  res.data.forEach(item => {
    const nominal = item.nominalCrypto
      ? '$' + item.nominalCrypto.match(/\((\d+)\)/)?.[1]
      : fmtIDR(item.nominalIDR);
    const statusColor = item.status === 'BERHASIL' ? '#00ff77'
                      : item.status === 'GAGAL'    ? '#ff6666'
                      : '#f5e642';
    html += `
      <div style="padding:12px;border-bottom:1px solid rgba(255,255,255,.07);font-size:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="color:#7799ff;font-weight:600;">${item.method || 'DEPOSIT'}</span>
          <span style="color:${statusColor};font-weight:700;">${item.status}</span>
        </div>
        <div style="font-size:16px;font-weight:700;color:#f5e642;">${nominal}</div>
        <div style="color:rgba(255,255,255,.35);font-size:10px;margin-top:3px;">${item.tanggal}</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// ─── REWARD PAGE ─────────────────────────────────────────────
async function initReward() {
  const u = getUsername();
  if (!u) { location.href = 'index.html'; return; }

  const refCode = localStorage.getItem('_cache_refCode') || '—';
  const refEl   = document.getElementById('ref-code-display');
  if (refEl) refEl.textContent = refCode;

  await Promise.all([loadInbox(), loadRefList(), checkDailyCooldown()]);
}

async function loadInbox() {
  const u = getUsername();
  const container = document.getElementById('inbox-container');
  if (!container) return;

  const res = await apiCall({ action: 'get_inbox', username: u });
  if (res.result !== 'SUCCESS' || !res.data || res.data.length === 0) {
    container.innerHTML = '<div class="hist-empty">Tidak ada hadiah di inbox.</div>';
    return;
  }

  container.innerHTML = '';
  res.data.forEach(item => {
    const div = document.createElement('div');
    div.className = 'inbox-item';
    div.innerHTML = `
      <div class="inbox-ico"><i class="fa-solid fa-gift"></i></div>
      <div style="flex:1;">
        <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.75);">${item.pesan}</div>
        <div class="inbox-amt">${fmtIDR(item.saldo)}</div>
      </div>
      <button class="btn-claim-inbox" onclick="claimInbox('${item.id}', ${item.saldo})">Klaim</button>
    `;
    container.appendChild(div);
  });
}

async function claimInbox(id, saldo) {
  const u = getUsername();
  const res = await apiCall({ action: 'claim_inbox', username: u, id: id, saldo: saldo });
  if (res.result === 'SUCCESS') {
    setSaldo(res.newSaldo);
    showModal('🎁', 'HADIAH DIKLAIM!', fmtIDR(saldo) + ' berhasil masuk ke saldo utama!', 'success');
    loadInbox();
  } else {
    showModal('❌', 'GAGAL', res.message || 'Gagal klaim hadiah.', 'error');
  }
}

async function claimDailyReward() {
  const u = getUsername();
  const res = await apiCall({ action: 'claim_daily', username: u });
  if (res.result === 'SUCCESS') {
    setSaldo(res.newSaldo);
    localStorage.setItem('lastDailyClaim', new Date().toDateString());
    showModal('☀️', 'DAILY BONUS!', 'IDR 1.000 berhasil diklaim!\nSaldo: ' + fmtIDR(res.newSaldo), 'success');
    checkDailyCooldown();
  } else {
    showModal('⏳', 'SUDAH KLAIM', res.message || 'Daily bonus sudah diklaim hari ini.', 'info');
  }
}

function checkDailyCooldown() {
  const last = localStorage.getItem('lastDailyClaim');
  const el   = document.getElementById('daily-countdown');
  const btn  = document.querySelector('.qc-btn.pk');
  if (!el) return;

  if (last === new Date().toDateString()) {
    if (btn) btn.disabled = true;
    const now  = new Date();
    const next = new Date(); next.setHours(24, 0, 0, 0);
    const diff = next - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    el.textContent = 'Reset: ' + h + 'j ' + m + 'm lagi';
  } else {
    if (btn) btn.disabled = false;
    el.textContent = '';
  }
}

async function claimReferral() {
  const u = getUsername();
  const now = new Date();
  if (now.getDay() !== 0) {
    return showModal('📅', 'BELUM WAKTUNYA', 'Bonus referral hanya bisa diklaim setiap hari Minggu.', 'info');
  }
  const res = await apiCall({ action: 'claim_referral', username: u });
  if (res.result === 'SUCCESS') {
    setSaldo(res.newSaldo);
    document.getElementById('ref-bonus-total').textContent = fmtIDR(0);
    showModal('🎉', 'REFERRAL DIKLAIM!', fmtIDR(res.bonus) + ' masuk ke saldo!\nSaldo: ' + fmtIDR(res.newSaldo), 'success');
    loadRefList();
  } else {
    showModal('❌', 'GAGAL', res.message || 'Tidak ada bonus yang bisa diklaim.', 'error');
  }
}

async function loadRefList() {
  const u = getUsername();
  const container = document.getElementById('ref-list-container');
  const bonusEl   = document.getElementById('ref-bonus-total');
  if (!container) return;

  const res = await apiCall({ action: 'get_referrals', username: u });
  if (res.result !== 'SUCCESS' || !res.data || res.data.length === 0) {
    container.innerHTML = '<div class="hist-empty">Belum ada undangan.</div>';
    return;
  }

  if (bonusEl) bonusEl.textContent = fmtIDR(res.totalBonus || 0);

  container.innerHTML = '';
  res.data.forEach(item => {
    const div = document.createElement('div');
    div.className = 'ref-row';
    const badge = item.status === 'VALID'
      ? '<span class="ref-badge ref-valid">VALID</span>'
      : '<span class="ref-badge ref-pending">BELUM DEPOSIT</span>';
    div.innerHTML = `<span class="ref-name">${item.username}</span>${badge}`;
    container.appendChild(div);
  });
}

async function copyLink() {
  const code = localStorage.getItem('_cache_refCode') || '';
  if (!code) return showModal('❌', 'ERROR', 'Kode referral tidak ditemukan.', 'error');
  const link = window.location.origin + '/index.html?ref=' + code;
  try {
    await navigator.clipboard.writeText(link);
    showModal('✅', 'DISALIN!', 'Link referral berhasil disalin:\n' + link, 'success');
  } catch(e) {
    showModal('📋', 'LINK REFERRAL', link, 'info');
  }
}

// ─── GAME PAGE ───────────────────────────────────────────────
let _gameSessionStart = null;

async function initGame() {
  const u = getUsername();
  if (!u) { location.href = 'index.html'; return; }

  // Ambil config game dari server (winrate, maxWinLimit, session)
  const res = await apiCall({ action: 'get_game_config', username: u });
  if (res.result === 'SUCCESS') {
    setSaldo(res.saldo);
    localStorage.setItem('user_winrate',       res.winrate || 50);
    localStorage.setItem('user_maxWinLimit',   res.maxWinLimit || 500000);
    localStorage.setItem('user_sessionMinutes',res.sessionMinutes || 60);
    _gameSessionStart = new Date(res.sessionStart || Date.now());

    // Set session start di server jika belum ada
    await apiCall({ action: 'set_session_start', username: u });
  }

  setOnline();
  startSaldoSync();
  document.getElementById('display-saldo').textContent = fmtIDR(getSaldo());
}

/**
 * Menghitung target multiplier berdasarkan winrate + maxWinLimit + sessionMinutes
 * Dipanggil oleh Apps Script, hasilnya dikembalikan lewat game_play response
 * Fungsi ini di client hanya sebagai fallback offline
 */
function _clientFallbackMultiplier(multipliers) {
  // Jika server tidak tersedia, gunakan random murni
  return multipliers[Math.floor(Math.random() * multipliers.length)];
}

// ─── MODAL UNIVERSAL (Reward & Profil) ───────────────────────
function showModal(icon, title, msg, type) {
  // Support berbagai struktur modal di tiap halaman
  const overlay = document.getElementById('modal-overlay');
  const modal   = document.getElementById('neon-modal');
  if (!modal) return;

  // Set class type
  if (modal.className !== undefined) {
    modal.className = 'm-' + (type || 'info');
  }

  // Set border/shadow langsung jika tidak ada class system
  const colors = { success:'#f5e642', error:'#ff0077', info:'#0055ff' };
  const c = colors[type] || colors.info;
  modal.style.borderColor = c;
  modal.style.boxShadow   = '0 0 20px ' + c + '55';

  // Icon
  const iconEl = document.getElementById('modal-icon') || document.getElementById('m-icon');
  if (iconEl) iconEl.textContent = icon || '✨';

  // Title
  const titleEl = document.getElementById('modal-title') || document.getElementById('m-title');
  if (titleEl) titleEl.textContent = title;

  // Message
  const msgEl = document.getElementById('modal-msg') || document.getElementById('m-text');
  if (msgEl) msgEl.textContent = msg;

  if (overlay) overlay.style.display = 'block';
  modal.style.display = 'block';
}

// ─── AUTO-INIT ────────────────────────────────────────────────
window.addEventListener('load', async () => {
  const page = location.pathname.split('/').pop();

  // Auto-redirect jika belum login (kecuali halaman login)
  if (page !== 'index.html' && page !== '' && !getUsername()) {
    location.href = 'index.html';
    return;
  }

  // Isi kode referral dari URL ?ref=XXXX
  if (page === 'index.html' || page === '') {
    const params = new URLSearchParams(window.location.search);
    const refFromUrl = params.get('ref');
    if (refFromUrl) {
      const refInput = document.getElementById('referral_code');
      if (refInput) refInput.value = refFromUrl;
    }
  }

  // Inisialisasi per halaman
  if (page === 'profil.html')   await initProfil();
  if (page === 'withdraw.html') await initWithdraw();
  if (page === 'deposit.html')  await initDeposit();
  if (page === 'reward.html')   await initReward();
  if (page === 'game.html')     await initGame();
});
