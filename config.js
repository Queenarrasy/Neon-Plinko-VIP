/**
 * ============================================================
 * NEON PLINKO VIP — CENTRAL ENGINE (STABILIZED & REINFORCED)
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
 * DIPERKUAT: Menangani kasus kolom kosong atau data lambat
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
            // Simpan saldo di cache
            localStorage.setItem('cached_saldo', data.saldo);
            
            // --- LOGIKA REINFORCED UNTUK REFERRAL ---
            // Cek semua kemungkinan nama kolom jika referral_code null
            const validRef = data.referral_code || data.ref_code || data.kode_referral;
            
            // Pemetaan Data ke ID HTML
            const uiElements = {
                'saldo-text': formatIDR(data.saldo),
                'display-saldo': formatIDR(data.saldo),
                'profile-saldo': formatIDR(data.saldo),
                'wd-saldo': formatIDR(data.saldo),
                'display-username': data.username,
                'header-username': data.username,
                // Jika masih kosong di DB, gunakan username sebagai kode (Fallback)
                'ref-code': validRef || user.toUpperCase()
            };

            for (const [id, value] of Object.entries(uiElements)) {
                const el = document.getElementById(id);
                if (el) {
                    if (el.tagName === 'INPUT') {
                        el.value = value;
                    } else {
                        // Tambahkan efek kilau jika data baru masuk
                        if(el.textContent === "REFRESHING..." || el.textContent === "BELUM_SET") {
                            el.style.color = "#fbff00"; 
                        }
                        el.textContent = value;
                    }
                }
            }

            if (typeof loadHistory === "function") loadHistory();
            if (typeof loadInbox === "function") loadInbox();
        } else if (error) {
            console.error("Supabase Error:", error.message);
        }
    } catch (err) { 
        console.warn("Connection lost. Retrying sync..."); 
    }
}

/**
 * Proteksi Halaman & Auto Init
 */
document.addEventListener('DOMContentLoaded', () => {
    const user = getUsername();
    const currentPath = window.location.pathname.split("/").pop();
    
    const publicPages = ['index.html', 'login.html', 'register.html', '']; 
    const isPublic = publicPages.includes(currentPath);

    if (!user && !isPublic) {
        window.location.href = 'index.html';
        return;
    }

    if (user) {
        // Jalankan sinkron segera
        syncNeonData();
        
        // Loop sinkronisasi setiap 5 detik
        setInterval(syncNeonData, 5000);
    }
});

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
