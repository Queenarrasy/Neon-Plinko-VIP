/**
 * ============================================================
 *  GLOBAL.JS — NEON PLINKO VIP v11.0  (SERVER-FIRST EDITION)
 * ============================================================
 *
 *  PRINSIP ARSITEKTUR:
 *  ─────────────────────────────────────────────────────────
 *  ✅ Semua data SENSITIF (saldo, nama, rekening, winrate)
 *     SELALU diambil dari server (Google Sheet) — bukan localStorage.
 *
 *  ✅ localStorage hanya untuk:
 *     - "username"  → identitas sesi (siapa yang login)
 *     - "_cache_*"  → cache tampilan sementara saja
 *
 *  ✅ Setiap halaman dibuka → fetchUserData() dipanggil dulu
 *     → data server menimpa cache
 *
 *  ✅ Login di device apapun langsung sinkron dengan Sheet.
 *
 *  ✅ Jika server gagal → pesan jelas ditampilkan,
 *     TIDAK pakai data lama yang bisa menyesatkan.
 * ============================================================
 */

// ── KONFIGURASI ──────────────────────────────────────────────
const SCRIPT_URL   = "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec";
const WA_ADMIN     = "6289510249551";   // Ganti nomor WA admin
const KURS_USDT    = 16800;
const FEE_USDT     = 2;
const MIN_WD       = 50000;
const MIN_DEPO_IDR = 20000;
const MIN_DEPO_USD = 10;

// ── State runtime (bukan localStorage) ──────────────────────
let _userData            = null;
let _lastKnownWdStatus   = null;
var _depoMethod          = "QRIS";

// ============================================================
//  CORE: KOMUNIKASI GAS
// ============================================================

/**
 * gasPost — kompatibel WebView Android & browser biasa.
 *
 * Masalah WebView Android dengan GAS:
 * 1. fetch() + redirect:"follow" ke GAS sering diblokir WebView
 *    karena cross-origin redirect (script.google.com → googleusercontent.com)
 * 2. AbortController kadang memicu false abort di WebView lama
 *
 * Solusi:
 * - Encode payload sebagai query param → kirim via GET (lebih kompatibel)
 * - Fallback ke POST jika GET gagal
 * - Timeout manual tanpa AbortController
 */
async function gasPost(payload) {
  // ── Coba GET dulu (paling kompatibel di WebView Android) ──
  const url = SCRIPT_URL + "?data=" + encodeURIComponent(JSON.stringify(payload));

  const result = await _gasFetch("GET", url, null);
  if (result) return result;

  // ── Fallback: POST biasa ───────────────────────────────────
  const result2 = await _gasFetch("POST", SCRIPT_URL, JSON.stringify(payload));
  if (result2) return result2;

  // ── Kedua cara gagal ──────────────────────────────────────
  return { result: "ERROR", message: "NETWORK_ERROR" };
}

async function _gasFetch(method, url, body) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 25000);

    const opts = { method, redirect: "follow" };
    if (body) opts.body = body;

    fetch(url, opts)
      .then(res => res.text())
      .then(text => {
        clearTimeout(timeout);
        if (!text || text.trim().startsWith("<")) { resolve(null); return; }
        try { resolve(JSON.parse(text)); }
        catch (e) { resolve(null); }
      })
      .catch(() => { clearTimeout(timeout); resolve(null); });
  });
}

function errMsg(code) {
  return {
    "GAS_HTML"     : "Server belum di-deploy. Hubungi admin.",
    "TIMEOUT"      : "Server timeout (20 detik). Coba lagi.",
    "NETWORK_ERROR": "Koneksi ke server gagal. Pastikan internet aktif & coba refresh."
  }[code] || code || "Terjadi kesalahan.";
}

// ============================================================
//  SESSION
// ============================================================

function getUsername()  { return localStorage.getItem("username") || null; }

function requireLogin() {
  if (!getUsername()) { window.location.href = "index.html"; return false; }
  return true;
}

function saveSession(username) {
  localStorage.setItem("username",     username);
  localStorage.setItem("user_session", username);
}

function clearSession() { localStorage.clear(); }

// ============================================================
//  FETCH USER DATA — SELALU DARI SERVER
// ============================================================

async function fetchUserData() {
  const username = getUsername();
  if (!username) return null;

  const result = await gasPost({ action: "getUserData", username });

  if (result.result === "SUCCESS") {
    _userData = result;
    // Cache tipis untuk UI saja
    localStorage.setItem("_cache_saldo",    result.saldo    ?? 0);
    localStorage.setItem("_cache_fullname", result.fullname ?? "");
    localStorage.setItem("_cache_bank",     result.bank     ?? "");
    localStorage.setItem("_cache_rekening", result.rekening ?? "");
    localStorage.setItem("_cache_tier",     result.tier     ?? "STARTER");
    localStorage.setItem("_cache_refCode",  result.refCode  ?? "");
    return result;
  }

  console.warn("[fetchUserData]", result.message);
  return null;
}

// ============================================================
//  UTILITY UI
// ============================================================

function fmtIDR(n) { return "IDR " + Number(n || 0).toLocaleString("id-ID"); }

function _setEl(id, val)  { const e = document.getElementById(id); if (e) e.innerText = val; }
function _setVal(id, val) { const e = document.getElementById(id); if (e) e.value    = val || ""; }

function showModal(title, msg, color) {
  const m = document.getElementById("neon-modal");
  if (!m) return;
  _setEl("modal-title", title);
  _setEl("modal-msg",   msg);
  if (color) { m.style.border = "2px solid " + color; m.style.boxShadow = "0 0 20px " + color; }
  m.style.display = "block";
}

function closeModal() {
  const m = document.getElementById("neon-modal");
  if (m) m.style.display = "none";
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
    showModal("GAGAL MEMUAT ❌", "Data profil tidak bisa diambil dari server.\nRefresh halaman.", "var(--pink)");
    return;
  }

  _setEl("profile-username", data.username  || "-");
  _setEl("profile-tier",    (data.tier || "STARTER") + " MEMBER");
  _setEl("display-saldo",    fmtIDR(data.saldo));
  _setEl("profile-fullname", data.fullname  || "-");
  _setEl("profile-bank",     data.bank      || "-");
  _setEl("profile-rek",      data.rekening  || "-");
  _setEl("total-depo",       fmtIDR(data.totalDepo));
  _setEl("total-wd",         fmtIDR(data.totalWD));
  _setEl("profile-refcode",  data.refCode   || "-");
  _setEl("profile-phone",    data.phone     || "-");
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
    showModal("SERVER TIDAK MERESPONS ❌",
      "Data tidak bisa diambil. Periksa koneksi internet lalu refresh.", "var(--pink)");
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

  container.innerHTML = `<div style="text-align:center;color:#777;padding:15px;font-size:11px;">
    <i class="fa-solid fa-spinner fa-spin"></i> Memuat riwayat...</div>`;

  let result = await gasPost({ action: "get_wd_history", username: getUsername() });

  // Auto-retry 1x jika gagal (WebView kadang butuh 2 percobaan)
  if (!result || result.result !== "SUCCESS") {
    await new Promise(r => setTimeout(r, 1500));
    result = await gasPost({ action: "get_wd_history", username: getUsername() });
  }

  if (!result || result.result !== "SUCCESS") {
    container.innerHTML = `<div style="text-align:center;color:#888;padding:20px;font-size:11px;">
      ⚠️ Gagal memuat riwayat.<br>
      <button onclick="loadWithdrawHistory()" style="margin-top:10px;padding:8px 18px;
        border-radius:20px;border:1px solid var(--yellow);background:transparent;
        color:var(--yellow);cursor:pointer;font-size:11px;">
        🔄 COBA LAGI
      </button></div>`;
    return;
  }

  if (!result.data || result.data.length === 0) {
    container.innerHTML = `<div style="text-align:center;color:#555;padding:20px;font-size:11px;">
      Belum ada riwayat penarikan.</div>`;
    return;
  }

  container.innerHTML = "";
  result.data.forEach((item, idx) => {
    const st      = String(item.status || "PROSES").toUpperCase();
    const stClass = st === "BERHASIL" ? "status-sukses" : st === "GAGAL" ? "status-gagal" : "status-proses";
    const isNew   = idx === 0;

    if (isNew && st === "BERHASIL" && _lastKnownWdStatus !== "BERHASIL") {
      showModal("APPROVED ✅", "Withdraw kamu telah disetujui! Saldo segera dikirim.", "var(--blue)");
    }
    if (isNew) _lastKnownWdStatus = st;

    container.innerHTML += `
      <div class="history-item ${isNew ? "latest" : ""}">
        ${isNew ? '<div class="badge-new">BARU</div>' : ""}
        <div class="hist-top">
          <span style="font-weight:bold;">PENARIKAN DANA</span>
          <span class="status-badge ${stClass}">${item.status}</span>
        </div>
        <div style="color:var(--yellow);font-weight:bold;font-size:14px;margin:4px 0;">
          ${fmtIDR(item.amount)}
        </div>
        <div class="hist-time" style="font-size:10px;color:#aaa;">${item.timestamp}</div>
      </div>`;
  });
}

async function processWithdraw() {
  if (!requireLogin()) return;

  const amtEl  = document.getElementById("wd-amount");
  const amount = Number(amtEl?.value || 0);

  if (!amount || amount <= 0) {
    showModal("GAGAL ❌", "Masukkan nominal penarikan.", "var(--pink)"); return;
  }
  if (amount < MIN_WD) {
    showModal("GAGAL ❌", `Minimal penarikan ${fmtIDR(MIN_WD)}.`, "var(--pink)"); return;
  }

  // Verifikasi saldo dari server dulu sebelum potong
  showModal("MENGECEK ⏳", "Memverifikasi saldo ke server...", "var(--blue)");

  const cek = await gasPost({ action: "sync_balance", username: getUsername() });
  if (cek.result !== "SUCCESS") {
    showModal("GAGAL ❌", "Tidak bisa verifikasi saldo: " + errMsg(cek.message), "var(--pink)"); return;
  }

  const saldoServer = Number(cek.saldo || 0);
  _setEl("wd-balance", fmtIDR(saldoServer));

  if (amount > saldoServer) {
    showModal("SALDO TIDAK CUKUP ❌",
      `Saldo kamu: ${fmtIDR(saldoServer)}\nNominal WD : ${fmtIDR(amount)}\n\nSaldo tidak mencukupi.`,
      "var(--yellow)");
    return;
  }

  showModal("MEMPROSES ⏳", "Mengirim permintaan ke server...", "var(--blue)");

  const result = await gasPost({ action: "withdraw", username: getUsername(), amount });

  if (result.result === "SUCCESS") {
    _setEl("wd-balance",    fmtIDR(result.newSaldo));
    _setEl("display-saldo", fmtIDR(result.newSaldo));
    localStorage.setItem("_cache_saldo", result.newSaldo);
    if (amtEl) amtEl.value = "";
    showModal("BERHASIL DIAJUKAN ✅",
      `Penarikan ${fmtIDR(amount)} berhasil diajukan.\nSaldo baru: ${fmtIDR(result.newSaldo)}\n\nMenunggu approval admin.`,
      "var(--blue)");
    await loadWithdrawHistory();
  } else {
    showModal("GAGAL ❌", result.message || errMsg(result.message), "var(--pink)");
  }
}

// Polling WD: sync saldo + refresh riwayat setiap 8 detik
setInterval(async () => {
  if (!document.getElementById("wd-history") || !getUsername()) return;
  const r = await gasPost({ action: "sync_balance", username: getUsername() });
  if (r.result === "SUCCESS") {
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
  el.classList.add("active");

  const qris    = document.getElementById("qris-container");
  const usdtBox = document.getElementById("usdt-calc");
  const idrGrid = document.getElementById("idr-grid");
  const labelEl = document.getElementById("label-nominal");

  if (method === "QRIS") {
    if (qris)    qris.style.display    = "block";
    if (usdtBox) usdtBox.style.display = "none";
    if (idrGrid) idrGrid.style.display = "grid";
    if (labelEl) labelEl.innerText     = "NOMINAL DEPOSIT (IDR)";
  } else if (method === "USDT") {
    if (qris)    qris.style.display    = "none";
    if (usdtBox) usdtBox.style.display = "block";
    if (idrGrid) idrGrid.style.display = "none";
    if (labelEl) labelEl.innerText     = "NOMINAL DEPOSIT (USDT / $)";
    calculateUSDT();
  } else {
    if (qris)    qris.style.display    = "none";
    if (usdtBox) usdtBox.style.display = "none";
    if (idrGrid) idrGrid.style.display = "grid";
    if (labelEl) labelEl.innerText     = "NOMINAL DEPOSIT (IDR)";
  }
}

function calculateUSDT() {
  if (_depoMethod !== "USDT") return;
  const amt      = Number(document.getElementById("depo-amount")?.value || 0);
  const diterima = amt > FEE_USDT ? (amt - FEE_USDT) * KURS_USDT : 0;
  _setEl("usdt-to-idr", fmtIDR(diterima));
}

function setAmount(val) {
  const el = document.getElementById("depo-amount");
  if (el) { el.value = val; calculateUSDT(); }
}

async function processDeposit() {
  if (!requireLogin()) return;

  const amount = Number(document.getElementById("depo-amount")?.value || 0);

  if (!amount || amount <= 0) {
    showModal("GAGAL ❌", "Masukkan nominal deposit.", "var(--pink)"); return;
  }
  if ((_depoMethod === "QRIS" || _depoMethod === "BANK") && amount < MIN_DEPO_IDR) {
    showModal("GAGAL ❌", `Minimal deposit ${_depoMethod} adalah ${fmtIDR(MIN_DEPO_IDR)}.`, "var(--pink)"); return;
  }
  if (_depoMethod === "USDT" && amount < MIN_DEPO_USD) {
    showModal("GAGAL ❌", `Minimal deposit USDT adalah $${MIN_DEPO_USD}.`, "var(--pink)"); return;
  }

  showModal("MEMPROSES ⏳", "Mengirim ke server...", "var(--blue)");

  const result = await gasPost({ action: "deposit", username: getUsername(), method: _depoMethod, amount });

  if (result.result === "SUCCESS") {
    if (_depoMethod === "USDT") {
      const diterima = (amount - FEE_USDT) * KURS_USDT;
      showModal("DEPOSIT USDT DIAJUKAN ✅",
        `Nominal: $${amount}\nEstimasi diterima: ${fmtIDR(diterima)}\n(Kurs: Rp ${KURS_USDT.toLocaleString("id-ID")} | Fee: $${FEE_USDT})\n\nSilakan konfirmasi ke admin.`,
        "var(--blue)");
      // Inject tombol WA
      setTimeout(() => {
        const modal = document.getElementById("neon-modal");
        if (modal && !modal.querySelector(".btn-wa-inject")) {
          const msgWA = encodeURIComponent(
            `Halo Admin, saya *${getUsername()}* ingin deposit USDT $${amount}. Estimasi diterima: ${fmtIDR((amount - FEE_USDT) * KURS_USDT)}. Mohon info wallet TRC20.`
          );
          const btn = document.createElement("button");
          btn.className   = "modal-btn btn-wa-inject";
          btn.style.cssText = "margin-top:8px;background:#25d366;border-color:#25d366;color:white;display:block;width:100%;";
          btn.innerText   = "📱 KONFIRMASI KE ADMIN (WA)";
          btn.onclick     = () => window.open(`https://wa.me/${WA_ADMIN}?text=${msgWA}`, "_blank");
          modal.appendChild(btn);
        }
      }, 100);
    } else {
      showModal("DEPOSIT DIAJUKAN ✅",
        `Deposit ${fmtIDR(amount)} via ${_depoMethod} berhasil diajukan.\nSaldo masuk setelah admin verifikasi.`,
        "var(--blue)");
    }

    const inp = document.getElementById("depo-amount");
    if (inp) inp.value = "";
    await loadDepositHistory();
  } else {
    showModal("GAGAL ❌", result.message || errMsg(result.message), "var(--pink)");
  }
}

async function loadDepositHistory() {
  const container = document.getElementById("depo-history-list");
  if (!container) return;

  container.innerHTML = `<div style="text-align:center;color:#777;padding:15px;font-size:11px;">
    <i class="fa-solid fa-spinner fa-spin"></i> Memuat riwayat...</div>`;

  const result = await gasPost({ action: "get_deposit_history", username: getUsername() });

  if (result.result !== "SUCCESS") {
    container.innerHTML = `<div style="text-align:center;color:#888;padding:20px;font-size:11px;">
      ⚠️ ${errMsg(result.message)}<br><small style="color:#555;">Refresh untuk coba lagi.</small></div>`;
    return;
  }

  if (!result.data || result.data.length === 0) {
    container.innerHTML = `<div style="text-align:center;color:#444;font-size:11px;padding:20px;">
      Belum ada riwayat transaksi.</div>`;
    return;
  }

  container.innerHTML = "";
  result.data.forEach(item => {
    const isCrypto  = !!item.nominalCrypto;
    const st        = String(item.status || "PROSES").toUpperCase();
    const stClass   = st === "BERHASIL" ? "status-sukses" : "status-proses";
    const methodLbl = isCrypto ? "USDT CRYPTO" : "QRIS / BANK";
    let displayAmt;
    if (isCrypto) {
      const match = String(item.nominalCrypto).match(/\((\d+)\)/);
      displayAmt  = match ? `$${match[1]}` : item.nominalCrypto;
    } else {
      displayAmt = fmtIDR(item.nominalIDR);
    }
    container.innerHTML += `
      <div class="history-item">
        <div class="hist-method">${methodLbl}</div>
        <div class="hist-date">${item.timestamp}</div>
        <div class="hist-amount">${displayAmt}</div>
        <div class="hist-status ${stClass}">${item.status}</div>
      </div>`;
  });
}

// Polling deposit history setiap 8 detik
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
    const vipEl = document.querySelector(".vip-info h4");
    if (vipEl) vipEl.innerText = (data.tier || "STARTER") + " MEMBER";
    _setEl("ref-code-display", data.refCode || "-");
  }
  await loadInbox();
  await loadRefList();
}

async function claimDailyReward() {
  if (!requireLogin()) return;
  const result = await gasPost({ action: "claim_daily", username: getUsername() });
  if (result.result === "SUCCESS") {
    _setEl("display-saldo", fmtIDR(result.newSaldo));
    localStorage.setItem("_cache_saldo", result.newSaldo);
    showModal("DAILY BONUS ✅",
      `Bonus harian ${fmtIDR(result.bonus)} berhasil diklaim!\nSaldo baru: ${fmtIDR(result.newSaldo)}`,
      "var(--yellow)");
  } else {
    showModal("INFO ℹ️", result.message || "Sudah klaim hari ini.", "var(--blue)");
  }
}

function claimType(type) { if (type === "daily") claimDailyReward(); }

async function claimInboxItem(inboxId) {
  if (!requireLogin()) return;
  const result = await gasPost({ action: "claim_inbox", username: getUsername(), inboxId });
  if (result.result === "SUCCESS") {
    _setEl("display-saldo", fmtIDR(result.newSaldo));
    localStorage.setItem("_cache_saldo", result.newSaldo);
    showModal("HADIAH DIKLAIM ✅",
      `${fmtIDR(result.bonus)} masuk ke saldo!\nSaldo baru: ${fmtIDR(result.newSaldo)}`, "var(--yellow)");
    await loadInbox();
  } else {
    showModal("GAGAL ❌", result.message || "Klaim gagal.", "var(--pink)");
  }
}

async function redeemGift() {
  if (!requireLogin()) return;
  const codeEl = document.getElementById("gift-code");
  const code   = codeEl?.value.trim() || "";
  if (!code) { showModal("INFO ℹ️", "Masukkan kode hadiah.", "var(--blue)"); return; }

  const btn = document.querySelector(".btn-redeem");
  if (btn) { btn.disabled = true; btn.innerText = "MENGECEK..."; }

  const result = await gasPost({ action: "redeem_gift", username: getUsername(), gift_code: code });

  if (result.result === "SUCCESS") {
    _setEl("display-saldo", fmtIDR(result.newSaldo));
    localStorage.setItem("_cache_saldo", result.newSaldo);
    if (codeEl) codeEl.value = "";
    showModal("GIFT DIKLAIM ✅",
      `${fmtIDR(result.bonus)} masuk ke saldo!\nSaldo baru: ${fmtIDR(result.newSaldo)}`, "var(--yellow)");
  } else {
    showModal("GAGAL ❌", result.message || "Kode tidak valid atau sudah digunakan.", "var(--pink)");
  }

  if (btn) { btn.disabled = false; btn.innerText = "KLAIM HADIAH"; }
}

async function claimReferral() {
  if (!requireLogin()) return;
  const result = await gasPost({ action: "claim_referral", username: getUsername() });
  if (result.result === "SUCCESS") {
    _setEl("display-saldo", fmtIDR(result.newSaldo));
    localStorage.setItem("_cache_saldo", result.newSaldo);
    showModal("BONUS REFERRAL ✅", result.message, "var(--yellow)");
    await loadRefList();
  } else {
    showModal("INFO ℹ️", result.message || "Belum bisa klaim.", "var(--blue)");
  }
}

function copyRefLink() {
  const refCode = localStorage.getItem("_cache_refCode") || getUsername();
  const link    = `https://neonplinko.vip/reg?ref=${refCode}`;
  navigator.clipboard.writeText(link)
    .then(()  => showModal("DISALIN ✅", `Link: ${link}`, "var(--blue)"))
    .catch(()  => showModal("LINK REFERRAL", link, "var(--blue)"));
}

function copyLink() { copyRefLink(); }

async function loadInbox() {
  const box = document.getElementById("inbox-container");
  if (!box) return;

  box.innerHTML = `<div style="text-align:center;color:#777;padding:12px;font-size:11px;">
    <i class="fa-solid fa-spinner fa-spin"></i> Memuat hadiah...</div>`;

  const result = await gasPost({ action: "get_inbox", username: getUsername() });

  if (result.result !== "SUCCESS" || !result.data || result.data.length === 0) {
    box.innerHTML = `<div style="text-align:center;color:#555;padding:15px;font-size:12px;">Tidak ada hadiah saat ini.</div>`;
    return;
  }

  box.innerHTML = "";
  result.data.forEach(item => {
    box.innerHTML += `
      <div style="background:rgba(255,0,119,0.07);border:1px solid var(--pink);border-radius:12px;padding:14px;margin-bottom:12px;">
        <div style="font-size:12px;color:#ccc;margin-bottom:6px;">${item.pesan}</div>
        <div style="color:var(--yellow);font-weight:900;font-size:16px;margin-bottom:10px;">+ ${fmtIDR(item.saldo)}</div>
        <button onclick="claimInboxItem('${item.id}')"
          style="width:100%;padding:10px;border-radius:50px;background:var(--pink);color:white;font-weight:900;border:none;cursor:pointer;font-size:12px;">
          KLAIM HADIAH
        </button>
      </div>`;
  });
}

async function loadRefList() {
  const refBox = document.getElementById("ref-list-container");
  if (!refBox) return;

  refBox.innerHTML = `<div style="text-align:center;color:#777;padding:10px;font-size:11px;">
    <i class="fa-solid fa-spinner fa-spin"></i> Memuat...</div>`;

  const result = await gasPost({ action: "get_ref_list", username: getUsername() });
  if (result.result !== "SUCCESS") {
    refBox.innerHTML = `<div style="text-align:center;color:#555;font-size:11px;padding:8px;">Gagal memuat data referral.</div>`;
    return;
  }

  const { invited, totalBonus, refCode } = result;
  localStorage.setItem("_cache_refCode", refCode || "");
  _setEl("ref-code-display", refCode || "-");
  _setEl("ref-bonus-total",  fmtIDR(totalBonus));

  if (!invited || invited.length === 0) {
    refBox.innerHTML = `<div style="text-align:center;color:#555;font-size:11px;padding:10px;">Belum ada teman yang diundang.</div>`;
    return;
  }

  refBox.innerHTML = "";
  invited.forEach(inv => {
    const ok = inv.status === "VALID";
    refBox.innerHTML += `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid #1a1a2e;">
        <span style="font-size:12px;">${inv.username}</span>
        <span style="font-size:10px;font-weight:bold;padding:3px 8px;border-radius:6px;
              background:${ok ? "rgba(0,255,0,0.12)" : "rgba(255,200,0,0.1)"};
              color:${ok ? "#00ff88" : "#ffcc00"};">${inv.status}</span>
      </div>`;
  });
}

// ============================================================
//  GAME
// ============================================================

async function playPlinkoGame(betAmount) {
  if (!requireLogin()) return null;
  const result = await gasPost({ action: "game_play", username: getUsername(), bet: betAmount });
  if (result.result === "SUCCESS") {
    _setEl("display-saldo", fmtIDR(result.newSaldo));
    localStorage.setItem("_cache_saldo", result.newSaldo);
    return { multiplier: result.target_multiplier, newSaldo: result.newSaldo };
  }
  return null;
}

async function syncSaldo() {
  if (!getUsername()) return;
  const r = await gasPost({ action: "sync_balance", username: getUsername() });
  if (r.result === "SUCCESS") {
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

  if (page === "profil.html")                               { initProfile();  return; }
  if (page === "withdraw.html")                             { initWithdraw(); return; }
  if (page === "deposit.html" || page === "deposit__1_.html") { initDeposit();  return; }
  if (page === "reward.html")                               { initReward();   return; }
  if (page === "game.html")                                 { fetchUserData(); return; }
});
