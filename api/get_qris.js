// api/get_qris.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { amount, username } = req.body;
    const serverKey = process.env.MIDTRANS_SERVER_KEY; // Mengambil dari Vercel Env

    // Buat Order ID unik
    const orderId = `DEP-${username.substring(0,3).toUpperCase()}-${Date.now()}`;

    // Payload untuk Midtrans
    const payload = {
        payment_type: 'qris',
        transaction_details: {
            order_id: orderId,
            gross_amount: parseInt(amount)
        },
        customer_details: {
            first_name: username
        }
    };

    // Encode Server Key ke Base64
    const auth = Buffer.from(serverKey + ':').toString('base64');

    try {
        const response = await fetch('https://api.midtrans.com/v2/charge', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.actions && data.actions.length > 0) {
            // Berhasil mendapatkan QRIS
            res.status(200).json({ 
                qr_url: data.actions[0].url, 
                order_id: orderId 
            });
        } else {
            res.status(400).json({ error: 'Midtrans Error', details: data });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server Error', message: error.message });
    }
}
