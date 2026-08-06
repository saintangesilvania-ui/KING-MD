const { isOwner } = require('../lib/permissions');
const { isGroup, getGroupAdmins } = require('../lib/groupHelpers');

module.exports = {
    name: 'kickall',
    description: '⚠️ Retire TOUS les non-admins du groupe (réservé au propriétaire du bot)',
    async execute({ sock, m, from }) {
        if (!isGroup(from)) {
            return sock.sendMessage(from, { text: '⚠️ Cette commande ne marche que dans un groupe.' }, { quoted: m });
        }
        // Sécurité supplémentaire : réservé au owner du BOT (pas juste admin du groupe),
        // vu la nature destructive de la commande.
        if (!isOwner(m.key.participant || m.key.remoteJid)) {
            return sock.sendMessage(from, { text: '⛔ Réservé au propriétaire du bot (commande destructive).' }, { quoted: m });
        }

        const metadata = await sock.groupMetadata(from);
        const admins = await getGroupAdmins(sock, from);
        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        if (!admins.some((a) => a.startsWith(sock.user.id.split(':')[0]))) {
            return sock.sendMessage(from, { text: '⛔ Je dois être admin du groupe pour faire ça.' }, { quoted: m });
        }

        const toKick = metadata.participants
            .map((p) => p.id)
            .filter((id) => !admins.includes(id) && id !== botJid);

        if (toKick.length === 0) {
            return sock.sendMessage(from, { text: 'ℹ️ Personne à retirer (tout le monde est admin).' }, { quoted: m });
        }

        await sock.sendMessage(from, { text: `⏳ Retrait de ${toKick.length} membre(s)...` }, { quoted: m });
        for (const jid of toKick) {
            try {
                await sock.groupParticipantsUpdate(from, [jid], 'remove');
            } catch (e) {
                console.error('Erreur kick sur', jid, e.message);
            }
        }
        await sock.sendMessage(from, { text: '✅ Terminé.' });
    },
};
