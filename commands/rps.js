const CHOICES = ['pierre', 'feuille', 'ciseaux'];
const EMOJI = { pierre: '🪨', feuille: '📄', ciseaux: '✂️' };

function winner(a, b) {
    if (a === b) return 'égalité';
    if ((a === 'pierre' && b === 'ciseaux') || (a === 'feuille' && b === 'pierre') || (a === 'ciseaux' && b === 'feuille')) return 'joueur';
    return 'bot';
}

module.exports = {
    name: 'rps',
    aliases: ['pfc'],
    description: 'Pierre-feuille-ciseaux contre le bot : .rps pierre',
    async execute({ sock, m, from, args }) {
        const choice = args[0]?.toLowerCase();
        if (!CHOICES.includes(choice)) {
            return sock.sendMessage(from, { text: '⚠️ Choisis : .rps pierre / feuille / ciseaux' }, { quoted: m });
        }
        const botChoice = CHOICES[Math.floor(Math.random() * 3)];
        const result = winner(choice, botChoice);
        const text = result === 'égalité' ? '🤝 Égalité !' : result === 'joueur' ? '🎉 Tu as gagné !' : '🤖 Le bot a gagné !';
        await sock.sendMessage(from, { text: `${EMOJI[choice]} vs ${EMOJI[botChoice]}\n${text}` }, { quoted: m });
    },
};
