/**
 * ============================================================
 * OMEGA V18 — NEON PLINKO VIP
 * CENTRAL ENGINE v3.2 — FIXED
 * ============================================================
 * Supabase Project : jcxgankdwfwfnbwlkkpz
 * Tables           : profiles, deposits, withdrawals, inbox, system_config
 * ============================================================
 */

// ── 1. INISIALISASI SUPABASE ──────────────────────────────────
const SUPABASE_URL = "https://jcxgankdwfwfnbwlkkpz.supabase.co";

// ⚠️ GANTI KEY INI:
// Buka supabase.com → Project → Settings → API → salin "anon public" key (diawali eyJ...)
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjeGdhbmtkd2Z3Zm5id2xra3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNDU0MjMsImV4cCI6MjA5MDgyMTQyM30.qBNQNZxeHLfG7U-HZDSkYg1Y4awPKcJ7J2XjnkiJ6PI";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

let _syncRunning = false; // lock agar syncNeonData tidak jalan double

/**
 * syncNeonData — sinkronisasi saldo & referral ke semua elemen UI.
 */
async function syncNeonData() {
    if(_syncRunning) return; // skip jika sedang berjalan
    _syncRunning = true;
    const user = getUsername();
    if (!user) { _syncRunning = false; return; }

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

        const uiMap = {
            'saldo-text'        : saldoIDR,
            'display-saldo'     : saldoIDR,
            'display-saldo-wd'  : saldoIDR,
            'profile-saldo'     : saldoIDR,
            'wd-saldo'          : saldoIDR,
            'saldo-val'         : saldoIDR,
            'display-username'  : (data.username || '').toUpperCase(),
            'header-username'   : (data.username || '').toUpperCase(),
            'ref-code'          : currentRef,
        };

        for (const [id, value] of Object.entries(uiMap)) {
            const el = document.getElementById(id);
            if (el) {
                if (el.tagName === 'INPUT') el.value = value;
                else                        el.textContent = value;
            }
        }

        // Saldo chip di game.html
        const chip = document.getElementById('saldo-chip');
        if (chip) {
            chip.innerHTML = '<i class="fas fa-coins" style="margin-right:5px;font-size:10px;"></i>'
                           + saldoIDR;
        }

        // Panic bar
        const panicBar = document.getElementById('panic-bar');
        if (panicBar) {
            panicBar.style.display = data.panic_mode ? 'block' : 'none';
        }

    } catch (err) {
        console.warn('[syncNeonData]', err?.message || err);
    } finally {
        _syncRunning = false;
    }
}

// ── 6. PROTEKSI HALAMAN ───────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const user        = getUsername();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Halaman yang bebas diakses tanpa login (player)
    const publicPages = [
        'index.html',
        'login.html',
        'register.html',
        ''
    ];

    // ✅ FIX: Halaman admin TIDAK perlu login sebagai player
    // Tambahkan nama file panel admin kamu di sini
    const adminPages = [
        'master_panel.html',
        'master_panel__2_.html',
        'm.html',
        'admin.html',
        'panel.html'
    ];

    const isAdminPage = adminPages.some(p => currentPage === p);

    // Jika bukan halaman publik dan bukan halaman admin dan belum login → redirect
    if (!publicPages.includes(currentPage) && !isAdminPage && !user) {
        window.location.href = 'index.html';
        return;
    }

    if (user) {
        syncNeonData();
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
 * type: ''   = pink/merah (error/info)
 *       'ok' = biru/sukses
 */
function showNeonAlertGlobal(msg, type = '') {
    const a = document.getElementById('neon-alert');
    if (!a) return;
    a.innerText = msg;
    a.className = type === 'ok' ? 'show success' : 'show';
    setTimeout(() => { a.className = ''; }, 3500);
}
