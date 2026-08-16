const axios = require('axios');
const FormData = require('form-data');
const { bufferFromMessage, getMediaMessage } = require('../lib/media');

// Nécessite OCR_API_KEY (clé gratuite disponible sur ocr.space)
module.exports = {
    name: 'ocr',
    description: "Extrait le texte visible dans une image (réponds à une image) — nécessite OCR_API_KEY",
    async execute({ sock, m, from }) {
        const apiKey = process.env.OCR_API_KEY;
        if (!apiKey) return sock.sendMessage(from, { text: '❌ OCR_API_KEY manquant dans les variables d\'environnement.' }, { quoted: m });
        const media = getMediaMessage(m);
        if (!media || media.type !== 'image') return sock.sendMessage(from, { text: '⚠️ Réponds à une image.' }, { quoted: m });
        try {
            const buffer = await bufferFromMessage(media.message, 'image');
            const form = new FormData();
            form.append('file', buffer, 'image.jpg');
            form.append('language', 'fre');
            const res = await axios.post('https://api.ocr.space/parse/image', form, {
                headers: { ...form.getHeaders(), apikey: apiKey },
            });
            const text = res.data?.ParsedResults?.[0]?.ParsedText;
            if (!text) throw new Error('Aucun texte détecté.');
            await sock.sendMessage(from, { text: `📝 Texte détecté :\n\n${text}` }, { quoted: m });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ ${error.message}` }, { quoted: m });
        }
    },
};
