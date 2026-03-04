/**
 * GLOBAL.JS - NEON PLINKO VIP (SINKRON V9.0)
 * Master Script untuk sinkronisasi Frontend dengan Google Apps Script.
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwqQWXIJuVnkIxLvdu3kYiiRDVh7eyrsy-KU6rG1qtQClgfAzmMoclv2ULFZ_hRdE_qUg/exec";

// 1. FUNGSI UTAMA: AMBIL DATA USER DARI SPREADSHEET
async function fetchUserData() {
    const user = localStorage.getItem('username');
    if (!user) {
        window.location.href = "index.html";
        return null;
    }

    try {
        // Menggunakan POST action: getUserData agar konsisten dengan App Script
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getUserData', username: user })
        });
        const data = await response.json();

        if (data.result === "SUCCESS") {
            // Update Local Storage agar semua elemen UI (Saldo, Tier, dll) sinkron
            localStorage.setItem('user_saldo', data.saldo);
            localStorage.setItem('user_tier', data.tier);
            localStorage.setItem('user_fullname', data.fullname);
            localStorage.setItem('winrate', data.winrate);
            localStorage.setItem('maxWin', data.maxWin);
            localStorage.setItem('sessionMinutes', data.sessionMin);
            
            // Update tampilan saldo global jika elemennya ada (header/profil)
            const saldoEl = document.getElementById('display-saldo');
            if (saldoEl) saldoEl.innerText = "IDR " + Number(data.saldo).toLocaleString('id-ID');
            
            return data;
        }
    } catch (e) {
        console.error("Sinkronisasi Gagal:", e);
    }
    return null;
}

// 2. INISIALISASI HALAMAN PROFIL
async function initProfile() {
    const data = await fetchUserData();
    if (data) {
        if(document.getElementById('profile-username')) document.getElementById('profile-username').innerText = data.username;
        if(document.getElementById('profile-tier')) document.getElementById('profile-tier').innerText = data.tier + " MEMBER";
        if(document.getElementById('profile-fullname')) document.getElementById('profile-fullname').innerText = data.fullname || "-";
        if(document.getElementById('profile-bank')) document.getElementById('profile-bank').innerText = data.bank || "-";
        if(document.getElementById('profile-rek')) document.getElementById('profile-rek').innerText = data.rekening || "-";
        if(document.getElementById('total-depo')) document.getElementById('total-depo').innerText = "IDR " + Number(data.totalDepo).toLocaleString('id-ID');
        if(document.getElementById('total-wd')) document.getElementById('total-wd').innerText = "IDR " + Number(data.totalWD).toLocaleString('id-ID');
    }
}

// 3. PROSES WITHDRAW (POTONG SALDO LANGSUNG DI SERVER)
async function submitWithdraw() {
    const amount = Number(document.getElementById('wd-amount').value);
    const user = localStorage.getItem('username');
    const saldoLokal = Number(localStorage.getItem('user_saldo'));

    if (amount < 50000) {
        alert("Minimal penarikan IDR 50.000");
        return;
    }
    if (amount > saldoLokal) {
        alert("Saldo tidak mencukupi!");
        return;
    }

    if (!confirm(`Konfirmasi Withdraw IDR ${amount.toLocaleString()}?`)) return;

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
            alert("Withdraw diproses! Saldo akun Anda telah dipotong.");
            localStorage.setItem('user_saldo', result.newSaldo);
            location.reload();
        } else {
            alert(result.message || "Gagal mengajukan withdraw.");
        }
    } catch (e) {
        alert("Terjadi kesalahan koneksi.");
    }
}

// 4. PROSES DEPOSIT (QRIS & USDT KURS SINKRON)
async function submitDeposit(method, amount) {
    const user = localStorage.getItem('username');

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
                // Redirect ke WA Admin dengan pesan konfirmasi dan info kurs dari server
                alert(`Deposit USDT Berhasil diajukan.\nEstimasi diterima: IDR ${result.idr.toLocaleString()}\nHarap konfirmasi wallet address ke admin.`);
                window.open(result.waUrl, '_blank');
            } else {
                alert("Deposit QRIS Sedang Diproses. Silakan upload bukti transfer jika diperlukan.");
            }
            location.reload();
        } else {
            alert(result.message);
        }
    } catch (e) {
        alert("Koneksi server gagal.");
    }
}

// 5. REWARD: CLAIM HARIAN & INBOX GIFT
async function claimDailyReward() {
    const user = localStorage.getItem('username');
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'claimDaily', username: user })
        });
        const result = await response.json();
        if (result.result === "SUCCESS") {
            alert("Reward Harian Berhasil Diklaim!");
            localStorage.setItem('user_saldo', result.newSaldo);
            location.reload();
        } else {
            alert(result.message); // Pesan "SUDAH CLAIM HARI INI" dari server
        }
    } catch (e) {
        alert("Gagal klaim reward.");
    }
}

async function claimInboxItem(msgId) {
    const user = localStorage.getItem('username');
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'claimInbox', username: user, id: msgId })
        });
        const result = await response.json();
        if (result.result === "SUCCESS") {
            alert("Saldo hadiah telah ditambahkan ke akun Anda!");
            localStorage.setItem('user_saldo', result.newSaldo);
            location.reload();
        } else {
            alert(result.message);
        }
    } catch (e) {
        alert("Gagal memproses pesan.");
    }
}

// 6. GAME ENGINE: LOGIKA PLINKO DENGAN LOCK SERVICE & SESSION CONTROL
async function playPlinkoGame(betAmount) {
    const user = localStorage.getItem('username');
    const currentSaldo = Number(localStorage.getItem('user_saldo'));

    if (betAmount > currentSaldo) {
        alert("Saldo tidak cukup untuk memasang taruhan!");
        return null;
    }

    try {
        // Kirim request ke server untuk menentukan hasil (Winrate & MaxWin diproses di GAS)
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
            // Update saldo di local storage agar UI game tetap sinkron saat bola jatuh
            localStorage.setItem('user_saldo', result.newSaldo);
            
            // Mengirim data ke game.html: multiplier hasil RNG server & saldo terbaru
            return {
                multiplier: result.multiplier,
                newSaldo: result.newSaldo
            };
        } else {
            alert(result.message);
            return null;
        }
    } catch (e) {
        console.error("Game Error:", e);
        alert("Server sibuk atau koneksi terputus.");
        return null;
    }
}

// FUNGSI LOGOUT
function userLogout() {
    localStorage.clear();
    window.location.href = "index.html";
}

// Otomatis sinkron data setiap kali halaman dimuat (jika sudah login)
if (localStorage.getItem('username')) {
    fetchUserData();
}
