const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.jpg');

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
        const caption = `📜 *Commandes disponibles*\n\n${list}`;

        if (fs.existsSync(LOGO_PATH)) {
            await sock.sendMessage(from, { image: fs.readFileSync(LOGO_PATH), caption }, { quoted: m });
        } else {
            await sock.sendMessage(from, { text: caption }, { quoted: m });
        }
    },
};
