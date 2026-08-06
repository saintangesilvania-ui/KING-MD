const express = require('express');
const path = require('path');
const { connectToWhatsApp } = require('./whatsapp');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.static(__dirname)); // sert main.html, pair.html, etc. si présents

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
    res.send('KING-MD v2 est en ligne. Utilise /code?number=TONNUMERO pour te connecter.');
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
