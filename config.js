/**
 * ============================================================
 * NEON PLINKO VIP — CENTRAL ENGINE (STABLE VERSION)
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

// 3. SESSION MANAGEMENT (DIPERKUAT)
function getUsername() {
    // Mengecek semua kemungkinan nama kunci yang mungkin Master gunakan
    return localStorage.getItem('user_neon') || 
           localStorage.getItem('username') || 
           localStorage.getItem('neon_user');
}

// 4. FORMATTER
function formatIDR(amount) {
    return "IDR " + Math.floor(amount || 0).toLocaleString('id-ID');
}

// 5. CORE SYNC ENGINE
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
            localStorage.setItem('cached_saldo', data.saldo);
            localStorage.setItem('cached_winrate', data.winrate || 50);

            const uiElements = {
                'saldo-text': formatIDR(data.saldo),
                'display-saldo': formatIDR(data.saldo),
                'profile-saldo': formatIDR(data.saldo),
                'wd-saldo': formatIDR(data.saldo),
                'display-username': data.username,
                'header-username': data.username,
                'user-winrate': (data.winrate || 50) + "%"
            };

            for (const [id, value] of Object.entries(uiElements)) {
                const el = document.getElementById(id);
                if (el) {
                    if (el.tagName === 'INPUT') el.value = value;
                    else el.textContent = value;
                }
            }
            
            // Pemicu otomatis untuk update riwayat jika ada di halaman deposit
            if (typeof loadHistory === "function") {
                loadHistory(); 
            }
        }
    } catch (err) {
        console.warn("Syncing..."); // Dikurangi agar console tidak kotor
    }
}

// 6. TRANSACTION FUNCTIONS
const NeonTransaksi = {
    async kirimDeposit(amount, method, netReceive) {
        const user = getUsername();
        if(!user) return { error: { message: "Sesi Habis, Silahkan Login" } };
        
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
        if(!user) return { error: { message: "Sesi Habis, Silahkan Login" } };

        return await _supabase.from('withdrawals').insert([{
            username: user,
            amount: parseFloat(amount),
            status: 'PROSES'
        }]);
    }
};

// 7. AUTO INITIALIZATION (FIXED REDIRECT)
document.addEventListener('DOMContentLoaded', () => {
    const user = getUsername();
    const path = window.location.pathname;
    const isAuthPage = path.includes('index.html') || path === '/' || path.includes('login') || path.includes('register');

    // Jika user tidak ada dan BUKAN di halaman login/register, tendang ke index
    if (!user && !isAuthPage) {
        console.log("No Session, redirecting...");
        window.location.href = 'index.html';
        return;
    }

    syncNeonData();
    // Sinkronisasi data setiap 5 detik agar tidak membebani database
    setInterval(syncNeonData, 5000);
});

// 8. LOGOUT
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
