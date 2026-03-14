// --- CONFIGURATION SUPABASE ---
const SUPABASE_URL = "https://bgffnmwrviyqpeevzjsn.supabase.co";
const SUPABASE_KEY = "sb_publishable_jT5khcYa5J22ijGDjl9klA_qWkSuani"; // Ini adalah Anon/Public Key Anda

// Inisialisasi Client Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- GLOBAL UTILITIES (Bisa dipakai di semua halaman) ---

// 1. Cek apakah user sudah login
function checkSession() {
    const user = localStorage.getItem('user_neon');
    if (!user && !window.location.href.includes('index.html')) {
        window.location.href = 'index.html';
    }
    return user;
}

// 2. Format Mata Uang IDR
function formatIDR(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// 3. Update Saldo secara Visual di UI
async function updateUISaldo() {
    const user = localStorage.getItem('user_neon');
    const displayEl = document.getElementById('display-saldo'); // Pastikan ID ini ada di HTML Anda
    
    if (user && displayEl) {
        const { data, error } = await _supabase
            .from('profiles')
            .select('saldo')
            .eq('username', user)
            .single();
            
        if (data) {
            displayEl.innerText = formatIDR(data.saldo);
            // Simpan cache saldo di localstorage untuk transisi halus
            localStorage.setItem('cached_saldo', data.saldo);
        }
    }
}

// 4. Logout Global
function logout() {
    localStorage.removeItem('user_neon');
    window.location.href = 'index.html';
}

// Auto-run session check saat file di-load
if (!window.location.href.includes('index.html')) {
    checkSession();
}
