const axios = require('axios');

module.exports = {
    name: 'currency',
    aliases: ['convert2'],
    description: 'Convertit une devise : .currency 100 USD EUR',
    async execute({ sock, m, from, args }) {
        const [amountStr, from_, to] = args;
        const amount = parseFloat(amountStr);
        if (!amount || !from_ || !to) {
            return sock.sendMessage(from, { text: '⚠️ Format : .currency 100 USD EUR' }, { quoted: m });
        }
        try {
            const { data } = await axios.get(`https://open.er-api.com/v6/latest/${from_.toUpperCase()}`);
            const rate = data?.rates?.[to.toUpperCase()];
            if (!rate) throw new Error('Devise inconnue.');
            const result = (amount * rate).toFixed(2);
            await sock.sendMessage(from, { text: `💱 ${amount} ${from_.toUpperCase()} = ${result} ${to.toUpperCase()}` }, { quoted: m });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ ${error.message}` }, { quoted: m });
        }
    },
};
