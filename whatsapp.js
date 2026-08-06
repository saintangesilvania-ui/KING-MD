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
            } else if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.warn(`❌ Connexion fermée (code ${statusCode})`);
                pairingInProgress = false;
                if (statusCode !== 401) {
                    setTimeout(() => connectToWhatsApp(sanitizedNumber).catch(console.error), 3000);
                }
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            const m = messages[0];
            if (!m?.message || m.key.fromMe) return;
            try {
                await handleMessage(sock, m);
            } catch (err) {
                console.error('Erreur handleMessage:', err.message);
            }
        });

        sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
            try {
                if (action === 'add' && isToggled(id, 'welcome')) {
                    for (const jid of participants) {
                        await sock.sendMessage(id, {
                            text: `👋 Bienvenue @${jid.split('@')[0]} dans le groupe !`,
                            mentions: [jid],
                        });
                    }
                }
                if (action === 'remove' && isToggled(id, 'goodbye')) {
                    for (const jid of participants) {
                        await sock.sendMessage(id, {
                            text: `👋 @${jid.split('@')[0]} a quitté le groupe.`,
                            mentions: [jid],
                        });
                    }
                }
            } catch (err) {
                console.error('Erreur welcome/goodbye:', err.message);
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
