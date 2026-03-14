/**
 * ============================================================
 * NEON PLINKO VIP — Global JS v6.0
 * KREDENSIAL: SUPABASE CLOUD
 * ============================================================
 */

// 1. INISIALISASI KONEKSI SUPABASE
const SB_URL = "https://bgffnmwrviyqpeevzjsn.supabase.co";
const SB_KEY = "sb_publishable_jT5khcYa5J22ijGDjl9klA_qWkSuani";
const _supabase = supabase.createClient(SB_URL, SB_KEY);

const API_CONFIG = {
    KURS_USDT: 16800,
    ADMIN_WA: "6289510249551",
    MIN_WD: 50000,
    MIN_DEPO: 10000
};

// 2. SESSION MANAGEMENT (UNIFIED)
const SESSION_KEY = 'user_neon';

/** Mengambil username dari session aktif */
function getUsername() {
    return localStorage.getItem(SESSION_KEY);
}

/** Proteksi Halaman: Redirect jika belum login */
async function requireLogin() {
    const user = getUsername();
    if (!user) {
        window.location.replace('index.html');
        return null;
    }
    return user;
}

/** Membersihkan session saat logout */
function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    // Hapus sisa-sisa key lama jika ada
    localStorage.removeItem('plinko_session');
    localStorage.removeItem('username');
}

// 3. PROFILE & BALANCE API
const ProfileAPI = {
    /** Sinkronisasi data dari Supabase ke UI secara Real-time */
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

    /** Mengupdate elemen teks di HTML secara otomatis berdasarkan ID */
    updateUI(data) {
        if (!data) return;
        
        const uiMap = {
            'display-username': data.username,
            'header-username': data.username,
            'display-saldo': formatIDR(data.saldo),
            'profile-saldo': formatIDR(data.saldo),
            'wd-saldo': formatIDR(data.saldo),
            'user-winrate': data.winrate + "%",
            'wd-fullname': data.nama_lengkap,
            'wd-bank': data.bank_name,
            'wd-rekening': data.rekening
        };

        for (const [id, value] of Object.entries(uiMap)) {
            const el = document.getElementById(id);
            if (el) {
                // Jika elemen berupa input, isi value-nya. Jika teks, isi textContent.
                if (el.tagName === 'INPUT') el.value = value;
                else el.textContent = value;
            }
        }
    }
};

// 4. TRANSACTION ENGINE
const TransaksiAPI = {
    /** Mengirim data permintaan Deposit */
    async submitDeposit(nominal, metode) {
        const user = getUsername();
        const { error } = await _supabase.from('deposits').insert([{
            username: user,
            nominal: parseInt(nominal),
            metode: metode,
            status: 'PROSES'
        }]);
        return { success: !error, message: error ? error.message : "Berhasil" };
    },

    /** Mengirim data permintaan Withdraw */
    async submitWithdraw(nominal) {
        const user = getUsername();
        const { error } = await _supabase.from('withdraws').insert([{
            username: user,
            nominal: parseInt(nominal),
            status: 'PROSES'
        }]);
        return { success: !error, message: error ? error.message : "Berhasil" };
    }
};

// 5. GAME ENGINE BRIDGE
const GameEngine = {
    /** Mencatat hasil permainan ke database */
    async recordPlay(bet, winAmount, newSaldo) {
        const user = getUsername();
        if (!user) return;

        const { error } = await _supabase
            .from('profiles')
            .update({ saldo: newSaldo })
            .eq('username', user);
            
        if (error) console.error("Gagal update saldo game:", error);
    }
};

// 6. UTILS
function formatIDR(num) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(num || 0);
}

function showToast(msg, type = "info") {
    // Implementasi sederhana menggunakan alert jika elemen toast tidak ada
    const toastEl = document.getElementById("toast");
    if (toastEl) {
        toastEl.innerText = msg;
        toastEl.className = "show";
        setTimeout(() => { toastEl.className = ""; }, 3000);
    } else {
        alert(msg);
    }
}

// 7. AUTO-INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
    const user = getUsername();
    if (user) {
        // Update status online
        await _supabase.from('profiles')
            .update({ last_active: new Date().toISOString() })
            .eq('username', user);
            
        // Jalankan sinkronisasi data awal
        ProfileAPI.sync();
    }
});

/** Fungsi Logout Global */
function apiLogout() {
    clearSession();
    window.location.replace('index.html');
}

// Alias untuk kompatibilitas file lama
const AuthAPI = { logout: apiLogout };
const UserSession = { 
    get username() { return getUsername(); },
    get saldo() { return 0; } // Saldo akan diupdate via ProfileAPI.sync()
};
