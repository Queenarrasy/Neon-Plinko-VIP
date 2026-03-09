/**
 * ============================================================
 *  GLOBAL.JS — Neon Plinko VIP Frontend Library
 *  Versi: 4.0 — FULL + MASTER PANEL
 *  Sesuaikan GAS_URL dengan URL Web App Google Apps Script Anda.
 * ============================================================
 */

// ─── KONFIGURASI UTAMA ──────────────────────────────────────
const GAS_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"; // ← Ganti ini

// ─── TIER CONFIG (cermin dari GAS) ──────────────────────────
const TIER_CONFIG = {
  MEMBER:   { minDepo: 0,          color: "#aaaaaa", icon: "👤" },
  SILVER:   { minDepo: 500000,     color: "#c0c0c0", icon: "🥈" },
  GOLD:     { minDepo: 1000000,    color: "#ffd700", icon: "🥇" },
  PLATINUM: { minDepo: 3000000,    color: "#e5e4e2", icon: "💎" },
  DIAMOND:  { minDepo: 10000000,   color: "#b9f2ff", icon: "💠" },
};

// ─── GAME CONFIG ────────────────────────────────────────────
const GAME_CONFIG = {
  WIN_MULTS:  [1.5, 3, 10],
  LOSS_MULTS: [0.2, 0.5],
};

// ─── DEPOSIT / WITHDRAW LIMITS ──────────────────────────────
const DEPOSIT_CONFIG  = { MIN_QRIS: 20000 };
const WITHDRAW_CONFIG = { MIN_WD:   50000 };
const DAILY_BONUS     = 1000;

// ─── SESSION STATE ──────────────────────────────────────────
let currentUser = null;

// ============================================================
//  SESSION HELPERS
// ============================================================
function saveSession(data) {
  localStorage.setItem("plinko_session", JSON.stringify(data));
  currentUser = data;
}

function loadSession() {
  try {
    const raw = localStorage.getItem("plinko_session");
    if (raw) currentUser = JSON.parse(raw);
  } catch (e) { currentUser = null; }
  return currentUser;
}

function clearSession() {
  localStorage.removeItem("plinko_session");
  currentUser = null;
}

/**
 * Cek apakah user sudah login; jika tidak redirect ke login.
 * @param {string} redirectUrl
 * @returns {object|null}
 */
function requireLogin(redirectUrl = "index.html") {
  const user = loadSession();
  if (!user) {
    showToast("Silakan login terlebih dahulu.", "error");
    setTimeout(() => { window.location.href = redirectUrl; }, 1000);
    return null;
  }
  return user;
}

// ============================================================
//  UTILITY HELPERS
// ============================================================
function formatRupiah(amount) {
  return "Rp " + Number(amount || 0).toLocaleString("id-ID");
}

function fmtNow() {
  return new Date().toLocaleString("id-ID", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

function setLoading(show) {
  const el = document.getElementById("loading");
  if (el) el.style.display = show ? "flex" : "none";
}

function showToast(message, type = "info") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.style.cssText = [
      "position:fixed", "bottom:30px", "left:50%", "transform:translateX(-50%)",
      "padding:12px 28px", "border-radius:10px", "font-weight:bold",
      "color:#fff", "z-index:99999", "font-size:14px",
      "transition:opacity 0.4s", "pointer-events:none", "text-align:center",
      "max-width:90vw", "box-shadow:0 4px 16px rgba(0,0,0,0.4)"
    ].join(";");
    document.body.appendChild(toast);
  }
  const colors = { success: "#28a745", error: "#dc3545", info: "#0d6efd", warning: "#ffc107" };
  toast.style.background = colors[type] || colors.info;
  toast.style.opacity    = "1";
  toast.textContent      = message;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = "0"; }, 3500);
}

function renderTierBadge(tier) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.MEMBER;
  return `<span style="color:${cfg.color};font-weight:bold;">${cfg.icon} ${tier}</span>`;
}

function renderStatus(status) {
  const map = {
    PROSES:   ["#f0ad4e", "⏳ Proses"],
    BERHASIL: ["#28a745", "✅ Berhasil"],
    SUCCESS:  ["#28a745", "✅ Berhasil"],
    REJECT:   ["#dc3545", "❌ Ditolak"],
    FAILED:   ["#dc3545", "❌ Gagal"],
  };
  const [color, label] = map[String(status).toUpperCase()] || ["#aaa", status];
  return `<span style="color:${color};font-weight:bold;">${label}</span>`;
}

/**
 * Render tabel riwayat ke dalam elemen HTML.
 * @param {string} containerId  - ID elemen target
 * @param {Array}  data         - Array dari apiGetDepoHistory / apiGetWDHistory
 * @param {"depo"|"wd"} type
 */
function renderHistoryTable(containerId, data, type = "depo") {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!data || !data.length) {
    el.innerHTML = `<p style="text-align:center;color:#888;padding:16px;">Belum ada riwayat.</p>`;
    return;
  }
  const isWd  = type === "wd";
  const rows  = data.map(r => `
    <tr>
      <td style="padding:8px">${r.tanggal}</td>
      <td style="padding:8px">${isWd ? formatRupiah(r.jumlah) : (r.nominalIDR ? formatRupiah(r.nominalIDR) : r.nominalCrypto)}</td>
      <td style="padding:8px">${isWd ? (r.bank + " - " + r.rekening) : (r.method || "QRIS")}</td>
      <td style="padding:8px">${renderStatus(r.status)}</td>
    </tr>`).join("");
  el.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#1a1a2e;color:#eee;">
          <th style="padding:8px">Tanggal</th>
          <th style="padding:8px">Nominal</th>
          <th style="padding:8px">${isWd ? "Rekening" : "Metode"}</th>
          <th style="padding:8px">Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ============================================================
//  CORE API — CALLER
// ============================================================

/**
 * POST ke GAS (semua aksi write / game).
 * @param {object} payload
 * @returns {Promise<object>}
 */
async function postToGAS(payload) {
  setLoading(true);
  try {
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    showToast("Gagal terhubung ke server.", "error");
    return { result: "ERROR", message: err.toString() };
  } finally {
    setLoading(false);
  }
}

/**
 * GET dari GAS (semua aksi read-only).
 * @param {object} params - Key-value query params; wajib ada `action`
 * @returns {Promise<object>}
 */
async function getFromGAS(params) {
  setLoading(true);
  try {
    const encoded = encodeURIComponent(JSON.stringify(params));
    const res     = await fetch(`${GAS_URL}?data=${encoded}`);
    return await res.json();
  } catch (err) {
    showToast("Gagal terhubung ke server.", "error");
    return { result: "ERROR", message: err.toString() };
  } finally {
    setLoading(false);
  }
}

// ============================================================
//  AUTH
// ============================================================

/**
 * Login user.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>} { result, fullname, saldo, bank, rekening, refCode, tier }
 */
async function apiLogin(username, password) {
  const res = await postToGAS({ action: "login", username, password });
  if (res.result === "SUCCESS") {
    saveSession({ ...res, username });
    showToast("Selamat datang, " + res.fullname + "! 🎉", "success");
  } else {
    showToast(res.message || "Login gagal.", "error");
  }
  return res;
}

/**
 * Register user baru.
 * @param {object} p - { username, password, fullname, phone, bank, rekening, refBy }
 * @returns {Promise<object>} { result, refCode }
 */
async function apiRegister(p) {
  const res = await postToGAS({ action: "register", ...p });
  if (res.result === "SUCCESS") {
    showToast("Registrasi berhasil! Kode referral: " + res.refCode, "success");
  } else {
    showToast(res.message || "Registrasi gagal.", "error");
  }
  return res;
}

/**
 * Logout & redirect.
 * @param {string} redirectUrl
 */
function apiLogout(redirectUrl = "index.html") {
  clearSession();
  postToGAS({ action: "set_status", username: currentUser?.username || "", status: "OFFLINE" })
    .catch(() => {});
  showToast("Berhasil logout.", "info");
  setTimeout(() => { window.location.href = redirectUrl; }, 700);
}

// ============================================================
//  PROFILE & SALDO
// ============================================================

/**
 * Ambil profil lengkap user.
 * @param {string} username
 * @returns {Promise<object>} { result, data: {...userData} }
 */
async function apiGetProfile(username) {
  return await getFromGAS({ action: "get_profile", username });
}

/**
 * Ambil saldo + config game terkini.
 * @param {string} username
 * @returns {Promise<object>} { result, saldo, tier, winrate, maxWinLimit, sessionMinutes, status }
 */
async function apiGetSaldo(username) {
  const res = await getFromGAS({ action: "get_saldo", username });
  if (res.result === "SUCCESS" && currentUser) {
    currentUser.saldo = res.saldo;
    currentUser.tier  = res.tier;
    saveSession(currentUser);
    const el = document.getElementById("saldoDisplay");
    if (el) el.textContent = formatRupiah(res.saldo);
  }
  return res;
}

/**
 * Update status user (ONLINE / OFFLINE).
 * @param {string} username
 * @param {"ONLINE"|"OFFLINE"} status
 */
async function apiSetStatus(username, status) {
  return await postToGAS({ action: "set_status", username, status });
}

/**
 * Catat waktu mulai sesi (dipanggil saat masuk halaman game).
 * @param {string} username
 */
async function apiSetSessionStart(username) {
  return await postToGAS({ action: "set_session_start", username });
}

// ============================================================
//  GAMEPLAY
// ============================================================

/**
 * Ambil config game (winrate, saldo, maxWin, sessionMinutes).
 * @param {string} username
 * @returns {Promise<object>}
 */
async function apiGetGameConfig(username) {
  return await getFromGAS({ action: "get_game_config", username });
}

/**
 * Kirim hasil satu putaran game ke server.
 *
 * PENTING: `saldoAwal` adalah snapshot saldo SEBELUM bet dikurangi di client.
 * Server menggunakan rumus: newSaldo = (saldoAwal - bet) + (bet × multiplier)
 *
 * @param {string} username
 * @param {number} bet        - Nominal taruhan
 * @param {number} saldoAwal  - Saldo client sebelum bet dikurangi
 * @returns {Promise<object>} { result, target_multiplier, win, newSaldo, debug }
 */
async function apiGamePlay(username, bet, saldoAwal) {
  const res = await postToGAS({ action: "game_play", username, bet, saldoAwal });
  if (res.result === "SUCCESS") {
    if (currentUser) {
      currentUser.saldo = res.newSaldo;
      saveSession(currentUser);
    }
  } else {
    showToast(res.message || "Gagal bermain.", "error");
  }
  return res;
}

// ============================================================
//  DEPOSIT
// ============================================================

/**
 * Ajukan deposit QRIS.
 * @param {string} username
 * @param {number} nominalIDR  - Nominal dalam Rupiah (min 20.000)
 * @returns {Promise<object>}
 */
async function apiDepositQRIS(username, nominalIDR) {
  if (nominalIDR < DEPOSIT_CONFIG.MIN_QRIS) {
    showToast(`Minimal deposit QRIS ${formatRupiah(DEPOSIT_CONFIG.MIN_QRIS)}`, "error");
    return { result: "ERROR" };
  }
  const res = await postToGAS({
    action: "deposit", username,
    nominalIDR, nominalCrypto: "",
    method: "QRIS",
    tanggal: fmtNow()
  });
  res.result === "SUCCESS"
    ? showToast("Deposit QRIS berhasil diajukan! Tunggu konfirmasi.", "success")
    : showToast(res.message || "Deposit gagal.", "error");
  return res;
}

/**
 * Ajukan deposit Crypto/USDT.
 * @param {string} username
 * @param {string} nominalCrypto - Misal: "10 USDT"
 * @returns {Promise<object>}
 */
async function apiDepositCrypto(username, nominalCrypto) {
  const res = await postToGAS({
    action: "deposit", username,
    nominalIDR: 0, nominalCrypto,
    method: "CRYPTO",
    tanggal: fmtNow()
  });
  res.result === "SUCCESS"
    ? showToast("Deposit Crypto berhasil diajukan! Tunggu konfirmasi.", "success")
    : showToast(res.message || "Deposit gagal.", "error");
  return res;
}

/**
 * Ambil riwayat deposit (10 terakhir).
 * @param {string} username
 * @returns {Promise<object>} { result, data: [{tanggal, nominalIDR, nominalCrypto, method, status}] }
 */
async function apiGetDepoHistory(username) {
  return await getFromGAS({ action: "get_deposit_history", username });
}

// ============================================================
//  WITHDRAW
// ============================================================

/**
 * Ajukan penarikan saldo.
 * @param {string} username
 * @param {number} jumlah       - Nominal dalam Rupiah (min 50.000)
 * @param {string} namaLengkap
 * @param {string} bank
 * @param {string} rekening
 * @returns {Promise<object>} { result, newSaldo }
 */
async function apiWithdraw(username, jumlah, namaLengkap, bank, rekening) {
  if (jumlah < WITHDRAW_CONFIG.MIN_WD) {
    showToast(`Minimal withdraw ${formatRupiah(WITHDRAW_CONFIG.MIN_WD)}`, "error");
    return { result: "ERROR" };
  }
  const res = await postToGAS({
    action: "withdraw", username, jumlah,
    namaLengkap, bank, rekening,
    tanggal: fmtNow()
  });
  if (res.result === "SUCCESS") {
    showToast("Withdraw berhasil diajukan!", "success");
    if (currentUser) { currentUser.saldo = res.newSaldo; saveSession(currentUser); }
    const el = document.getElementById("saldoDisplay");
    if (el) el.textContent = formatRupiah(res.newSaldo);
  } else {
    showToast(res.message || "Withdraw gagal.", "error");
  }
  return res;
}

/**
 * Ambil riwayat withdraw (10 terakhir).
 * @param {string} username
 * @returns {Promise<object>} { result, data: [{tanggal, jumlah, bank, rekening, status}] }
 */
async function apiGetWDHistory(username) {
  return await getFromGAS({ action: "get_withdraw_history", username });
}

// ============================================================
//  INBOX
// ============================================================

/**
 * Ambil pesan inbox yang belum diklaim.
 * @param {string} username
 * @returns {Promise<object>} { result, data: [{id, pesan, saldo}] }
 */
async function apiGetInbox(username) {
  return await getFromGAS({ action: "get_inbox", username });
}

/**
 * Klaim reward dari inbox.
 * @param {string} username
 * @param {string|number} id    - ID inbox item
 * @param {number} saldo        - Nominal reward (dari data inbox)
 * @returns {Promise<object>} { result, newSaldo }
 */
async function apiClaimInbox(username, id, saldo) {
  const res = await postToGAS({ action: "claim_inbox", username, id, saldo });
  if (res.result === "SUCCESS") {
    showToast("Reward inbox berhasil diklaim! 🎁", "success");
    if (currentUser) { currentUser.saldo = res.newSaldo; saveSession(currentUser); }
  } else {
    showToast(res.message || "Gagal klaim inbox.", "error");
  }
  return res;
}

// ============================================================
//  DAILY BONUS
// ============================================================

/**
 * Klaim bonus harian (Rp 1.000, 1× per hari).
 * @param {string} username
 * @returns {Promise<object>} { result, newSaldo, bonus }
 */
async function apiClaimDaily(username) {
  const res = await postToGAS({ action: "claim_daily", username });
  if (res.result === "SUCCESS") {
    showToast(`Bonus harian ${formatRupiah(res.bonus)} berhasil diklaim! 🎉`, "success");
    if (currentUser) { currentUser.saldo = res.newSaldo; saveSession(currentUser); }
    const el = document.getElementById("saldoDisplay");
    if (el) el.textContent = formatRupiah(res.newSaldo);
  } else {
    showToast(res.message || "Gagal klaim bonus harian.", "error");
  }
  return res;
}

// ============================================================
//  REFERRAL
// ============================================================

/**
 * Ambil data referral user (daftar teman + bonus tersedia).
 * @param {string} username
 * @returns {Promise<object>} { result, data, totalBonus, validCount, newValid }
 */
async function apiGetReferrals(username) {
  return await getFromGAS({ action: "get_referrals", username });
}

/**
 * Klaim bonus referral (hanya bisa hari Minggu).
 * @param {string} username
 * @returns {Promise<object>} { result, newSaldo, bonus }
 */
async function apiClaimReferral(username) {
  const res = await postToGAS({ action: "claim_referral", username });
  if (res.result === "SUCCESS") {
    showToast(`Bonus referral ${formatRupiah(res.bonus)} berhasil diklaim! 🎉`, "success");
    if (currentUser) { currentUser.saldo = res.newSaldo; saveSession(currentUser); }
  } else {
    showToast(res.message || "Gagal klaim referral.", "error");
  }
  return res;
}

// ============================================================
//  MASTER PANEL — ADMIN ONLY
// ============================================================

/**
 * Ambil semua data user (untuk Live Player Monitor).
 * @returns {Promise<Array>} Array of user objects
 */
async function adminGetAllUsers() {
  return await getFromGAS({ action: "getAllUsers" });
}

/**
 * Ambil daftar deposit berstatus PROSES.
 * @returns {Promise<Array>} Array of pending deposit objects
 */
async function adminGetPendingDeposits() {
  return await getFromGAS({ action: "get_pending_deposits" });
}

/**
 * Approve deposit dan tambah saldo user.
 * @param {number} row - Nomor baris di sheet Deposit
 * @returns {Promise<object>} { result, message }
 */
async function adminApproveDeposit(row) {
  const res = await postToGAS({ action: "approve_deposit", row });
  res.result === "SUCCESS"
    ? showToast("Deposit berhasil di-approve! ✅", "success")
    : showToast(res.message || "Gagal approve deposit.", "error");
  return res;
}

/**
 * Update winrate user tertentu.
 * @param {string} targetUser  - Username target
 * @param {number} newRate     - Nilai winrate 0–100
 * @returns {Promise<object>} { result, message }
 */
async function adminUpdateWinrate(targetUser, newRate) {
  const res = await postToGAS({ action: "updateWinrate", targetUser, newRate });
  res.result === "SUCCESS"
    ? showToast(`Winrate ${targetUser} → ${newRate}%`, "success")
    : showToast(res.message || "Gagal update winrate.", "error");
  return res;
}

/**
 * Tambah / kurangi saldo user (amount bisa negatif).
 * @param {string} targetUser
 * @param {number} amount  - Positif untuk tambah, negatif untuk kurangi
 * @returns {Promise<object>} { result, newSaldo, message }
 */
async function adminUpdateSaldo(targetUser, amount) {
  const res = await postToGAS({ action: "adminUpdateSaldo", targetUser, amount });
  res.result === "SUCCESS"
    ? showToast(`Saldo ${targetUser} diupdate → ${formatRupiah(res.newSaldo)}`, "success")
    : showToast(res.message || "Gagal update saldo.", "error");
  return res;
}

/**
 * Set batas MaxWin user tertentu.
 * @param {string} targetUser
 * @param {number} maxwin  - Nominal batas menang
 * @returns {Promise<object>} { result, message }
 */
async function adminSetMaxwinLimit(targetUser, maxwin) {
  const res = await postToGAS({ action: "setMaxwinLimit", targetUser, maxwin });
  res.result === "SUCCESS"
    ? showToast(`MaxWin ${targetUser} → ${formatRupiah(maxwin)}`, "success")
    : showToast(res.message || "Gagal set maxwin.", "error");
  return res;
}

/**
 * Aktifkan / matikan Global Panic (paksa semua WR → 10%).
 * @param {number} minutes - Durasi menit (> 0 aktifkan, 0 matikan)
 * @returns {Promise<object>} { result, message }
 */
async function adminSetGlobalPanic(minutes) {
  const res = await postToGAS({ action: "set_global_panic", minutes });
  if (res.result === "SUCCESS") {
    minutes > 0
      ? showToast(`⚠️ PANIC AKTIF ${minutes} menit! WR semua → 10%`, "warning")
      : showToast("✅ Panic dimatikan. WR semua dipulihkan.", "success");
  } else {
    showToast(res.message || "Gagal set global panic.", "error");
  }
  return res;
}

// ============================================================
//  AUTO INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  loadSession();
});
