/**
 * GLOBAL SCRIPT NEON PLINKO VIP - V5.0
 * Menangani Sesi, Saldo (Anti-Mental Logic), dan Sinkronisasi Server
 */

// URL API dari App Script Anda
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec";
const API_URL = SCRIPT_URL; 

/**
 * 1. CEK SESI
 * Memastikan user sudah login sebelum mengakses halaman permainan
 */
function checkSession() {
    const user = localStorage.getItem('user_session');
    const currentPage = window.location.pathname.split("/").pop();

    // Jika tidak ada sesi dan bukan di halaman index (login), kembalikan ke index
    if (!user && currentPage !== "index.html" && currentPage !== "") {
        window.location.href = "index.html";
    }
}

/**
 * 2. UPDATE UI SALDO
 * Memperbarui tampilan saldo di elemen 'display-saldo'
 */
function updateSaldoUI() {
    const saldo = localStorage.getItem('user_saldo') || 0;
    const saldoEl = document.getElementById('display-saldo');
    if (saldoEl) {
        // Format Rupiah Indonesia
        saldoEl.innerText = "IDR " + Number(saldo).toLocaleString('id-ID');
    }
}

/**
 * 3. LOGIKA ANTI-MENTAL (fetchLatestSaldo)
 * Mengambil saldo dari server tanpa mengganggu animasi kemenangan lokal
 */
async function fetchLatestSaldo() {
    const now = Date.now();
    
    // KUNCI SINKRONISASI:
    // Jangan tarik data jika ada bola yang sedang meluncur (mengacu pada ballActiveCount di HTML)
    if (typeof ballActiveCount !== 'undefined' && ballActiveCount > 0) return;
    
    // Jangan tarik data jika baru saja menang kurang dari 4 detik 
    // agar saldo lokal tidak tertimpa saldo server yang belum terupdate
    if (typeof lastWinTime !== 'undefined' && (now - lastWinTime < 4000)) return;

    const user = localStorage.getItem('user_session');
    if (!user) return;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getUserData', username: user })
        });
        const res = await response.json();
        
        if (res.result === "SUCCESS") {
            let localSaldo = Number(localStorage.getItem('user_saldo') || 0);
            let serverSaldo = Number(res.saldo);
            
            // HANYA UPDATE JIKA:
            // Saldo server berubah (biasanya karena Admin Update atau Deposit Masuk)
            // Dan pastikan tidak sedang dalam kondisi bermain (isPlaying false)
            if (typeof isPlaying !== 'undefined' && !isPlaying) {
                if (serverSaldo !== localSaldo) {
                    localStorage.setItem('user_saldo', serverSaldo);
                    updateSaldoUI();
                }
            }
        }
    } catch (e) {
        console.warn("Gagal sinkron saldo: Koneksi sibuk.");
    }
}

/**
 * 4. FIX USER SESSION
 * Memastikan 'username' selalu tersedia untuk parameter 'game_play' di App Script
 */
function fixUserSession() {
    const session = localStorage.getItem('user_session');
    const username = localStorage.getItem('username');
    
    // Sinkronkan key 'user_session' ke 'username' untuk kompatibilitas script game
    if (session && !username) {
        localStorage.setItem('username', session);
    }
}

/**
 * 5. COMPATIBILITY ALIAS
 */
async function syncSaldo() {
    await fetchLatestSaldo();
}

/**
 * 6. LOGOUT
 */
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

// Jalankan otomatis saat halaman dimuat
checkSession();
fixUserSession();

// Jalankan sinkronisasi berkala setiap 10 detik untuk cek deposit masuk (background sync)
setInterval(() => {
    fetchLatestSaldo();
}, 10000);
