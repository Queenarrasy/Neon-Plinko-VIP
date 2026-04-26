const axios = require('axios');
const crypto = require('crypto');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    // Pastikan menerima order_id dari frontend
    const { amount, username, order_id } = req.body;
    
    const va = process.env.IPAYMU_VA;
    const apiKey = process.env.IPAYMU_KEY;

    // Gunakan order_id murni angka agar tidak error 'bigint' di database
    // Jika frontend tidak mengirim order_id, kita buat angka murni dari timestamp
    const cleanOrderId = order_id ? order_id.toString().replace(/\D/g, '') : Date.now().toString();

    const body = {
        name: username || 'Player',
        email: 'user@email.com',
        amount: amount,
        referenceId: cleanOrderId, // Menggunakan angka saja untuk menghindari error BigInt
        notifyUrl: `https://neon-plinko-vip.vercel.app/api/ipaymu-callback`,
        returnUrl: `https://neon-plinko-vip.vercel.app/deposit.html`,
        cancelUrl: `https://neon-plinko-vip.vercel.app/deposit.html`,
        paymentMethod: 'qris'
    };

    const jsonBody = JSON.stringify(body);
    
    // Signature iPaymu V2
    const bodyEncrypt = crypto.createHash('sha256').update(jsonBody).digest('hex');
    const stringToSign = `POST:${va}:${bodyEncrypt}:${apiKey}`;
    const signature = crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex');

    try {
        const response = await axios.post('https://my.ipaymu.com/api/v2/payment/direct', body, {
            headers: {
                'Content-Type': 'application/json',
                'va': va,
                'signature': signature,
                'timestamp': Date.now()
            }
        });

        if (response.data.Status === 200) {
            res.status(200).json({ 
                token: response.data.Data.Url,
                order_id: cleanOrderId 
            });
        } else {
            res.status(400).json({ message: response.data.Message });
        }
    } catch (error) {
        const msg = error.response?.data?.Message || error.message;
        res.status(500).json({ message: msg });
    }
}
