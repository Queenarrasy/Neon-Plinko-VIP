// 1. KONFIGURASI UTAMA
// Pastikan URL ini adalah URL Web App Google Apps Script versi TERBARU (V3.6.3 atau yang baru di-deploy)
const CLOUD_URL = "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec";
const SCRIPT_URL = CLOUD_URL; // Alias untuk kompatibilitas di game.html

/**
 * Fungsi Utama untuk Komunikasi ke Google Sheets
 * Dioptimalkan untuk Google Apps Script doPost(e)
 */
async function callCloud(payload) {
    try {
        // Menggunakan mode 'cors' dan mengarahkan output ke JSON string
        // Google Apps Script membutuhkan penanganan khusus agar tidak kena CORS block
        const response = await fetch(CLOUD_URL, {
            method: "POST",
            mode: "no-cors", // Penting untuk pengiriman awal ke GAS
            cache: "no-cache",
            headers: {
                "Content-Type": "text/plain", // GAS seringkali lebih stabil menerima text/plain lalu di-parse
            },
            body: JSON.stringify(payload)
        });

        /* Catatan: Google Apps Script Web App dengan mode 'no-cors' tidak akan 
           mengembalikan data JSON secara langsung karena alasan keamanan browser.
           
           SOLUSI TERBAIK: Tetap gunakan fetch standar tapi pastikan 
           di sisi Apps Script sudah ada header ContentService.MimeType.JSON
        */
        
        // Versi Fetch yang mendukung pembacaan respon JSON (Gunakan ini jika GAS sudah di-set CORS-nya)
        const directRes = await fetch(CLOUD_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        return await directRes.json();

    } catch (error) {
        console.error("Koneksi Error:", error);
        // Fallback jika fetch pertama gagal karena kebijakan CORS
        return { result: "ERROR", message: "Gagal terhubung ke server. Pastikan Web App sudah di-deploy sebagai 'Anyone'." };
    }
}

/**
 * UPDATE SALDO LOKAL (ANTI MEMBAL)
 * Diperbaiki agar mendukung IDR formatting yang rapi
 */
function updateSaldoLokal(newAmount) {
    if (newAmount === undefined || newAmount === null) return;
    
    localStorage.setItem('saldo', newAmount);
    
    // Cari elemen saldo (mendukung berbagai ID elemen)
    const saldoDisplay = document.getElementById('display-saldo') || 
                         document.getElementById('user-balance') || 
                         document.getElementById('saldo-header');
                         
    if (saldoDisplay) {
        // Format IDR 1.000
        saldoDisplay.innerText = "IDR " + Number(newAmount).toLocaleString('id-ID');
    }
}

/**
 * SYNC DATA DARI SERVER
 */
async function syncSaldo() {
    const user = localStorage.getItem('user_session');
    if (!user) return;

    try {
        const result = await callCloud({
            action: "getUserData",
            username: user
        });

        if (result && result.result === "SUCCESS") {
            updateSaldoLokal(result.saldo);
            localStorage.setItem('user_winrate', result.winrate || 70);
            if (result.tier) localStorage.setItem('tier', result.tier);
        }
    } catch (e) {
        console.warn("Gagal sinkronisasi saldo otomatis.");
    }
}

/**
 * LOGIN HANDLER
 */
async function handleLogin(user, pass) {
    const loader = document.getElementById('loading-overlay');
    if (loader) loader.style.display = 'flex';
    
    try {
        const result = await callCloud({
            action: "login",
            username: user,
            password: pass
        });

        if (result && result.result === "SUCCESS") {
            localStorage.setItem('user_session', result.username);
            localStorage.setItem('user_fullname', result.fullname);
            localStorage.setItem('saldo', result.saldo);
            localStorage.setItem('tier', result.tier || "VIP");
            localStorage.setItem('user_winrate', result.winrate || 70);

            // Redirect ke game
            window.location.href = "game.html";
        } else {
            if (loader) loader.style.display = 'none';
            alert(result.message || "Login Gagal! Periksa kembali akun anda.");
        }
    } catch (err) {
        if (loader) loader.style.display = 'none';
        alert("Terjadi gangguan koneksi ke server.");
    }
}

/**
 * LOGOUT HANDLER
 */
async function handleLogout() {
    const user = localStorage.getItem('user_session');
    if (user) {
        await callCloud({ action: "logout", username: user });
    }
    localStorage.clear();
    window.location.href = "index.html";
}

// Security: Jika di halaman index tapi sudah login, lempar ke game
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('login.html')) {
    if (localStorage.getItem('user_session')) {
        window.location.href = "game.html";
    }
}
