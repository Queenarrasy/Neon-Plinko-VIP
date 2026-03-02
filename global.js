/**
 * GLOBAL SCRIPT NEON PLINKO VIP - V5.0
 */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec";
const API_URL = SCRIPT_URL; 

// Ambil username dari session untuk digunakan di semua halaman
const user = localStorage.getItem('user_session') || localStorage.getItem('username');

function checkSession() {
    if (!user && !window.location.pathname.includes("index.html")) {
        window.location.href = "index.html";
    }
}

function updateSaldoUI() {
    const saldo = localStorage.getItem('user_saldo') || 0;
    const saldoEl = document.getElementById('display-saldo');
    if (saldoEl) {
        saldoEl.innerText = "IDR " + Number(saldo).toLocaleString('id-ID');
    }
}

async function fetchLatestSaldo() {
    if (typeof ballActiveCount !== 'undefined' && ballActiveCount > 0) return;
    if (!user) return;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getUserData', username: user })
        });
        const res = await response.json();
        if (res.result === "SUCCESS") {
            localStorage.setItem('user_saldo', res.saldo);
            updateSaldoUI();
        }
    } catch (e) { console.log("Sync Pending..."); }
}

checkSession();
updateSaldoUI();
