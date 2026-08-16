const axios = require('axios');

module.exports = {
    name: 'lyrics',
    description: 'Cherche les paroles d\'une chanson : .lyrics Artiste - Titre',
    async execute({ sock, m, from, args }) {
        const query = args.join(' ');
        const [artist, title] = query.split(' - ').map((s) => s?.trim());
        if (!artist || !title) {
            return sock.sendMessage(from, { text: '⚠️ Format : .lyrics Artiste - Titre' }, { quoted: m });
        }
        try {
            const { data } = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
            if (!data.lyrics) throw new Error('Paroles introuvables.');
            const lyrics = data.lyrics.slice(0, 3500);
            await sock.sendMessage(from, { text: `🎤 *${title} — ${artist}*\n\n${lyrics}` }, { quoted: m });
        } catch (error) {
            await sock.sendMessage(from, { text: '❌ Paroles introuvables pour cette chanson.' }, { quoted: m });
        }
    },
};
