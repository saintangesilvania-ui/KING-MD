const { evaluate } = require('mathjs');

module.exports = {
    name: 'calc',
    description: 'Calculatrice : .calc 15*8+3',
    async execute({ sock, m, from, args }) {
        const expr = args.join(' ');
        if (!expr) return sock.sendMessage(from, { text: '⚠️ Donne un calcul : .calc 15*8+3' }, { quoted: m });
        try {
            const result = evaluate(expr);
            await sock.sendMessage(from, { text: `🧮 ${expr} = ${result}` }, { quoted: m });
        } catch (error) {
            await sock.sendMessage(from, { text: '❌ Expression invalide.' }, { quoted: m });
        }
    },
};
