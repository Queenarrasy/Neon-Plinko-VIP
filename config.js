/**
 * ============================================================
 * OMEGA V18 — NEON PLINKO VIP
 * CENTRAL ENGINE v3.5 — STABLE SESSION & DATABASE FIX
 * ============================================================
 * Perbaikan: Deteksi Username Akurat & Penanganan Error JSON
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

/**
 * Ambil username dengan prioritas tinggi pada session aktif.
 * Memastikan 'sapi22' terdeteksi dengan benar dan membersihkan data sampah.
 */
function getUsername() {
    // Key prioritas untuk memastikan user yang benar (sapi22) yang terbaca
    const priorityKeys = ['neon_user', 'user_session', 'username'];
    
    for (const key of priorityKeys) {
        const val = localStorage.getItem(key);
        if (val && val.trim().length > 0) {
            let cleanVal = val.trim();
            // Jika tersimpan sebagai string JSON, bersihkan tanda kutipnya
            if (cleanVal.startsWith('"') && cleanVal.endsWith('"')) {
                cleanVal = cleanVal.slice(1, -1);
            }
            return cleanVal;
        }
    }
    return null;
}

function isLoggedIn() {
    return !!getUsername();
}

function getLocalToken() {
    return localStorage.getItem('neon_session_token') || null;
}

/**
 * Logout: Bersihkan semua data untuk mencegah akun tertukar (seperti temanbakwan)
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
        // PERBAIKAN: Gunakan maybeSingle() untuk menghindari error "single JSON object"
        // jika data tidak ditemukan atau ada konflik di database.
        const { data, error } = await _supabase
            .from('profiles')
            .select('*')
            .eq('username', user)
            .maybeSingle();

        if (error) {
            console.error('[Sync Error]', error.message);
            _syncRunning = false; 
            return;
        }

        // Jika data user (sapi22) belum ada di DB, stop sync agar tidak error
        if (!data) {
            _syncRunning = false;
            return;
        }

        // ── CEK SESSION TOKEN (PROTEKSI MULTI-DEVICE) ───────────
        const localToken  = getLocalToken();
        const dbToken     = data.session_token || data.last_session_id || null;

        if (localToken && dbToken && localToken !== dbToken) {
            // Jika token di browser berbeda dengan di DB, artinya ada login di device lain
            localStorage.clear();
            window.location.href = 'index.html';
            return;
        }

        // Simpan saldo ke cache untuk kebutuhan game tanpa delay
        localStorage.setItem('cached_saldo', data.saldo || 0);

        // ── KUNCI REFERRAL ───────────────────────────────────
        let currentRef = data.referral_code;
        if (!currentRef || currentRef.trim() === '') {
            let tempRef = 'NEON' + Math.random().toString(36).substring(2, 7).toUpperCase();
            await _supabase.from('profiles').update({ referral_code: tempRef }).eq('username', user);
            currentRef = tempRef;
        }

        // ── UPDATE SEMUA ELEMEN UI OTOMATIS ────────────────────
        const saldoFormatted = formatIDR(data.saldo);
        const upperUser = (data.username || '').toUpperCase();

        const uiMap = {
            'saldo-text'       : saldoFormatted,
            'display-saldo'    : saldoFormatted,
            'display-saldo-wd' : saldoFormatted,
            'profile-saldo'    : saldoFormatted,
            'wd-saldo'         : saldoFormatted,
            'saldo-val'        : saldoFormatted,
            'u-saldo'          : saldoFormatted,
            'display-username' : upperUser,
            'header-username'  : upperUser,
            'u-name'           : upperUser,
            'ref-code'         : currentRef,
            'u-ref'            : currentRef
        };

        for (const [id, value] of Object.entries(uiMap)) {
            const el = document.getElementById(id);
            if (el) {
                if (el.tagName === 'INPUT') el.value = value;
                else el.textContent = value;
            }
        }

        // Update saldo di game (jika ada elemen saldo-chip)
        const chip = document.getElementById('saldo-chip');
        if (chip) {
            chip.innerHTML = '<i class="fas fa-coins" style="margin-right:5px;font-size:10px;"></i>' + saldoFormatted;
        }

        // Panic Mode Bar
        const panicBar = document.getElementById('panic-bar');
        if (panicBar) {
            panicBar.style.display = data.panic_mode ? 'block' : 'none';
        }

    } catch (err) {
        console.warn('[syncNeonData Exception]', err);
    } finally {
        _syncRunning = false;
    }
}

// ── 6. PROTEKSI HALAMAN ───────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const user = getUsername();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    const publicPages = ['index.html', 'login.html', 'register.html', ''];
    const adminPages = ['master_panel.html', 'm.html', 'admin.html', 'panel.html'];
    const selfAuthPages = ['reward.html', 'reward__3_.html'];

    const isPublic = publicPages.includes(currentPage);
    const isAdmin = adminPages.some(p => currentPage === p);
    const isSelfAuth = selfAuthPages.some(p => currentPage === p);

    // Jika bukan halaman publik/admin/self-auth dan belum login -> lempar ke login
    if (!isPublic && !isAdmin && !isSelfAuth && !user) {
        window.location.href = 'index.html';
        return;
    }

    // Jika sudah login, jalankan sinkronisasi berkala (setiap 10 detik agar tidak berat)
    if (user) {
        syncNeonData();
        setInterval(syncNeonData, 10000);
        // Update IP/device ke database saat halaman game/profil dibuka
        if (!isPublic && !isAdmin) {
            updateIPOnSession();
        }
    }
});

// ── 7. SYSTEM CONFIG HELPERS ──────────────────────────────────

async function getSystemConfig(key) {
    try {
        const { data } = await _supabase
            .from('system_config')
            .select('value')
            .eq('key', key)
            .maybeSingle(); // Gunakan maybeSingle agar lebih aman
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
        console.error('[setSystemConfig Error]', err);
    }
}

// ── 8. IP UPDATE SAAT GAME ───────────────────────────────────
// Dipanggil sekali saat game.html load — update IP terkini ke db

async function updateIPOnSession() {
    const user = getUsername();
    if(!user) return;
    try {
        // Ambil IP via ipapi.co dengan timeout
        let ipInfo = { ip: null, country: null, city: null, isp: null };
        try {
            const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
            const d = await r.json();
            ipInfo = { ip: d.ip||null, country: d.country_name||null, city: d.city||null, isp: d.org||null };
        } catch(e1) {
            try {
                const r2 = await fetch('https://ipinfo.io/json', { signal: AbortSignal.timeout(5000) });
                const d2 = await r2.json();
                ipInfo = { ip: d2.ip||null, country: d2.country||null, city: d2.city||null, isp: d2.org||null };
            } catch(e2) { /* fallback gagal — tetap jalan tanpa IP */ }
        }
        // Fingerprint device
        const fp = [navigator.userAgent,navigator.language,screen.width+'x'+screen.height,screen.colorDepth,new Date().getTimezoneOffset(),navigator.hardwareConcurrency||'',navigator.platform||''].join('|');
        let h=0; for(let i=0;i<fp.length;i++){h=Math.imul(31,h)+fp.charCodeAt(i)|0;}
        const deviceId = 'D'+Math.abs(h).toString(36).toUpperCase().padStart(8,'0');

        // Simpan ke localStorage
        localStorage.setItem('neon_device_id', deviceId);
        if(ipInfo.ip) localStorage.setItem('neon_last_ip', ipInfo.ip);

        // Log event SESSION ke ip_logs
        const logRow = {
            username: user, event_type: 'SESSION',
            ip_address: ipInfo.ip, device_id: deviceId,
            user_agent: navigator.userAgent,
            screen_res: screen.width+'x'+screen.height,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            platform: navigator.platform||navigator.userAgentData?.platform||'web',
            ip_country: ipInfo.country, ip_city: ipInfo.city, ip_isp: ipInfo.isp
        };
        await _supabase.from('ip_logs').insert([logRow]);

        // Update kolom IP di profiles
        await _supabase.from('profiles').update({
            last_ip: ipInfo.ip, last_device_id: deviceId,
            last_user_agent: navigator.userAgent,
            last_seen: new Date().toISOString(),
            ip_country: ipInfo.country, ip_city: ipInfo.city, ip_isp: ipInfo.isp
        }).eq('username', user);

    } catch(e) { console.warn('[updateIPOnSession]', e); }
}

// ── 8. NEON ALERT GLOBAL ─────────────────────────────────────

function showNeonAlertGlobal(msg, type = '') {
    const a = document.getElementById('neon-alert');
    if (!a) return;
    a.innerText = msg;
    a.className = type === 'ok' ? 'show success' : 'show';
    setTimeout(() => { a.className = ''; }, 3500);
}
