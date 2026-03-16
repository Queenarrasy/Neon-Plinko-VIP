/**
 * ============================================================
 * NEON PLINKO VIP — CENTRAL ENGINE (LOCKED REF SYSTEM)
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
 * FIX: Mengunci kode referral agar tidak berubah-ubah.
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
            localStorage.setItem('cached_saldo', data.saldo);
            
            // --- LOGIKA PENGUNCI REFERRAL ---
            // Cek apakah kolom referral_code di DB sudah ada isinya (misal: SAPI123)
            let currentRef = data.referral_code;

            // HANYA generate jika di database benar-benar kosong/null
            if (!currentRef || currentRef === "" || currentRef === "BELUM_SET") {
                // Cek apakah kita sudah punya kode sementara di localStorage agar tidak berubah tiap 5 detik
                let tempRef = localStorage.getItem('temp_ref_lock');
                
                if (!tempRef) {
                    tempRef = "NEON" + Math.random().toString(36).substring(2, 7).toUpperCase();
                    localStorage.setItem('temp_ref_lock', tempRef);
                }

                // Coba simpan ke database secara permanen
                await _supabase
                    .from('profiles')
                    .update({ referral_code: tempRef })
                    .eq('username', user);
                
                currentRef = tempRef;
            } else {
                // Jika sudah ada di DB (seperti SAPI123), hapus kunci sementara
                localStorage.removeItem('temp_ref_lock');
            }
            
            // Pemetaan Data ke ID HTML
            const uiElements = {
                'saldo-text': formatIDR(data.saldo),
                'display-saldo': formatIDR(data.saldo),
                'profile-saldo': formatIDR(data.saldo),
                'wd-saldo': formatIDR(data.saldo),
                'display-username': data.username,
                'header-username': data.username,
                'ref-code': currentRef // Menampilkan kode permanen
            };

            for (const [id, value] of Object.entries(uiElements)) {
                const el = document.getElementById(id);
                if (el) {
                    if (el.tagName === 'INPUT') el.value = value;
                    else el.textContent = value;
                }
            }

            if (typeof loadHistory === "function") loadHistory();
            if (typeof loadInbox === "function") loadInbox();
        }
    } catch (err) { 
        console.warn("Syncing..."); 
    }
}

/**
 * Proteksi Halaman
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
        syncNeonData();
        setInterval(syncNeonData, 5000);
    }
});

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
