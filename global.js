/**
 * GLOBAL SCRIPT NEON PLINKO VIP
 * Menangani Sesi, Saldo, dan Navigasi
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec";

// 1. CEK SESI (Dijalankan di setiap halaman kecuali index.html)
function checkSession() {
    const user = localStorage.getItem('user_session');
    const currentPage = window.location.pathname.split("/").pop();

    // Jika tidak ada user dan bukan di halaman login, tendang ke index.html
    if (!user && currentPage !== "index.html" && currentPage !== "") {
        window.location.href = "index.html";
    }
}

// 2. AMBIL DATA SALDO TERBARU DARI SERVER
async function syncSaldo() {
    const user = localStorage.getItem('user_session');
    if (!user) return;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getUserData', username: user })
        });
        const res = await response.json();
        
        if (res.result === "SUCCESS") {
            localStorage.setItem('user_saldo', res.saldo);
            // Update tampilan saldo jika elemennya ada
            const saldoEl = document.getElementById('display-saldo');
            if (saldoEl) {
                saldoEl.innerText = "IDR " + Number(res.saldo).toLocaleString('id-ID');
            }
        }
    } catch (e) {
        console.error("Gagal sinkron saldo server");
    }
}

// 3. FUNGSI LOGOUT
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

// Jalankan proteksi sesi saat script dimuat
checkSession();
