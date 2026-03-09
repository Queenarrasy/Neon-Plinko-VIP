/**
 * GLOBAL.JS — Neon Plinko VIP v4.2 FINAL
 *
 * PENYEBAB REDIRECT LOOP (semua sudah di-fix):
 * [1] username tidak tersimpan di session → fixed: simpan eksplisit
 * [2] saveSession overwrite penuh → fixed: merge dengan data lama
 * [3] requireLogin dengan setTimeout → fixed: replace langsung + flag guard
 * [4] postToGAS semua tampilkan loading → fixed: param silent untuk background
 * [5] apiGetSaldo overwrite session field username → fixed: update parsial
 * [6] DOMContentLoaded race condition → fixed: currentUser diinit IIFE sync
 */

// ── KONFIGURASI ───────────────────────────────────────────────
const GAS_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"; // ← Ganti!

// ── CONFIG GAME ──────────────────────────────────────────────
const TIER_CONFIG = {
  MEMBER:   {minDepo:0,        color:"#aaaaaa", icon:"👤"},
  SILVER:   {minDepo:500000,   color:"#c0c0c0", icon:"🥈"},
  GOLD:     {minDepo:1000000,  color:"#ffd700", icon:"🥇"},
  PLATINUM: {minDepo:3000000,  color:"#e5e4e2", icon:"💎"},
  DIAMOND:  {minDepo:10000000, color:"#b9f2ff", icon:"💠"},
};
const DEPOSIT_CONFIG  = {MIN_QRIS: 20000};
const WITHDRAW_CONFIG = {MIN_WD: 50000};
const DAILY_BONUS = 1000;

// ── [FIX #6] Init session SYNCHRONOUS (bukan DOMContentLoaded) ──
let currentUser = (function () {
  try {
    const raw = localStorage.getItem("plinko_session");
    if (!raw) return null;
    const obj = JSON.parse(raw);
    // Validasi: harus ada username
    return (obj && obj.username) ? obj : null;
  } catch (e) { return null; }
})();

// ── SESSION ───────────────────────────────────────────────────

// [FIX #2] Merge — tidak hapus field yang sudah ada
function saveSession(data) {
  if (!data) return;
  // Merge ke currentUser yang ada, override dengan data baru
  currentUser = Object.assign({}, currentUser || {}, data);
  // Pastikan username tidak hilang
  if (!currentUser.username) { console.warn("[session] username kosong!"); return; }
  try { localStorage.setItem("plinko_session", JSON.stringify(currentUser)); } catch(e) {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem("plinko_session");
    if (!raw) { currentUser = null; return null; }
    const obj = JSON.parse(raw);
    currentUser = (obj && obj.username) ? obj : null;
  } catch(e) { currentUser = null; }
  return currentUser;
}

function clearSession() {
  currentUser = null;
  try { localStorage.removeItem("plinko_session"); } catch(e) {}
}

// [FIX #3] Tidak ada setTimeout, tidak ada toast, langsung replace
function requireLogin(redirectUrl) {
  redirectUrl = redirectUrl || "index.html";
  // Pastikan currentUser terbaca (kalau belum)
  if (!currentUser) loadSession();
  if (!currentUser || !currentUser.username) {
    // Guard: cegah double redirect
    if (!window._redirecting) {
      window._redirecting = true;
      window.location.replace(redirectUrl);
    }
    return null;
  }
  return currentUser;
}

function getUsername() {
  return (currentUser && currentUser.username) ? currentUser.username : "";
}

// ── UTILITY ───────────────────────────────────────────────────
function formatRupiah(n) { return "Rp " + Number(n||0).toLocaleString("id-ID"); }
function fmtNow() {
  return new Date().toLocaleString("id-ID",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"});
}

function setLoading(show) {
  const el = document.getElementById("loading");
  if (el) el.style.display = show ? "flex" : "none";
}

function showToast(msg, type) {
  type = type || "info";
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div"); t.id = "toast";
    t.style.cssText = "position:fixed;bottom:30px;left:50%;transform:translateX(-50%);padding:12px 28px;border-radius:10px;font-weight:bold;color:#fff;z-index:99999;font-size:14px;transition:opacity 0.4s;pointer-events:none;text-align:center;max-width:90vw;box-shadow:0 4px 16px rgba(0,0,0,0.4)";
    document.body.appendChild(t);
  }
  var c = {success:"#28a745",error:"#dc3545",info:"#0d6efd",warning:"#e67e22"};
  t.style.background = c[type] || c.info;
  t.style.opacity = "1";
  t.textContent = msg;
  clearTimeout(t._t);
  t._t = setTimeout(function(){ t.style.opacity = "0"; }, 3500);
}

function renderTierBadge(tier) {
  var cfg = TIER_CONFIG[tier] || TIER_CONFIG.MEMBER;
  return '<span style="color:'+cfg.color+';font-weight:bold;">'+cfg.icon+' '+tier+'</span>';
}
function renderStatus(status) {
  var m = {PROSES:["#f0ad4e","⏳ Proses"],BERHASIL:["#28a745","✅ Berhasil"],SUCCESS:["#28a745","✅ Berhasil"],REJECT:["#dc3545","❌ Ditolak"],FAILED:["#dc3545","❌ Gagal"]};
  var s = m[String(status).toUpperCase()] || ["#aaa", status];
  return '<span style="color:'+s[0]+';font-weight:bold;">'+s[1]+'</span>';
}
function renderHistoryTable(containerId, data, type) {
  type = type || "depo";
  var el = document.getElementById(containerId); if (!el) return;
  if (!data || !data.length) { el.innerHTML='<p style="text-align:center;color:#888;padding:16px;">Belum ada riwayat.</p>'; return; }
  var isWd = (type === "wd");
  var rows = data.map(function(r){
    return '<tr><td style="padding:8px">'+r.tanggal+'</td><td style="padding:8px">'+(isWd?formatRupiah(r.jumlah):(r.nominalIDR?formatRupiah(r.nominalIDR):r.nominalCrypto))+'</td><td style="padding:8px">'+(isWd?(r.bank+" - "+r.rekening):(r.method||"QRIS"))+'</td><td style="padding:8px">'+renderStatus(r.status)+'</td></tr>';
  }).join("");
  el.innerHTML='<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#1a1a2e;color:#eee;"><th style="padding:8px">Tanggal</th><th style="padding:8px">Nominal</th><th style="padding:8px">'+(isWd?"Rekening":"Metode")+'</th><th style="padding:8px">Status</th></tr></thead><tbody>'+rows+'</tbody></table>';
}

// ── [FIX #4] API CALLER ───────────────────────────────────────
// silent=true → tidak tampilkan loading overlay (untuk background request)
async function postToGAS(payload, silent) {
  if (!silent) setLoading(true);
  try {
    var res = await fetch(GAS_URL, {
      method: "POST",
      headers: {"Content-Type":"text/plain"},
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch(err) {
    if (!silent) showToast("Gagal terhubung ke server.", "error");
    return {result:"ERROR", message: String(err)};
  } finally {
    if (!silent) setLoading(false);
  }
}

async function getFromGAS(params, silent) {
  if (!silent) setLoading(true);
  try {
    var enc = encodeURIComponent(JSON.stringify(params));
    var res = await fetch(GAS_URL + "?data=" + enc);
    return await res.json();
  } catch(err) {
    if (!silent) showToast("Gagal terhubung ke server.", "error");
    return {result:"ERROR", message: String(err)};
  } finally {
    if (!silent) setLoading(false);
  }
}

// ── AUTH ──────────────────────────────────────────────────────

// [FIX #1] Simpan username dari parameter input, bukan dari response GAS
async function apiLogin(username, password) {
  var res = await postToGAS({action:"login", username:username, password:password});
  if (res.result === "SUCCESS") {
    saveSession({
      username:    username,           // dari input — GAS tidak return ini
      fullname:    res.fullname  || "",
      saldo:       Number(res.saldo)  || 0,
      bank:        res.bank      || "",
      rekening:    res.rekening  || "",
      refCode:     res.refCode   || "",
      tier:        res.tier      || "MEMBER",
      winrate:     Number(res.winrate)     || 50,
      maxWinLimit: Number(res.maxWinLimit) || 500000,
    });
    showToast("Selamat datang, " + (res.fullname || username) + "! 🎉", "success");
  } else {
    showToast(res.message || "Login gagal.", "error");
  }
  return res;
}

async function apiRegister(p) {
  var res = await postToGAS(Object.assign({action:"register"}, p));
  if (res.result === "SUCCESS") showToast("Registrasi berhasil! Kode referral: " + res.refCode, "success");
  else showToast(res.message || "Registrasi gagal.", "error");
  return res;
}

function apiLogout(redirectUrl) {
  redirectUrl = redirectUrl || "index.html";
  var u = getUsername();
  clearSession();
  if (u) postToGAS({action:"set_status", username:u, status:"OFFLINE"}, true).catch(function(){});
  showToast("Berhasil logout.", "info");
  setTimeout(function(){ window.location.replace(redirectUrl); }, 600);
}

// ── PROFILE & SALDO ───────────────────────────────────────────
async function apiGetProfile(username) {
  return await getFromGAS({action:"get_profile", username:username});
}

// [FIX #5] Update parsial — TIDAK overwrite username/password/dll
async function apiGetSaldo(username) {
  var res = await getFromGAS({action:"get_saldo", username:username}, true); // silent!
  if (res.result === "SUCCESS" && currentUser) {
    // Hanya update field yang relevan, username TIDAK disentuh
    currentUser.saldo   = Number(res.saldo)   || currentUser.saldo;
    currentUser.tier    = res.tier            || currentUser.tier;
    currentUser.winrate = Number(res.winrate) || currentUser.winrate;
    try { localStorage.setItem("plinko_session", JSON.stringify(currentUser)); } catch(e) {}
    var el = document.getElementById("saldoDisplay");
    if (el) el.textContent = formatRupiah(res.saldo);
  }
  return res;
}

// Fire-and-forget — tidak blocking, tidak loading overlay
function apiSetStatus(username, status) {
  postToGAS({action:"set_status", username:username, status:status}, true).catch(function(){});
}
function apiSetSessionStart(username) {
  postToGAS({action:"set_session_start", username:username}, true).catch(function(){});
}

// ── GAMEPLAY ──────────────────────────────────────────────────
async function apiGetGameConfig(username) {
  return await getFromGAS({action:"get_game_config", username:username}, true);
}

// Silent — tidak loading overlay tiap lempar bola
async function apiGamePlay(username, bet, saldoAwal) {
  var res = await postToGAS({action:"game_play", username:username, bet:bet, saldoAwal:saldoAwal}, true);
  if (res.result === "SUCCESS" && currentUser) {
    currentUser.saldo = Number(res.newSaldo);
    try { localStorage.setItem("plinko_session", JSON.stringify(currentUser)); } catch(e) {}
  }
  return res;
}

// ── DEPOSIT ───────────────────────────────────────────────────
async function apiDepositQRIS(username, nominalIDR) {
  if (nominalIDR < DEPOSIT_CONFIG.MIN_QRIS) { showToast("Minimal deposit QRIS " + formatRupiah(DEPOSIT_CONFIG.MIN_QRIS), "error"); return {result:"ERROR"}; }
  var res = await postToGAS({action:"deposit", username:username, nominalIDR:nominalIDR, nominalCrypto:"", method:"QRIS", tanggal:fmtNow()});
  (res.result==="SUCCESS") ? showToast("Deposit QRIS diajukan! Tunggu konfirmasi.", "success") : showToast(res.message||"Deposit gagal.", "error");
  return res;
}
async function apiDepositCrypto(username, nominalCrypto) {
  var res = await postToGAS({action:"deposit", username:username, nominalIDR:0, nominalCrypto:nominalCrypto, method:"CRYPTO", tanggal:fmtNow()});
  (res.result==="SUCCESS") ? showToast("Deposit Crypto diajukan! Tunggu konfirmasi.", "success") : showToast(res.message||"Deposit gagal.", "error");
  return res;
}
async function apiGetDepoHistory(username) { return await getFromGAS({action:"get_deposit_history", username:username}); }

// ── WITHDRAW ──────────────────────────────────────────────────
async function apiWithdraw(username, jumlah, namaLengkap, bank, rekening) {
  if (jumlah < WITHDRAW_CONFIG.MIN_WD) { showToast("Minimal withdraw " + formatRupiah(WITHDRAW_CONFIG.MIN_WD), "error"); return {result:"ERROR"}; }
  var res = await postToGAS({action:"withdraw", username:username, jumlah:jumlah, namaLengkap:namaLengkap, bank:bank, rekening:rekening, tanggal:fmtNow()});
  if (res.result === "SUCCESS") {
    showToast("Withdraw berhasil diajukan!", "success");
    if (currentUser) { currentUser.saldo = Number(res.newSaldo); try{localStorage.setItem("plinko_session",JSON.stringify(currentUser));}catch(e){} }
  } else { showToast(res.message||"Withdraw gagal.", "error"); }
  return res;
}
async function apiGetWDHistory(username) { return await getFromGAS({action:"get_withdraw_history", username:username}); }

// ── INBOX ─────────────────────────────────────────────────────
async function apiGetInbox(username) { return await getFromGAS({action:"get_inbox", username:username}); }
async function apiClaimInbox(username, id, saldo) {
  var res = await postToGAS({action:"claim_inbox", username:username, id:id, saldo:saldo});
  if (res.result === "SUCCESS") {
    showToast("Reward inbox diklaim! 🎁", "success");
    if (currentUser) { currentUser.saldo = Number(res.newSaldo); try{localStorage.setItem("plinko_session",JSON.stringify(currentUser));}catch(e){} }
  } else { showToast(res.message||"Gagal klaim inbox.", "error"); }
  return res;
}

// ── DAILY ─────────────────────────────────────────────────────
async function apiClaimDaily(username) {
  var res = await postToGAS({action:"claim_daily", username:username});
  if (res.result === "SUCCESS") {
    showToast("Bonus harian " + formatRupiah(res.bonus) + " diklaim! 🎉", "success");
    if (currentUser) { currentUser.saldo = Number(res.newSaldo); try{localStorage.setItem("plinko_session",JSON.stringify(currentUser));}catch(e){} }
  } else { showToast(res.message||"Gagal klaim bonus.", "error"); }
  return res;
}

// ── REFERRAL ──────────────────────────────────────────────────
async function apiGetReferrals(username) { return await getFromGAS({action:"get_referrals", username:username}); }
async function apiClaimReferral(username) {
  var res = await postToGAS({action:"claim_referral", username:username});
  if (res.result === "SUCCESS") {
    showToast("Bonus referral " + formatRupiah(res.bonus) + " diklaim! 🎉", "success");
    if (currentUser) { currentUser.saldo = Number(res.newSaldo); try{localStorage.setItem("plinko_session",JSON.stringify(currentUser));}catch(e){} }
  } else { showToast(res.message||"Gagal klaim referral.", "error"); }
  return res;
}

// ── MASTER PANEL ──────────────────────────────────────────────
async function adminGetAllUsers()        { return await getFromGAS({action:"getAllUsers"}); }
async function adminGetPendingDeposits() { return await getFromGAS({action:"get_pending_deposits"}); }
async function adminApproveDeposit(row) {
  var res = await postToGAS({action:"approve_deposit", row:row});
  (res.result==="SUCCESS") ? showToast("Deposit di-approve! ✅","success") : showToast(res.message||"Gagal.","error");
  return res;
}
async function adminUpdateWinrate(targetUser, newRate) {
  var res = await postToGAS({action:"updateWinrate", targetUser:targetUser, newRate:newRate});
  (res.result==="SUCCESS") ? showToast("Winrate "+targetUser+" → "+newRate+"%","success") : showToast(res.message||"Gagal.","error");
  return res;
}
async function adminUpdateSaldo(targetUser, amount) {
  var res = await postToGAS({action:"adminUpdateSaldo", targetUser:targetUser, amount:amount});
  (res.result==="SUCCESS") ? showToast("Saldo "+targetUser+" → "+formatRupiah(res.newSaldo),"success") : showToast(res.message||"Gagal.","error");
  return res;
}
async function adminSetMaxwinLimit(targetUser, maxwin) {
  var res = await postToGAS({action:"setMaxwinLimit", targetUser:targetUser, maxwin:maxwin});
  (res.result==="SUCCESS") ? showToast("MaxWin "+targetUser+" → "+formatRupiah(maxwin),"success") : showToast(res.message||"Gagal.","error");
  return res;
}
async function adminSetGlobalPanic(minutes) {
  var res = await postToGAS({action:"set_global_panic", minutes:minutes});
  if (res.result==="SUCCESS") (minutes>0) ? showToast("⚠️ PANIC AKTIF "+minutes+" menit!","warning") : showToast("✅ Panic dimatikan.","success");
  else showToast(res.message||"Gagal.","error");
  return res;
}
