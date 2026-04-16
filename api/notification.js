// api/notification.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY // Gunakan Service Role Key agar bisa bypass RLS
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const notification = req.body;

  // 1. Verifikasi status transaksi dari Midtrans
  const orderId = notification.order_id;
  const transactionStatus = notification.transaction_status;
  const fraudStatus = notification.fraud_status;

  console.log(`Menerima notifikasi untuk Order ID: ${orderId}. Status: ${transactionStatus}`);

  try {
    // 2. Cari data deposit di tabel 'deposits' berdasarkan ID (Order ID)
    const { data: deposit, error: depoError } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', orderId)
      .single();

    if (depoError || !deposit) {
      return res.status(404).json({ message: 'Data deposit tidak ditemukan' });
    }

    // Jika deposit sudah sukses sebelumnya, jangan diproses lagi (mencegah double saldo)
    if (deposit.status === 'SUKSES') {
      return res.status(200).json({ message: 'Deposit sudah diproses sebelumnya' });
    }

    // 3. Cek apakah statusnya sukses (settlement = uang masuk)
    if (transactionStatus === 'settlement') {
      if (fraudStatus === 'accept' || !fraudStatus) {
        
        // A. Update status deposit jadi SUKSES
        await supabase
          .from('deposits')
          .update({ status: 'SUKSES' })
          .eq('id', orderId);

        // B. Tambahkan saldo ke profil user
        // Ambil saldo saat ini
        const { data: profile } = await supabase
          .from('profiles')
          .select('saldo')
          .eq('username', deposit.username)
          .single();

        const saldoBaru = (profile?.saldo || 0) + deposit.net_receive;

        // Update saldo di tabel profiles
        await supabase
          .from('profiles')
          .update({ saldo: saldoBaru })
          .eq('username', deposit.username);

        console.log(`Saldo user ${deposit.username} berhasil ditambah: ${deposit.net_receive}`);
      }
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
      // Jika gagal atau kadaluarsa, update status jadi GAGAL
      await supabase
        .from('deposits')
        .update({ status: 'GAGAL' })
        .eq('id', orderId);
    }

    res.status(200).json({ message: 'OK' });
  } catch (error) {
    console.error('Error processing notification:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
