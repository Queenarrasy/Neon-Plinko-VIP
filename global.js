// 1. KONFIGURASI UTAMA
// Ganti URL di bawah dengan URL Web App Google Apps Script kamu yang sudah di-deploy
const CLOUD_URL = "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec";

/**
 * Fungsi Utama untuk Komunikasi ke Google Sheets
 * @param {Object} payload - Data yang akan dikirim (action, username, password, dll)
 */
async function callCloud(payload) {
    try {
        const response = await fetch(CLOUD_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Koneksi Error:", error);
        return { result: "ERROR", message: "Gagal terhubung ke server" };
    }
}

/**
 * Fungsi untuk Menangani Login
 */
async function handleLogin(user, pass) {
    const loader = document.getElementById('loading-overlay');
    
    const result = await callCloud({
        action: "login",
        username: user,
        password: pass
    });

    if (result && result.result === "SUCCESS") {
        // Simpan data ke browser (LocalStorage) agar bisa dibaca di game.html
        localStorage.setItem('user_session', result.username);
        localStorage.setItem('user_fullname', result.fullname);
        localStorage.setItem('saldo', result.saldo);
        localStorage.setItem('tier', result.tier);
        localStorage.setItem('winrate', result.winrate);

        showNeonAlert("Selamat Datang Kembali, " + result.fullname, "LOGIN BERHASIL");
        
        // Arahkan ke halaman game setelah 1.5 detik
        setTimeout(() => {
            window.location.href = "game.html";
        }, 1500);
    } else {
        loader.style.display = 'none';
        showNeonAlert("Username atau Password salah!", "AKSES DITOLAK");
    }
}

/**
 * Fungsi Custom Alert bertema Neon
 */
function showNeonAlert(message, title = "NOTIFIKASI") {
    // Kamu bisa menggunakan alert bawaan browser dulu untuk memastikan fungsi jalan
    // Atau membuat modal custom di sini nanti
    alert(`${title}\n\n${message}`);
}

/**
 * Fungsi Logout
 */
async function handleLogout() {
    const user = localStorage.getItem('user_session');
    if (user) {
        // Opsional: Kirim perintah ke sheet untuk set OFFLINE
        await callCloud({ action: "logout", username: user });
    }
    localStorage.clear();
    window.location.href = "index.html";
}

// Tambahkan pengaman: Jika sudah login, jangan balik ke halaman login (index.html)
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    if (localStorage.getItem('user_session')) {
        window.location.href = "game.html";
    }
}
