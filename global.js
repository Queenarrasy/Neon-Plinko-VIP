/**
 * GLOBAL JS - SISTEM PLINKO VIP V3.6.3 (Optimized & Integrated)
 * Terintegrasi: Cloud Sync, Auth, Transaction History, & Anti-Lag Balance Update
 */

// 1. KONFIGURASI UTAMA
const CLOUD_URL = "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec";
const SCRIPT_URL = CLOUD_URL;

/**
 * Komunikasi Utama ke Google Apps Script (Server)
 */
async function callCloud(payload) {
    try {
        const response = await fetch(CLOUD_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (error) {
        console.error("Koneksi Error:", error);
        return { result: "ERROR", message: "Gagal terhubung ke server" };
    }
}

/**
 * AUTHENTICATION: LOGIN HANDLER
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
            localStorage.setItem('tier', result.tier || "BRONZE");
            localStorage.setItem('user_winrate', result.winrate || 70);

            window.location.href = "game.html";
        } else {
            if (loader) loader.style.display = 'none';
            alert(result.message || "Username atau Password salah!");
        }
    } catch (err) {
        if (loader) loader.style.display = 'none';
        alert("Gangguan koneksi server.");
    }
}

/**
 * AUTHENTICATION: LOGOUT HANDLER
 */
async function handleLogout() {
    const user = localStorage.getItem('user_session');
    if (user) {
        await callCloud({ action: "logout", username: user });
    }
    localStorage.clear();
    window.location.href = "index.html";
}

/**
 * SISTEM SALDO: UPDATE LOKAL (ANTI-MEMBAL & PROTEKSI NaN)
 */
function updateSaldoLokal(newAmount) {
    // Proteksi jika data tidak valid agar saldo tidak berubah jadi NaN atau hilang
    if (newAmount === undefined || newAmount === null || isNaN(newAmount)) return;
    
    localStorage.setItem('saldo', newAmount);
    
    const saldoDisplay = document.getElementById('display-saldo') || 
                         document.getElementById('user-balance') || 
                         document.getElementById('saldo-header');
                         
    if (saldoDisplay) {
        saldoDisplay.innerText = "IDR " + Number(newAmount).toLocaleString('id-ID');
    }
}

/**
 * SISTEM SALDO: SYNC DARI SERVER (PERIODIK)
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
        console.warn("Auto-sync failed.");
    }
}

/**
 * SISTEM PERMAINAN: KIRIM HASIL KE SERVER (SINKRONISASI DATABASE)
 * Memastikan setiap kemenangan tercatat di Google Sheets
 */
async function processGameResult(multiplierValue) {
    const user = localStorage.getItem('user_session');
    const currentBetDisplay = document.getElementById('current-bet');
    
    if (!user || !currentBetDisplay) return 0;

    // Ambil bet dari teks UI (hilangkan titik/koma)
    const bet = parseInt(currentBetDisplay.innerText.replace(/,/g, '').replace(/\./g, ''));

    try {
        // Kirim data ke Cloud (Google Sheets)
        const res = await callCloud({ 
            action: 'playGame', 
            username: user, 
            betAmount: bet, 
            multiplier: multiplierValue.toString() 
        });

        if (res.result === "SUCCESS") {
            // Update saldo final berdasarkan balasan resmi database server
            updateSaldoLokal(res.newSaldo);
            return res.winAmount; 
        } else {
            console.error("Server Error:", res.message);
            // Jika saldo habis di server, sinkronkan ulang UI
            if(res.message === "SALDO HABIS") syncSaldo();
            return 0;
        }
    } catch (e) { 
        console.error("Gagal sinkronisasi cloud."); 
        return 0; 
    }
}

/**
 * TRANSAKSI: MUAT RIWAYAT (DEPOSIT/WITHDRAW)
 */
async function loadRiwayat(type) {
    const user = localStorage.getItem('user_session');
    const container = document.getElementById('history-list');

    if (!user || !container) return;

    container.innerHTML = '<div style="text-align:center; padding:20px; color:#00d4ff;">MEMUAT DATA...</div>';

    try {
        const res = await callCloud({
            action: "getRiwayat",
            username: user,
            type: type
        });

        if (res.result === "SUCCESS" && res.data && res.data.length > 0) {
            container.innerHTML = ''; 
            res.data.forEach(item => {
                const statusColor = item.status.toLowerCase() === 'success' || item.status.toLowerCase() === 'berhasil' ? '#00ff88' : 
                                   (item.status.toLowerCase() === 'pending' || item.status.toLowerCase() === 'proses' ? '#ffcc00' : '#ff0077');
                
                const card = document.createElement('div');
                card.style = "background:rgba(255,255,255,0.05); border:1px solid #333; border-radius:10px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;";
                card.innerHTML = `
                    <div>
                        <div style="font-size:10px; color:#888;">${item.tanggal}</div>
                        <div style="font-size:12px; font-weight:900; color:white;">${item.metode.toUpperCase()}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:14px; font-weight:900; color:#fbff00;">IDR ${Number(item.jumlah).toLocaleString('id-ID')}</div>
                        <div style="font-size:9px; font-weight:900; color:${statusColor}; text-transform:uppercase;">● ${item.status}</div>
                    </div>
                `;
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<div style="text-align:center; padding:40px; color:#555; font-size:12px;">BELUM ADA TRANSAKSI</div>';
        }
    } catch (e) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#ff0077;">GAGAL MEMUAT RIWAYAT</div>';
    }
}

/**
 * SECURITY: AUTO-REDIRECT
 */
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('login.html')) {
    if (localStorage.getItem('user_session')) {
        window.location.href = "game.html";
    }
}
