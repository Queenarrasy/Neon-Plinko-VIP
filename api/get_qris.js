const axios = require('axios');
const crypto = require('crypto');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { amount, username } = req.body;
    const va = process.env.IPAYMU_VA;
    const apiKey = process.env.IPAYMU_KEY;

    const body = {
        name: username,
        email: 'user@email.com',
        amount: amount,
        referenceId: 'DEP-' + Date.now(),
        notifyUrl: `https://${req.headers.host}/api/ipaymu-callback`,
        returnUrl: `https://${req.headers.host}/deposit.html`,
        cancelUrl: `https://${req.headers.host}/deposit.html`,
        paymentMethod: 'qris'
    };

    const jsonBody = JSON.stringify(body);
    const signature = crypto.createHmac('sha256', apiKey)
        .update(crypto.createHash('sha256').update(jsonBody).digest('hex'))
        .digest('hex');

    try {
        const response = await axios.post('https://my.ipaymu.com/api/v2/payment/direct', body, {
            headers: {
                'Content-Type': 'application/json',
                'va': va,
                'signature': signature
            }
        });

        if (response.data.Status === 200) {
            res.status(200).json({ token: response.data.Data.Url });
        } else {
            res.status(400).json({ message: response.data.Message });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
