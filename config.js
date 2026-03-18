/**
 * ============================================================
 * OMEGA V18 — NEON PLINKO VIP
 * CENTRAL ENGINE v3.1
 * ============================================================
 * Tabel yang digunakan:
 * - profiles       (25+ columns)
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

function formatIDR(amount) {
    return "IDR " + Math.floor(amount || 0).toLocaleString('id-ID');
}

function formatRp(amount) {
    return "Rp " + Math.floor(amount || 0).toLocaleString('id-ID');
}

// ── 5. SYNC ENGINE ────────────────────────────────────────────

/**
 * syncNeonData — sinkronisasi saldo & referral ke semua elemen UI.
 *
 * PERBAIKAN v3.1:
 * - Support elemen di game.html (saldo-chip, saldo-val)
 * - Referral code dikunci permanen dari database
 * - Tidak reset state game yang sedang berjalan
 */
async function syncNeonData() {
    const user = getUsername();
    if (!user) return;

    try {
        const { data, error } = await _supabase
            .from('profiles')
            .select('saldo, referral_code, username, panic_mode')
            .eq('username', user)
            .single();

        if (!data || error) return;

        // Cache saldo
        localStorage.setItem('cached_saldo', data.saldo || 0);

        // ── KUNCI REFERRAL PERMANEN ──────────────────────────
        let currentRef = data.referral_code;
        if (!currentRef || currentRef.trim() === '') {
            let tempRef = localStorage.getItem('temp_ref_lock');
            if (!tempRef) {
                tempRef = 'NEON' + Math.random().toString(36).substring(2, 7).toUpperCase();
                localStorage.setItem('temp_ref_lock', tempRef);
            }
            await _supabase
                .from('profiles')
                .update({ referral_code: tempRef })
                .eq('username', user);
            currentRef = tempRef;
        } else {
            localStorage.removeItem('temp_ref_lock');
        }

        // ── UPDATE ELEMEN UI ─────────────────────────────────
        const saldoIDR = formatIDR(data.saldo);
        const saldoRp  = formatRp(data.saldo);

        // Map ID elemen → nilai
        const uiMap = {
            // Saldo — semua halaman
            'saldo-text'        : saldoIDR,
            'display-saldo'     : saldoIDR,
            'display-saldo-wd'  : saldoIDR,
            'profile-saldo'     : saldoIDR,
            'wd-saldo'          : saldoIDR,
            'saldo-val'         : saldoIDR,   // game.html

            // Username
            'display-username'  : (data.username || '').toUpperCase(),
            'header-username'   : (data.username || '').toUpperCase(),

            // Referral
            'ref-code'          : currentRef,
        };

        for (const [id, value] of Object.entries(uiMap)) {
            const el = document.getElementById(id);
            if (el) {
                if (el.tagName === 'INPUT') el.value  = value;
                else                        el.textContent = value;
            }
        }

        // Saldo chip di game.html (mengandung icon, jadi pakai innerHTML)
        const chip = document.getElementById('saldo-chip');
        if (chip) {
            chip.innerHTML = '<i class="fas fa-coins" style="margin-right:5px;font-size:10px;"></i>'
                           + saldoIDR;
        }

        // Panic bar di game.html
        const panicBar = document.getElementById('panic-bar');
        if (panicBar) {
            panicBar.style.display = data.panic_mode ? 'block' : 'none';
        }

    } catch (err) {
        console.warn('[syncNeonData]', err?.message || err);
    }
}

// ── 6. PROTEKSI HALAMAN ───────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const user        = getUsername();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const publicPages = ['index.html', 'login.html', 'register.html', ''];

    if (!publicPages.includes(currentPage) && !user) {
        window.location.href = 'index.html';
        return;
    }

    if (user) {
        // Sync segera
        syncNeonData();
        // Sync tiap 8 detik (lebih jarang agar tidak konflik dengan realtime di game.html)
        setInterval(syncNeonData, 8000);
    }
});

// ── 7. SYSTEM CONFIG HELPERS ──────────────────────────────────

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

async function setSystemConfig(key, value) {
    try {
        await _supabase
            .from('system_config')
            .upsert({ key, value }, { onConflict: 'key' });
    } catch (err) {
        console.error('[setSystemConfig]', err);
    }
}

// ── 8. NEON ALERT GLOBAL ─────────────────────────────────────

/**
 * Alert neon standar — bisa dipanggil dari halaman mana saja
 * type: ''   = pink/merah (error/info)
 *       'ok' = hijau/biru (sukses)
 */
function showNeonAlertGlobal(msg, type = '') {
    const a = document.getElementById('neon-alert');
    if (!a) return;
    a.innerText = msg;
    a.className = type === 'ok' ? 'show success' : 'show';
    setTimeout(() => { a.className = ''; }, 3500);
}
