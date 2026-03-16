/**
 * ============================================================
 * NEON PLINKO VIP — CENTRAL ENGINE (STABILIZED)
 * ============================================================
 */

// 1. Inisialisasi Supabase
const SUPABASE_URL = "https://bgffnmwrviyqpeevzjsn.supabase.co";
const SUPABASE_KEY = "sb_publishable_jT5khcYa5J22ijGDjl9klA_qWkSuani"; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Konfigurasi Global
const NEON_CONFIG = {
    KURS_USDT: 16800,
    MIN_DEPO: 20000,
    MIN_WD: 50000
};

/**
 * Mengambil username dari storage.
 * Prioritas utama pada 'neon_user' agar sinkron dengan reward.html
 */
function getUsername() {
    return localStorage.getItem('neon_user') || 
           localStorage.getItem('user_neon') || 
           localStorage.getItem('username');
}

/**
 * Format angka ke IDR (Rp)
 */
function formatIDR(amount) {
    return "Rp " + Math.floor(amount || 0).toLocaleString('id-ID');
}

/**
 * Sinkronisasi Data User & UI secara Real-time
 * Fungsi ini akan otomatis mencari elemen ID di HTML dan mengisinya
 */
async function syncNeonData() {
    const user = getUsername();
    if (!user || !_supabase) return;

    try {
        const { data, error } = await _supabase
            .from('profiles')
            .select('*')
            .eq('username', user)
            .single();
            
        if (data && !error) {
            // Simpan saldo di cache untuk akses cepat
            localStorage.setItem('cached_saldo', data.saldo);
            
            // Pemetaan Data ke ID HTML (Otomatis Update UI)
            const uiElements = {
                'saldo-text': formatIDR(data.saldo),
                'display-saldo': formatIDR(data.saldo),
                'profile-saldo': formatIDR(data.saldo),
                'wd-saldo': formatIDR(data.saldo),
                'display-username': data.username,
                'header-username': data.username,
                'ref-code': data.referral_code || "BELUM_SET"
            };

            for (const [id, value] of Object.entries(uiElements)) {
                const el = document.getElementById(id);
                if (el) {
                    if (el.tagName === 'INPUT') {
                        el.value = value;
                    } else {
                        el.textContent = value;
                    }
                }
            }

            // Jalankan fungsi loadHistory atau loadInbox jika ada di halaman tersebut
            if (typeof loadHistory === "function") loadHistory();
            if (typeof loadInbox === "function") loadInbox();
        }
    } catch (err) { 
        console.warn("Connection lost. Retrying sync..."); 
    }
}

/**
 * Proteksi Halaman: Mencegah user masuk tanpa login
 */
document.addEventListener('DOMContentLoaded', () => {
    const user = getUsername();
    const currentPath = window.location.pathname.split("/").pop();
    
    // Daftar halaman yang boleh dibuka tanpa login
    const publicPages = ['index.html', 'login.html', 'register.html', '']; 
    const isPublic = publicPages.includes(currentPath);

    if (!user && !isPublic) {
        // Jika tidak ada user dan bukan halaman publik, tendang ke login
        window.location.href = 'index.html';
        return;
    }

    if (user) {
        // Sinkron pertama kali saat halaman terbuka
        syncNeonData();
        
        // Loop sinkronisasi setiap 5 detik agar saldo & referral selalu update
        setInterval(syncNeonData, 5000);
    }
});

/**
 * Fungsi Logout Global
 */
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
