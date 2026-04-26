const crypto = require('crypto');

// Wajib di Vercel agar req.body terbaca
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
    },
};

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    try {
        // Debug: log semua yang masuk
        console.log('req.body:', JSON.stringify(req.body));
        console.log('ENV VA:', process.env.IPAYMU_VA ? 'ADA' : 'KOSONG');
        console.log('ENV KEY:', process.env.IPAYMU_KEY ? 'ADA' : 'KOSONG');

        const { amount, username, order_id } = req.body || {};

        const va = process.env.IPAYMU_VA;
        const apiKey = process.env.IPAYMU_KEY;

        // Validasi env tersedia
        if (!va || !apiKey) {
            return res.status(500).json({ message: 'IPAYMU_VA / IPAYMU_KEY belum diset di Vercel Environment Variables' });
        }

        // Validasi amount
        const parsedAmount = parseInt(amount);
        if (!parsedAmount || parsedAmount < 1000) {
            return res.status(400).json({ message: 'Amount minimal Rp 1.000', received: amount });
        }

        // Pastikan order_id HANYA berisi angka
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
        const jsonBody = JSON.stringify(body);
        const bodyHash = crypto.createHash('sha256').update(jsonBody).digest('hex');
        const stringToSign = `POST:${va}:${bodyHash}:${apiKey}`;
        const signature = crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex');
        const timestamp = Date.now().toString();

        console.log('Mengirim ke iPaymu sandbox...');

        // SANDBOX MODE
        const ipaymuRes = await fetch('https://sandbox.ipaymu.com/api/v2/payment/direct', {
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
            return res.status(400).json({
                message: data.Message || 'Gagal dari iPaymu',
                detail: data
            });
        }

    } catch (error) {
        console.error('CATCH ERROR:', error.message);
        console.error('STACK:', error.stack);
        return res.status(500).json({ message: error.message });
    }
};
