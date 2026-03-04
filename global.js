/**
 * GLOBAL.JS - NEON PLINKO VIP
 * Master Script untuk menangani sinkronisasi data pemain, 
 * transaksi, reward, dan logika Game.
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwqQWXIJuVnkIxLvdu3kYiiRDVh7eyrsy-KU6rG1qtQClgfAzmMoclv2ULFZ_hRdE_qUg/exec";
const ADMIN_WA = "628xxxxxxxxxx"; // Ganti dengan nomor admin untuk konfirmasi USDT

// 1. FUNGSI UTAMA SINKRONISASI DATA USER
async function fetchUserData() {
    const user = localStorage.getItem('username');
    if (!user) {
        window.location.href = "index.html";
        return null;
    }

    try {
        const response = await fetch(SCRIPT_URL + "?action=getUserData&username=" + user);
        const data = await response.json();
        if (data.result === "SUCCESS") {
            // Update Local Storage agar game & UI sinkron
            localStorage.setItem('user_saldo', data.saldo);
            localStorage.setItem('user_tier', data.tier);
            localStorage.setItem('user_fullname', data.fullname);
            localStorage.setItem('winrate', data.winrate);
            localStorage.setItem('maxWin', data.maxWin);
            localStorage.setItem('sessionMinutes', data.sessionMinutes);
            return data;
        }
    } catch (e) {
        console.error("Gagal sinkronisasi data server:", e);
    }
    return null;
}

// 2. LOGIKA HALAMAN PROFIL
async function initProfile() {
    const data = await fetchUserData();
    if (data) {
        document.getElementById('profile-username').innerText = data.username;
        document.getElementById('display-saldo').innerText = "IDR " + Number(data.saldo).toLocaleString('id-ID');
        document.getElementById('profile-tier').innerText = data.tier + " MEMBER";
        document.getElementById('profile-fullname').innerText = data.fullname || "-";
        document.getElementById('profile-bank').innerText = data.bank || "-";
        document.getElementById('profile-rek').innerText = data.rekening || "-";
        document.getElementById('total-depo').innerText = "IDR " + Number(data.totalDepo).toLocaleString('id-ID');
        document.getElementById('total-wd').innerText = "IDR " + Number(data.totalWD).toLocaleString('id-ID');
    }
}

// 3. LOGIKA HALAMAN WITHDRAW
async function submitWithdraw() {
    const amount = Number(document.getElementById('wd-amount').value);
    const user = localStorage.getItem('username');
    const saldo = Number(localStorage.getItem('user_saldo'));

    if (amount < 50000) {
        alert("Minimal penarikan IDR 50.000");
        return;
    }
    if (amount > saldo) {
        alert("Saldo tidak mencukupi!");
        return;
    }

    const btn = document.querySelector('.btn-submit');
    btn.disabled = true;
    btn.innerText = "MEMPROSES...";

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'withdraw',
                username: user,
                amount: amount
            })
        });
        const result = await response.json();
        if (result.result === "SUCCESS") {
            alert("Withdraw berhasil diajukan! Saldo Anda terpotong.");
            localStorage.setItem('user_saldo', result.newSaldo);
            location.reload();
        } else {
            alert(result.message || "Gagal mengajukan withdraw.");
        }
    } catch (e) {
        alert("Koneksi Error.");
    } finally {
        btn.disabled = false;
        btn.innerText = "AJUKAN WITHDRAW";
    }
}

// 4. LOGIKA HALAMAN DEPOSIT (QRIS & USDT)
async function submitDeposit(method, amount) {
    const user = localStorage.getItem('username');
    
    // Validasi Sesuai Instruksi
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
        const result = await response.json();
        
        if (result.result === "SUCCESS") {
            if (method === "USDT") {
                const waText = `Konfirmasi wallet address deposit USDT sebesar $${amount} (Username: ${user})`;
                window.open(`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(waText)}`, '_blank');
                alert(`Harap konfirmasi ke Admin. Estimasi diterima: IDR ${result.idr.toLocaleString()}`);
            } else {
                alert("Deposit QRIS sedang diproses. Silakan tunggu konfirmasi admin.");
            }
            location.reload();
        }
    } catch (e) {
        alert("Gagal terhubung ke server.");
    }
}

// 5. LOGIKA REWARD & INBOX
async function claimDaily() {
    const user = localStorage.getItem('username');
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'claimDaily', username: user })
        });
        const result = await response.json();
        if (result.result === "SUCCESS") {
            alert("Berhasil Klaim Reward Harian!");
            localStorage.setItem('user_saldo', result.newSaldo);
            location.reload();
        } else {
            alert(result.message || "Anda sudah klaim hari ini.");
        }
    } catch (e) {
        alert("Server Error.");
    }
}

async function claimInboxGift(id) {
    const user = localStorage.getItem('username');
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'claimInbox', username: user, id: id })
        });
        const result = await response.json();
        if (result.result === "SUCCESS") {
            alert("Hadiah saldo masuk ke akun Anda!");
            localStorage.setItem('user_saldo', result.newSaldo);
            location.reload();
        }
    } catch (e) {
        alert("Gagal Klaim.");
    }
}

// 6. LOGIKA GAME ENGINE (SINKRON KE SERVER)
async function playPlinko(betAmount) {
    const user = localStorage.getItem('username');
    const saldo = Number(localStorage.getItem('user_saldo'));

    if (betAmount > saldo) {
        alert("Saldo Habis!");
        return null;
    }

    // Lock Service dijalankan di sisi Server (GAS)
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'game_play',
                username: user,
                bet: betAmount
            })
        });
        const result = await response.json();

        if (result.result === "SUCCESS") {
            // Update saldo lokal agar tampilan sinkron saat bola jatuh
            localStorage.setItem('user_saldo', result.newSaldo);
            
            // Return multiplier ke game.html untuk animasi bola
            return {
                multiplier: result.multiplier,
                newSaldo: result.newSaldo
            };
        } else {
            alert(result.message);
            return null;
        }
    } catch (e) {
        console.error("Game Server Error");
        return null;
    }
}

// Sinkronisasi Winrate & Session (Dipanggil setiap kali masuk game)
async function checkGameSession() {
    const data = await fetchUserData();
    if (data) {
        console.log("Session Terpantau - Winrate saat ini:", data.winrate);
        // Logika MaxWin dan SessionMinutes ditangani di Server (GAS) 
        // agar tidak bisa dimanipulasi oleh pemain lewat inspect element.
    }
}

// Fungsi pembantu Logout
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}
