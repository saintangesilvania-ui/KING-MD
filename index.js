const express = require('express');
const compression = require('compression');
const path = require('path');
const { connectToWhatsApp } = require('./whatsapp');
const { startCleanupLoop } = require('./lib/cleanup');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(compression()); // réponses plus légères/rapides à charger
app.use(express.static(__dirname)); // sert main.html, pair.html, etc. si présents

// Route ultra-légère pour les services type UptimeRobot (évite de solliciter le reste du bot)
app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/code', async (req, res) => {
    const number = req.query.number;
    if (!number) {
        return res.status(400).json({ error: 'Numéro requis (ex: /code?number=50912345678)' });
    }
    try {
        const code = await connectToWhatsApp(number);
        res.json({ code: code || 'Déjà connecté' });
    } catch (error) {
        console.error('❌ Erreur /code:', error.message);
        console.error(error.stack);
        res.status(503).json({ error: 'Service Unavailable', detail: error.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    startCleanupLoop();

    // Reconnexion automatique au démarrage si SESSION_ID + SESSION_NUMBER sont configurés
    // (évite d'avoir à repasser par le site à chaque redémarrage du serveur)
    if (process.env.SESSION_ID && process.env.SESSION_NUMBER) {
        console.log('♻️ Tentative de reconnexion automatique via SESSION_ID...');
        connectToWhatsApp(process.env.SESSION_NUMBER).catch((e) =>
            console.error('❌ Reconnexion automatique échouée:', e.message)
        );
    }
});
