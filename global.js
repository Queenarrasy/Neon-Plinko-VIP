/**
 * ============================================================
 *  GLOBAL.JS — NEON PLINKO VIP v10.0
 *  Sinkron penuh dengan Google Apps Script (Code.gs)
 *  Halaman: profil.html | withdraw.html | deposit.html | reward.html | game.html
 * ============================================================
 */

// ── URL Google Apps Script (JANGAN UBAH) ────────────────────
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwqQWXIJuVnkIxLvdu3kYiiRDVh7eyrsy-KU6rG1qtQClgfAzmMoclv2ULFZ_hRdE_qUg/exec";

// ── Konstanta Deposit ────────────────────────────────────────
const KURS_USDT_GLOBAL = 16800;
const FEE_USDT_GLOBAL  = 2;
const WA_ADMIN         = "6281234567890"; // ← Ganti nomor WA admin

// ============================================================
//  UTILITY
// ============================================================

/** Kirim POST ke GAS dan kembalikan JSON */
async function gasPost(payload) {
  const res = await fetch(SCRIPT_URL, {
    method : "POST",
    body   : JSON.stringify(payload)
  });
  return res.json();
}

/** Format angka ke Rupiah */
function fmtIDR(n) {
  return "IDR " + Number(n || 0).toLocaleString("id-ID");
}

/** Ambil username dari localStorage, redirect jika tidak ada */
function getUser() {
  const u = localStorage.getItem("username");
  if (!u) { window.location.href = "index.html"; return null; }
  return u;
}

// ============================================================
//  1. SINKRON DATA USER DARI SERVER
//     Dipanggil oleh semua halaman saat onload
// ============================================================
async function fetchUserData() {
  const user = getUser();
  if (!user) return null;

  try {
    const data = await gasPost({ action: "getUserData", username: user });

    if (data.result === "SUCCESS") {
      // Simpan ke localStorage sebagai cache
      localStorage.setItem("user_saldo",        data.saldo       || 0);
      localStorage.setItem("user_tier",         data.tier        || "STARTER");
      localStorage.setItem("user_fullname",     data.fullname    || "");
      localStorage.setItem("user_bank",         data.bank        || "");
      localStorage.setItem("user_rekening",     data.rekening    || "");
      localStorage.setItem("user_phone",        data.phone       || "");
      localStorage.setItem("winrate",           data.winrate     || 50);
      localStorage.setItem("maxWin",            data.maxWin      || 0);
      localStorage.setItem("sessionMinutes",    data.sessionMinutes || 0);
      localStorage.setItem("refCode",           data.refCode     || "");

      // Update semua elemen saldo yang ada di halaman
      _setEl("display-saldo",   fmtIDR(data.saldo));
      _setEl("wd-balance",      fmtIDR(data.saldo));

      return data;
    }
  } catch (e) {
    console.warn("fetchUserData gagal:", e);
    // Gunakan cache localStorage jika server tidak bisa dijangkau
    const cached = localStorage.getItem("user_saldo");
    _setEl("display-saldo", fmtIDR(cached));
    _setEl("wd-balance",    fmtIDR(cached));
  }
  return null;
}

/** Helper: set innerText elemen jika ada */
function _setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerText = val;
}

// ============================================================
//  2. INISIALISASI HALAMAN PROFIL  →  profil.html
// ============================================================
async function initProfile() {
  const data = await fetchUserData();
  if (!data) return;

  _setEl("profile-username", data.username  || "-");
  _setEl("profile-tier",    (data.tier || "STARTER") + " MEMBER");
  _setEl("display-saldo",   fmtIDR(data.saldo));
  _setEl("profile-fullname", data.fullname  || "-");
  _setEl("profile-bank",     data.bank      || "-");
  _setEl("profile-rek",      data.rekening  || "-");
  _setEl("total-depo",      fmtIDR(data.totalDepo));
  _setEl("total-wd",        fmtIDR(data.totalWD));
  _setEl("profile-refcode",  data.refCode   || "-");
}

// ============================================================
//  3. INISIALISASI HALAMAN WITHDRAW  →  withdraw.html
// ============================================================
async function initWithdraw() {
  const data = await fetchUserData();
  if (!data) return;

  // Isi field rekening otomatis (readonly)
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "-";
  };
  set("wd-account-name", data.fullname);
  set("wd-account-num",  data.rekening);
  set("wd-method",       data.bank);

  // Muat riwayat withdraw
  await loadWithdrawHistory();
}

/** Muat & render riwayat withdraw dari sheet */
async function loadWithdrawHistory() {
  const user      = getUser();
  const container = document.getElementById("wd-history");
  if (!container) return;

  try {
    const result = await gasPost({ action: "get_wd_history", username: user });

    if (result.result === "SUCCESS" && result.data.length > 0) {
      container.innerHTML = "";
      result.data.slice(0, 10).forEach((item, idx) => {
        const st     = String(item.status || "").toUpperCase();
        const stClass = st === "BERHASIL" ? "status-sukses" : st === "GAGAL" ? "status-gagal" : "status-proses";
        const isNew  = idx === 0;
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
    } else {
      container.innerHTML = `<div style="text-align:center;color:#555;padding:20px;">Belum ada riwayat transaksi</div>`;
    }
  } catch (e) {
    console.warn("loadWithdrawHistory gagal:", e);
  }
}

/**
 * Proses Withdraw — dipanggil dari tombol di withdraw.html
 * Validasi di sisi client lalu kirim ke server.
 * Saldo dipotong di server, lalu localStorage diperbarui.
 */
async function processWithdraw() {
  const user   = getUser();
  const amtEl  = document.getElementById("wd-amount");
  const amount = Number(amtEl ? amtEl.value : 0);
  const saldo  = Number(localStorage.getItem("user_saldo") || 0);

  // Validasi minimal
  if (amount < 50000) {
    _showWdModal("GAGAL ❌", "Minimal penarikan IDR 50.000", "var(--pink)", "0 0 20px var(--pink)");
    return;
  }
  if (amount > saldo) {
    _showWdModal("SALDO KURANG ❌", "Saldo tidak mencukupi untuk penarikan ini.", "var(--yellow)", "0 0 20px var(--yellow)");
    return;
  }

  _showWdModal("MEMPROSES ⏳", "Harap tunggu...", "var(--blue)", "0 0 20px var(--blue)");

  try {
    const result = await gasPost({ action: "withdraw", username: user, amount: amount });

    if (result.result === "SUCCESS") {
      localStorage.setItem("user_saldo", result.newSaldo);
      _setEl("wd-balance", fmtIDR(result.newSaldo));
      _setEl("display-saldo", fmtIDR(result.newSaldo));
      if (amtEl) amtEl.value = "";
      _showWdModal("BERHASIL DIAJUKAN ✅",
        `Penarikan ${fmtIDR(amount)} sedang diproses admin.`,
        "var(--blue)", "0 0 20px var(--blue)");
      await loadWithdrawHistory();
    } else {
      _showWdModal("GAGAL ❌", result.message || "Penarikan gagal.", "var(--pink)", "0 0 20px var(--pink)");
    }
  } catch (e) {
    _showWdModal("ERROR ❌", "Koneksi ke server gagal. Coba lagi.", "var(--pink)", "0 0 20px var(--pink)");
  }
}

function _showWdModal(title, msg, color, shadow) {
  const m = document.getElementById("neon-modal");
  if (!m) return;
  document.getElementById("modal-title").innerText = title;
  document.getElementById("modal-msg").innerText   = msg;
  m.style.border    = "2px solid " + color;
  m.style.boxShadow = shadow;
  m.style.display   = "block";
}

// ============================================================
//  4. INISIALISASI HALAMAN DEPOSIT  →  deposit.html
// ============================================================

// Variabel state deposit (dipakai inline di deposit.html)
var _depoMethod = "QRIS";

function initDeposit() {
  if (!getUser()) return;
  loadDepositHistory();
  // Tampilkan QRIS default
  const qris = document.getElementById("qris-container");
  if (qris) qris.style.display = "block";
}

/** Pilih metode deposit — dipanggil dari onclick di deposit.html */
function selectMethod(el, method) {
  _depoMethod = method;

  // Reset semua method-item
  document.querySelectorAll(".method-item").forEach(m => m.classList.remove("active"));
  el.classList.add("active");

  // Kontrol QRIS box
  const qris    = document.getElementById("qris-container");
  const usdtBox = document.getElementById("usdt-calc");
  const idrGrid = document.getElementById("idr-grid");
  const labelEl = document.getElementById("label-nominal");

  if (method === "QRIS") {
    if (qris)    { qris.style.display    = "block"; }
    if (usdtBox) { usdtBox.style.display = "none";  }
    if (idrGrid) { idrGrid.style.display = "grid";  }
    if (labelEl)   labelEl.innerText = "NOMINAL DEPOSIT (IDR)";
  } else if (method === "USDT") {
    if (qris)    { qris.style.display    = "none";  }
    if (usdtBox) { usdtBox.style.display = "block"; }
    if (idrGrid) { idrGrid.style.display = "none";  }
    if (labelEl)   labelEl.innerText = "NOMINAL DEPOSIT (USDT / $)";
    calculateUSDT();
  } else {
    // BANK
    if (qris)    { qris.style.display    = "none";  }
    if (usdtBox) { usdtBox.style.display = "none";  }
    if (idrGrid) { idrGrid.style.display = "grid";  }
    if (labelEl)   labelEl.innerText = "NOMINAL DEPOSIT (IDR)";
  }
}

/** Hitung estimasi USDT → IDR (dipanggil oninput) */
function calculateUSDT() {
  if (_depoMethod !== "USDT") return;
  const amt     = Number(document.getElementById("depo-amount")?.value || 0);
  const diterima = amt > FEE_USDT_GLOBAL ? (amt - FEE_USDT_GLOBAL) * KURS_USDT_GLOBAL : 0;
  const el       = document.getElementById("usdt-to-idr");
  if (el) el.innerText = fmtIDR(diterima);
}

/** Set nominal cepat */
function setAmount(val) {
  const el = document.getElementById("depo-amount");
  if (el) { el.value = val; calculateUSDT(); }
}

/**
 * Proses Deposit — dipanggil tombol AJUKAN DEPOSIT
 * Validasi → kirim ke GAS → tampilkan modal
 */
async function processDeposit() {
  const user   = getUser();
  const amount = Number(document.getElementById("depo-amount")?.value || 0);

  // Validasi
  if (_depoMethod === "QRIS" || _depoMethod === "BANK") {
    if (amount < 20000) {
      _showDepoModal("GAGAL ❌", "Minimal deposit QRIS / Bank adalah IDR 20.000.");
      return;
    }
  }
  if (_depoMethod === "USDT") {
    if (amount < 10) {
      _showDepoModal("GAGAL ❌", "Minimal deposit USDT adalah $10.");
      return;
    }
  }

  _showDepoModal("MEMPROSES ⏳", "Mengirim permintaan ke server...");

  try {
    const result = await gasPost({
      action  : "deposit",
      username: user,
      method  : _depoMethod,
      amount  : amount
    });

    if (result.result === "SUCCESS") {
      if (_depoMethod === "USDT") {
        const diterima = (amount - FEE_USDT_GLOBAL) * KURS_USDT_GLOBAL;
        _showDepoModal(
          "DEPOSIT USDT DIAJUKAN ✅",
          `Estimasi diterima: ${fmtIDR(diterima)}\n` +
          `(Kurs: Rp ${KURS_USDT_GLOBAL.toLocaleString("id-ID")} | Fee: $${FEE_USDT_GLOBAL})\n\n` +
          `Silakan konfirmasi wallet address ke Admin WhatsApp.`
        );
        // Tombol WA muncul di modal (inject)
        setTimeout(() => {
          const msgWA  = encodeURIComponent(
            `Halo Admin, saya ${user} ingin konfirmasi deposit USDT $${amount}. ` +
            `Estimasi diterima: ${fmtIDR(diterima)}. Mohon info wallet address TRC20.`
          );
          const waUrl  = `https://wa.me/${WA_ADMIN}?text=${msgWA}`;
          const modal  = document.getElementById("neon-modal");
          if (modal && !modal.querySelector(".btn-wa")) {
            const btnWA = document.createElement("button");
            btnWA.className   = "modal-btn btn-wa";
            btnWA.style.cssText = "margin-top:10px;background:#25d366;border-color:#25d366;color:white;";
            btnWA.innerText   = "📱 KONFIRMASI KE ADMIN";
            btnWA.onclick     = () => window.open(waUrl, "_blank");
            modal.appendChild(btnWA);
          }
        }, 100);
      } else {
        _showDepoModal(
          "DEPOSIT DIAJUKAN ✅",
          `Permintaan deposit ${fmtIDR(amount)} via ${_depoMethod} sedang diproses. ` +
          `Saldo akan masuk setelah admin verifikasi.`
        );
      }
      // Reset input & refresh riwayat
      const inp = document.getElementById("depo-amount");
      if (inp) inp.value = "";
      await loadDepositHistory();

    } else {
      _showDepoModal("GAGAL ❌", result.message || "Deposit gagal diproses.");
    }
  } catch (e) {
    _showDepoModal("ERROR ❌", "Koneksi ke server gagal. Pastikan internet stabil.");
  }
}

function _showDepoModal(title, msg) {
  const t = document.getElementById("modal-title");
  const m = document.getElementById("modal-msg");
  const d = document.getElementById("neon-modal");
  if (t) t.innerText = title;
  if (m) m.innerText = msg;
  if (d) d.style.display = "block";
}

function closeModal() {
  const d = document.getElementById("neon-modal");
  if (d) d.style.display = "none";
  // Hapus tombol WA yang mungkin di-inject
  document.querySelectorAll(".btn-wa").forEach(b => b.remove());
}

/** Muat & render riwayat deposit */
async function loadDepositHistory() {
  const user      = getUser();
  const container = document.getElementById("depo-history-list");
  if (!container) return;

  try {
    const result = await gasPost({ action: "get_deposit_history", username: user });

    if (result.result === "SUCCESS" && result.data.length > 0) {
      container.innerHTML = "";
      result.data.slice(0, 10).forEach(item => {
        const isCrypto  = !!item.nominalCrypto;
        const st        = String(item.status || "").toUpperCase();
        const stClass   = st === "BERHASIL" ? "status-sukses" : "status-proses";
        const method    = isCrypto ? "USDT CRYPTO" : "QRIS / BANK";
        // Di halaman riwayat tampilkan nominal dollar jika USDT
        let displayAmt;
        if (isCrypto) {
          // Format di sheet: "126400 (10)" → tampilkan "$10"
          const match = String(item.nominalCrypto).match(/\((\d+)\)/);
          displayAmt = match ? "$" + match[1] : item.nominalCrypto;
        } else {
          displayAmt = fmtIDR(item.nominalIDR);
        }

        container.innerHTML += `
          <div class="history-item">
            <div class="hist-method">${method}</div>
            <div class="hist-date">${item.timestamp}</div>
            <div class="hist-amount">${displayAmt}</div>
            <div class="hist-status ${stClass}">${item.status}</div>
          </div>`;
      });
    } else {
      container.innerHTML = `<div style="text-align:center;color:#444;font-size:11px;padding:20px;">Belum ada riwayat transaksi.</div>`;
    }
  } catch (e) {
    console.warn("loadDepositHistory gagal:", e);
  }
}

// ── Auto-refresh deposit history setiap 8 detik ─────────────
setInterval(() => {
  if (document.getElementById("depo-history-list") && getUser()) {
    loadDepositHistory();
  }
}, 8000);

// ============================================================
//  5. INISIALISASI HALAMAN REWARD  →  reward.html
// ============================================================
async function initReward() {
  const data = await fetchUserData();
  if (!data) return;

  // Tampilkan tier di VIP card
  const vipEl = document.querySelector(".vip-info h4");
  if (vipEl) vipEl.innerText = (data.tier || "STARTER") + " MEMBER";

  // Tampilkan ref code
  const refCodeEl = document.getElementById("ref-code-display");
  if (refCodeEl) refCodeEl.innerText = data.refCode || "-";

  // Muat inbox & referral
  await loadInbox();
  await loadRefList();
}

/** Claim Daily Bonus */
async function claimDailyReward() {
  const user = getUser();
  try {
    const result = await gasPost({ action: "claim_daily", username: user });
    if (result.result === "SUCCESS") {
      localStorage.setItem("user_saldo", result.newSaldo);
      _showRewardModal(
        "DAILY BONUS ✅",
        `Selamat! Bonus harian IDR ${Number(result.bonus).toLocaleString("id-ID")} berhasil diklaim.`
      );
    } else {
      _showRewardModal("INFO ℹ️", result.message || "Sudah klaim hari ini.");
    }
  } catch (e) {
    _showRewardModal("ERROR ❌", "Gagal terhubung ke server.");
  }
}

/** Klaim hadiah dari INBOX (dipanggil dari tombol di kartu inbox) */
async function claimInboxItem(inboxId) {
  const user = getUser();
  try {
    const result = await gasPost({ action: "claim_inbox", username: user, inboxId: inboxId });
    if (result.result === "SUCCESS") {
      localStorage.setItem("user_saldo", result.newSaldo);
      _showRewardModal(
        "HADIAH DIKLAIM ✅",
        `Saldo IDR ${Number(result.bonus).toLocaleString("id-ID")} berhasil masuk ke akun Anda!`
      );
      await loadInbox(); // refresh kotak hadiah
    } else {
      _showRewardModal("GAGAL ❌", result.message || "Klaim gagal.");
    }
  } catch (e) {
    _showRewardModal("ERROR ❌", "Gagal terhubung ke server.");
  }
}

/** Redeem kode gift dari admin */
async function redeemGift() {
  const user    = getUser();
  const codeEl  = document.getElementById("gift-code");
  const code    = codeEl ? codeEl.value.trim() : "";
  if (!code) { _showRewardModal("INFO ℹ️", "Harap masukkan kode hadiah terlebih dahulu."); return; }

  const btn = document.querySelector(".btn-redeem");
  if (btn) { btn.disabled = true; btn.innerText = "MENGECEK..."; }

  try {
    const result = await gasPost({ action: "redeem_gift", username: user, gift_code: code });
    if (result.result === "SUCCESS") {
      localStorage.setItem("user_saldo", result.newSaldo);
      if (codeEl) codeEl.value = "";
      _showRewardModal(
        "GIFT DIKLAIM ✅",
        `Saldo IDR ${Number(result.bonus).toLocaleString("id-ID")} berhasil masuk ke akun Anda!`
      );
    } else {
      _showRewardModal("GAGAL ❌", result.message || "Kode tidak valid atau sudah digunakan.");
    }
  } catch (e) {
    _showRewardModal("ERROR ❌", "Gagal terhubung ke server.");
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "KLAIM HADIAH"; }
  }
}

/** Claim bonus referral (hanya hari Minggu) */
async function claimReferral() {
  const user = getUser();
  try {
    const result = await gasPost({ action: "claim_referral", username: user });
    if (result.result === "SUCCESS") {
      localStorage.setItem("user_saldo", result.newSaldo);
      _showRewardModal("REFERRAL BONUS ✅", result.message);
      await loadRefList();
    } else {
      _showRewardModal("INFO ℹ️", result.message || "Belum bisa klaim.");
    }
  } catch (e) {
    _showRewardModal("ERROR ❌", "Gagal terhubung ke server.");
  }
}

/** Salin link referral ke clipboard */
function copyRefLink() {
  const user    = localStorage.getItem("username") || "player";
  const refCode = localStorage.getItem("refCode")  || user;
  const link    = `https://neonplinko.vip/reg?ref=${refCode}`;
  navigator.clipboard.writeText(link).then(() => {
    _showRewardModal("DISALIN ✅", `Link referral berhasil disalin:\n${link}`);
  }).catch(() => {
    _showRewardModal("LINK REFERRAL", link);
  });
}

/** Muat pesan inbox dari sheet Inbox */
async function loadInbox() {
  const user = getUser();
  const box  = document.getElementById("inbox-container");
  if (!box) return;

  try {
    const result = await gasPost({ action: "get_inbox", username: user });
    if (result.result === "SUCCESS" && result.data.length > 0) {
      box.innerHTML = "";
      result.data.forEach(item => {
        box.innerHTML += `
          <div style="background:rgba(255,0,119,0.08);border:1px solid var(--pink);
                      border-radius:12px;padding:14px;margin-bottom:12px;">
            <div style="font-size:12px;color:#ccc;margin-bottom:6px;">${item.pesan}</div>
            <div style="color:var(--yellow);font-weight:900;font-size:16px;margin-bottom:10px;">
              + IDR ${Number(item.saldo).toLocaleString("id-ID")}
            </div>
            <button onclick="claimInboxItem('${item.id}')"
              style="width:100%;padding:10px;border-radius:50px;background:var(--pink);
                     color:white;font-weight:900;border:none;cursor:pointer;">
              KLAIM HADIAH
            </button>
          </div>`;
      });
    } else {
      box.innerHTML = `<div style="text-align:center;color:#555;padding:15px;font-size:12px;">
                         Tidak ada hadiah saat ini.</div>`;
    }
  } catch (e) {
    console.warn("loadInbox gagal:", e);
  }
}

/** Muat daftar undangan referral */
async function loadRefList() {
  const user   = getUser();
  const refBox = document.getElementById("ref-list-container");
  if (!refBox) return;

  try {
    const result = await gasPost({ action: "get_ref_list", username: user });
    if (result.result !== "SUCCESS") return;

    const { invited, totalBonus, refCode } = result;

    // Update ref code display
    localStorage.setItem("refCode", refCode || "");
    if (document.getElementById("ref-code-display"))
      document.getElementById("ref-code-display").innerText = refCode || "-";

    // Update total bonus
    if (document.getElementById("ref-bonus-total"))
      document.getElementById("ref-bonus-total").innerText = fmtIDR(totalBonus);

    if (invited.length === 0) {
      refBox.innerHTML = `<div style="text-align:center;color:#555;font-size:11px;padding:10px;">
                            Belum ada teman yang diundang.</div>`;
      return;
    }

    refBox.innerHTML = "";
    invited.forEach(inv => {
      const isValid = inv.status === "VALID";
      refBox.innerHTML += `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:10px;border-bottom:1px solid #222;">
          <span style="font-size:12px;">${inv.username}</span>
          <span style="font-size:10px;font-weight:bold;padding:3px 8px;border-radius:6px;
                background:${isValid ? "rgba(0,255,0,0.15)" : "rgba(255,200,0,0.1)"};
                color:${isValid ? "#00ff00" : "#ffcc00"};">${inv.status}</span>
        </div>`;
    });

  } catch (e) {
    console.warn("loadRefList gagal:", e);
  }
}

function _showRewardModal(title, msg) {
  const t = document.getElementById("modal-title");
  const m = document.getElementById("modal-msg");
  const d = document.getElementById("neon-modal");
  if (t) t.innerText = title;
  if (m) m.innerText = msg;
  if (d) d.style.display = "block";
}

// ── Alias agar reward.html tombol lama tetap berfungsi ──────
function claimType(type) {
  if (type === "daily") claimDailyReward();
  else _showRewardModal("INFO", "Fitur ini belum tersedia.");
}
function copyLink() { copyRefLink(); }

// ============================================================
//  6. GAME ENGINE — dipanggil dari game.html
// ============================================================

/**
 * Kirim satu putaran ke server, dapatkan multiplier & saldo baru.
 * Server yang menentukan apakah menang / kalah sesuai winrate admin.
 * @param {number} betAmount
 * @returns {{ multiplier: number, newSaldo: number } | null}
 */
async function playPlinkoGame(betAmount) {
  const user       = getUser();
  const curSaldo   = Number(localStorage.getItem("user_saldo") || 0);

  if (betAmount > curSaldo) return null; // sudah dicek di game.html

  try {
    const result = await gasPost({
      action  : "game_play",
      username: user,
      bet     : betAmount
    });

    if (result.result === "SUCCESS") {
      localStorage.setItem("user_saldo", result.newSaldo);
      return {
        multiplier: result.target_multiplier,
        newSaldo  : result.newSaldo
      };
    } else {
      return null;
    }
  } catch (e) {
    console.error("playPlinkoGame error:", e);
    return null;
  }
}

/** Sync saldo dari server (polling ringan untuk game.html) */
async function syncSaldo() {
  const user = localStorage.getItem("username");
  if (!user) return;
  try {
    const r = await gasPost({ action: "sync_balance", username: user });
    if (r.result === "SUCCESS") {
      localStorage.setItem("user_saldo", r.saldo);
      _setEl("display-saldo", fmtIDR(r.saldo));
    }
  } catch (e) { /* silent */ }
}

// ============================================================
//  7. LOGOUT
// ============================================================
function userLogout() {
  localStorage.clear();
  window.location.href = "index.html";
}

// ============================================================
//  AUTO-INIT  — sesuai halaman yang sedang dibuka
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname.split("/").pop() || "";

  if (!localStorage.getItem("username") && path !== "index.html") {
    window.location.href = "index.html";
    return;
  }

  if (path === "profil.html")   { initProfile();  return; }
  if (path === "withdraw.html") { initWithdraw(); return; }
  if (path === "deposit.html" || path === "deposit__1_.html") { initDeposit();  return; }
  if (path === "reward.html")   { initReward();   return; }

  // game.html — cukup fetchUserData saja
  if (path === "game.html") { fetchUserData(); }
});

// ── Polling saldo setiap 6 detik di halaman withdraw ────────
setInterval(() => {
  if (document.getElementById("wd-history") && localStorage.getItem("username")) {
    loadWithdrawHistory();
    syncSaldo();
  }
}, 6000);
