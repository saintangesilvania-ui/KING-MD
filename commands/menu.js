module.exports = {
    name: 'menu',
    aliases: ['help'],
    description: 'Affiche la liste des commandes disponibles',
    async execute({ sock, m, from }) {
        // require tardif pour éviter une dépendance circulaire au chargement
        const { commands } = require('../messageHandler');
        const uniqueCommands = [...new Set([...commands.values()])];
        const list = uniqueCommands
            .map((c) => `▸ .${c.name} — ${c.description || ''}`)
            .join('\n');
        await sock.sendMessage(from, { text: `📜 *Commandes disponibles*\n\n${list}` }, { quoted: m });
    },
};
