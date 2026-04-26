import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    try {
        const { amount, username, order_id } = req.body;

        const va = process.env.IPAYMU_VA;
        const apiKey = process.env.IPAYMU_KEY;

        // Validasi env tersedia
        if (!va || !apiKey) {
            return res.status(500).json({ message: 'IPAYMU_VA / IPAYMU_KEY belum diset di Vercel Environment Variables' });
        }

        // Validasi amount
        const parsedAmount = parseInt(amount);
        if (!parsedAmount || parsedAmount < 1000) {
            return res.status(400).json({ message: 'Amount minimal Rp 1.000' });
        }

        // Pastikan order_id HANYA berisi angka (kompatibel BIGINT Supabase)
        let finalOrderId;
        if (order_id) {
            finalOrderId = order_id.toString().replace(/\D/g, '');
        } else {
            finalOrderId = Date.now().toString();
        }

        const body = {
            name: username || 'Player',
            email: 'user@email.com',
            amount: parsedAmount,
            referenceId: finalOrderId,
            notifyUrl: 'https://neon-plinko-vip.vercel.app/api/ipaymu-callback',
            returnUrl: 'https://neon-plinko-vip.vercel.app/deposit.html',
            cancelUrl: 'https://neon-plinko-vip.vercel.app/deposit.html',
            paymentMethod: 'qris'
        };

        // Signature iPaymu V2
        // Penting: jsonBody harus SAMA PERSIS antara yang di-hash dan yang dikirim
        const jsonBody = JSON.stringify(body);
        const bodyHash = crypto.createHash('sha256').update(jsonBody).digest('hex');
        const stringToSign = `POST:${va}:${bodyHash}:${apiKey}`;
        const signature = crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex');
        const timestamp = Date.now().toString();

        // SANDBOX MODE
        // Setelah verifikasi Live selesai, ganti URL ke:
        // https://my.ipaymu.com/api/v2/payment/direct
        const IPAYMU_URL = 'https://sandbox.ipaymu.com/api/v2/payment/direct';

        const ipaymuRes = await fetch(IPAYMU_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'va': va,
                'signature': signature,
                'timestamp': timestamp
            },
            body: jsonBody
        });

        const data = await ipaymuRes.json();
        console.log('iPaymu response:', JSON.stringify(data));

        if (data.Status === 200) {
            return res.status(200).json({
                token: data.Data.Url,
                order_id: finalOrderId
            });
        } else {
            // Kirim detail error dari iPaymu agar mudah di-debug
            return res.status(400).json({
                message: data.Message || 'Gagal dari iPaymu',
                detail: data
            });
        }

    } catch (error) {
        console.error('Error get_qris:', error.message);
        return res.status(500).json({ message: error.message });
    }
}
