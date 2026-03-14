/**
 * ============================================================
 * NEON PLINKO VIP — Global JS v6.0
 * Unified Supabase & Session Management
 * ============================================================
 */

// 1. KONEKSI SUPABASE
const SB_URL = "URL_SUPABASE_ANDA"; // Ganti dengan URL Supabase Anda
const SB_KEY = "KEY_SUPABASE_ANDA"; // Ganti dengan Anon Key Supabase Anda
const _supabase = supabase.createClient(SB_URL, SB_KEY);

const API_CONFIG = {
    KURS_USDT: 16800,
    ADMIN_WA: "6289510249551",
    MIN_WD: 50000,
    MIN_DEPO: 10000
};

// 2. SESSION MANAGEMENT
const SESSION_KEY = 'user_neon'; // Konsisten dengan localStorage.getItem('user_neon')

// Fungsi mendapatkan username yang sedang login
function getUsername() {
    return localStorage.getItem(SESSION_KEY);
}

// Fungsi proteksi halaman (Redirect jika belum login)
async function requireLogin() {
    const user = getUsername();
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

// 3. CORE PROFILE API (SINKRONISASI DATA)
const ProfileAPI = {
    // Mengambil data terbaru dari Database Supabase
    async sync() {
        const username = getUsername();
        if (!username) return null;

        const { data, error } = await _supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();

        if (error) {
            console.error("Sync Error:", error);
            return null;
        }

        // Update UI secara otomatis jika elemen tersedia
        this.updateUI(data);
        return data;
    },

    updateUI(data) {
        if (!data) return;
        const elements = {
            'display-username': data.username,
            'display-saldo': "Rp " + data.saldo.toLocaleString('id-ID'),
            'profile-saldo': "Rp " + data.saldo.toLocaleString('id-ID'),
            'wd-saldo': "Rp " + data.saldo.toLocaleString('id-ID'),
            'user-winrate': data.winrate + "%",
            'profile-rekening': data.rekening,
            'profile-bank': data.bank_name
        };

        for (const [id, val] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        }
    }
};

// 4. TRANSACTION API
const TransaksiAPI = {
    // Kirim permintaan Deposit
    async deposit(username, nominal, metode) {
        const { error } = await _supabase.from('deposits').insert([{
            username: username,
            nominal: nominal,
            metode: metode,
            status: 'PROSES'
        }]);
        return { success: !error, error };
    },

    // Kirim permintaan Withdraw
    async withdraw(username, nominal) {
        const { error } = await _supabase.from('withdraws').insert([{
            username: username,
            nominal: nominal,
            status: 'PROSES'
        }]);
        return { success: !error, error };
    }
};

// 5. UTILS & FORMATTING
function formatIDR(num) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(num || 0);
}

// Alias untuk kemudahan pemanggilan
function showToast(msg, type = "info") {
    // Jika Anda punya fungsi toast di UI, panggil di sini
    alert(msg); // Default sementara
}

// 6. AUTO INIT SAAT HALAMAN DIMUAT
document.addEventListener('DOMContentLoaded', async () => {
    const user = getUsername();
    if (user) {
        // Update status Online di database
        await _supabase.from('profiles')
            .update({ last_active: new Date().toISOString() })
            .eq('username', user);
            
        // Jalankan sinkronisasi data profil
        ProfileAPI.sync();
    }
});

// 7. LOGOUT
function apiLogout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
}
