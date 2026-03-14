/**
 * ============================================================
 * NEON PLINKO VIP — Pusat Konfigurasi & Sinkronisasi
 * ============================================================
 */

// 1. KREDENSIAL SUPABASE
const SUPABASE_URL = "https://bgffnmwrviyqpeevzjsn.supabase.co";
const SUPABASE_KEY = "sb_publishable_jT5khcYa5J22ijGDjl9klA_qWkSuani"; 

// Inisialisasi Client
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. FUNGSI AMBIL USERNAME (Multi-Session Support)
function getUsername() {
    // Mengecek semua kemungkinan key yang mungkin tersimpan
    return localStorage.getItem('user_neon') || 
           localStorage.getItem('username') || 
           localStorage.getItem('plinko_session');
}

// 3. FORMAT MATA UANG
function formatIDR(amount) {
    if (amount === undefined || amount === null) return "IDR 0";
    return "IDR " + Math.floor(amount).toLocaleString('id-ID');
}

// 4. ENGINE SINKRONISASI SALDO (Hati & Jantung Sistem)
async function updateUISaldo() {
    const user = getUsername();
    if (!user) return;

    try {
        // Ambil data terbaru dari tabel profiles
        const { data, error } = await _supabase
            .from('profiles')
            .select('saldo, winrate, nama_lengkap')
            .eq('username', user)
            .single();
            
        if (error) throw error;

        if (data) {
            const formattedBalance = formatIDR(data.saldo);
            
            // DAFTAR ID ELEMEN YANG AKAN DIISI OTOMATIS
            const uiMap = {
                'saldo-text': formattedBalance,      // Dipakai di game.html
                'display-saldo': formattedBalance,   // Dipakai di navbar/header
                'profile-saldo': formattedBalance,   // Dipakai di profil
                'wd-saldo': formattedBalance,        // Dipakai di withdraw.html
                'header-username': user,             // Nama user di header
                'display-username': user             // Nama user di profil
            };

            // Proses Pengisian ke HTML
            for (const [id, value] of Object.entries(uiMap)) {
                const el = document.getElementById(id);
                if (el) {
                    if (el.tagName === 'INPUT') {
                        el.value = value;
                    } else {
                        el.textContent = value;
                    }
                }
            }

            // Simpan ke cache untuk keperluan game engine
            localStorage.setItem('cached_saldo', data.saldo);
        }
    } catch (err) {
        console.error("Sinkronisasi Gagal:", err.message);
    }
}

// 5. AUTO-START & REAL-TIME UPDATE
document.addEventListener('DOMContentLoaded', () => {
    // Jalankan sekali saat start
    updateUISaldo();
    
    // CEK SESI: Jika di halaman game tapi tidak ada user, tendang ke login
    const user = getUsername();
    const isLoginPage = window.location.href.includes('index.html');
    if (!user && !isLoginPage) {
        window.location.href = 'index.html';
    }

    // UPDATE OTOMATIS TIAP 3 DETIK
    // Agar saat Admin klik "Approve" di Master Panel, 
    // saldo di layar pemain langsung berubah tanpa refresh.
    setInterval(updateUISaldo, 3000);
});

// 6. LOGOUT GLOBAL
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
