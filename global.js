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

/**
 * NEW: START SESSION LOGIC
 * Fungsi ini memicu reset waktu "StartTime" di Kolom R Sheet
 * Panggil fungsi ini saat tombol "PLAY" di game di-klik atau saat login sukses.
 */
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
        // Menggunakan POST agar lebih aman dan sesuai dengan route getUserData di GAS
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

/**
 * 4. DEPOSIT SYSTEM
 */
async function submitDeposit(method, amount) {
    if (method === "QRIS" && amount < 20000) {
        alert("Minimal Deposit QRIS IDR 20.000");
        return;
    }
    if (method === "USDT" && amount < 10) {
        alert("Minimal Deposit USDT $10");
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'deposit',
                username: user,
                method: method,
                amount: amount
            })
        });
        const res = await response.json();
        if (res.result === "SUCCESS") {
            alert("Tiket Deposit Berhasil Dibuat.");
        } else {
            alert("Gagal: " + res.message);
        }
    } catch (e) {
        alert("Gagal menghubungi server.");
    }
}

/**
 * 5. REWARD & INBOX SYSTEM
 */
async function claimDaily() {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'claimDaily', username: user })
        });
        const res = await response.json();
        if (res.result === "SUCCESS") {
            alert("Selamat! Bonus Harian IDR " + res.bonus + " masuk.");
            syncUserData();
        } else {
            alert(res.message);
        }
    } catch (e) { console.log(e); }
}

async function fetchInbox() {
    try {
        const response = await fetch(SCRIPT_URL + "?action=getInbox&username=" + user);
        const res = await response.json();
        return res; 
    } catch (e) { return []; }
}

async function claimInboxBonus(msgId) {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'claimInbox', username: user, id: msgId })
        });
        const res = await response.json();
        if (res.result === "SUCCESS") {
            alert("Bonus Inbox Berhasil diklaim!");
            syncUserData();
        }
    } catch (e) { console.log(e); }
}

// Jalankan otomatis saat halaman dimuat
checkSession();
syncUserData();

// Interval update saldo tiap 10 detik
setInterval(syncUserData, 10000);
