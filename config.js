// --- CONFIGURATION SUPABASE ---
const SUPABASE_URL = "https://bgffnmwrviyqpeevzjsn.supabase.co";
const SUPABASE_KEY = "sb_publishable_jT5khcYa5J22ijGDjl9klA_qWkSuani"; 

// Inisialisasi Client Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- GLOBAL UTILITIES ---

// Ambil Username yang sedang login
function getUsername() {
    return localStorage.getItem('user_neon');
}

// 1. Cek apakah user sudah login & arahkan sesuai role jika di index
async function checkSession() {
    const user = getUsername();
    
    // Jika tidak ada user dan bukan di halaman login, lempar ke login
    if (!user && !window.location.href.includes('index.html')) {
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

// 2. Format Mata Uang IDR
function formatIDR(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount || 0).replace("Rp", "IDR");
}

// 3. Update Saldo secara Visual
async function updateUISaldo() {
    const user = getUsername();
    const displayEl = document.getElementById('display-saldo');
    
    if (user && displayEl) {
        const { data } = await _supabase
            .from('profiles')
            .select('saldo')
            .eq('username', user)
            .single();
            
        if (data) {
            displayEl.innerText = formatIDR(data.saldo);
            localStorage.setItem('cached_saldo', data.saldo);
        }
    }
}

// 4. Logout Global
function logout() {
    localStorage.clear(); // Bersihkan semua sesi
    window.location.href = 'index.html';
}
