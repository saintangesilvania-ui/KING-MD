const DEFIS = [
    "Envoie un emoji au hasard aux 3 dernières personnes avec qui t'as discuté.",
    "Change ta photo de profil pour un dessin d'enfant pendant 1h.",
    "Envoie un message vocal en chantant.",
    "Écris ton prochain message uniquement en emojis.",
    "Raconte une blague nulle dans ce chat.",
    "Complimente 3 personnes du groupe.",
    "Parle comme un robot pendant les 5 prochains messages.",
];
module.exports = {
    name: 'dare',
    description: 'Défi "action" aléatoire (jeu action/vérité)',
    async execute({ sock, m, from }) {
        const d = DEFIS[Math.floor(Math.random() * DEFIS.length)];
        await sock.sendMessage(from, { text: `🔥 *Action* : ${d}` }, { quoted: m });
    },
};
