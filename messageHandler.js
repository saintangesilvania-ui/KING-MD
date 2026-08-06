const fs = require('fs');
const path = require('path');

const PREFIX = '.';

// Charge automatiquement toutes les commandes du dossier /commands
const commands = new Map();
const commandsDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsDir)) {
    if (!file.endsWith('.js')) continue;
    const cmd = require(path.join(commandsDir, file));
    if (cmd?.name && typeof cmd.execute === 'function') {
        commands.set(cmd.name, cmd);
        for (const alias of cmd.aliases || []) commands.set(alias, cmd);
    }
}
console.log(`🔧 ${commands.size} commande(s) chargée(s) : ${[...new Set([...commands.values()].map(c => c.name))].join(', ')}`);

async function handleMessage(sock, m) {
    const from = m.key.remoteJid;
    const body =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        m.message.imageMessage?.caption ||
        '';

    if (!body.startsWith(PREFIX)) return;

    const args = body.slice(PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    const command = commands.get(commandName);
    if (!command) return;

    try {
        await command.execute({ sock, m, from, args });
    } catch (err) {
        console.error(`Erreur dans la commande "${commandName}":`, err);
        await sock.sendMessage(from, { text: `❌ Erreur lors de l'exécution de .${commandName}` }, { quoted: m });
    }
}

module.exports = { handleMessage, commands };
