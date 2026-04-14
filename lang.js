/**
 * ============================================================
 * NEON PLINKO VIP — LANGUAGE ENGINE v1.0
 * Supports: Indonesian (ID) | English (EN)
 * ============================================================
 * Usage: Add data-lang="key" to any element.
 * Call applyLang() after DOM ready.
 * ============================================================
 */

const LANG_DATA = {
    id: {
        // ── NAV BAR ──
        nav_play      : "PLAY",
        nav_depo      : "DEPO",
        nav_wd        : "WD",
        nav_reward    : "REWARD",
        nav_profil    : "PROFIL",

        // ── INDEX PAGE ──
        tab_login     : "LOGIN",
        tab_daftar    : "DAFTAR",
        btn_auth      : "DAFTAR/LOGIN",
        btn_create    : "BUAT AKUN VIP",
        ph_username   : "USERNAME",
        ph_password   : "PASSWORD",
        ph_pass_min   : "PASSWORD (MIN 6 KARAKTER)",
        ph_nama       : "NAMA LENGKAP",
        ph_whatsapp   : "NOMOR WHATSAPP",
        ph_bank_pick  : "PILIH BANK / DOMPET",
        ph_norek      : "NOMOR REKENING",
        ph_ref        : "KODE REFERAL (OPSIONAL)",
        lbl_bank_lain : "LAINNYA...",
        btn_contact   : "HUBUNGI ADMIN",
        err_fill_all  : "HARAP ISI SEMUA KOLOM!",
        err_access    : "AKSES DITOLAK! USERNAME/PASSWORD SALAH.",
        err_incomplete: "DATA TIDAK LENGKAP!",
        ok_created    : "✅ AKUN VIP BERHASIL DIBUAT!",
        load_init     : "INISIALISASI...",
        load_by       : "BY AR.GAMING..",
        load_loading  : "MEMUAT..",
        load_done     : "SELESAI",
        btn_continue  : "LANJUTKAN",

        // ── GAME PAGE ──
        lbl_saldo     : "SALDO",
        lbl_bet       : "BET",
        lbl_bola      : "BOLA",
        btn_drop      : "JATUHKAN",
        btn_auto      : "OTOMATIS",
        btn_stop      : "BERHENTI",
        lbl_history   : "RIWAYAT",
        lbl_stats     : "STATISTIK",
        lbl_win       : "MENANG",
        lbl_lose      : "KALAH",
        lbl_profit    : "KEUNTUNGAN",
        lbl_total_bet : "TOTAL BET",
        lbl_rtp       : "RTP",
        lbl_rows      : "BARIS",
        lbl_risk      : "RISIKO",
        risk_low      : "RENDAH",
        risk_med      : "SEDANG",
        risk_high     : "TINGGI",
        lbl_multiplier: "MULTIPLIER",
        lbl_jackpot   : "JACKPOT",
        lbl_result    : "HASIL",
        err_min_bet   : "BET MINIMUM",
        err_saldo_low : "SALDO TIDAK CUKUP!",
        err_auto_stop : "AUTO STOP — SALDO HABIS",
        lbl_balls_left: "BOLA TERSISA",

        // ── DEPOSIT PAGE ──
        page_deposit  : "DEPOSIT",
        lbl_method    : "METODE PEMBAYARAN",
        lbl_amount    : "JUMLAH DEPOSIT",
        lbl_nominal   : "NOMINAL",
        lbl_fee       : "BIAYA",
        lbl_receive   : "DITERIMA",
        lbl_total_pay : "TOTAL BAYAR",
        btn_confirm   : "KONFIRMASI DEPOSIT",
        lbl_scan_qr   : "SCAN QRIS",
        lbl_copy_va   : "SALIN NOMOR VA",
        lbl_copy_addr : "SALIN ALAMAT",
        lbl_upload_tf : "UPLOAD BUKTI TRANSFER",
        lbl_pending   : "MENUNGGU KONFIRMASI ADMIN",
        err_min_depo  : "MINIMUM DEPOSIT",
        ok_depo_sent  : "✅ DEPOSIT TERKIRIM! MENUNGGU KONFIRMASI.",
        lbl_network   : "JARINGAN",
        lbl_address   : "ALAMAT WALLET",
        lbl_memo      : "MEMO/TAG",
        lbl_rate      : "KURS SAAT INI",

        // ── WITHDRAW PAGE ──
        page_wd       : "WITHDRAW",
        lbl_wd_amount : "JUMLAH PENARIKAN",
        lbl_wd_to     : "TUJUAN TRANSFER",
        lbl_bank_name : "NAMA BANK",
        lbl_acc_num   : "NOMOR REKENING",
        lbl_acc_name  : "NAMA PEMILIK",
        btn_wd        : "AJUKAN PENARIKAN",
        err_min_wd    : "MINIMUM PENARIKAN",
        err_saldo_wd  : "SALDO TIDAK MENCUKUPI",
        ok_wd_sent    : "✅ PERMINTAAN PENARIKAN TERKIRIM!",
        lbl_wd_info   : "PROSES 1×24 JAM",
        lbl_saldo_now : "SALDO SAAT INI",

        // ── REWARD PAGE ──
        page_reward   : "REWARD",
        lbl_daily     : "BONUS HARIAN",
        lbl_claim     : "KLAIM",
        lbl_claimed   : "SUDAH DIKLAIM",
        lbl_next_claim: "KLAIM BERIKUTNYA",
        lbl_ref_bonus : "BONUS REFERRAL",
        lbl_ref_link  : "LINK REFERRAL KAMU",
        btn_copy_ref  : "SALIN LINK",
        lbl_total_ref : "TOTAL REFERRAL",
        lbl_ref_earn  : "TOTAL PENGHASILAN",
        ok_claimed    : "✅ BONUS BERHASIL DIKLAIM!",
        err_wait      : "TUNGGU HINGGA BESOK",
        lbl_share     : "BAGIKAN",

        // ── PROFIL PAGE ──
        page_profil   : "PROFIL VIP",
        lbl_saldo_now2: "SALDO AKUN SAAT INI",
        lbl_user_data : "DATA VALIDASI USER",
        lbl_full_name : "Nama Lengkap",
        lbl_whatsapp2 : "WhatsApp",
        lbl_bank2     : "Bank / E-Wallet",
        lbl_norek2    : "No. Rekening",
        lbl_ref_code  : "Kode Referral",
        lbl_trx_sum   : "RINGKASAN TRANSAKSI",
        lbl_total_depo: "TOTAL DEPOSIT",
        lbl_total_wd2 : "TOTAL WITHDRAW",
        btn_logout    : "KELUAR DARI SESI",
        err_load_prof : "Gagal memuat profil: ",
    },

    en: {
        // ── NAV BAR ──
        nav_play      : "PLAY",
        nav_depo      : "DEPOSIT",
        nav_wd        : "WITHDRAW",
        nav_reward    : "REWARD",
        nav_profil    : "PROFILE",

        // ── INDEX PAGE ──
        tab_login     : "LOGIN",
        tab_daftar    : "REGISTER",
        btn_auth      : "SIGN IN / SIGN UP",
        btn_create    : "CREATE VIP ACCOUNT",
        ph_username   : "USERNAME",
        ph_password   : "PASSWORD",
        ph_pass_min   : "PASSWORD (MIN 6 CHARS)",
        ph_nama       : "FULL NAME",
        ph_whatsapp   : "WHATSAPP NUMBER",
        ph_bank_pick  : "SELECT BANK / WALLET",
        ph_norek      : "ACCOUNT NUMBER",
        ph_ref        : "REFERRAL CODE (OPTIONAL)",
        lbl_bank_lain : "OTHER...",
        btn_contact   : "CONTACT ADMIN",
        err_fill_all  : "PLEASE FILL ALL FIELDS!",
        err_access    : "ACCESS DENIED! WRONG USERNAME/PASSWORD.",
        err_incomplete: "INCOMPLETE DATA!",
        ok_created    : "✅ VIP ACCOUNT CREATED SUCCESSFULLY!",
        load_init     : "INITIALIZING...",
        load_by       : "BY AR.GAMING..",
        load_loading  : "LOADING..",
        load_done     : "DONE",
        btn_continue  : "CONTINUE",

        // ── GAME PAGE ──
        lbl_saldo     : "BALANCE",
        lbl_bet       : "BET",
        lbl_bola      : "BALLS",
        btn_drop      : "DROP",
        btn_auto      : "AUTO",
        btn_stop      : "STOP",
        lbl_history   : "HISTORY",
        lbl_stats     : "STATS",
        lbl_win       : "WIN",
        lbl_lose      : "LOSE",
        lbl_profit    : "PROFIT",
        lbl_total_bet : "TOTAL BET",
        lbl_rtp       : "RTP",
        lbl_rows      : "ROWS",
        lbl_risk      : "RISK",
        risk_low      : "LOW",
        risk_med      : "MEDIUM",
        risk_high     : "HIGH",
        lbl_multiplier: "MULTIPLIER",
        lbl_jackpot   : "JACKPOT",
        lbl_result    : "RESULT",
        err_min_bet   : "MINIMUM BET",
        err_saldo_low : "INSUFFICIENT BALANCE!",
        err_auto_stop : "AUTO STOP — BALANCE EMPTY",
        lbl_balls_left: "BALLS LEFT",

        // ── DEPOSIT PAGE ──
        page_deposit  : "DEPOSIT",
        lbl_method    : "PAYMENT METHOD",
        lbl_amount    : "DEPOSIT AMOUNT",
        lbl_nominal   : "NOMINAL",
        lbl_fee       : "FEE",
        lbl_receive   : "YOU RECEIVE",
        lbl_total_pay : "TOTAL PAYMENT",
        btn_confirm   : "CONFIRM DEPOSIT",
        lbl_scan_qr   : "SCAN QR CODE",
        lbl_copy_va   : "COPY VA NUMBER",
        lbl_copy_addr : "COPY ADDRESS",
        lbl_upload_tf : "UPLOAD PAYMENT PROOF",
        lbl_pending   : "WAITING FOR ADMIN CONFIRMATION",
        err_min_depo  : "MINIMUM DEPOSIT",
        ok_depo_sent  : "✅ DEPOSIT SENT! WAITING FOR CONFIRMATION.",
        lbl_network   : "NETWORK",
        lbl_address   : "WALLET ADDRESS",
        lbl_memo      : "MEMO/TAG",
        lbl_rate      : "CURRENT RATE",

        // ── WITHDRAW PAGE ──
        page_wd       : "WITHDRAW",
        lbl_wd_amount : "WITHDRAWAL AMOUNT",
        lbl_wd_to     : "TRANSFER DESTINATION",
        lbl_bank_name : "BANK NAME",
        lbl_acc_num   : "ACCOUNT NUMBER",
        lbl_acc_name  : "ACCOUNT HOLDER",
        btn_wd        : "REQUEST WITHDRAWAL",
        err_min_wd    : "MINIMUM WITHDRAWAL",
        err_saldo_wd  : "INSUFFICIENT BALANCE",
        ok_wd_sent    : "✅ WITHDRAWAL REQUEST SENT!",
        lbl_wd_info   : "PROCESSED WITHIN 1×24 HRS",
        lbl_saldo_now : "CURRENT BALANCE",

        // ── REWARD PAGE ──
        page_reward   : "REWARD",
        lbl_daily     : "DAILY BONUS",
        lbl_claim     : "CLAIM",
        lbl_claimed   : "ALREADY CLAIMED",
        lbl_next_claim: "NEXT CLAIM",
        lbl_ref_bonus : "REFERRAL BONUS",
        lbl_ref_link  : "YOUR REFERRAL LINK",
        btn_copy_ref  : "COPY LINK",
        lbl_total_ref : "TOTAL REFERRALS",
        lbl_ref_earn  : "TOTAL EARNINGS",
        ok_claimed    : "✅ BONUS CLAIMED SUCCESSFULLY!",
        err_wait      : "WAIT UNTIL TOMORROW",
        lbl_share     : "SHARE",

        // ── PROFIL PAGE ──
        page_profil   : "VIP PROFILE",
        lbl_saldo_now2: "CURRENT ACCOUNT BALANCE",
        lbl_user_data : "USER VALIDATION DATA",
        lbl_full_name : "Full Name",
        lbl_whatsapp2 : "WhatsApp",
        lbl_bank2     : "Bank / E-Wallet",
        lbl_norek2    : "Account Number",
        lbl_ref_code  : "Referral Code",
        lbl_trx_sum   : "TRANSACTION SUMMARY",
        lbl_total_depo: "TOTAL DEPOSIT",
        lbl_total_wd2 : "TOTAL WITHDRAWAL",
        btn_logout    : "SIGN OUT",
        err_load_prof : "Failed to load profile: ",
    }
};

// ── CORE ENGINE ─────────────────────────────────────────────

/**
 * Get current language from localStorage. Default: 'id'
 */
function getLang() {
    return localStorage.getItem('neon_lang') || 'id';
}

/**
 * Set language and immediately apply to current page.
 */
function setLang(code) {
    localStorage.setItem('neon_lang', code);
    applyLang();
    updateLangFlags();
    // Also update html lang attribute
    document.documentElement.lang = code;
}

/**
 * Get a translation string by key. Falls back to ID if key not found.
 */
function t(key) {
    const lang = getLang();
    const dict = LANG_DATA[lang] || LANG_DATA['id'];
    return dict[key] || LANG_DATA['id'][key] || key;
}

/**
 * Apply translations to all elements with data-lang attribute.
 * Supports: innerText, placeholder, title, aria-label
 */
function applyLang() {
    const lang = getLang();
    const dict = LANG_DATA[lang] || LANG_DATA['id'];

    // Text content
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (dict[key] !== undefined) {
            el.innerText = dict[key];
        }
    });

    // Placeholders
    document.querySelectorAll('[data-lang-ph]').forEach(el => {
        const key = el.getAttribute('data-lang-ph');
        if (dict[key] !== undefined) {
            el.placeholder = dict[key];
        }
    });

    // HTML content (for elements needing innerHTML)
    document.querySelectorAll('[data-lang-html]').forEach(el => {
        const key = el.getAttribute('data-lang-html');
        if (dict[key] !== undefined) {
            el.innerHTML = dict[key];
        }
    });

    document.documentElement.lang = lang;
}

/**
 * Update flag button active states.
 */
function updateLangFlags() {
    const lang = getLang();
    document.querySelectorAll('.lang-flag-btn').forEach(btn => {
        btn.classList.toggle('lang-active', btn.getAttribute('data-lang-code') === lang);
    });
}

/**
 * Auto-apply on DOMContentLoaded for all pages.
 */
document.addEventListener('DOMContentLoaded', () => {
    applyLang();
    updateLangFlags();
});
