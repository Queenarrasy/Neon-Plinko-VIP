/**
 * GLOBAL SCRIPT NEON PLINKO VIP - V5.2
 * Bridge for App Script V5.2 (Support Session Timer)
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec";
const user = localStorage.getItem('user_session') || localStorage.getItem('username');

/**
 * 1. SESSION & AUTH
 */
function checkSession() {
    if (!user && !window.location.pathname.includes("index.html")) {
        window.location.href = "index.html";
    }
}

async function startSession() {
    if (!user) return;
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'reset_session', username: user })
        });
        console.log("Session Gacor Dimulai!");
    } catch (e) {
        console.error("Session Error:", e);
    }
}

/**
 * 2. SYNC SALDO & PROFILE
 */
async function syncUserData() {
    if (!user) return;
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getUserData', username: user })
        });
        const res = await response.json();
        
        if (res.result === "SUCCESS") {
            localStorage.setItem('user_saldo', res.saldo);
            localStorage.setItem('user_tier', res.tier);
            localStorage.setItem('user_fullname', res.fullname);
            updateUI(res);
        }
    } catch (e) {
        console.error("Sync Error:", e);
    }
}

function updateUI(data) {
    const saldoEl = document.getElementById('display-saldo');
    const tierEl = document.getElementById('display-tier');
    const nameEl = document.getElementById('display-name');

    if (saldoEl) {
        const val = Number(data.saldo);
        saldoEl.innerText = isNaN(val) ? "IDR 0" : "IDR " + val.toLocaleString('id-ID');
    }
    if (tierEl) tierEl.innerText = data.tier || "BRONZE";
    if (nameEl) nameEl.innerText = data.fullname || user;
}

/**
 * NEW: FUNGSI RIWAYAT (Agar riwayat tidak hilang)
 * Panggil fungsi ini di halaman deposit.html atau withdraw.html
 */
async function fetchHistory(type) { // type: 'deposit' atau 'withdraw'
    if (!user) return [];
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getHistory&username=${user}&type=${type}`);
        const res = await response.json();
        return res; // Mengembalikan array data riwayat
    } catch (e) {
        console.error("History Error:", e);
        return [];
    }
}

/**
 * 3. WITHDRAWAL SYSTEM
 */
async function submitWithdraw(amount) {
    if (amount < 50000) {
        alert("Gagal: Minimal penarikan adalah IDR 50.000");
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'withdraw',
                username: user,
                amount: amount
            })
        });
        const res = await response.json();
        if (res.result === "SUCCESS") {
            alert("Withdraw Berhasil Diajukan!");
            syncUserData(); 
        } else {
            alert("Error: " + (res.message || "Saldo tidak mencukupi"));
        }
    } catch (e) {
        alert("Koneksi Server Gagal");
    }
}

// ... (Gunakan sisa fungsi deposit, claimDaily, inbox dari kode Anda sebelumnya)

// Jalankan otomatis
checkSession();
syncUserData();
setInterval(syncUserData, 10000);
