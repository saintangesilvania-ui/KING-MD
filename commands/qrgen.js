const QRCode = require('qrcode');

module.exports = {
    name: 'qrgen',
    description: 'Génère un QR code à partir de texte/lien : .qrgen https://exemple.com',
    async execute({ sock, m, from, args }) {
        const text = args.join(' ');
        if (!text) return sock.sendMessage(from, { text: '⚠️ Donne un texte : .qrgen <texte ou lien>' }, { quoted: m });
        try {
            const buffer = await QRCode.toBuffer(text, { width: 400, margin: 2 });
            await sock.sendMessage(from, { image: buffer, caption: `📱 QR code pour : ${text}` }, { quoted: m });
        } catch (error) {
            await sock.sendMessage(from, { text: '❌ Échec de la génération.' }, { quoted: m });
        }
    },
};
