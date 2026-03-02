/**
 * GLOBAL SCRIPT NEON PLINKO VIP - V4.5
 * Menangani Sesi, Saldo (Anti-Mental Logic), dan Navigasi
 */

// Menyamakan SCRIPT_URL dengan API_URL agar fungsi fetch di HTML tidak error
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec";
const API_URL = SCRIPT_URL; 

// 1. CEK SESI (Dijalankan di setiap halaman kecuali index.html)
function checkSession() {
    const user = localStorage.getItem('user_session');
    const currentPage = window.location.pathname.split("/").pop();

    // Jika tidak ada user dan bukan di halaman login, tendang ke index.html
    if (!user && currentPage !== "index.html" && currentPage !== "") {
        window.location.href = "index.html";
    }
}

// 2. FUNGSI UPDATE UI (Helper untuk sinkronisasi tampilan)
function updateSaldoUI() {
    const saldo = localStorage.getItem('user_saldo') || 0;
    const saldoEl = document.getElementById('display-saldo');
    if (saldoEl) {
        saldoEl.innerText = "IDR " + Number(saldo).toLocaleString('id-ID');
    }
}

// 3. AMBIL DATA SALDO TERBARU DARI SERVER (LOGIKA ANTI-MENTAL)
async function fetchLatestSaldo() {
    const now = Date.now();
    
    // TRIPLE LOCK: JANGAN tarik data jika:
    // - Ada bola aktif di layar (activeBalls > 0)
    // - Sedang proses kirim data menang (isSyncing)
    // - Baru saja menang kurang dari 5 detik (now - lastWinTime < 5000)
    if (typeof activeBalls !== 'undefined' && activeBalls > 0) return;
    if (typeof isSyncing !== 'undefined' && isSyncing) return;
    if (typeof lastWinTime !== 'undefined' && (now - lastWinTime < 5000)) return;

    const user = localStorage.getItem('user_session');
    if (!user) return;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getUserData', username: user })
        });
        const res = await response.json();
        
        let localSaldo = Number(localStorage.getItem('user_saldo') || 0);
        
        // HANYA UPDATE JIKA:
        // 1. Saldo server lebih besar (artinya ada deposit/admin update)
        // 2. Atau saldo server sama (sinkron)
        if (res.result === "SUCCESS" && res.saldo >= localSaldo) {
            localStorage.setItem('user_saldo', res.saldo);
            updateSaldoUI();
        }
    } catch (e) {
        console.error("Gagal sinkron saldo server");
    }
}

// 4. ALIAS UNTUK KOMPATIBILITAS (syncSaldo diarahkan ke fetchLatestSaldo)
async function syncSaldo() {
    await fetchLatestSaldo();
}

/**
 * TAMBAHAN UNTUK FIX KONEKSI SERVER GAGAL PADA AKUN BARU
 * Memastikan 'username' selalu tersedia untuk fungsi game_play
 */
function fixUserSession() {
    const session = localStorage.getItem('user_session');
    const username = localStorage.getItem('username');
    
    // Jika user_session ada tapi username kosong (biasanya terjadi setelah login/register baru)
    if (session && !username) {
        localStorage.setItem('username', session);
    }
}

// 5. FUNGSI LOGOUT
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

// Jalankan fungsi otomatis saat script dimuat
checkSession();
fixUserSession();
