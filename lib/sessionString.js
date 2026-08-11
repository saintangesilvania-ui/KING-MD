const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Convertit les identifiants de session (creds.json) en une chaîne de texte compacte,
// stockable dans une variable d'environnement Render (SESSION_ID) qui, contrairement
// au disque, n'est jamais effacée au redémarrage.

function encodeSession(sessionPath) {
    const credsPath = path.join(sessionPath, 'creds.json');
    if (!fs.existsSync(credsPath)) return null;
    const raw = fs.readFileSync(credsPath, 'utf8');
    const compressed = zlib.gzipSync(raw);
    return compressed.toString('base64');
}

function restoreSession(sessionPath, sessionIdString) {
    if (!sessionIdString) return false;
    try {
        const compressed = Buffer.from(sessionIdString, 'base64');
        const raw = zlib.gunzipSync(compressed).toString('utf8');
        JSON.parse(raw); // vérifie que c'est un JSON valide avant d'écrire
        if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), raw);
        return true;
    } catch (e) {
        console.error('❌ SESSION_ID invalide, impossible de restaurer:', e.message);
        return false;
    }
}

module.exports = { encodeSession, restoreSession };
