const axios = require('axios');
const SIGNES = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const NOMS_FR = { aries: 'Bélier', taurus: 'Taureau', gemini: 'Gémeaux', cancer: 'Cancer', leo: 'Lion', virgo: 'Vierge', libra: 'Balance', scorpio: 'Scorpion', sagittarius: 'Sagittaire', capricorn: 'Capricorne', aquarius: 'Verseau', pisces: 'Poissons' };

module.exports = {
    name: 'horoscope',
    description: 'Horoscope du jour : .horoscope lion',
    async execute({ sock, m, from, args }) {
        const input = args[0]?.toLowerCase();
        const sign = SIGNES.find((s) => s === input || NOMS_FR[s].toLowerCase() === input);
        if (!sign) {
            return sock.sendMessage(from, { text: `⚠️ Signe invalide. Choix : ${Object.values(NOMS_FR).join(', ')}` }, { quoted: m });
        }
        try {
            const { data } = await axios.get(`https://ohmanda.com/api/horoscope/${sign}/`);
            await sock.sendMessage(from, { text: `🔮 *${NOMS_FR[sign]}*\n\n${data.horoscope}` }, { quoted: m });
        } catch (error) {
            await sock.sendMessage(from, { text: '❌ Service horoscope indisponible pour le moment.' }, { quoted: m });
        }
    },
};
