/**
 * ============================================================
 * NEON PLINKO VIP — Global JS Ultra Sync
 * Version: 4.1 — Full Integration (Profile, WD, Depo, Reward, Game)
 * ============================================================
 */

const API_CONFIG = {
    URL: "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec", // Ganti dengan URL deployment Anda
    KURS_USDT: 16800, // Contoh kurs 1 USD ke IDR
    ADMIN_WA: "6289510249551" // Nomor WA Admin untuk konfirmasi USDT
};

const UserSession = {
    data: null,
    isAutoPlaying: false
};

// ─── CORE ENGINE ─────────────────────────────────────────────

async function callApi(action, payload = {}) {
    try {
        const jsonString = encodeURIComponent(JSON.stringify({ action, ...payload }));
        const response = await fetch(`${API_CONFIG.URL}?data=${jsonString}`);
        const result = await response.json();
        if (result.result === "SUCCESS") return result;
        throw new Error(result.message || "Terjadi kesalahan sistem");
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

// ─── 1. PROFILE & AUTH ───────────────────────────────────────

const ProfileAPI = {
    async sync() {
        if (!UserSession.data) return;
        const res = await callApi("get_profile", { username: UserSession.data.username });
        UserSession.data = res.data;
        this.updateUI();
    },

    updateUI() {
        const d = UserSession.data;
        // Update elemen HTML jika ada (contoh ID: profile-saldo)
        if (document.getElementById("profile-saldo")) 
            document.getElementById("profile-saldo").innerText = formatIDR(d.saldo);
        if (document.getElementById("profile-tier")) 
            document.getElementById("profile-tier").innerText = d.tier;
    }
};

// ─── 2. WITHDRAW ──────────────────────────────────────────────

const WdAPI = {
    async submit(jumlah) {
        const d = UserSession.data;
        if (jumlah < 50000) throw new Error("Minimal penarikan IDR 50.000");
        if (d.saldo < jumlah) throw new Error("Saldo tidak mencukupi");

        const res = await callApi("withdraw", {
            username: d.username,
            namaLengkap: d.namaLengkap,
            bank: d.bank,
            rekening: d.nomorRekening,
            jumlah: jumlah,
            tanggal: new Date().toLocaleString("id-ID")
        });

        await ProfileAPI.sync(); // Potong saldo langsung di tampilan
        return res;
    },

    async getHistory(username) {
        return await callApi("get_withdraw_history", { username });
    }
};

// ─── 3. DEPOSIT ───────────────────────────────────────────────

const DepoAPI = {
    async submitQRIS(nominal) {
        if (nominal < 20000) throw new Error("Minimal deposit QRIS IDR 20.000");
        return await callApi("deposit", {
            username: UserSession.data.username,
            nominalIDR: nominal,
            method: "QRIS",
            tanggal: new Date().toLocaleString("id-ID")
        });
    },

    async submitCrypto(nominalUSD) {
        if (nominalUSD < 10) throw new Error("Minimal deposit USDT $10");
        
        const fee = 2;
        const netUSD = nominalUSD - fee;
        const nominalIDR = netUSD * API_CONFIG.KURS_USDT;
        const nominalCryptoText = `${nominalIDR} (${netUSD})`;

        // Integrasi WhatsApp Admin
        const msg = `Konfirmasi wallet address: Saya ingin deposit USDT\nUsername: ${UserSession.data.username}\nNominal: $${nominalUSD}\nTerima Bersih: $${netUSD}`;
        window.open(`https://wa.me/${API_CONFIG.ADMIN_WA}?text=${encodeURIComponent(msg)}`, '_blank');

        return await callApi("deposit", {
            username: UserSession.data.username,
            nominalCrypto: nominalCryptoText,
            method: "USDT",
            tanggal: new Date().toLocaleString("id-ID")
        });
    },

    async getHistory(username) {
        return await callApi("get_deposit_history", { username });
    }
};

// ─── 4. REWARD & INBOX ────────────────────────────────────────

const RewardAPI = {
    async claimDaily() {
        return await callApi("claim_daily", { username: UserSession.data.username });
    },

    async getInbox() {
        return await callApi("get_inbox", { username: UserSession.data.username });
    },

    async claimInbox(id, amount) {
        const res = await callApi("claim_inbox", { 
            id, 
            username: UserSession.data.username,
            saldo: amount 
        });
        await ProfileAPI.sync();
        return res;
    },

    async getReferralStatus() {
        return await callApi("get_referrals", { username: UserSession.data.username });
    },

    async claimReferral() {
        const res = await callApi("claim_referral", { username: UserSession.data.username });
        await ProfileAPI.sync();
        return res;
    }
};

// ─── 5. GAME ENGINE (LOCK SERVICE & WINRATE) ──────────────────

const GameEngine = {
    // Dipanggil setiap kali bola dilepas (drop)
    async processPlay(betAmount) {
        if (UserSession.isAutoPlaying && betAmount <= 0) return;
        
        const currentSaldo = UserSession.data.saldo;

        try {
            // Backend menangani Mode Kuras/Normal/Gacor & SessionMinutes
            const res = await callApi("game_play", {
                username: UserSession.data.username,
                bet: betAmount,
                saldoAwal: currentSaldo
            });

            // Update saldo di memori lokal agar tidak delay
            UserSession.data.saldo = res.newSaldo;
            ProfileAPI.updateUI();

            return {
                multiplier: res.target_multiplier,
                winAmount: res.win,
                newSaldo: res.newSaldo
            };
        } catch (e) {
            alert(e.message);
            return null;
        }
    },

    toggleAuto(status) {
        UserSession.isAutoPlaying = status;
        // UI Logic: Disable input bet jika status true
        document.getElementById("bet-input").disabled = status;
    }
};

// ─── UTILS ────────────────────────────────────────────────────

function formatIDR(num) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(num);
}

// Inisialisasi Session Start saat halaman dimuat
async function initSession() {
    if (UserSession.data) {
        await callApi("set_session_start", { username: UserSession.data.username });
    }
}
