/**
 * ============================================================
 * OMEGA V18 — NEON PLINKO VIP
 * CENTRAL ENGINE v3.0
 * ============================================================
 * Tabel yang digunakan:
 * - profiles       (25 columns)
 * - deposits       (7 columns)
 * - withdrawals    (7 columns)
 * - inbox          (6 columns)
 * - system_config  (3 columns)
 * ============================================================
 */

// ── 1. INISIALISASI SUPABASE ──────────────────────────────────
const SUPABASE_URL = "https://bgffnmwrviyqpeevzjsn.supabase.co";
const SUPABASE_KEY = "sb_publishable_jT5khcYa5J22ijGDjl9klA_qWkSuani";
const _supabase    = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Alias agar semua halaman bisa pakai _supabase atau _db
const _db = _supabase;

// ── 2. KONFIGURASI GLOBAL ─────────────────────────────────────
const NEON_CONFIG = {
    KURS_USDT : 16800,
    MIN_DEPO  : 20000,
    MIN_WD    : 50000,
    FEE_USDT  : 2
};

// ── 3. AUTH HELPERS ───────────────────────────────────────────

/**
 * Ambil username dari localStorage (multi-key support)
 */
function getUsername() {
    return localStorage.getItem('neon_user')
        || localStorage.getItem('user_session')
        || localStorage.getItem('user_neon')
        || localStorage.getItem('username')
        || null;
}

/**
 * Cek apakah user sudah login
 */
function isLoggedIn() {
    return !!getUsername();
}

/**
 * Logout: bersihkan semua storage dan kembali ke login
 */
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// ── 4. FORMAT HELPERS ─────────────────────────────────────────

/**
 * Format angka ke IDR
 * Contoh: 1500000 → "IDR 1.500.000"
 */
function formatIDR(amount) {
    return "IDR " + Math.floor(amount || 0).toLocaleString('id-ID');
}

/**
 * Format angka ke Rupiah singkat
 * Contoh: 1500000 → "Rp 1.500.000"
 */
function formatRp(amount) {
    return "Rp " + Math.floor(amount || 0).toLocaleString('id-ID');
}

// ── 5. SYNC ENGINE (INTI) ─────────────────────────────────────

/**
 * Sinkronisasi data user ke semua elemen UI di halaman aktif.
 * Dipanggil otomatis setiap 5 detik dan saat halaman load.
 * 
 * FIX UTAMA:
 * - Referral code dikunci permanen dari database
 * - Tidak akan berubah selama user tidak dihapus
 * - Support semua element ID yang dipakai di semua halaman
 */
async function syncNeonData() {
    const user = getUsername();
    if (!user) return;

    try {
        const { data, error } = await _supabase
            .from('profiles')
            .select('*')
            .eq('username', user)
            .single();

        if (!data || error) return;

        // Simpan saldo ke cache lokal
        localStorage.setItem('cached_saldo', data.saldo || 0);

        // ── KUNCI REFERRAL PERMANEN ──────────────────────────
        let currentRef = data.referral_code;

        if (!currentRef || currentRef.trim() === '') {
            // Cek kunci sementara di localStorage dulu
            let tempRef = localStorage.getItem('temp_ref_lock');
            if (!tempRef) {
                tempRef = 'NEON' + Math.random().toString(36).substring(2, 7).toUpperCase();
                localStorage.setItem('temp_ref_lock', tempRef);
            }
            // Simpan permanen ke database
            await _supabase
                .from('profiles')
                .update({ referral_code: tempRef })
                .eq('username', user);
            currentRef = tempRef;
        } else {
            // Sudah ada di DB → hapus kunci sementara
            localStorage.removeItem('temp_ref_lock');
        }

        // ── UPDATE SEMUA ELEMEN UI ───────────────────────────
        const saldoFormatted = formatIDR(data.saldo);
        const saldoFormatted2 = formatRp(data.saldo);

        // Mapping: id elemen → nilai
        const uiMap = {
            // Saldo (berbagai ID yang dipakai di tiap halaman)
            'saldo-text'         : saldoFormatted,
            'display-saldo'      : saldoFormatted,
            'display-saldo-wd'   : saldoFormatted,
            'profile-saldo'      : saldoFormatted,
            'wd-saldo'           : saldoFormatted,

            // Username
            'display-username'   : (data.username || '').toUpperCase(),
            'header-username'    : (data.username || '').toUpperCase(),

            // Referral (PERMANEN dari DB)
            'ref-code'           : currentRef,
        };

        for (const [id, value] of Object.entries(uiMap)) {
            const el = document.getElementById(id);
            if (el) {
                if (el.tagName === 'INPUT') el.value = value;
                else el.textContent = value;
            }
        }

        // ── TRIGGER FUNGSI TAMBAHAN JIKA ADA ────────────────
        if (typeof loadHistory  === 'function') loadHistory();
        if (typeof loadInbox    === 'function') loadInbox();
        if (typeof refreshUI    === 'function') refreshUI();

    } catch (err) {
        // Silent fail — tidak tampilkan error ke user
        console.warn('[syncNeonData] Warning:', err?.message || err);
    }
}

// ── 6. PROTEKSI HALAMAN ───────────────────────────────────────

/**
 * Proteksi halaman:
 * - Halaman publik (index.html, login.html): boleh diakses tanpa login
 * - Halaman lain: redirect ke index.html jika belum login
 */
document.addEventListener('DOMContentLoaded', () => {
    const user        = getUsername();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const publicPages = ['index.html', 'login.html', 'register.html', ''];

    // Jika bukan halaman publik dan belum login → redirect
    if (!publicPages.includes(currentPage) && !user) {
        window.location.href = 'index.html';
        return;
    }

    // Jika sudah login → sync data & mulai interval
    if (user) {
        syncNeonData();
        setInterval(syncNeonData, 5000);
    }
});

// ── 7. SYSTEM CONFIG HELPER ───────────────────────────────────

/**
 * Ambil konfigurasi sistem dari tabel system_config
 * Contoh: getSystemConfig('maintenance_mode')
 */
async function getSystemConfig(key) {
    try {
        const { data } = await _supabase
            .from('system_config')
            .select('value')
            .eq('key', key)
            .single();
        return data?.value || null;
    } catch {
        return null;
    }
}

/**
 * Simpan konfigurasi sistem ke tabel system_config
 */
async function setSystemConfig(key, value) {
    try {
        await _supabase
            .from('system_config')
            .upsert({ key, value }, { onConflict: 'key' });
    } catch (err) {
        console.error('[setSystemConfig] Error:', err);
    }
}

// ── 8. NEON ALERT HELPER ─────────────────────────────────────

/**
 * Tampilkan alert neon standar OMEGA V18
 * Bisa dipanggil dari halaman mana saja
 * type: '' = pink (error/info), 'ok' = biru (sukses)
 */
function showNeonAlertGlobal(msg, type = '') {
    const a = document.getElementById('neon-alert');
    if (!a) return;
    a.innerText = msg;
    a.className = type === 'ok' ? 'show success' : 'show';
    setTimeout(() => { a.className = ''; }, 3500);
}
