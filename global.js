/**
 * GLOBAL.JS - Plinko VIP System V6.9
 * Semua fungsi API, helper, dan konstanta untuk frontend.
 */

// ============================================================
//  KONFIGURASI UTAMA — Ganti dengan URL Web App GAS Anda
// ============================================================
const GAS_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";

// ============================================================
//  CONFIG (Cermin dari GAS Backend)
// ============================================================
const TIER_CONFIG = {
  BRONZE:   { minDepo: 0,        color: "#cd7f32", icon: "🥉" },
  SILVER:   { minDepo: 50000,    color: "#c0c0c0", icon: "🥈" },
  GOLD:     { minDepo: 1000000,  color: "#ffd700", icon: "🥇" },
  PLATINUM: { minDepo: 3000000,  color: "#e5e4e2", icon: "💎" },
  DIAMOND:  { minDepo: 10000000, color: "#b9f2ff", icon: "💠" },
};

const DEPOSIT_CONFIG = { MIN_QRIS: 20000, MIN_USDT: 10, USDT_RATE: 15800, USDT_FEE: 2 };
const WITHDRAW_CONFIG = { MIN_WD: 50000 };
const DAILY_BONUS = 2000;

// ============================================================
//  SESSION STATE
// ============================================================
let currentUser = null;

function saveSession(data) { localStorage.setItem("plinko_session", JSON.stringify(data)); currentUser = data; }
function loadSession()     { const r = localStorage.getItem("plinko_session"); if (r) currentUser = JSON.parse(r); return currentUser; }
function clearSession()    { localStorage.removeItem("plinko_session"); currentUser = null; }

// ============================================================
//  UTILITY
// ============================================================
function formatRupiah(amount) { return "Rp " + Number(amount).toLocaleString("id-ID"); }

function setLoading(show) {
  const el = document.getElementById("loading");
  if (el) el.style.display = show ? "flex" : "none";
}

function showToast(message, type = "info") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.style.cssText = "position:fixed;bottom:30px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:8px;font-weight:bold;color:#fff;z-index:9999;font-size:14px;transition:opacity 0.3s;";
    document.body.appendChild(toast);
  }
  const colors = { success: "#28a745", error: "#dc3545", info: "#007bff" };
  toast.style.background = colors[type] || colors.info;
  toast.style.opacity = "1";
  toast.textContent = message;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = "0"; }, 3000);
}

function requireLogin(redirectUrl = "index.html") {
  const user = loadSession();
  if (!user) { showToast("Silakan login terlebih dahulu.", "error"); setTimeout(() => location.href = redirectUrl, 1000); return null; }
  return user;
}

function renderTierBadge(tier) {
  const c = TIER_CONFIG[tier] || TIER_CONFIG.BRONZE;
  return `<span style="color:${c.color};font-weight:bold;">${c.icon} ${tier}</span>`;
}

function renderStatus(status) {
  const map = { PROSES: ["#f0ad4e","⏳ Proses"], SUCCESS: ["#28a745","✅ Sukses"], REJECT: ["#dc3545","❌ Ditolak"] };
  const [color, label] = map[String(status).toUpperCase()] || ["#aaa", status];
  return `<span style="color:${color};font-weight:bold;">${label}</span>`;
}

function renderHistoryTable(containerId, history) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!history?.length) { el.innerHTML = `<p style="text-align:center;color:#aaa;">Belum ada riwayat.</p>`; return; }
  const rows = history.map(h => `<tr><td style="padding:8px">${h.tgl}</td><td style="padding:8px">${formatRupiah(h.nominal)}</td><td style="padding:8px">${renderStatus(h.status)}</td></tr>`).join("");
  el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#222;color:#fff;"><th style="padding:8px">Tanggal</th><th style="padding:8px">Nominal</th><th style="padding:8px">Status</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ============================================================
//  CORE API
// ============================================================
async function postToGAS(payload) {
  setLoading(true);
  try {
    const res = await fetch(GAS_URL, { method: "POST", body: JSON.stringify(payload) });
    return await res.json();
  } catch (err) { showToast("Gagal terhubung ke server.", "error"); return { result: "ERROR", message: err.toString() }; }
  finally { setLoading(false); }
}

async function getFromGAS(params) {
  setLoading(true);
  try {
    const res = await fetch(`${GAS_URL}?${new URLSearchParams(params)}`);
    return await res.json();
  } catch (err) { showToast("Gagal terhubung ke server.", "error"); return { result: "ERROR", message: err.toString() }; }
  finally { setLoading(false); }
}

// ============================================================
//  AUTH
// ============================================================
async function apiLogin(username, password) {
  const res = await postToGAS({ action: "login", username, password });
  if      (res.result === "SUCCESS")        { saveSession(res); showToast("Selamat datang, " + res.fullname + "!", "success"); }
  else if (res.result === "WRONG_PASSWORD") { showToast("Password salah!", "error"); }
  else if (res.result === "NOT_FOUND")      { showToast("Username tidak ditemukan.", "error"); }
  else                                       { showToast(res.message || "Login gagal.", "error"); }
  return res;
}

async function apiRegister({ username, phone, fullname, bank, rekening, password, refBy = "" }) {
  const res = await postToGAS({ action: "register", username, phone, fullname, bank, rekening, password, refBy });
  if      (res.result === "SUCCESS") { showToast("Registrasi berhasil! Kode referral: " + res.referralCode, "success"); }
  else if (res.result === "EXISTS")  { showToast("Username sudah dipakai.", "error"); }
  else                                { showToast(res.message || "Registrasi gagal.", "error"); }
  return res;
}

function apiLogout(redirectUrl = "index.html") {
  clearSession();
  showToast("Berhasil logout.", "info");
  setTimeout(() => location.href = redirectUrl, 800);
}

// ============================================================
//  USER DATA
// ============================================================
async function apiGetUserData(username) {
  const res = await getFromGAS({ action: "getUserData", username });
  if (res.result === "SUCCESS" && currentUser) { currentUser.saldo = res.saldo; saveSession(currentUser); }
  return res;
}

async function syncSaldo(username) {
  const res = await apiGetUserData(username);
  if (res.result === "SUCCESS") {
    const el = document.getElementById("saldoDisplay");
    if (el) el.textContent = formatRupiah(res.saldo);
  }
  return res;
}

// ============================================================
//  GAMEPLAY
// ============================================================
async function apiGamePlay(username, bet) {
  const res = await postToGAS({ action: "game_play", username, bet });
  if      (res.result === "SUCCESS") { if (currentUser) { currentUser.saldo = res.newSaldo; saveSession(currentUser); } }
  else if (res.result === "FAILED")  { showToast(res.message || "Permainan gagal.", "error"); }
  else                                { showToast("Kesalahan server, coba lagi.", "error"); }
  return res;
}

async function apiResetSession(username) {
  return await postToGAS({ action: "reset_session", username });
}

// ============================================================
//  DEPOSIT & WITHDRAW
// ============================================================
async function apiDepositQRIS(username, amount) {
  if (amount < DEPOSIT_CONFIG.MIN_QRIS) { showToast(`Minimal deposit QRIS ${formatRupiah(DEPOSIT_CONFIG.MIN_QRIS)}`, "error"); return { result: "FAILED" }; }
  const res = await postToGAS({ action: "deposit", username, amount, method: "QRIS" });
  res.result === "SUCCESS" ? showToast("Deposit QRIS berhasil diajukan!", "success") : showToast(res.message || "Deposit gagal.", "error");
  return res;
}

async function apiDepositUSDT(username, amount) {
  if (amount < DEPOSIT_CONFIG.MIN_USDT) { showToast(`Minimal deposit USDT $${DEPOSIT_CONFIG.MIN_USDT}`, "error"); return { result: "FAILED" }; }
  const bersih = (amount - DEPOSIT_CONFIG.USDT_FEE) * DEPOSIT_CONFIG.USDT_RATE;
  const res = await postToGAS({ action: "deposit", username, amount, method: "USDT" });
  res.result === "SUCCESS" ? showToast(`Deposit USDT berhasil! Estimasi diterima: ${formatRupiah(bersih)}`, "success") : showToast(res.message || "Deposit gagal.", "error");
  return res;
}

async function apiWithdraw(username, amount) {
  if (amount < WITHDRAW_CONFIG.MIN_WD) { showToast(`Minimal withdraw ${formatRupiah(WITHDRAW_CONFIG.MIN_WD)}`, "error"); return { result: "FAILED" }; }
  const res = await postToGAS({ action: "withdraw", username, amount });
  if (res.result === "SUCCESS") { showToast("Withdraw berhasil diajukan!", "success"); if (currentUser) { currentUser.saldo = res.newSaldo; saveSession(currentUser); } }
  else { showToast(res.message || "Withdraw gagal.", "error"); }
  return res;
}

// ============================================================
//  HISTORY
// ============================================================
async function apiGetDepoHistory(username) { return await getFromGAS({ action: "getDepoHistory", username }); }
async function apiGetWDHistory(username)   { return await getFromGAS({ action: "getWDHistory",   username }); }

// ============================================================
//  REWARD & BONUS
// ============================================================
async function apiClaimDaily(username) {
  const res = await postToGAS({ action: "claimDaily", username });
  if (res.result === "SUCCESS") { showToast(`Bonus harian ${formatRupiah(res.nominal)} diklaim!`, "success"); if (currentUser) { currentUser.saldo = res.newSaldo; saveSession(currentUser); } }
  else { showToast(res.message || "Gagal klaim bonus.", "error"); }
  return res;
}

async function apiClaimReferral(username) {
  const res = await postToGAS({ action: "claimReferral", username });
  res.result === "SUCCESS" ? showToast("Reward referral diklaim!", "success") : showToast(res.message || "Gagal klaim referral.", "error");
  return res;
}

// ============================================================
//  INBOX
// ============================================================
async function apiGetInbox(username)       { return await getFromGAS({ action: "getInbox", username }); }
async function apiClaimInbox(username, id) {
  const res = await postToGAS({ action: "claimInbox", username, id });
  res.result === "SUCCESS" ? showToast("Reward inbox diklaim!", "success") : showToast(res.message || "Gagal klaim inbox.", "error");
  return res;
}

// ============================================================
//  AUTO INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => { loadSession(); });
