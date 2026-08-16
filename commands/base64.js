module.exports = {
    name: 'base64',
    description: 'Encode/décode en base64 : .base64 encode <texte> ou .base64 decode <texte>',
    async execute({ sock, m, from, args }) {
        const mode = args[0]?.toLowerCase();
        const text = args.slice(1).join(' ');
        if (!['encode', 'decode'].includes(mode) || !text) {
            return sock.sendMessage(from, { text: '⚠️ Usage : .base64 encode <texte>  ou  .base64 decode <texte>' }, { quoted: m });
        }
        try {
            const result = mode === 'encode'
                ? Buffer.from(text, 'utf8').toString('base64')
                : Buffer.from(text, 'base64').toString('utf8');
            await sock.sendMessage(from, { text: `🔐 ${result}` }, { quoted: m });
        } catch {
            await sock.sendMessage(from, { text: '❌ Texte invalide pour cette opération.' }, { quoted: m });
        }
    },
};
