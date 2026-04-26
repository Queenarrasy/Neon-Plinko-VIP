import { createClient } from '@supabase/supabase-js';

// Konfigurasi Supabase menggunakan data yang Anda berikan
const SUPABASE_URL = 'https://jcxgankdwfwfnbwlkkpz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjeGdhbmtkd2Z3Zm5id2xra3B6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI0NTQyMywiZXhwIjoyMDkwODIxNDIzfQ.GObXaCVbJGBN1gNjdeVLhKyywHHEyNeMUsexjk9NsHk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    // iPaymu mengirimkan callback menggunakan metode POST
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        // Mengambil data dari body request iPaymu
        const { status, reference_id, amount, buyer_name } = req.body;

        console.log(`Menerima callback iPaymu: ID ${reference_id}, Status: ${status}`);

        // Hanya proses jika status pembayaran adalah 'berhasil'
        if (status === 'berhasil') {
            
            // 1. Cek apakah ID deposit ini ada di tabel dan statusnya masih 'PROSES'
            const { data: deposit, error: depError } = await supabase
                .from('deposits')
                .select('*')
                .eq('id', reference_id)
                .single();

            if (depError || !deposit) {
                console.error('Deposit tidak ditemukan di database:', reference_id);
                return res.status(404).send('Deposit Not Found');
            }

            if (deposit.status === 'PROSES') {
                
                // 2. Update status deposit menjadi 'SUKSES'
                const { error: updateDepError } = await supabase
                    .from('deposits')
                    .update({ status: 'SUKSES' })
                    .eq('id', reference_id);

                if (updateDepError) throw updateDepError;

                // 3. Ambil saldo terakhir user dari tabel profiles
                const { data: profile, error: profError } = await supabase
                    .from('profiles')
                    .select('saldo')
                    .eq('username', deposit.username) // Menggunakan username dari data deposit
                    .single();

                if (profError || !profile) {
                    console.error('Profil user tidak ditemukan:', deposit.username);
                    return res.status(404).send('User Profile Not Found');
                }

                // 4. Hitung saldo baru dan update ke tabel profiles
                const saldoLama = parseFloat(profile.saldo || 0);
                const jumlahDeposit = parseFloat(amount);
                const saldoBaru = saldoLama + jumlahDeposit;

                const { error: updateProfError } = await supabase
                    .from('profiles')
                    .update({ saldo: saldoBaru })
                    .eq('username', deposit.username);

                if (updateProfError) throw updateProfError;

                console.log(`Berhasil! Saldo ${deposit.username} bertambah sebesar ${amount}.`);
                return res.status(200).send('OK - Saldo Updated');
            } else {
                console.log('Deposit sudah pernah diproses sebelumnya.');
                return res.status(200).send('OK - Already Processed');
            }
        } else {
            console.log('Pembayaran belum berhasil, status:', status);
            return res.status(200).send('OK - Status not successful');
        }

    } catch (err) {
        console.error('Terjadi kesalahan di Callback:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
