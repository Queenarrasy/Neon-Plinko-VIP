/**
 * ============================================================
 * NEON PLINKO VIP — Global JS
 * Version: 5.0 — UNIFIED SESSION & FULL INTEGRATION FIX
 *
 * PERBAIKAN UTAMA v5.0:
 * [1] Session key SATU (plinko_session) — tidak pecah ke banyak localStorage key
 * [2] requireLogin() langsung redirect tanpa delay/race condition
 * [3] ProfileAPI.sync() return data agar bisa dipakai langsung di halaman
 * [4] claimReferral fungsional — GAS Code.gs sudah diperbaiki
 * [5] initGlobalSync() TIDAK redirect — hanya sync data
 * [6] logout → clearSession() + redirect ke index.html
 * [7] semua API silent tersedia untuk background request
 * ============================================================
 */

const API_CONFIG = {
    URL: "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec",
    KURS_USDT: 16800,
    ADMIN_WA: "6289510249551"
};

// ═══════════════════════════════════════════════════════════
//  SESSION MANAGEMENT — SATU KEY, SATU SUMBER KEBENARAN
// ═══════════════════════════════════════════════════════════
const SESSION_KEY = 'plinko_session';

let _session = (function () {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        return (obj && obj.username) ? obj : null;
    } catch (e) { return null; }
})();

function saveSession(data) {
    if (!data || !data.username) return;
    _session = Object.assign({}, _session || {}, data);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(_session)); } catch(e) {}
}

function loadSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) { _session = null; return null; }
        const obj = JSON.parse(raw);
        _session = (obj && obj.username) ? obj : null;
    } catch(e) { _session = null; }
    return _session;
}

function clearSession() {
    _session = null;
    try {
        // Bersihkan semua key lama & baru
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem('username');
        localStorage.removeItem('user_saldo');
        localStorage.removeItem('user_tier');
        localStorage.removeItem('_cache_refCode');
        localStorage.removeItem('lastDailyClaim');
    } catch(e) {}
}

// Cek login — redirect jika belum. Panggil di halaman yang butuh login.
function requireLogin(redirectUrl) {
    redirectUrl = redirectUrl || 'index.html';
    if (!_session) loadSession();
    if (!_session || !_session.username) {
        if (!window._redirecting) {
            window._redirecting = true;
            window.location.replace(redirectUrl);
        }
        return null;
    }
    return _session;
}

// ═══════════════════════════════════════════════════════════
//  BRIDGE — agar file lama yang pakai UserSession tetap jalan
// ═══════════════════════════════════════════════════════════
const UserSession = {
    get username() { return _session ? _session.username : null; },
    get saldo()    { return _session ? (_session.saldo || 0) : 0; },
    get tier()     { return _session ? (_session.tier || 'MEMBER') : 'MEMBER'; },
    isAutoPlaying: false
};

function getUsername() { return _session ? _session.username : null; }
function getSaldo()    { return _session ? (_session.saldo || 0) : 0; }
function setSaldo(v)   { syncSaldoUI(v); }

// Bridge untuk reward.html & file lain yang pakai apiCall({action,...})
async function apiCall(payload) {
    const { action, ...rest } = payload;
    return await callApi(action, rest);
}

// ═══════════════════════════════════════════════════════════
//  CORE API ENGINE
// ═══════════════════════════════════════════════════════════
async function callApi(action, payload, silent) {
    payload = payload || {};
    silent  = silent  || false;
    if (!silent) setLoading(true);
    try {
        const jsonString = encodeURIComponent(JSON.stringify(Object.assign({ action: action }, payload)));
        const response = await fetch(API_CONFIG.URL + '?data=' + jsonString, {
            method: 'GET',
            cache: 'no-store'
        });
        const result = await response.json();
        if (result.result === "SUCCESS" || result.status === "SUCCESS" || Array.isArray(result)) {
            return result;
        }
        throw new Error(result.message || "Kesalahan sistem.");
    } catch (error) {
        console.error("API Error [" + action + "]:", error);
        if (!silent) showToast("Koneksi gagal. Coba lagi.", "error");
        return { result: "ERROR", message: error.message };
    } finally {
        if (!silent) setLoading(false);
    }
}

async function callApiSilent(action, payload) {
    return await callApi(action, payload || {}, true);
}

// ═══════════════════════════════════════════════════════════
//  UI — LOADING & TOAST
// ═══════════════════════════════════════════════════════════
function setLoading(show) {
    const el = document.getElementById("loading");
    if (el) el.style.display = show ? "flex" : "none";
}

function showToast(msg, type) {
    type = type || "info";
    let t = document.getElementById("toast");
    if (!t) {
        t = document.createElement("div"); t.id = "toast";
        t.style.cssText = "position:fixed;bottom:30px;left:50%;transform:translateX(-50%);" +
            "padding:12px 28px;border-radius:10px;font-weight:bold;color:#fff;z-index:99999;" +
            "font-size:14px;transition:opacity 0.4s;pointer-events:none;text-align:center;" +
            "max-width:90vw;box-shadow:0 4px 16px rgba(0,0,0,0.4)";
        document.body.appendChild(t);
    }
    var c = { success: "#28a745", error: "#dc3545", info: "#0d6efd", warning: "#e67e22" };
    t.style.background = c[type] || c.info;
    t.style.opacity = "1";
    t.textContent = msg;
    clearTimeout(t._t);
    t._t = setTimeout(function() { t.style.opacity = "0"; }, 3500);
}

// ═══════════════════════════════════════════════════════════
//  SALDO SYNC
// ═══════════════════════════════════════════════════════════
function syncSaldoUI(nominal) {
    const val = Math.max(0, parseFloat(nominal) || 0);
    if (_session) {
        _session.saldo = val;
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(_session)); } catch(e) {}
    }
    // Update semua elemen saldo di halaman
    ["display-saldo", "profile-saldo", "header-saldo", "saldoDisplay"].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.textContent = formatIDR(val);
    });
}

// ═══════════════════════════════════════════════════════════
//  AUTH API
// ═══════════════════════════════════════════════════════════
const AuthAPI = {
    async login(username, password) {
        const res = await callApi("login", { username: username, password: password });
        if (res.result === "SUCCESS") {
            saveSession({
                username:    username,
                fullname:    res.fullname    || '',
                saldo:       Number(res.saldo)       || 0,
                bank:        res.bank        || '',
                rekening:    res.rekening    || '',
                refCode:     res.refCode     || '',
                tier:        res.tier        || 'MEMBER',
                winrate:     Number(res.winrate)     || 50,
                maxWinLimit: Number(res.maxWinLimit) || 500000
            });
            showToast("Selamat datang, " + (res.fullname || username) + "! 🎉", "success");
        } else {
            showToast(res.message || "Login gagal.", "error");
        }
        return res;
    },
    async register(data) {
        const res = await callApi("register", data);
        if (res.result === "SUCCESS") {
            showToast("Registrasi berhasil! Kode: " + res.refCode, "success");
        } else {
            showToast(res.message || "Registrasi gagal.", "error");
        }
        return res;
    },
    async logout() {
        const u = getUsername();
        if (u) {
            try { await callApiSilent("set_status", { username: u, status: "OFFLINE" }); } catch(e) {}
        }
        clearSession();
        window.location.replace('index.html');
    }
};

// ═══════════════════════════════════════════════════════════
//  PROFILE API
// ═══════════════════════════════════════════════════════════
const ProfileAPI = {
    // Sync data profil dari server — return data atau null
    async sync() {
        const u = getUsername();
        if (!u) return null;
        try {
            const res = await callApiSilent("get_profile", { username: u });
            if (res.result === "SUCCESS" && res.data) {
                const d = res.data;
                saveSession({
                    username:    d.username,
                    fullname:    d.namaLengkap   || '',
                    saldo:       Number(d.saldo)         || 0,
                    tier:        d.tier           || 'MEMBER',
                    bank:        d.bank           || '',
                    rekening:    d.nomorRekening  || '',
                    refCode:     d.refCode        || '',
                    winrate:     Number(d.winrate)       || 50,
                    maxWinLimit: Number(d.maxWinLimit)   || 500000,
                    totalDepo:   Number(d.totalDepo)     || 0,
                    totalWD:     Number(d.totalWD)       || 0,
                    phone:       d.phone          || ''
                });
                syncSaldoUI(d.saldo);
                return d;
            }
        } catch(e) {
            console.warn("ProfileAPI.sync gagal:", e);
        }
        return null;
    }
};

// ═══════════════════════════════════════════════════════════
//  GAME ENGINE
// ═══════════════════════════════════════════════════════════
const GameEngine = {
    async processPlay(betAmount) {
        const u = getUsername();
        if (!u || getSaldo() < betAmount) return null;
        const saldoAwalSnapshot = getSaldo();
        try {
            const res = await callApiSilent("game_play", {
                username: u,
                bet: betAmount,
                saldoAwal: saldoAwalSnapshot
            });
            if (res.result === "SUCCESS" && res.newSaldo !== undefined) {
                syncSaldoUI(res.newSaldo);
            }
            return {
                multiplier: res.target_multiplier,
                winAmount:  res.win,
                newSaldo:   res.newSaldo,
                result:     res.result
            };
        } catch(e) {
            return null;
        }
    }
};

// ═══════════════════════════════════════════════════════════
//  TRANSAKSI API
// ═══════════════════════════════════════════════════════════
const TransaksiAPI = {
    async withdraw(jumlah, namaLengkap, bank, rekening) {
        const u = getUsername();
        const res = await callApi("withdraw", {
            username:    u,
            jumlah:      jumlah,
            namaLengkap: namaLengkap || (_session && _session.fullname)  || '',
            bank:        bank        || (_session && _session.bank)       || '',
            rekening:    rekening    || (_session && _session.rekening)   || '',
            tanggal:     new Date().toLocaleString("id-ID")
        });
        if (res.result === "SUCCESS") {
            syncSaldoUI(res.newSaldo);
            showToast("Withdraw berhasil diajukan!", "success");
        } else {
            showToast(res.message || "Withdraw gagal.", "error");
        }
        return res;
    },
    async depositQRIS(nominal) {
        const res = await callApi("deposit", {
            username: getUsername(), nominalIDR: nominal,
            nominalCrypto: '', method: "QRIS",
            tanggal: new Date().toLocaleString("id-ID")
        });
        if (res.result === "SUCCESS") showToast("Deposit QRIS diajukan! Tunggu konfirmasi.", "success");
        else showToast(res.message || "Deposit gagal.", "error");
        return res;
    },
    async depositCrypto(nominalCrypto) {
        const res = await callApi("deposit", {
            username: getUsername(), nominalIDR: 0,
            nominalCrypto: nominalCrypto, method: "CRYPTO",
            tanggal: new Date().toLocaleString("id-ID")
        });
        if (res.result === "SUCCESS") showToast("Deposit Crypto diajukan!", "success");
        else showToast(res.message || "Deposit gagal.", "error");
        return res;
    },
    async getHistory(type) {
        const action = type === 'WD' ? "get_withdraw_history" : "get_deposit_history";
        return await callApi(action, { username: getUsername() });
    }
};

// ═══════════════════════════════════════════════════════════
//  REWARD API
// ═══════════════════════════════════════════════════════════
const RewardAPI = {
    async claimDaily() {
        const res = await callApi("claim_daily", { username: getUsername() });
        if (res.result === "SUCCESS") {
            syncSaldoUI(res.newSaldo);
            showToast("Daily bonus IDR 1.000 diklaim! ☀️", "success");
        } else {
            showToast(res.message || "Sudah klaim hari ini.", "info");
        }
        return res;
    },
    async getInbox() {
        return await callApiSilent("get_inbox", { username: getUsername() });
    },
    async claimInbox(id, rowIdx, amount) {
        const res = await callApi("claim_inbox", {
            id:       id,
            rowIdx:   rowIdx,
            username: getUsername(),
            saldo:    amount
        });
        if (res.result === "SUCCESS") {
            syncSaldoUI(res.newSaldo);
            showToast("Hadiah diklaim! 🎁", "success");
        } else {
            showToast(res.message || "Gagal klaim.", "error");
        }
        return res;
    },
    async getReferralData() {
        return await callApiSilent("get_referrals", { username: getUsername() });
    },
    async claimReferral() {
        const res = await callApi("claim_referral", { username: getUsername() });
        if (res.result === "SUCCESS") {
            syncSaldoUI(res.newSaldo);
            showToast("Bonus referral diklaim! 🎉", "success");
        } else {
            showToast(res.message || "Gagal klaim referral.", "error");
        }
        return res;
    }
};

// ═══════════════════════════════════════════════════════════
//  ADMIN API
// ═══════════════════════════════════════════════════════════
const AdminAPI = {
    async getAllPlayers()           { return await callApi("getAllUsers"); },
    async getPendingDeposits()     { return await callApi("get_pending_deposits"); },
    async approveDeposit(rowIdx)   { return await callApi("approve_deposit",    { row: rowIdx }); },
    async updateWinrate(u, rate)   { return await callApi("updateWinrate",      { targetUser: u, newRate: rate }); },
    async adjustSaldo(u, amount)   { return await callApi("adminUpdateSaldo",   { targetUser: u, amount: amount }); },
    async setMaxwin(u, maxwin)     { return await callApi("setMaxwinLimit",      { targetUser: u, maxwin: maxwin }); },
    async togglePanicMode(minutes) { return await callApi("set_global_panic",   { minutes: minutes }); }
};

// ═══════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════
function formatIDR(num) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR", maximumFractionDigits: 0
    }).format(num || 0);
}

// Alias — reward.html pakai fmtIDR
function fmtIDR(v) { return formatIDR(v); }

// ═══════════════════════════════════════════════════════════
//  INIT — AUTO SYNC DATA (BUKAN REDIRECT)
// ═══════════════════════════════════════════════════════════
async function initGlobalSync() {
    const u = getUsername();
    if (!u) return; // Halaman yang butuh auth panggil requireLogin() sendiri

    // Isi username ke UI langsung dari session
    ["profile-username", "display-username", "header-username"].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.textContent = u;
    });

    // Update saldo dari session cache dulu
    if (_session && _session.saldo !== undefined) syncSaldoUI(_session.saldo);

    try {
        callApiSilent("set_status", { username: u, status: "ONLINE" }).catch(function(){});
        await ProfileAPI.sync();
    } catch(e) {
        console.warn("initGlobalSync: pakai data cache.");
    }
}

// Set OFFLINE saat tab ditutup
window.addEventListener('beforeunload', function() {
    const u = getUsername();
    if (u) {
        const payload = JSON.stringify({ action: "set_status", username: u, status: "OFFLINE" });
        navigator.sendBeacon(API_CONFIG.URL + '?data=' + encodeURIComponent(payload));
    }
});

document.addEventListener('DOMContentLoaded', initGlobalSync);

// ═══════════════════════════════════════════════════════════
//  ALIAS — index.html dan file lain yang pakai apiLogin()
//  Di global.js v5.0 login ada di AuthAPI.login()
//  Alias ini menjembatani agar tidak perlu ubah semua file
// ═══════════════════════════════════════════════════════════
async function apiLogin(username, password) {
    return await AuthAPI.login(username, password);
}
async function apiRegister(data) {
    return await AuthAPI.register(data);
}
function apiLogout(redirectUrl) {
    AuthAPI.logout();
}
