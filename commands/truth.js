const QUESTIONS = [
    "Quelle est la chose la plus embarrassante qui te soit arrivée ?",
    "As-tu déjà menti à un(e) ami(e) proche ? Pourquoi ?",
    "Quel est ton plus grand regret ?",
    "As-tu déjà eu le béguin pour quelqu'un dans ce groupe ?",
    "Quelle est la pire excuse que tu aies inventée ?",
    "Quel est ton secret le mieux gardé (que tu peux partager) ?",
    "As-tu déjà triché à un examen ?",
    "Quelle est la chose la plus stupide que t'aies faite pour impressionner quelqu'un ?",
];
module.exports = {
    name: 'truth',
    description: 'Question "vérité" aléatoire (jeu action/vérité)',
    async execute({ sock, m, from }) {
        const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        await sock.sendMessage(from, { text: `🤔 *Vérité* : ${q}` }, { quoted: m });
    },
};
