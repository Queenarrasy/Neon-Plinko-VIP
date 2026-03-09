/**
 * ============================================================
 * NEON PLINKO VIP — Global JS API Connector
 * Versi: 4.0 — Unified API + Master Panel Support
 * ============================================================
 */

const API_CONFIG = {
    // Masukkan URL Web App Google Apps Script Anda di sini
    URL: "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec";
};

/**
 * Core Request Handler
 * Mendukung POST (Default) dan GET (Fallback)
 */
async function callApi(action, payload = {}, method = "POST") {
    try {
        const fullPayload = { action, ...payload };

        if (method === "POST") {
            const response = await fetch(API_CONFIG.URL, {
                method: "POST",
                mode: "no-cors", // Penting untuk Apps Script jika tidak memakai library CORS
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(fullPayload)
            });
            
            // Apps Script doPost dengan no-cors tidak mengembalikan body secara langsung
            // Jika butuh return data, disarankan menggunakan doGet (GET) atau setting khusus.
            return { result: "SUCCESS", message: "Request sent (POST mode)" };
        } else {
            // Menggunakan GET untuk mendapatkan return data JSON
            const jsonString = encodeURIComponent(JSON.stringify(fullPayload));
            const response = await fetch(`${API_CONFIG.URL}?data=${jsonString}`);
            const result = await response.json();
            return result;
        }
    } catch (error) {
        console.error("API Error:", error);
        return { result: "ERROR", message: error.message };
    }
}

// ─── FUNGSI UNTUK USER (FRONTEND) ───────────────────────────

const UserAPI = {
    login: (username, password) => 
        callApi("login", { username, password }, "GET"),

    register: (userData) => 
        callApi("register", userData, "GET"),

    getProfile: (username) => 
        callApi("get_profile", { username }, "GET"),

    getSaldo: (username) => 
        callApi("get_saldo", { username }, "GET"),

    playGame: (username, bet, saldoAwal) => 
        callApi("game_play", { username, bet, saldoAwal }, "GET"),

    deposit: (username, nominalIDR, method) => 
        callApi("deposit", { username, nominalIDR, method, tanggal: new Date().toLocaleString() }, "GET"),

    withdraw: (username, jumlah, bank, rek, nama) => 
        callApi("withdraw", { username, jumlah, bank, rekening: rek, namaLengkap: nama }, "GET"),

    claimDaily: (username) => 
        callApi("claim_daily", { username }, "GET"),

    getReferrals: (username) => 
        callApi("get_referrals", { username }, "GET"),
        
    claimReferral: (username) => 
        callApi("claim_referral", { username }, "GET")
};

// ─── FUNGSI UNTUK MASTER PANEL (ADMIN) ──────────────────────

const AdminAPI = {
    getAllUsers: () => 
        callApi("getAllUsers", {}, "GET"),

    getPendingDeposits: () => 
        callApi("get_pending_deposits", {}, "GET"),

    approveDeposit: (row) => 
        callApi("approve_deposit", { row }, "GET"),

    updateWinrate: (targetUser, newRate) => 
        callApi("updateWinrate", { targetUser, newRate }, "GET"),

    adjustSaldo: (targetUser, amount) => 
        callApi("adminUpdateSaldo", { targetUser, amount }, "GET"),

    setMaxwin: (targetUser, maxwin) => 
        callApi("setMaxwinLimit", { targetUser, maxwin }, "GET"),

    setGlobalPanic: (minutes) => 
        callApi("set_global_panic", { minutes }, "GET")
};

/**
 * Helper: Format Rupiah
 */
function formatIDR(number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(number);
}
