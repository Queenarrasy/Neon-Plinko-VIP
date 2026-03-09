/**
 * ============================================================
 * NEON PLINKO VIP — Global JS Ultra Master Sync
 * Version: 4.5 — Full Master Panel & Admin Integration
 * ============================================================
 */

const API_CONFIG = {
    URL: "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec",
    KURS_USDT: 16800,
    ADMIN_WA: "6289510249551"
};

// ─── STATE MANAGEMENT ────────────────────────────────────────
const UserSession = {
    username: localStorage.getItem('username') || null,
    saldo: parseFloat(localStorage.getItem('user_saldo') || 0),
    tier: localStorage.getItem('user_tier') || 'MEMBER',
    isAutoPlaying: false
};

// ─── CORE ENGINE ─────────────────────────────────────────────

async function callApi(action, payload = {}) {
    try {
        const jsonString = encodeURIComponent(JSON.stringify({ action, ...payload }));
        const response = await fetch(`${API_CONFIG.URL}?data=${jsonString}`, { 
            method: 'GET',
            cache: 'no-store' 
        });
        const result = await response.json();
        
        // Handle SUCCESS from App Script (beberapa action merespon status/result)
        if (result.result === "SUCCESS" || result.status === "SUCCESS" || Array.isArray(result)) {
            return result;
        }
        throw new Error(result.message || "Terjadi kesalahan sistem");
    } catch (error) {
        console.error("API Error [" + action + "]:", error);
        throw error;
    }
}

// Sinkronisasi Saldo ke UI dan Storage
function syncSaldoUI(nominal) {
    const val = Math.max(0, parseFloat(nominal) || 0);
    UserSession.saldo = val;
    localStorage.setItem('user_saldo', val);
    
    // Update elemen saldo (ID: display-saldo & profile-saldo)
    const displays = ['display-saldo', 'profile-saldo', 'admin-display-saldo'];
    displays.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = id.includes('profile') ? formatIDR(val) : 'IDR ' + Math.floor(val).toLocaleString('id-ID');
    });
}

// ─── 1. AUTH & PROFILE ───────────────────────────────────────

const AuthAPI = {
    async login(username, password) {
        const res = await callApi("login", { username, password });
        UserSession.username = username;
        localStorage.setItem('username', username);
        syncSaldoUI(res.saldo);
        return res;
    },
    async register(data) {
        return await callApi("register", data);
    },
    async logout() {
        if (UserSession.username) {
            await callApi("set_status", { username: UserSession.username, status: "OFFLINE" });
        }
        localStorage.clear();
        window.location.href = "login.html";
    }
};

const ProfileAPI = {
    async sync() {
        if (!UserSession.username) return;
        const res = await callApi("get_profile", { username: UserSession.username });
        if (res.data) {
            syncSaldoUI(res.data.saldo);
            UserSession.tier = res.data.tier;
            localStorage.setItem('user_tier', res.data.tier);
            
            const tierEl = document.getElementById("profile-tier");
            if (tierEl) tierEl.innerText = res.data.tier;
        }
    }
};

// ─── 2. GAME ENGINE (SYNC WITH APP SCRIPT) ───────────────────

const GameEngine = {
    async processPlay(betAmount) {
        if (!UserSession.username || UserSession.saldo < betAmount) return null;
        
        const saldoAwalSnapshot = UserSession.saldo;

        try {
            // Mengirim saldoAwal sesuai rumus App Script: (saldoAwal - bet) + (bet * mult)
            const res = await callApi("game_play", {
                username: UserSession.username,
                bet: betAmount,
                saldoAwal: saldoAwalSnapshot
            });

            // Update saldo lokal setelah pemotongan bet oleh server
            if (res.newSaldo !== undefined) {
                syncSaldoUI(res.newSaldo);
            }

            return {
                multiplier: res.target_multiplier,
                winAmount: res.win,
                newSaldo: res.newSaldo
            };
        } catch (e) {
            alert("Koneksi bermasalah: " + e.message);
            return null;
        }
    },

    // Dipanggil saat animasi bola selesai masuk ke bucket
    updateBalanceAfterWin(winAmount) {
        const saldoBaru = UserSession.saldo + winAmount;
        syncSaldoUI(saldoBaru);
    }
};

// ─── 3. TRANSAKSI (WD & DEPO) ────────────────────────────────

const TransaksiAPI = {
    async withdraw(jumlah) {
        const res = await callApi("withdraw", {
            username: UserSession.username,
            jumlah: jumlah,
            tanggal: new Date().toLocaleString("id-ID")
        });
        await ProfileAPI.sync();
        return res;
    },
    async depositQRIS(nominal) {
        return await callApi("deposit", {
            username: UserSession.username,
            nominalIDR: nominal,
            method: "QRIS",
            tanggal: new Date().toLocaleString("id-ID")
        });
    },
    async getHistory(type) {
        const action = type === 'WD' ? "get_withdraw_history" : "get_deposit_history";
        return await callApi(action, { username: UserSession.username });
    }
};

// ─── 4. REWARDS & INBOX ──────────────────────────────────────

const RewardAPI = {
    async claimDaily() {
        const res = await callApi("claim_daily", { username: UserSession.username });
        syncSaldoUI(res.newSaldo);
        return res;
    },
    async getInbox() {
        return await callApi("get_inbox", { username: UserSession.username });
    },
    async claimInbox(id, amount) {
        const res = await callApi("claim_inbox", { id, username: UserSession.username, saldo: amount });
        syncSaldoUI(res.newSaldo);
        return res;
    },
    async getReferralData() {
        return await callApi("get_referrals", { username: UserSession.username });
    },
    async claimReferral() {
        const res = await callApi("claim_referral", { username: UserSession.username });
        syncSaldoUI(res.newSaldo);
        return res;
    }
};

// ─── 5. MASTER PANEL (ADMIN ONLY) ────────────────────────────

const AdminAPI = {
    async getAllPlayers() {
        return await callApi("getAllUsers");
    },
    async getPendingDeposits() {
        return await callApi("get_pending_deposits");
    },
    async approveDeposit(rowIdx) {
        return await callApi("approve_deposit", { row: rowIdx });
    },
    async updateWinrate(targetUser, newRate) {
        return await callApi("updateWinrate", { targetUser, newRate });
    },
    async adjustSaldo(targetUser, amount) {
        return await callApi("adminUpdateSaldo", { targetUser, amount });
    },
    async setMaxwin(targetUser, maxwin) {
        return await callApi("setMaxwinLimit", { targetUser, maxwin });
    },
    async togglePanicMode(minutes) {
        // minutes: 0 untuk matikan, >0 untuk aktifkan
        return await callApi("set_global_panic", { minutes });
    }
};

// ─── UTILS ───────────────────────────────────────────────────

function formatIDR(num) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(num);
}

// ─── INITIALIZATION ──────────────────────────────────────────

async function initGlobalSync() {
    if (UserSession.username) {
        try {
            // Update Status ONLINE & Start Session
            await callApi("set_status", { username: UserSession.username, status: "ONLINE" });
            await callApi("set_session_start", { username: UserSession.username });
            
            // Sync Data Terbaru
            await ProfileAPI.sync();
        } catch (e) {
            console.warn("Sync failed, check internet.");
        }
    }
}

// Menangani penutupan tab agar status jadi OFFLINE
window.addEventListener('beforeunload', () => {
    if (UserSession.username) {
        const payload = JSON.stringify({ action: "set_status", username: UserSession.username, status: "OFFLINE" });
        navigator.sendBeacon(`${API_CONFIG.URL}?data=${encodeURIComponent(payload)}`);
    }
});

document.addEventListener('DOMContentLoaded', initGlobalSync);
