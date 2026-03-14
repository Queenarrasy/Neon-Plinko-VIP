// DATA DARI DASHBOARD SUPABASE (API SETTINGS)
const SUPABASE_URL = "MASUKKAN_URL_DI_SINI"; 
const SUPABASE_KEY = "MASUKKAN_ANON_PUBLIC_KEY_DI_SINI";

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fungsi Global untuk ambil data pemain (SINKRON DATA & SALDO)
async function getPlayerData() {
    const user = localStorage.getItem('user_session');
    if (!user) return null;
    const { data } = await _supabase.from('profiles').select('*').eq('username', user).single();
    return data;
}

// Fungsi Global untuk update saldo
async function updateSaldo(newSaldo) {
    const user = localStorage.getItem('user_session');
    await _supabase.from('profiles').update({ saldo: newSaldo }).eq('username', user);
}
