/**
 * ============================================================
 * NEON PLINKO VIP — Global JS v6.1 (REVISED)
 * KREDENSIAL: SUPABASE CLOUD
 * ============================================================
 */

// 1. INISIALISASI KONEKSI SUPABASE
const SB_URL = "https://bgffnmwrviyqpeevzjsn.supabase.co";
const SB_KEY = "sb_publishable_jT5khcYa5J22ijGDjl9klA_qWkSuani"; // Pastikan API Key ini benar
const _supabase = supabase.createClient(SB_URL, SB_KEY);

const API_CONFIG = {
    KURS_USDT: 16800,
    ADMIN_WA: "6289510249551",
    MIN_WD: 50000,
    MIN_DEPO: 20000
};

// 2. SESSION MANAGEMENT
const SESSION_KEY = 'user_neon';

function getUsername() {
    return localStorage.getItem(SESSION_KEY) || localStorage.getItem('username');
}

async function requireLogin() {
    const user = getUsername();
    if (!user) {
        window.location.replace('index.html');
        return null;
    }
    return user;
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('username');
    localStorage.removeItem('plinko_session');
}

// 3. PROFILE & BALANCE API
const ProfileAPI = {
    async sync() {
        const username = getUsername();
        if (!username) return null;

        try {
            const { data, error } = await _supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .single();

            if (error) throw error;

            if (data) {
                this.updateUI(data);
                return data;
            }
        } catch (err) {
            console.error("Gagal sinkronisasi profil:", err.message);
            return null;
        }
    },

    updateUI(data) {
        if (!data) return;
        
        // Pemetaan ID elemen HTML yang akan diupdate otomatis
        const uiMap = {
            'display-username': data.username,
            'header-username': data.username,
            'saldo-text': "IDR " + (data.saldo || 0).toLocaleString('id-ID'),
            'display-saldo': "IDR " + (data.saldo || 0).toLocaleString('id-ID'),
            'profile-saldo': "IDR " + (data.saldo || 0).toLocaleString('id-ID'),
            'user-winrate': (data.winrate || 50) + "%"
        };

        for (const [id, value] of Object.entries(uiMap)) {
            const el = document.getElementById(id);
            if (el) {
                if (el.tagName === 'INPUT') el.value = value;
                else el.textContent = value;
            }
        }
    }
};

// 4. TRANSACTION ENGINE (Sesuai dengan kolom di Database)
const TransaksiAPI = {
    async submitDeposit(amount, method, netReceive) {
        const user = getUsername();
        const { error } = await _supabase.from('deposits').insert([{
            username: user,
            amount: parseFloat(amount),
            method: method,
            net_receive: parseFloat(netReceive),
            status: 'PROSES'
        }]);
        return { success: !error, message: error ? error.message : "Berhasil" };
    },

    async submitWithdraw(amount) {
        const user = getUsername();
        const { error } = await _supabase.from('withdrawals').insert([{
            username: user,
            amount: parseFloat(amount),
            status: 'PROSES'
        }]);
        return { success: !error, message: error ? error.message : "Berhasil" };
    }
};

// 5. UTILS
function formatIDR(num) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(num || 0);
}

// 6. AUTO-INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
    const user = getUsername();
    if (user) {
        // Update aktivitas terakhir
        await _supabase.from('profiles')
            .update({ last_active: new Date().toISOString() })
            .eq('username', user);
            
        // Sinkronisasi data awal
        ProfileAPI.sync();

        // Loop sinkronisasi tiap 5 detik (Agar saldo sinkron saat Admin Approve)
        setInterval(() => {
            ProfileAPI.sync();
        }, 5000);
    }
});

/** Fungsi Logout Global */
function apiLogout() {
    clearSession();
    window.location.replace('index.html');
}

// Alias untuk kompatibilitas
const AuthAPI = { logout: apiLogout };
