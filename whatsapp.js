const path = require('path');
const fs = require('fs');
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    Browsers,
    delay,
} = require('@whiskeysockets/baileys');

const { handleMessage } = require('./messageHandler');
const { isToggled } = require('./lib/groupSettings');

const SESSION_BASE_PATH = path.join(__dirname, 'session');
if (!fs.existsSync(SESSION_BASE_PATH)) fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });

let sock = null;
let pairingInProgress = false;

async function connectToWhatsApp(number) {
    if (pairingInProgress) {
        throw new Error('Une connexion est déjà en cours, patiente quelques secondes.');
    }

    const sanitizedNumber = (number || '').replace(/[^0-9]/g, '');
    if (sanitizedNumber.length < 8) {
        throw new Error(`Numéro invalide : "${number}" (n'oublie pas l'indicatif pays, sans le +)`);
    }

    pairingInProgress = true;

    try {
        const sessionPath = path.join(SESSION_BASE_PATH, sanitizedNumber);
        if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

        // On vérifie d'abord si ce numéro est déjà connecté — si oui, on ne touche à rien.
        // Sinon (nouvelle tentative ou tentative précédente ratée), on repart d'une session
        // neuve : d'anciens identifiants partiels peuvent rendre le nouveau code invalide
        // côté WhatsApp, même s'il est correctement affiché à l'écran.
        const preCheck = await useMultiFileAuthState(sessionPath);
        if (!preCheck.state.creds?.registered) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();
        console.log(`📶 Baileys / WA version : ${version.join('.')}`);

        sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
            },
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: Browsers.ubuntu('Chrome'),
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                console.log('✅ Connecté à WhatsApp !');
                pairingInProgress = false;
                const { getConfig } = require('./lib/config');
                const newsletterJid = getConfig().newsletterJid;
                if (newsletterJid) {
                    sock.newsletterFollow(newsletterJid)
                        .then(() => console.log(`📢 Abonné automatiquement au canal ${newsletterJid}`))
                        .catch((e) => console.error('Erreur abonnement canal:', e.message));
                }
            } else if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.warn(`❌ Connexion fermée (code ${statusCode})`);
                pairingInProgress = false;
                // Pendant la phase de pairing (compte pas encore enregistré), WhatsApp ferme
                // souvent la connexion juste après avoir émis le code — c'est normal, il ne
                // faut surtout pas relancer une nouvelle demande, ça invaliderait le code
                // qu'on vient de donner à l'utilisateur.
                if (statusCode !== 401 && state.creds?.registered) {
                    setTimeout(() => connectToWhatsApp(sanitizedNumber).catch(console.error), 3000);
                }
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            const m = messages[0];
            if (!m?.message) return;
            try {
                await handleMessage(sock, m);
            } catch (err) {
                console.error('Erreur handleMessage:', err.message);
            }
        });

        sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
            try {
                const { getGroup } = require('./lib/groupSettings');
                const g = getGroup(id);
                if (action === 'add' && isToggled(id, 'welcome')) {
                    for (const jid of participants) {
                        const template = g.welcomeMessage || 'Bienvenue @user dans le groupe !';
                        await sock.sendMessage(id, {
                            text: `👋 ${template.replace('@user', `@${jid.split('@')[0]}`)}`,
                            mentions: [jid],
                        });
                    }
                }
                if (action === 'remove' && isToggled(id, 'goodbye')) {
                    for (const jid of participants) {
                        const template = g.goodbyeMessage || '@user a quitté le groupe.';
                        await sock.sendMessage(id, {
                            text: `👋 ${template.replace('@user', `@${jid.split('@')[0]}`)}`,
                            mentions: [jid],
                        });
                    }
                }
            } catch (err) {
                console.error('Erreur welcome/goodbye:', err.message);
            }
        });

        sock.ev.on('call', async (calls) => {
            const { getSettings } = require('./lib/botSettings');
            const s = getSettings();
            if (!s.anticall) return;
            for (const call of calls) {
                try {
                    await sock.rejectCall(call.id, call.from);
                    await sock.sendMessage(call.from, { text: s.anticallMessage });
                } catch (err) {
                    console.error('Erreur anticall:', err.message);
                }
            }
        });

        if (!state.creds?.registered) {
            await delay(1500);
            const code = await sock.requestPairingCode(sanitizedNumber);
            pairingInProgress = false;
            return code?.match(/.{1,4}/g)?.join('-') || code;
        }

        pairingInProgress = false;
        return null; // déjà connecté
    } catch (error) {
        pairingInProgress = false;
        throw error;
    }
}

module.exports = { connectToWhatsApp };
