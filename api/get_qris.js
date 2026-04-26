const axios = require('axios');
const crypto = require('crypto');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    try {
        const { amount, username, order_id } = req.body;
        
        const va = process.env.IPAYMU_VA;
        const apiKey = process.env.IPAYMU_KEY;

        // --- VALIDASI & PEMBERSIHAN ORDER ID ---
        // Kita pastikan order_id HANYA berisi angka. 
        // Jika ada "DEP-123", kita paksa jadi "123" agar diterima kolom BIGINT Supabase.
        let finalOrderId;
        if (order_id) {
            finalOrderId = order_id.toString().replace(/\D/g, ''); 
        } else {
            finalOrderId = Date.now().toString(); // Jika kosong, pakai timestamp (angka semua)
        }

        const body = {
            name: username || 'Player',
            email: 'user@email.com',
            amount: parseInt(amount), // Pastikan angka
            referenceId: finalOrderId, 
            notifyUrl: `https://neon-plinko-vip.vercel.app/api/ipaymu-callback`,
            returnUrl: `https://neon-plinko-vip.vercel.app/deposit.html`,
            cancelUrl: `https://neon-plinko-vip.vercel.app/deposit.html`,
            paymentMethod: 'qris'
        };

        const jsonBody = JSON.stringify(body);
        
        // Pembuatan Signature iPaymu V2 Resmi
        const bodyEncrypt = crypto.createHash('sha256').update(jsonBody).digest('hex');
        const stringToSign = `POST:${va}:${bodyEncrypt}:${apiKey}`;
        const signature = crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex');

        const response = await axios.post('https://my.ipaymu.com/api/v2/payment/direct', body, {
            headers: {
                'Content-Type': 'application/json',
                'va': va,
                'signature': signature,
                'timestamp': Date.now()
            }
        });

        if (response.data.Status === 200) {
            // Kirim balik ke frontend, pastikan order_id yang baru (tanpa huruf) digunakan
            res.status(200).json({ 
                token: response.data.Data.Url,
                order_id: finalOrderId 
            });
        } else {
            res.status(400).json({ message: response.data.Message });
        }
    } catch (error) {
        console.error("Error Detail:", error.response?.data || error.message);
        res.status(500).json({ message: error.response?.data?.Message || error.message });
    }
}
