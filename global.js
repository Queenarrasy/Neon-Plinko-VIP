/**
 * ============================================================
 * NEON PLINKO VIP — Global JS Ultra Master Sync
 * Version: 4.8 — Full Profile Auto-Fill & Sync (FINAL)
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

// ─── BRIDGE FUNCTIONS (Agar Game Plinko Bisa Jalan) ──────────
async function apiCall(payload) {
    const { action, ...rest } = payload;
    return await callApi(action, rest);
}

function getSaldo() { return UserSession.saldo; }
function setSaldo(nominal) { syncSaldoUI(nominal); }
function getUsername() { return UserSession.username; }

// ─── CORE ENGINE (Fetch & Response) ──────────────────────────
async function callApi(action, payload = {}) {
    try {
        const jsonString = encodeURIComponent(JSON.stringify({ action, ...payload }));
        const response = await fetch(`${API_CONFIG.URL}?data=${jsonString}`, { 
            method: 'GET',
            cache: 'no-store' 
        });
        const result = await response.json();
        
        if (result.result === "SUCCESS" || result.status === "SUCCESS" || Array.isArray(result)) {
            return result;
        }
        throw new Error(result.message || "Terjadi kesalahan sistem");
    } catch (error) {
        console.error("API Error [" + action + "]:", error);
        throw error;
    }
}

// Sinkronisasi Saldo ke Semua UI Elemen
function syncSaldoUI(nominal) {
    const val = Math.max(0, parseFloat(nominal) || 0);
    UserSession.saldo = val;
    localStorage.setItem('user_saldo', val);
    
    // Update elemen saldo di berbagai lokasi (Header, Profile, Admin)
    const displays = ['display-saldo', 'profile-saldo', 'admin-display-saldo', 'header-saldo'];
    displays.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Khusus profile-saldo biasanya pakai format IDR penuh
            el.innerText = id.includes('profile') ? formatIDR(val) : 'IDR ' + Math.floor(val).toLocaleString('id-ID');
        }
    });
}

// ─── 1. AUTH & PROFILE (DENGAN LOGIKA AUTO-FILL) ──────────────
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
        
        try {
            const res = await callApi("get_profile", { username: UserSession.username });
            if (res.data) {
                const d = res.data;
                
                // 1. Update Saldo & Tier ke Storage
                syncSaldoUI(d.saldo);
                UserSession.tier = d.tier;
                localStorage.setItem('user_tier', d.tier);

                // 2. AUTO-FILL DATA KE HTML
                // Script ini akan mencari ID di HTML Anda dan mengisinya secara otomatis
                const profileMap = {
                    "profile-username": d.username,
                    "profile-nama": d.namaLengkap,
                    "profile-phone": d.phone,
                    "profile-bank": d.bank,
                    "profile-rekening": d.nomorRekening,
                    "profile-tier": d.tier,
                    "profile-refcode": d.refCode,
                    "display-username": d.username,
                    "info-total-depo": formatIDR(d.totalDepo),
                    "info-total-wd": formatIDR(d.totalWD)
                };

                for (let id in profileMap) {
                    const el = document.getElementById(id);
                    if (el) {
                        if (el.tagName === 'INPUT') {
                            el.value = profileMap[id];
                        } else {
                            el.innerText = profileMap[id];
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Gagal sinkronisasi profil:", e);
        }
    }
};

// ─── 2. GAME ENGINE (Logika Bermain) ──────────────────────────
const GameEngine = {
    async processPlay(betAmount) {
        if (!UserSession.username || UserSession.saldo < betAmount) return null;
        
        const saldoAwalSnapshot = UserSession.saldo;

        try {
            const res = await callApi("game_play", {
                username: UserSession.username,
                bet: betAmount,
                saldoAwal: saldoAwalSnapshot
            });

            if (res.newSaldo !== undefined) {
                syncSaldoUI(res.newSaldo);
            }

            return {
                multiplier: res.target_multiplier,
                winAmount: res.win,
                newSaldo: res.newSaldo
            };
        } catch (e) {
            console.error("Game Play Error:", e);
            return null;
        }
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
        await ProfileAPI.sync(); // Refresh data setelah WD
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

// ─── 5. MASTER PANEL (Hanya Admin) ───────────────────────────
const AdminAPI = {
    async getAllPlayers() { return await callApi("getAllUsers"); },
    async getPendingDeposits() { return await callApi("get_pending_deposits"); },
    async approveDeposit(rowIdx) { return await callApi("approve_deposit", { row: rowIdx }); },
    async updateWinrate(targetUser, newRate) { return await callApi("updateWinrate", { targetUser, newRate }); },
    async adjustSaldo(targetUser, amount) { return await callApi("adminUpdateSaldo", { targetUser, amount }); },
    async setMaxwin(targetUser, maxwin) { return await callApi("setMaxwinLimit", { targetUser, maxwin }); },
    async togglePanicMode(minutes) { return await callApi("set_global_panic", { minutes }); }
};

// ─── UTILS ───────────────────────────────────────────────────
function formatIDR(num) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(num);
}

// ─── INITIALIZATION (Dijalankan saat halaman terbuka) ────────
async function initGlobalSync() {
    if (UserSession.username) {
        // Isi username ke UI segera sebelum fetch selesai agar tidak kosong
        const userDisplays = ["profile-username", "display-username"];
        userDisplays.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = UserSession.username;
        });

        try {
            await callApi("set_status", { username: UserSession.username, status: "ONLINE" });
            await ProfileAPI.sync();
        } catch (e) {
            console.warn("Koneksi bermasalah, menggunakan data cache.");
        }
    }
}

// Auto-Logout / Offline saat browser ditutup
window.addEventListener('beforeunload', () => {
    if (UserSession.username) {
        const payload = JSON.stringify({ action: "set_status", username: UserSession.username, status: "OFFLINE" });
        navigator.sendBeacon(`${API_CONFIG.URL}?data=${encodeURIComponent(payload)}`);
    }
});

document.addEventListener('DOMContentLoaded', initGlobalSync);
