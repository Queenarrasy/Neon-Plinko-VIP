/**
 * ============================================================
 * NEON PLINKO VIP — CENTRAL ENGINE (PERFECTED)
 * ============================================================
 */

const SUPABASE_URL = "https://bgffnmwrviyqpeevzjsn.supabase.co";
const SUPABASE_KEY = "sb_publishable_jT5khcYa5J22ijGDjl9klA_qWkSuani"; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const NEON_CONFIG = {
    KURS_USDT: 16800,
    MIN_DEPO: 20000,
    MIN_WD: 50000
};

// Ambil username dari semua kemungkinan penyimpanan
function getUsername() {
    return localStorage.getItem('user_neon') || 
           localStorage.getItem('username') || 
           localStorage.getItem('neon_user');
}

function formatIDR(amount) {
    return "IDR " + Math.floor(amount || 0).toLocaleString('id-ID');
}

// Sinkronisasi Saldo & Data User Real-time
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
            
            const uiElements = {
                'saldo-text': formatIDR(data.saldo),
                'display-saldo': formatIDR(data.saldo),
                'profile-saldo': formatIDR(data.saldo),
                'wd-saldo': formatIDR(data.saldo),
                'display-username': data.username,
                'header-username': data.username
            };

            for (const [id, value] of Object.entries(uiElements)) {
                const el = document.getElementById(id);
                if (el) {
                    if (el.tagName === 'INPUT') el.value = value;
                    else el.textContent = value;
                }
            }
            // Trigger refresh riwayat jika ada fungsi loadHistory di halaman tersebut
            if (typeof loadHistory === "function") loadHistory();
        }
    } catch (err) { console.warn("Syncing..."); }
}

// Proteksi Halaman & Auto Init
document.addEventListener('DOMContentLoaded', () => {
    const user = getUsername();
    const path = window.location.pathname.split("/").pop();
    
    // Halaman yang boleh diakses tanpa login
    const publicPages = ['index.html', 'login.html', 'register.html', '']; 
    const isPublic = publicPages.includes(path);

    if (!user && !isPublic) {
        window.location.href = 'index.html';
        return;
    }

    if (user) {
        syncNeonData();
        setInterval(syncNeonData, 5000); // Update saldo tiap 5 detik
    }
});

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
