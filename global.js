/**
 * ============================================================
 *  GLOBAL.JS — NEON PLINKO VIP v12.0  (UNIFIED EDITION)
 * ============================================================
 *  Semua halaman terhubung ke sheet Google lewat Apps Script.
 *  Sheet: User | Deposit | Withdraw | Inbox | Referral
 * ============================================================
 */

// ── KONFIGURASI ──────────────────────────────────────────────
const SCRIPT_URL   = "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec";
const GLOBAL_SHEET_URL = SCRIPT_URL;
const WA_ADMIN     = "6289510249551";
const KURS_USDT    = 16800;
const FEE_USDT     = 2;
const MIN_WD       = 50000;
const MIN_DEPO_IDR = 20000;
const MIN_DEPO_USD = 10;

// ── State runtime ────────────────────────────────────────────
let _userData          = null;
let _lastKnownWdStatus = null;
var _depoMethod        = "QRIS";

// ============================================================
//  CORE: KOMUNIKASI DENGAN GOOGLE APPS SCRIPT
// ============================================================
async function gasPost(payload) {
  const url = SCRIPT_URL + "?data=" + encodeURIComponent(JSON.stringify(payload));
  const r1  = await _gasFetch("GET", url, null);
  if (r1) return r1;
  const r2  = await _gasFetch("POST", SCRIPT_URL, JSON.stringify(payload));
  if (r2) return r2;
  return { result: "ERROR", message: "NETWORK_ERROR" };
}

async function _gasFetch(method, url, body) {
  return new Promise(resolve => {
    const to = setTimeout(() => resolve(null), 25000);
    const opts = { method, redirect: "follow" };
    if (body) opts.body = body;
    fetch(url, opts)
      .then(r => r.text())
      .then(t => {
        clearTimeout(to);
        if (!t || t.trim().startsWith("<")) { resolve(null); return; }
        try { resolve(JSON.parse(t)); } catch(e) { resolve(null); }
      })
      .catch(() => { clearTimeout(to); resolve(null); });
  });
}

function errMsg(code) {
  return { "NETWORK_ERROR": "Koneksi gagal. Pastikan internet aktif." }[code] || code || "Terjadi kesalahan.";
}

// ============================================================
//  SESSION
// ============================================================
function getUsername()  { return localStorage.getItem("username") || null; }
function requireLogin() { if (!getUsername()) { window.location.href = "index.html"; return false; } return true; }
function saveSession(u) { localStorage.setItem("username", u); localStorage.setItem("user_session", u); }
function clearSession() { localStorage.clear(); }

// ============================================================
//  FETCH USER DATA
// ============================================================
async function fetchUserData() {
  const u = getUsername();
  if (!u) return null;
  const r = await gasPost({ action: "getUserData", username: u });
  if (r && r.result === "SUCCESS") {
    _userData = r;
    localStorage.setItem("_cache_saldo",    r.saldo    ?? 0);
    localStorage.setItem("_cache_fullname", r.fullname ?? "");
    localStorage.setItem("_cache_bank",     r.bank     ?? "");
    localStorage.setItem("_cache_rekening", r.rekening ?? "");
    localStorage.setItem("_cache_tier",     r.tier     ?? "STARTER");
    localStorage.setItem("_cache_refCode",  r.refCode  ?? "");
    return r;
  }
  return null;
}

// ============================================================
//  UTILITY UI
// ============================================================
function fmtIDR(n)        { return "IDR " + Number(n || 0).toLocaleString("id-ID"); }
function _setEl(id, val)  { const e = document.getElementById(id); if (e) e.innerText = val; }
function _setVal(id, val) { const e = document.getElementById(id); if (e) e.value = val || ""; }

// Modal universal — support icon, type (success/error/info)
function showModal(iconOrTitle, titleOrMsg, msgOrColor, typeOrUndef) {
  const m = document.getElementById("neon-modal");
  if (!m) return;
  // Deteksi signature lama (title, msg, color) vs baru (icon, title, msg, type)
  let icon, title, msg, type;
  if (typeOrUndef !== undefined) {
    // Signature baru: showModal(icon, title, msg, type)
    icon = iconOrTitle; title = titleOrMsg; msg = msgOrColor; type = typeOrUndef;
  } else {
    // Signature lama: showModal(title, msg, color)
    icon = "💡"; title = iconOrTitle; msg = titleOrMsg;
    type = (msgOrColor && msgOrColor.includes("pink")) ? "error"
         : (msgOrColor && msgOrColor.includes("yellow")) ? "success"
         : "info";
  }
  m.className = "m-" + (type || "success");
  const iconEl = document.getElementById("modal-icon");
  if (iconEl) iconEl.textContent = icon;
  _setEl("modal-title", title);
  _setEl("modal-msg",   msg);
  // Legacy: set direct style for pages that don't use class-based modal
  const titleEl = document.getElementById("modal-title");
  if (titleEl && !iconEl) {
    const c = type==="error"?"#ff0077":type==="info"?"#0055ff":"#f5e642";
    titleEl.style.color = c;
  }
  m.style.display = "block";
  const ov = document.getElementById("modal-overlay");
  if (ov) ov.style.display = "block";
}

function closeModal() {
  const m = document.getElementById("neon-modal");  if (m) m.style.display = "none";
  const o = document.getElementById("modal-overlay"); if (o) o.style.display = "none";
  document.querySelectorAll(".btn-wa-inject").forEach(b => b.remove());
}

// ============================================================
//  PROFIL
// ============================================================
async function initProfile() {
  if (!requireLogin()) return;
  _setEl("profile-username", getUsername());
  const data = await fetchUserData();
  if (!data) {
    showModal("❌", "GAGAL MEMUAT", "Data profil tidak bisa diambil dari server. Refresh halaman.", "error");
    return;
  }
  _setEl("profile-username", data.username  || "-");
  _setEl("profile-tier",    (data.tier || "STARTER") + " MEMBER");
  _setEl("display-saldo",    fmtIDR(data.saldo));
  _setEl("profile-fullname", data.fullname  || "-");
  _setEl("profile-phone",    data.phone     || "-");
  _setEl("profile-bank",     data.bank      || "-");
  _setEl("profile-rek",      data.rekening  || "-");
  _setEl("total-depo",       fmtIDR(data.totalDepo));
  _setEl("total-wd",         fmtIDR(data.totalWD));
  _setEl("profile-refcode",  data.refCode   || "-");
}

// ============================================================
//  WITHDRAW
// ============================================================
async function initWithdraw() {
  if (!requireLogin()) return;
  _setEl("wd-balance", "Memuat...");
  const data = await fetchUserData();
  if (!data) {
    _setEl("wd-balance", "GAGAL");
    showModal("❌", "SERVER ERROR", "Data tidak bisa diambil. Periksa koneksi lalu refresh.", "error");
    return;
  }
  _setEl("wd-balance",       fmtIDR(data.saldo));
  _setVal("wd-account-name", data.fullname);
  _setVal("wd-account-num",  data.rekening);
  _setVal("wd-method",       data.bank);
  await loadWithdrawHistory();
}

async function loadWithdrawHistory() {
  const container = document.getElementById("wd-history");
  if (!container) return;
  container.innerHTML = '<div class="hempty"><i class="fa-solid fa-spinner fa-spin"></i><p>Memuat riwayat...</p></div>';

  let result = await gasPost({ action: "get_wd_history", username: getUsername() });
  if (!result || result.result !== "SUCCESS") {
    await new Promise(r => setTimeout(r, 1500));
    result = await gasPost({ action: "get_wd_history", username: getUsername() });
  }
  if (!result || result.result !== "SUCCESS") {
    container.innerHTML = '<div class="hempty"><i class="fa-regular fa-rectangle-list"></i><p>Gagal memuat riwayat.</p></div>';
    return;
  }
  if (!result.data || !result.data.length) {
    container.innerHTML = '<div class="hempty"><i class="fa-regular fa-rectangle-list"></i><p>Belum ada riwayat penarikan.</p></div>';
    return;
  }
  // Render delegasi ke halaman jika ada fungsi renderWDHistory
  if (typeof renderWDHistory === "function") { renderWDHistory(result.data); return; }

  // Fallback render sederhana
  container.innerHTML = result.data.map((item, i) => {
    const st = String(item.status||"PROSES").toUpperCase();
    const sc = st==="BERHASIL"?"status-sukses":st==="GAGAL"?"status-gagal":"status-proses";
    return `<div class="history-item ${i===0?"latest":""}">
      ${i===0?'<div class="badge-new">BARU</div>':""}
      <div class="hist-top"><span>PENARIKAN DANA</span><span class="status-badge ${sc}">${st}</span></div>
      <div style="color:#f5e642;font-weight:bold;">${fmtIDR(item.amount||item.jumlah||0)}</div>
      <div style="font-size:10px;color:#aaa;">${item.timestamp||item.tanggal||""}</div>
    </div>`;
  }).join("");
}

async function processWithdraw() {
  if (!requireLogin()) return;
  const amtEl  = document.getElementById("wd-amount");
  const amount = Number(amtEl?.value || 0);
  if (!amount || amount <= 0) { showModal("🚫","Gagal","Masukkan nominal penarikan.","error"); return; }
  if (amount < MIN_WD) { showModal("🚫","Ditolak",`Minimal penarikan ${fmtIDR(MIN_WD)}.`,"error"); return; }

  showModal("⏳","Mengecek...","Memverifikasi saldo ke server...","info");
  const cek = await gasPost({ action: "sync_balance", username: getUsername() });
  if (!cek || cek.result !== "SUCCESS") { showModal("❌","Gagal","Tidak bisa verifikasi saldo: "+errMsg(cek?.message),"error"); return; }

  const saldoServer = Number(cek.saldo || 0);
  _setEl("wd-balance", fmtIDR(saldoServer));
  if (amount > saldoServer) {
    showModal("❌","Saldo Tidak Cukup",`Saldo: ${fmtIDR(saldoServer)}\nWithdraw: ${fmtIDR(amount)}`,"error"); return;
  }
  showModal("⏳","Memproses...","Mengirim permintaan ke server...","info");
  const result = await gasPost({ action: "withdraw", username: getUsername(), amount });
  if (result && result.result === "SUCCESS") {
    _setEl("wd-balance",    fmtIDR(result.newSaldo));
    _setEl("display-saldo", fmtIDR(result.newSaldo));
    localStorage.setItem("_cache_saldo", result.newSaldo);
    if (amtEl) amtEl.value = "";
    showModal("✅","Berhasil Diajukan",`Penarikan ${fmtIDR(amount)} berhasil!\nSaldo baru: ${fmtIDR(result.newSaldo)}\nMenunggu approval admin.`,"success");
    await loadWithdrawHistory();
  } else {
    showModal("❌","Gagal", result?.message || errMsg(result?.message), "error");
  }
}

// Polling WD setiap 8 detik
setInterval(async () => {
  if (!document.getElementById("wd-history") || !getUsername()) return;
  const r = await gasPost({ action: "sync_balance", username: getUsername() });
  if (r && r.result === "SUCCESS") {
    _setEl("wd-balance",    fmtIDR(r.saldo));
    _setEl("display-saldo", fmtIDR(r.saldo));
    localStorage.setItem("_cache_saldo", r.saldo);
  }
  await loadWithdrawHistory();
}, 8000);

// ============================================================
//  DEPOSIT
// ============================================================
async function initDeposit() {
  if (!requireLogin()) return;
  const qris = document.getElementById("qris-container");
  if (qris) qris.style.display = "block";
  await loadDepositHistory();
}

function selectMethod(el, method) {
  _depoMethod = method;
  document.querySelectorAll(".method-item").forEach(m => m.classList.remove("active"));
  if (el) el.classList.add("active");
  const qris    = document.getElementById("qris-container");
  const usdtBox = document.getElementById("usdt-calc") || document.getElementById("usdt-info");
  const idrGrid = document.getElementById("idr-grid");
  const usdtGrid= document.getElementById("usdt-grid");
  const kBadge  = document.getElementById("kurs-badge");
  const labelEl = document.getElementById("label-nominal");
  if (qris)    qris.style.display    = "none";
  if (usdtBox) usdtBox.style.display = "none";
  if (idrGrid) idrGrid.style.display = "none";
  if (usdtGrid)usdtGrid.style.display= "none";
  if (kBadge)  kBadge.style.display  = "none";
  if (method === "QRIS") {
    if (qris)    qris.style.display    = "block";
    if (idrGrid) idrGrid.style.display = "grid";
    if (labelEl) labelEl.innerHTML     = "<i class='fa-solid fa-coins'></i> NOMINAL DEPOSIT (IDR)";
  } else if (method === "USDT") {
    if (usdtBox) usdtBox.style.display = "block";
    if (usdtGrid)usdtGrid.style.display= "grid";
    if (kBadge)  kBadge.style.display  = "block";
    if (labelEl) labelEl.innerHTML     = "<i class='fa-brands fa-ethereum'></i> JUMLAH USDT ($)";
    calculateUSDT();
  }
  const inp = document.getElementById("depo-amount");
  if (inp) inp.value = "";
}

function calculateUSDT() {
  if (_depoMethod !== "USDT") return;
  const amt      = Number(document.getElementById("depo-amount")?.value || 0);
  const afterFee = amt > FEE_USDT ? amt - FEE_USDT : 0;
  const idrResult= Math.round(afterFee * KURS_USDT);
  _setEl("usdt-to-idr", fmtIDR(idrResult));
  // Update calc detail jika ada (deposit.html asli)
  const el = document.getElementById("usdt-calc-detail");
  if (el && amt > 0) {
    el.innerHTML = `Deposit: <strong>$${amt.toFixed(2)}</strong><br>` +
      `Fee: <strong style="color:#ff0077">-$${FEE_USDT}</strong><br>` +
      `Diterima: <strong style="color:#42dfa8">$${afterFee.toFixed(2)}</strong><br>` +
      `<span style="color:#f5e642;font-weight:700">≈ ${fmtIDR(idrResult)}</span>`;
  }
}

function setAmount(val) { const e = document.getElementById("depo-amount"); if (e) { e.value = val; calculateUSDT(); } }
function setUSDT(val)   { setAmount(val); }

async function processDeposit() {
  if (!requireLogin()) return;
  const amount = Number(document.getElementById("depo-amount")?.value || 0);
  if (!amount || amount <= 0) { showModal("🚫","Ditolak","Masukkan nominal deposit.","error"); return; }
  if (_depoMethod === "QRIS" && amount < MIN_DEPO_IDR) {
    showModal("🚫","Ditolak",`Minimal deposit QRIS adalah ${fmtIDR(MIN_DEPO_IDR)}.`,"error"); return;
  }
  if (_depoMethod === "USDT" && amount < MIN_DEPO_USD) {
    showModal("🚫","Ditolak",`Minimal deposit USDT adalah $${MIN_DEPO_USD}.`,"error"); return;
  }
  showModal("⏳","Memproses...","Mengirim ke server...","info");
  const result = await gasPost({ action: "deposit", username: getUsername(), method: _depoMethod, amount });
  if (result && result.result === "SUCCESS") {
    if (_depoMethod === "USDT") {
      const diterima = (amount - FEE_USDT) * KURS_USDT;
      showModal("✅","Deposit USDT Diajukan",`Nominal: $${amount}\nEstimasi: ${fmtIDR(diterima)}\n(Kurs: Rp ${KURS_USDT.toLocaleString("id-ID")} | Fee: $${FEE_USDT})\n\nSilakan konfirmasi ke admin.`,"success");
      setTimeout(() => {
        const modal = document.getElementById("neon-modal");
        if (modal && !modal.querySelector(".btn-wa-inject")) {
          const msgWA = encodeURIComponent(`Halo Admin, saya *${getUsername()}* ingin deposit USDT $${amount}. Estimasi diterima: ${fmtIDR((amount-FEE_USDT)*KURS_USDT)}. Mohon konfirmasi.`);
          const btn = document.createElement("a");
          btn.className = "btn-wa-inject";
          btn.href = `https://wa.me/${WA_ADMIN}?text=${msgWA}`;
          btn.target = "_blank";
          btn.style.cssText = "display:block;margin-top:10px;padding:10px;border-radius:50px;background:#25d366;color:#fff;text-align:center;font-weight:700;text-decoration:none;font-size:12px;";
          btn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> KONFIRMASI KE ADMIN (WA)';
          modal.appendChild(btn);
        }
      }, 100);
    } else {
      showModal("✅","Deposit Diajukan",`Deposit ${fmtIDR(amount)} via ${_depoMethod} berhasil!\nSaldo masuk setelah admin verifikasi.`,"success");
    }
    const inp = document.getElementById("depo-amount");
    if (inp) inp.value = "";
    await loadDepositHistory();
  } else {
    showModal("❌","Gagal", result?.message || errMsg(result?.message), "error");
  }
}

async function loadDepositHistory() {
  const container = document.getElementById("depo-history-list");
  if (!container) return;
  const result = await gasPost({ action: "get_deposit_history", username: getUsername() });
  if (!result || result.result !== "SUCCESS" || !result.data || !result.data.length) {
    container.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,.3);padding:20px;font-size:11px;">Belum ada riwayat transaksi.</div>';
    return;
  }
  container.innerHTML = "";
  result.data.forEach(item => {
    const isCrypto  = !!item.nominalCrypto;
    const st        = String(item.status || "PROSES").toUpperCase();
    const stClass   = st==="BERHASIL"?"status-sukses":st==="GAGAL"?"status-gagal":"status-proses";
    const methodLbl = isCrypto ? "USDT CRYPTO" : "QRIS";
    let displayAmt;
    if (isCrypto) {
      const match = String(item.nominalCrypto).match(/\((\d+\.?\d*)\)/);
      displayAmt  = match ? `$${match[1]}` : item.nominalCrypto;
    } else {
      displayAmt = fmtIDR(item.nominalIDR);
    }
    container.innerHTML += `
      <div class="history-item">
        <div class="hist-method">${methodLbl}</div>
        <div class="hist-date">${item.timestamp||item.tanggal||""}</div>
        <div class="hist-amount">${displayAmt}</div>
        <div class="hist-status ${stClass}">${item.status}</div>
      </div>`;
  });
}

setInterval(() => {
  if (document.getElementById("depo-history-list") && getUsername()) loadDepositHistory();
}, 8000);

// ============================================================
//  REWARD
// ============================================================
async function initReward() {
  if (!requireLogin()) return;
  const data = await fetchUserData();
  if (data) {
    _setEl("ref-code-display", data.refCode || "-");
  }
  await loadInbox();
  await loadRefList();
}

async function claimDailyReward() {
  if (!requireLogin()) return;
  const result = await gasPost({ action: "claim_daily", username: getUsername() });
  if (result && result.result === "SUCCESS") {
    _setEl("display-saldo", fmtIDR(result.newSaldo));
    localStorage.setItem("_cache_saldo", result.newSaldo);
    localStorage.setItem("_lastDailyClaim_"+getUsername(), new Date().toISOString());
    showModal("🎉","Daily Bonus!",`Bonus harian ${fmtIDR(result.bonus)} berhasil diklaim!\nSaldo baru: ${fmtIDR(result.newSaldo)}`,"success");
  } else {
    showModal("ℹ️","Info", result?.message || "Sudah klaim hari ini.", "info");
  }
}

function claimType(type) { if (type === "daily") claimDailyReward(); }

async function claimInboxItem(inboxId) {
  if (!requireLogin()) return;
  const result = await gasPost({ action: "claim_inbox", username: getUsername(), inboxId });
  if (result && result.result === "SUCCESS") {
    _setEl("display-saldo", fmtIDR(result.newSaldo));
    localStorage.setItem("_cache_saldo", result.newSaldo);
    showModal("🎁","Hadiah Diklaim!",`${fmtIDR(result.bonus)} masuk ke saldo!\nSaldo baru: ${fmtIDR(result.newSaldo)}`,"success");
    if (typeof loadInbox === "function") await loadInbox();
  } else {
    showModal("❌","Gagal", result?.message || "Klaim gagal.", "error");
  }
}

async function claimReferral() {
  if (!requireLogin()) return;
  const result = await gasPost({ action: "claim_referral", username: getUsername() });
  if (result && result.result === "SUCCESS") {
    _setEl("display-saldo", fmtIDR(result.newSaldo));
    localStorage.setItem("_cache_saldo", result.newSaldo);
    showModal("🎉","Bonus Referral!", result.message, "success");
    if (typeof loadRefList === "function") await loadRefList();
  } else {
    showModal("ℹ️","Info", result?.message || "Belum bisa klaim.", "info");
  }
}

function copyRefLink() {
  const refCode = localStorage.getItem("_cache_refCode") || getUsername();
  const link    = `https://neonplinko.vip/reg?ref=${refCode}`;
  navigator.clipboard?.writeText(link)
    .then(()  => showModal("✅","Disalin!",`Link: ${link}`,"success"))
    .catch(()  => showModal("🔗","Link Referral", link, "info"));
}
function copyLink() { copyRefLink(); }

async function loadInbox() {
  const box = document.getElementById("inbox-container");
  if (!box) return;
  box.innerHTML = '<div style="text-align:center;color:#777;padding:12px;font-size:11px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat hadiah...</div>';
  const result = await gasPost({ action: "get_inbox", username: getUsername() });
  if (!result || result.result !== "SUCCESS" || !result.data || !result.data.length) {
    box.innerHTML = '<div style="text-align:center;color:#555;padding:15px;font-size:12px;">Tidak ada hadiah saat ini.</div>';
    return;
  }
  box.innerHTML = result.data.map(item => `
    <div style="background:rgba(255,0,119,.07);border:1px solid rgba(255,0,119,.3);border-radius:12px;padding:14px;margin-bottom:12px;">
      <div style="font-size:12px;color:#ccc;margin-bottom:6px;">${item.pesan}</div>
      <div style="color:#f5e642;font-weight:900;font-size:16px;margin-bottom:10px;">+ ${fmtIDR(item.saldo)}</div>
      <button onclick="claimInboxItem('${item.id}')"
        style="width:100%;padding:10px;border-radius:50px;background:rgba(245,230,66,.1);border:1px solid rgba(245,230,66,.3);color:#f5e642;font-family:'Outfit',sans-serif;font-weight:700;cursor:pointer;font-size:12px;">
        KLAIM HADIAH
      </button>
    </div>`).join("");
}

async function loadRefList() {
  const refBox = document.getElementById("ref-list-container");
  if (!refBox) return;
  const result = await gasPost({ action: "get_ref_list", username: getUsername() });
  if (!result || result.result !== "SUCCESS") { refBox.innerHTML = '<div style="text-align:center;color:#555;font-size:11px;padding:8px;">Gagal memuat data referral.</div>'; return; }
  const { invited, totalBonus, refCode } = result;
  if (refCode) { localStorage.setItem("_cache_refCode", refCode); _setEl("ref-code-display", refCode); }
  _setEl("ref-bonus-total", fmtIDR(totalBonus));
  if (!invited || !invited.length) { refBox.innerHTML = '<div style="text-align:center;color:#555;font-size:11px;padding:10px;">Belum ada teman yang diundang.</div>'; return; }
  refBox.innerHTML = invited.map(inv => {
    const ok = inv.status === "VALID";
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid #1a1a2e;">
      <span style="font-size:12px;">${inv.username}</span>
      <span style="font-size:10px;font-weight:bold;padding:3px 8px;border-radius:6px;background:${ok?"rgba(0,255,0,.12)":"rgba(255,200,0,.1)"};color:${ok?"#00ff88":"#ffcc00"};">${inv.status}</span>
    </div>`;
  }).join("");
}

// ============================================================
//  GAME
// ============================================================
async function playPlinkoGame(betAmount) {
  if (!requireLogin()) return null;
  const result = await gasPost({ action: "game_play", username: getUsername(), bet: betAmount });
  if (result && result.result === "SUCCESS") {
    _setEl("display-saldo", fmtIDR(result.newSaldo));
    localStorage.setItem("_cache_saldo", result.newSaldo);
    return { multiplier: result.target_multiplier, newSaldo: result.newSaldo };
  }
  return null;
}

async function syncSaldo() {
  if (!getUsername()) return;
  const r = await gasPost({ action: "sync_balance", username: getUsername() });
  if (r && r.result === "SUCCESS") {
    _setEl("display-saldo", fmtIDR(r.saldo));
    localStorage.setItem("_cache_saldo", r.saldo);
  }
}

// ============================================================
//  LOGOUT
// ============================================================
function userLogout() {
  if (getUsername()) gasPost({ action: "logout", username: getUsername() }).catch(() => {});
  clearSession();
  window.location.href = "index.html";
}

// ============================================================
//  AUTO-INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  const page = window.location.pathname.split("/").pop() || "index.html";
  if (page === "index.html" || page === "") return;
  if (!requireLogin()) return;
  if (page === "profil.html")   { initProfile();  return; }
  if (page === "withdraw.html") { initWithdraw(); return; }
  if (page === "deposit.html" || page === "deposit__1_.html" || page === "deposit_v4.html") { initDeposit(); return; }
  if (page === "reward.html")   { initReward();   return; }
  if (page === "game.html")     { fetchUserData(); return; }
});
