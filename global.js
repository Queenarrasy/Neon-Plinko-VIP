/**
 * ============================================================
 *  GLOBAL.JS — NEON PLINKO VIP
 *  Berisi fungsi shared yang dipakai semua halaman:
 *  game.html, deposit.html, withdraw.html, profil.html, reward.html
 *
 *  ATURAN SALDO:
 *  - TIDAK ada setInterval / auto-sync dari sini
 *  - Saldo dikelola masing-masing halaman secara event-driven
 *  - game.html   → update dari hasil game_play + visibilitychange
 *  - withdraw.html → update langsung setelah submit berhasil
 *  - deposit.html  → tidak update saldo (admin yang approve)
 *  - profil/reward → ambil fresh dari server saat load
 * ============================================================
 */

// ─── URL APPS SCRIPT ────────────────────────────────────────
// Satu sumber kebenaran — semua halaman pakai ini
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec";

// ─── API CALL ────────────────────────────────────────────────
/**
 * Kirim request ke Apps Script.
 * Coba GET dulu (lebih cepat), fallback POST jika gagal.
 */
async function apiCall(payload) {
  try {
    const url = SCRIPT_URL + '?data=' + encodeURIComponent(JSON.stringify(payload));
    const r   = await fetch(url, { redirect: 'follow' });
    const t   = await r.text();
    const j   = JSON.parse(t);
    if (j && j.result !== undefined) return j;
  } catch(e) {}
  try {
    const r2 = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return JSON.parse(await r2.text());
  } catch(e) {
    return { result: 'ERROR', message: 'Koneksi gagal. Cek koneksi internet.' };
  }
}

// ─── USER ────────────────────────────────────────────────────
function getUsername() {
  return localStorage.getItem('username') || null;
}

// ─── FORMAT ─────────────────────────────────────────────────
function fmtIDR(v) {
  return 'IDR ' + Math.floor(parseFloat(v) || 0).toLocaleString('id-ID');
}

function fmtDate() {
  return new Date().toLocaleString('id-ID', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// ─── SALDO localStorage ──────────────────────────────────────
/**
 * Baca saldo dari localStorage.
 * Dipakai halaman non-game (withdraw, profil) sebagai nilai awal tampilan.
 */
function getStoredSaldo() {
  return Math.floor(parseFloat(localStorage.getItem('user_saldo') || 0));
}

/**
 * Simpan saldo ke localStorage.
 * TIDAK mengubah tampilan — setiap halaman render sendiri.
 * Fungsi ini hanya untuk sinkronisasi antar halaman via localStorage.
 */
function storeLocalSaldo(v) {
  const val = Math.max(0, Math.floor(parseFloat(v) || 0));
  localStorage.setItem('user_saldo', val);
  return val;
}

// ─── LOGOUT ─────────────────────────────────────────────────
async function userLogout() {
  const u = getUsername();
  if (u) {
    try {
      await apiCall({ action: 'set_status', username: u, status: 'OFFLINE' });
    } catch(e) {}
  }
  localStorage.clear();
  location.href = 'index.html';
}

// ─── GUARD: redirect ke login jika belum login ───────────────
/**
 * Panggil di awal setiap halaman yang butuh login.
 * Kecuali index.html — tidak perlu guard.
 */
function requireLogin() {
  if (!getUsername()) {
    location.href = 'index.html';
    return false;
  }
  return true;
}

// ─── SET OFFLINE saat tutup tab ─────────────────────────────
window.addEventListener('beforeunload', () => {
  const u = getUsername();
  // Halaman game.html punya handler sendiri — skip agar tidak dobel
  const page = location.pathname.split('/').pop();
  if (page === 'game.html') return;
  if (u) {
    navigator.sendBeacon(
      SCRIPT_URL + '?data=' + encodeURIComponent(
        JSON.stringify({ action: 'set_status', username: u, status: 'OFFLINE' })
      )
    );
  }
});
