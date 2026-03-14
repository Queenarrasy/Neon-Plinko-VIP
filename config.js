/**
 * ============================================================
 * NEON PLINKO VIP — ALL-IN-ONE CENTRAL ENGINE
 * Gabungan Global.js & Config.js
 * ============================================================
 */

// 1. KREDENSIAL SUPABASE
const SUPABASE_URL = "https://bgffnmwrviyqpeevzjsn.supabase.co";
const SUPABASE_KEY = "sb_publishable_jT5khcYa5J22ijGDjl9klA_qWkSuani"; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. CONFIG SETTINGS
const NEON_CONFIG = {
    KURS_USDT: 16800,
    MIN_DEPO: 20000,
    MIN_WD: 50000
};

// 3. SESSION MANAGEMENT
function getUsername() {
    return localStorage.getItem('user_neon') || localStorage.getItem('username');
}

// 4. FORMATTER
function formatIDR(amount) {
    return "IDR " + Math.floor(amount || 0).toLocaleString('id-ID');
}

// 5. CORE SYNC ENGINE (Mengisi Saldo & Data User Otomatis)
async function syncNeonData() {
    const user = getUsername();
    if (!user) return;

    try {
        const { data, error } = await _supabase
            .from('profiles')
            .select('*')
            .eq('username', user)
            .single();
            
        if (data && !error) {
            // Simpan saldo angka murni untuk kebutuhan Game (tanpa teks IDR)
            localStorage.setItem('cached_saldo', data.saldo);
            localStorage.setItem('cached_winrate', data.winrate || 50);

            // Daftar ID elemen HTML yang akan diisi otomatis jika ditemukan di halaman
            const uiElements = {
                'saldo-text': formatIDR(data.saldo),      // Untuk di Game
                'display-saldo': formatIDR(data.saldo),   // Untuk di Navbar
                'profile-saldo': formatIDR(data.saldo),   // Untuk di Profil
                'wd-saldo': formatIDR(data.saldo),        // Untuk di Withdraw
                'display-username': data.username,        // Nama user
                'header-username': data.username,         // Nama user di header
                'user-winrate': (data.winrate || 50) + "%" // Winrate di profil
            };

            for (const [id, value] of Object.entries(uiElements)) {
                const el = document.getElementById(id);
                if (el) {
                    if (el.tagName === 'INPUT') el.value = value;
                    else el.textContent = value;
                }
            }
        }
    } catch (err) {
        console.error("Sync Error:", err.message);
    }
}

// 6. TRANSACTION FUNCTIONS (Untuk Deposit & Withdraw)
const NeonTransaksi = {
    async kirimDeposit(amount, method, netReceive) {
        const user = getUsername();
        return await _supabase.from('deposits').insert([{
            username: user,
            amount: parseFloat(amount),
            method: method,
            net_receive: Math.floor(netReceive),
            status: 'PROSES'
        }]);
    },

    async kirimWithdraw(amount) {
        const user = getUsername();
        return await _supabase.from('withdrawals').insert([{
            username: user,
            amount: parseFloat(amount),
            status: 'PROSES'
        }]);
    }
};

// 7. AUTO INITIALIZATION (Berjalan otomatis di setiap halaman)
document.addEventListener('DOMContentLoaded', () => {
    const user = getUsername();
    const isIndex = window.location.href.includes('index.html');

    // Proteksi: Jika bukan halaman login dan tidak ada user, balikkan ke login
    if (!user && !isIndex) {
        window.location.href = 'index.html';
        return;
    }

    // Jalankan Sinkronisasi Pertama
    syncNeonData();

    // Jalankan Sinkronisasi Otomatis setiap 3 detik (Real-time)
    setInterval(syncNeonData, 3000);
});

// 8. LOGOUT
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
