/**
 * GLOBAL SCRIPT NEON PLINKO VIP - V5.1
 * Bridge for App Script V5.1
 */

// Ganti dengan URL Web App yang Anda dapatkan setelah Deploy di Google Sheets
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec";// Mengambil sesi user
const user = localStorage.getItem('user_session') || localStorage.getItem('username');

/**
 * 1. SESSION & AUTH
 * Memastikan user login dan status sinkron
 */
function checkSession() {
    if (!user && !window.location.pathname.includes("index.html")) {
        window.location.href = "index.html";
    }
}

/**
 * 2. SYNC SALDO & PROFILE
 * Mengambil data terbaru dari Kolom G (Saldo) dan H (Tier)
 */
async function syncUserData() {
    if (!user) return;
    try {
        const response = await fetch(SCRIPT_URL + "?action=getUserData&username=" + user);
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

    if (saldoEl) saldoEl.innerText = "IDR " + Number(data.saldo).toLocaleString('id-ID');
    if (tierEl) tierEl.innerText = data.tier;
    if (nameEl) nameEl.innerText = data.fullname;
}

/**
 * 3. WITHDRAWAL SYSTEM
 * Validasi Min 50.000 & Sinkronisasi Langsung
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
            alert("Withdraw Berhasil Diajukan! Saldo Anda telah dipotong.");
            syncUserData(); // Langsung update saldo di tampilan
        } else {
            alert("Error: " + (res.message || "Saldo tidak mencukupi"));
        }
    } catch (e) {
        alert("Koneksi Server Gagal");
    }
}

/**
 * 4. DEPOSIT SYSTEM (QRIS & USDT)
 * Menolak transaksi di bawah limit (20rb / $10)
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
            alert("Tiket Deposit Berhasil Dibuat. Silahkan selesaikan pembayaran.");
        } else {
            alert("Gagal: " + res.message);
        }
    } catch (e) {
        alert("Gagal menghubungi server.");
    }
}

/**
 * 5. REWARD & INBOX SYSTEM
 * Handle Klaim Harian & Pesan Admin
 */
async function claimDaily() {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'claimDaily', username: user })
        });
        const res = await response.json();
        if (res.result === "SUCCESS") {
            alert("Selamat! Bonus Harian IDR " + res.bonus + " masuk ke saldo.");
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
        // Logika untuk menampilkan list pesan di HTML
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
            alert("Bonus dari Inbox telah diklaim!");
            syncUserData();
        }
    } catch (e) { console.log(e); }
}

// Jalankan otomatis saat halaman dimuat
checkSession();
syncUserData();

// Interval update saldo tiap 10 detik agar sinkron dengan admin (Sheet)
setInterval(syncUserData, 10000);
