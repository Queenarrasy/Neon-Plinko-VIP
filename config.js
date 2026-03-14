// --- CONFIGURATION SUPABASE ---
const SUPABASE_URL = "https://bgffnmwrviyqpeevzjsn.supabase.co";
const SUPABASE_KEY = "sb_publishable_jT5khcYa5J22ijGDjl9klA_qWkSuani"; 

// Inisialisasi Client Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- GLOBAL UTILITIES ---

// Ambil Username yang sedang login (Mendukung dua kunci cadangan)
function getUsername() {
    return localStorage.getItem('user_neon') || localStorage.getItem('username');
}

// 1. Cek apakah user sudah login
async function checkSession() {
    const user = getUsername();
    if (!user && !window.location.href.includes('index.html')) {
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

// 2. Format Mata Uang IDR (Menghasilkan format: IDR 10.000)
function formatIDR(amount) {
    return "IDR " + (amount || 0).toLocaleString('id-ID');
}

// 3. Update Saldo secara Visual (Sinkron dengan banyak ID)
async function updateUISaldo() {
    const user = getUsername();
    if (!user) return;

    try {
        const { data, error } = await _supabase
            .from('profiles')
            .select('saldo')
            .eq('username', user)
            .single();
            
        if (data) {
            const formatted = formatIDR(data.saldo);
            
            // Update semua kemungkinan ID elemen saldo yang Master pakai
            const saldoElements = ['display-saldo', 'saldo-text', 'profile-saldo', 'wd-saldo'];
            
            saldoElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    if (el.tagName === 'INPUT') el.value = formatted;
                    else el.textContent = formatted;
                }
            });

            // Simpan ke cache lokal
            localStorage.setItem('cached_saldo', data.saldo);
        }
    } catch (err) {
        console.error("Error updating saldo:", err);
    }
}

// 4. Logout Global
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// --- AUTO RUN ---
// Menjalankan update saldo otomatis saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    updateUISaldo();
    
    // Interval update otomatis setiap 5 detik agar jika admin Approve, 
    // saldo langsung berubah tanpa refresh.
    setInterval(updateUISaldo, 5000);
});
