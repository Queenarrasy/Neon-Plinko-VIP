const axios = require('axios');
const crypto = require('crypto');

export default async function handler(req, res) {
    // Pastikan hanya menerima request POST
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    // Menerima order_id dari frontend (deposit.html)
    const { amount, username, order_id } = req.body;
    
    // Mengambil Key dari Vercel Environment Variables
    const va = process.env.IPAYMU_VA;
    const apiKey = process.env.IPAYMU_KEY;

    if (!va || !apiKey) {
        return res.status(500).json({ message: 'Konfigurasi VA atau API KEY iPaymu belum diatur di Vercel' });
    }

    // Konfigurasi Payload iPaymu
    const body = {
        name: username || 'Player',
        email: 'user@email.com',
        amount: amount,
        referenceId: order_id || ('DEP-' + Date.now()), // Wajib sinkron dengan database
        notifyUrl: 'https://neon-plinko-vip.vercel.app/api/ipaymu-callback',
        returnUrl: 'https://neon-plinko-vip.vercel.app/deposit.html',
        cancelUrl: 'https://neon-plinko-vip.vercel.app/deposit.html',
        paymentMethod: 'qris'
    };

    const jsonBody = JSON.stringify(body);
    
    // ---------------------------------------------------------
    // PEMBUATAN SIGNATURE STANDAR IPAYMU API V2 (DIPERBAIKI)
    // ---------------------------------------------------------
    const bodyEncrypt = crypto.createHash('sha256')
                              .update(jsonBody)
                              .digest('hex');
                              
    const stringToSign = `POST:${va}:${bodyEncrypt}:${apiKey}`;
    
    const signature = crypto.createHmac('sha256', apiKey)
                            .update(stringToSign)
                            .digest('hex');
    // ---------------------------------------------------------

    try {
        const response = await axios.post('https://my.ipaymu.com/api/v2/payment/direct', body, {
            headers: {
                'Content-Type': 'application/json',
                'va': va,
                'signature': signature,
                'timestamp': Date.now()
            }
        });

        // Jika berhasil mendapatkan respon dari iPaymu
        if (response.data.Status === 200) {
            // Mengirim link pembayaran (Url iPaymu) ke frontend
            res.status(200).json({ token: response.data.Data.Url });
        } else {
            // Jika ada penolakan dari iPaymu (misal limit, dll)
            res.status(400).json({ message: response.data.Message || 'Transaksi ditolak iPaymu' });
        }
    } catch (error) {
        // Tangkap error detail jika axios gagal
        const errorMessage = error.response?.data?.Message || error.message;
        res.status(500).json({ message: errorMessage });
    }
}
