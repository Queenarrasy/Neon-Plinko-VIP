/**
 * ============================================================
 * OMEGA V18 — NEON PLINKO VIP
 * CENTRAL ENGINE v3.3 — MULTI-DEVICE SESSION FIX
 * ============================================================
 * Supabase Project : jcxgankdwfwfnbwlkkpz
 * Tables           : profiles, deposits, withdrawals, inbox, system_config
 * ============================================================
 *
 * FITUR SESSION SATU DEVICE:
 * - Saat login di index.html → update session_token di DB
 *   ke token unik device ini (disimpan di localStorage)
 * - syncNeonData() membandingkan token localStorage dengan DB
 * - Jika berbeda (login dari device lain) → auto logout
 * - Ini memastikan hanya 1 device aktif per akun setiap saat
 * ============================================================
 */

// ── 1. INISIALISASI SUPABASE ──────────────────────────────────
const SUPABASE_URL = "https://jcxgankdwfwfnbwlkkpz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjeGdhbmtkd2Z3Zm5id2xra3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNDU0MjMsImV4cCI6MjA5MDgyMTQyM30.qBNQNZxeHLfG7U-HZDSkYg1Y4awPKcJ7J2XjnkiJ6PI";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const _db = _supabase;

// ── 2. KONFIGURASI GLOBAL ─────────────────────────────────────
const NEON_CONFIG = {
    KURS_USDT : 16800,
    MIN_DEPO  : 20000,
    MIN_WD    : 50000,
    FEE_USDT  : 2
};

// ── 3. AUTH HELPERS ───────────────────────────────────────────

function getUsername() {
    return localStorage.getItem('neon_user')
        || localStorage.getItem('user_session')
        || localStorage.getItem('user_neon')
        || localStorage.getItem('username')
        || null;
}

function isLoggedIn() {
    return !!getUsername();
}

/**
 * Ambil session token device ini dari localStorage.
 * Token dibuat saat login dan disimpan di localStorage.
 */
function getLocalToken() {
    return localStorage.getItem('neon_session_token') || null;
}

/**
 * Logout: bersihkan semua storage dan redirect ke login
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

let _syncRunning = false;

async function syncNeonData() {
    if (_syncRunning) return;
    _syncRunning = true;
    const user = getUsername();
    if (!user) { _syncRunning = false; return; }

    try {
        const { data, error } = await _supabase
            .from('profiles')
            .select('saldo, referral_code, username, panic_mode, session_token, last_session_id')
            .eq('username', user)
            .single();

        if (!data || error) return;

        // ── CEK SESSION TOKEN (1 LOGIN PER DEVICE) ───────────
        // Bandingkan token yang tersimpan di localStorage
        // dengan token di DB. Jika beda → ada login baru
        // dari device lain → paksa logout device ini.
        const localToken  = getLocalToken();
        const dbToken     = data.session_token || data.last_session_id || null;

        // Hanya cek jika keduanya ada (skip jika token belum pernah diset)
        if (localToken && dbToken && localToken !== dbToken) {
            // Token tidak cocok → device ini sudah di-logout oleh login baru
            localStorage.clear();
            window.location.href = 'index.html';
            return;
        }

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

        const uiMap = {
            'saldo-text'       : saldoIDR,
            'display-saldo'    : saldoIDR,
            'display-saldo-wd' : saldoIDR,
            'profile-saldo'    : saldoIDR,
            'wd-saldo'         : saldoIDR,
            'saldo-val'        : saldoIDR,
            'display-username' : (data.username || '').toUpperCase(),
            'header-username'  : (data.username || '').toUpperCase(),
            'ref-code'         : currentRef,
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
            chip.innerHTML = '<i class="fas fa-coins" style="margin-right:5px;font-size:10px;"></i>' + saldoIDR;
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

    const publicPages = ['index.html', 'login.html', 'register.html', ''];

    const adminPages = [
        'master_panel.html',
        'master_panel__2_.html',
        'm.html',
        'admin.html',
        'panel.html'
    ];

    const isAdminPage = adminPages.some(p => currentPage === p);

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

function showNeonAlertGlobal(msg, type = '') {
    const a = document.getElementById('neon-alert');
    if (!a) return;
    a.innerText = msg;
    a.className = type === 'ok' ? 'show success' : 'show';
    setTimeout(() => { a.className = ''; }, 3500);
}
