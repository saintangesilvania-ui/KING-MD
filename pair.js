const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const router = express.Router();
const pino = require('pino');
const cheerio = require('cheerio');
const { Octokit } = require('@octokit/rest');
const moment = require('moment-timezone');
const Jimp = require('jimp');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require("form-data");
const os = require('os'); 
const { sms, downloadMediaMessage } = require("./msg");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    getContentType,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser,
    downloadContentFromMessage,
    proto,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    fetchLatestBaileysVersion,
    S_WHATSAPP_NET
} = require('@whiskeysockets/baileys');

// ╔══════════════════════════════════════════════════════════════════╗
// ║  CONFIG MAÎTRE — valeurs du CRÉATEUR (ne jamais modifier)       ║
// ║  C'est la base que tout le monde hérite au départ               ║
// ╚══════════════════════════════════════════════════════════════════╝
const config = {
    // — Comportement automatique —
    AUTO_VIEW_STATUS: 'true',
    AUTO_LIKE_STATUS: 'false',
    AUTO_RECORDING: 'true',
    AUTO_LIKE_EMOJI: ['🖕', '😶', '✨️', '💗', '🎈', '🎉', '🥳', '🍆', '🧫', '🐭'],
    // — Identité du bot —
    PREFIX: '.',
    BOT_NAME: '𝙆𝙄𝙉𝙂-𝗠𝗗',
    BOT_FOOTER: '𝗞𝗜𝗡𝗚 𝙎𝙏𝘼𝙍𝙆⁹⁹⁹',
    // — Owner maître (créateur) —
    OWNER_NUMBER: '50933715832',
    OWNER_NAME: '𝗞𝗜𝗡𝗚 𝙎𝙏𝘼𝙍𝙆⁹⁹⁹',
    // — Liens —
    CHANNEL_LINK: 'https://whatsapp.com/channel/0029VbCY0ob7YSd0Oc9d650O',
    GROUP_INVITE_LINK: 'https://chat.whatsapp.com/KZOzUTeDItAFANHPas4Qdh?s=cl&p=a&ilr=1&amv=2', 
    // — Images —
    IMAGE_PATH: 'https://files.catbox.moe/qhu2f5.png', // pour l image du bot c'est facile attends je fais prochain video
    RCD_IMAGE_PATH: 'https://files.catbox.moe/ywj6ak.png',
    // — Technique (non modifiable par commande) —
    MAX_RETRIES: 3,
    ADMIN_LIST_PATH: './admin.json',
    NEWSLETTER_JID: '120363424779982227@newsletter',
    NEWSLETTER_MESSAGE_ID: '428',
    OTP_EXPIRY: 300000,
    version: '4.0.0',
};

// ╔══════════════════════════════════════════════════════════════════╗
// ║  SYSTÈME DE CONFIGS ISOLÉES PAR SESSION                         ║
// ║                                                                  ║
// ║  Dossiers :                                                      ║
// ║   configs/<numero>.json  → préférences personnalisées            ║
// ║   lineage/<numero>.json  → qui a pairé qui (arbre de parrainage) ║
// ╚══════════════════════════════════════════════════════════════════╝
const userConfigs = new Map();   // config active en mémoire par numéro
const CONFIGS_DIR = './configs'; // préférences personnalisées
const LINEAGE_DIR = './lineage'; // arbre de parrainage

// Créer les dossiers au démarrage
[CONFIGS_DIR, LINEAGE_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ╔══════════════════════════════════════════════════════════════════╗
// ║  JOURNAL — base de données persistante (./database/journal.json) ║
// ╚══════════════════════════════════════════════════════════════════╝
// Journal stocké sur GitHub — pas de fichier local nécessaire

// ─── Drague sessions (stockées sur GitHub) ────────────────────────────
// ── Champs personnalisables (les seuls sauvegardés dans le JSON) ───────────
const CUSTOMIZABLE_KEYS = [
    'BOT_NAME', 'OWNER_NAME', 'OWNER_NUMBER',
    'CHANNEL_LINK', 'GROUP_INVITE_LINK',
    'IMAGE_PATH', 'RCD_IMAGE_PATH',
    'PREFIX', 'BOT_FOOTER',
    'AUTO_VIEW_STATUS', 'AUTO_LIKE_STATUS', 'AUTO_RECORDING'
];

/**
 * Charge la config sauvegardée d'un utilisateur (configs/<num>.json).
 * Si elle n'existe pas → retourne null (pas de personnalisation).
 */
function loadSavedConfig(number) {
    const file = path.join(CONFIGS_DIR, `${number}.json`);
    try {
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) { console.error(`[config] Erreur lecture ${file}:`, e.message); }
    return null;
}

/**
 * Sauvegarde uniquement les champs personnalisés dans configs/<num>.json.
 */
function saveUserConfig(number, userCfg) {
    const file = path.join(CONFIGS_DIR, `${number}.json`);
    const toSave = {};
    CUSTOMIZABLE_KEYS.forEach(k => { if (userCfg[k] !== undefined) toSave[k] = userCfg[k]; });
    fs.writeFileSync(file, JSON.stringify(toSave, null, 2));
}

/**
 * Supprime le fichier de config → reset aux valeurs par défaut.
 * Retourne true si le fichier existait, false sinon.
 */
function deleteUserConfig(number) {
    const file = path.join(CONFIGS_DIR, `${number}.json`);
    if (fs.existsSync(file)) { fs.unlinkSync(file); return true; }
    return false;
}

/**
 * Charge le lignage d'un utilisateur (lineage/<num>.json).
 * Structure : { parrainedBy: "509...", pairedAt: "ISO date" }
 */
function loadLineage(number) {
    const file = path.join(LINEAGE_DIR, `${number}.json`);
    try {
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {}
    return null;
}

/**
 * Enregistre le parrainage : qui a pairé ce numéro et quand.
 */
function saveLineage(number, parrainNumber) {
    const file = path.join(LINEAGE_DIR, `${number}.json`);
    fs.writeFileSync(file, JSON.stringify({
        parrainedBy: parrainNumber,
        pairedAt: new Date().toISOString(),
        pairedVia: 'whatsapp'
    }, null, 2));
}

/**
 * Construit la config active d'un utilisateur :
 *   1. Base = config maître (créateur)
 *   2. Si pairé via WhatsApp → hérite des champs de son parrain
 *   3. Ses propres modifs par-dessus (configs/<num>.json)
 *
 * Résultat mis en cache dans userConfigs Map.
 */
function buildUserConfig(number) {
    // 1. Base maître
    let merged = { ...config };

    // 2. Héritage du parrain (si pairé via WhatsApp)
    const lineage = loadLineage(number);
    if (lineage?.parrainedBy) {
        const parrainSaved = loadSavedConfig(lineage.parrainedBy);
        if (parrainSaved) {
            CUSTOMIZABLE_KEYS.forEach(k => {
                if (parrainSaved[k] !== undefined) merged[k] = parrainSaved[k];
            });
            console.log(`[config] ${number} hérite de ${lineage.parrainedBy}`);
        }
    }

    // 3. Propres modifications de l'utilisateur (priorité max)
    const saved = loadSavedConfig(number);
    if (saved) {
        CUSTOMIZABLE_KEYS.forEach(k => {
            if (saved[k] !== undefined) merged[k] = saved[k];
        });
    }

    return merged;
}

/**
 * Récupère (ou construit) la config active d'une session.
 */
function getUserConfig(number) {
    const n = number.replace(/[^0-9]/g, '');
    if (!userConfigs.has(n)) {
        userConfigs.set(n, buildUserConfig(n));
    }
    return userConfigs.get(n);
}

const owner = 'sylvainbetty91-sys';
const repo = 'Dracula_MD';
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

let dragueSessions = {};

async function loadDrague() {
    try {
        const { data } = await octokit.repos.getContent({ owner, repo, path: 'database/drague.json' });
        dragueSessions = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
        console.log('[drague] Chargé depuis GitHub');
    } catch (e) {
        dragueSessions = {};
        console.log('[drague] Nouveau fichier (introuvable sur GitHub)');
    }
}

async function saveDrague() {
    try {
        let sha;
        try {
            const { data } = await octokit.repos.getContent({ owner, repo, path: 'database/drague.json' });
            sha = data.sha;
        } catch {}
        await octokit.repos.createOrUpdateFileContents({
            owner, repo,
            path: 'database/drague.json',
            message: 'Update drague sessions',
            content: Buffer.from(JSON.stringify(dragueSessions, null, 2)).toString('base64'),
            ...(sha && { sha })
        });
    } catch (e) {
        console.error('[drague] Erreur sauvegarde GitHub:', e.message);
    }
}

// Chargement au démarrage
loadDrague();

async function loadJournal() {
    try {
        const { data } = await octokit.repos.getContent({ owner, repo, path: 'database/journal.json' });
        return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
    } catch (e) {
        console.log('[journal] Introuvable sur GitHub, retour objet vide');
        return {};
    }
}

async function saveJournal(data) {
    try {
        let sha;
        try {
            const { data: existing } = await octokit.repos.getContent({ owner, repo, path: 'database/journal.json' });
            sha = existing.sha;
        } catch {}
        await octokit.repos.createOrUpdateFileContents({
            owner, repo,
            path: 'database/journal.json',
            message: 'Update journal',
            content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
            ...(sha && { sha })
        });
    } catch (e) {
        console.error('[journal] Erreur sauvegarde GitHub:', e.message);
    }
}

function isAdmin(db, section, sender) {
    if (!db[section] || !db[section].admins) return false;
    return db[section].admins.includes(sender);
}

function checkSecret(db, section, code) {
    if (!db[section] || !db[section].secret) return false;
    return db[section].secret === code;
}

function checkCode(text, requiredCode = '77777') {
    const match = (text || '').match(/'(\d+)'$/);
    if (!match) return { ok: false, error: "❌ Code requis a la fin: '12345'" };
    if (match[1] !== requiredCode) return { ok: false, error: '❌ Mauvais code' };
    return { ok: true, code: match[1] };
}



const activeSockets = new Map();
const socketCreationTime = new Map();
const ownerNumber = [`${config.OWNER_NUMBER}@s.whatsapp.net`];
const SESSION_BASE_PATH = './session';
const NUMBER_LIST_PATH = './numbers.json';
const otpStore = new Map();

if (!fs.existsSync(SESSION_BASE_PATH)) {
    fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });
}

function loadAdmins() {
    try {
        if (fs.existsSync(config.ADMIN_LIST_PATH)) {
            return JSON.parse(fs.readFileSync(config.ADMIN_LIST_PATH, 'utf8'));
        }
        return [];
    } catch (error) {
        console.error('Failed to load admin list:', error);
        return [];
    }
}

function loadPremium() {
    try {
        if (fs.existsSync('./premium.json')) {
            return JSON.parse(fs.readFileSync('./premium.json', 'utf8'));
        }
        return [];
    } catch (e) {
        return [];
    }
}


function formatMessage(title, content, footer) {
    return `*${title}*\n\n${content}\n\n> *${footer}*`;
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getSriLankaTimestamp() {
    return moment().tz('Africa/Nairobi').format('YYYY-MM-DD HH:mm:ss');
}


async function cleanDuplicateFiles(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'session'
        });

        const sessionFiles = data.filter(file => 
            file.name.startsWith(`empire_${sanitizedNumber}_`) && file.name.endsWith('.json')
        ).sort((a, b) => {
            const timeA = parseInt(a.name.match(/empire_\d+_(\d+)\.json/)?.[1] || 0);
            const timeB = parseInt(b.name.match(/empire_\d+_(\d+)\.json/)?.[1] || 0);
            return timeB - timeA;
        });

        const configFiles = data.filter(file => 
            file.name === `config_${sanitizedNumber}.json`
        );

        if (sessionFiles.length > 1) {
            for (let i = 1; i < sessionFiles.length; i++) {
                await octokit.repos.deleteFile({
                    owner,
                    repo,
                    path: `session/${sessionFiles[i].name}`,
                    message: `Delete duplicate session file for ${sanitizedNumber}`,
                    sha: sessionFiles[i].sha
                });
                console.log(`Deleted duplicate session file: ${sessionFiles[i].name}`);
            }
        }

        if (configFiles.length > 0) {
            console.log(`Config file for ${sanitizedNumber} already exists`);
        }
    } catch (error) {
        console.error(`Failed to clean duplicate files for ${number}:`, error);
    }
}

// Count total commands in pair.js
let totalcmds = async () => {
  try {
    const filePath = "./pair.js";
    const mytext = await fs.readFile(filePath, "utf-8");

    // Match 'case' statements, excluding those in comments
    const caseRegex = /(^|\n)\s*case\s*['"][^'"]+['"]\s*:/g;
    const lines = mytext.split("\n");
    let count = 0;

    for (const line of lines) {
      // Skip lines that are comments
      if (line.trim().startsWith("//") || line.trim().startsWith("/*")) continue;
      // Check if line matches case statement
      if (line.match(/^\s*case\s*['"][^'"]+['"]\s*:/)) {
        count++;
      }
    }

    return count;
  } catch (error) {
    console.error("Error reading pair.js:", error.message);
    return 0; // Return 0 on error to avoid breaking the bot
  }
  }

async function joinGroup(socket, userCfg) {
    let retries = config.MAX_RETRIES || 3;
    let inviteCode = 'HE7NQEHJrzXLpsOtBhncGq'; // Hardcoded default
    const groupLink = (userCfg && userCfg.GROUP_INVITE_LINK) || config.GROUP_INVITE_LINK;
    if (groupLink) {
        const cleanInviteLink = groupLink.split('?')[0]; // Remove query params
        const inviteCodeMatch = cleanInviteLink.match(/chat\.whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9_-]+)/);
        if (!inviteCodeMatch) {
            console.error('Invalid group invite link format:', groupLink);
            return { status: 'failed', error: 'Invalid group invite link' };
        }
        inviteCode = inviteCodeMatch[1];
    }
    console.log(`Attempting to join group with invite code: ${inviteCode}`);

    while (retries > 0) {
        try {
            const response = await socket.groupAcceptInvite(inviteCode);
            console.log('Group join response:', JSON.stringify(response, null, 2)); // Debug response
            if (response?.gid) {
                console.log(`[ ✅ ] Successfully joined group with ID: ${response.gid}`);
                return { status: 'success', gid: response.gid };
            }
            throw new Error('No group ID in response');
        } catch (error) {
            retries--;
            let errorMessage = error.message || 'Unknown error';
            if (error.message.includes('not-authorized')) {
                errorMessage = 'Bot is not authorized to join (possibly banned)';
            } else if (error.message.includes('conflict')) {
                errorMessage = 'Bot is already a member of the group';
            } else if (error.message.includes('gone') || error.message.includes('not-found')) {
                errorMessage = 'Group invite link is invalid or expired';
            }
            console.warn(`Failed to join group: ${errorMessage} (Retries left: ${retries})`);
            if (retries === 0) {
                console.error('[ ❌ ] Failed to join group', { error: errorMessage });
                try {
                    await socket.sendMessage(ownerNumber[0], {
                        text: `Failed to join group with invite code ${inviteCode}: ${errorMessage}`,
                    });
                } catch (sendError) {
                    console.error(`Failed to send failure message to owner: ${sendError.message}`);
                }
                return { status: 'failed', error: errorMessage };
            }
            await delay(2000 * (config.MAX_RETRIES - retries + 1));
        }
    }
    return { status: 'failed', error: 'Max retries reached' };
}


// Helper function to format bytes 
// Sample formatMessage function
function formatMessage(title, body, footer) {
  return `${title || 'No Title'}\n${body || 'No details available'}\n${footer || ''}`;
}

// Sample formatBytes function
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function sendOTP(socket, number, otp) {
    const userJid = jidNormalizedUser(socket.user.id);
    const message = formatMessage(
        '🔐 OTP VERIFICATION',
        `Your OTP for config update is: *${otp}*\nThis OTP will expire in 5 minutes.`,
        config.BOT_FOOTER
    );

    try {
        await socket.sendMessage(userJid, { text: message });
        console.log(`OTP ${otp} sent to ${number}`);
    } catch (error) {
        console.error(`Failed to send OTP to ${number}:`, error);
        throw error;
    }
}

function setupNewsletterHandlers(socket) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const message = messages[0];
        if (!message?.key) return;

        const allNewsletterJIDs = await loadNewsletterJIDsFromRaw();
        const jid = message.key.remoteJid;

        if (!allNewsletterJIDs.includes(jid)) return;

        try {
            const emojis = ['🩵', '🫶', '😀', '👍', '😶'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            const messageId = message.newsletterServerId;

            if (!messageId) {
                console.warn('No newsletterServerId found in message:', message);
                return;
            }

            let retries = 3;
            while (retries-- > 0) {
                try {
                    await socket.newsletterReactMessage(jid, messageId.toString(), randomEmoji);
                    console.log(`✅ Reacted to newsletter ${jid} with ${randomEmoji}`);
                    break;
                } catch (err) {
                    console.warn(`❌ Reaction attempt failed (${3 - retries}/3):`, err.message);
                    await delay(1500);
                }
            }
        } catch (error) {
            console.error('⚠️ Newsletter reaction handler failed:', error.message);
        }
    });
}

async function setupStatusHandlers(socket) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const message = messages[0];
        if (!message?.key || message.key.remoteJid !== 'status@broadcast' || !message.key.participant || message.key.remoteJid === config.NEWSLETTER_JID) return;

        try {
            if (config.AUTO_RECORDING === 'true' && message.key.remoteJid) {
                await socket.sendPresenceUpdate("recording", message.key.remoteJid);
            }

            if (config.AUTO_VIEW_STATUS === 'true') {
                let retries = config.MAX_RETRIES;
                while (retries > 0) {
                    try {
                        await socket.readMessages([message.key]);
                        break;
                    } catch (error) {
                        retries--;
                        console.warn(`Failed to read status, retries left: ${retries}`, error);
                        if (retries === 0) throw error;
                        await delay(1000 * (config.MAX_RETRIES - retries));
                    }
                }
            }

            if (config.AUTO_LIKE_STATUS === 'true') {
                const randomEmoji = config.AUTO_LIKE_EMOJI[Math.floor(Math.random() * config.AUTO_LIKE_EMOJI.length)];
                let retries = config.MAX_RETRIES;
                while (retries > 0) {
                    try {
                        await socket.sendMessage(
                            message.key.remoteJid,
                            { react: { text: randomEmoji, key: message.key } },
                            { statusJidList: [message.key.participant, jidNormalizedUser(socket.user.id)] }
                        );
                        break;
                    } catch (error) {
                        retries--;
                        console.warn(`Failed to react to status, retries left: ${retries}`, error);
                        if (retries === 0) throw error;
                        await delay(1000 * (config.MAX_RETRIES - retries));
                    }
                }
            }
        } catch (error) {
            console.error('⚠️ Status handler failed:', error.message);
        }
    });
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  CONNEXION WHATSAPP (Baileys) + ENDPOINT DE PAIRING             ║
// ║  ⚠️ Reconstruit à minima : gère connexion + code de pairing.     ║
// ║  Le routeur de commandes (.sticker, .play, etc.) d'origine a été ║
// ║  perdu avec la troncature du fichier et n'est PAS reconstruit    ║
// ║  ici — seule la connexion WhatsApp fonctionne.                   ║
// ╚══════════════════════════════════════════════════════════════════╝

async function loadNewsletterJIDsFromRaw() {
    // Reconstruit à minima : uniquement la newsletter officielle du bot.
    return [config.NEWSLETTER_JID];
}

async function connectToWhatsApp(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    if (sanitizedNumber.length < 8) {
        throw new Error(`Numéro invalide : "${number}" → nettoyé en "${sanitizedNumber}" (trop court, indicatif pays manquant ?)`);
    }

    const sessionPath = path.join(SESSION_BASE_PATH, sanitizedNumber);
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();
    console.log(`📶 Baileys version WA utilisée : ${version.join('.')}`);

    const socket = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu('Chrome'),
    });

    activeSockets.set(sanitizedNumber, socket);
    socketCreationTime.set(sanitizedNumber, Date.now());

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log(`✅ [${sanitizedNumber}] Connecté à WhatsApp`);
            setupStatusHandlers(socket);
            setupNewsletterHandlers(socket);
            try {
                await joinGroup(socket, getUserConfig(sanitizedNumber));
            } catch (e) {
                console.warn('Join group failed:', e.message);
            }
        } else if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.warn(`❌ [${sanitizedNumber}] Connexion fermée (code ${statusCode})`);
            activeSockets.delete(sanitizedNumber);
            if (statusCode !== 401) {
                setTimeout(() => connectToWhatsApp(sanitizedNumber).catch(console.error), 3000);
            }
        }
    });

    // ⚠️ Minimal : répond seulement "pong" au ping. Le routeur de
    // commandes d'origine (des centaines de `case`) a été perdu et
    // n'est pas reconstruit ici.
    socket.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m?.message || m.key.fromMe) return;
            const userCfg = getUserConfig(sanitizedNumber);
            const from = m.key.remoteJid;
            const body = m.message.conversation || m.message.extendedTextMessage?.text || '';
            if (body === `${userCfg.PREFIX}ping`) {
                await socket.sendMessage(from, { text: '🏓 Pong !' }, { quoted: m });
            }
        } catch (e) {
            console.error('Message handler error:', e.message);
        }
    });

    if (!state.creds?.registered) {
        await delay(1500);
        try {
            const code = await socket.requestPairingCode(sanitizedNumber);
            return code?.match(/.{1,4}/g)?.join('-') || code;
        } catch (error) {
            console.error('❌ Échec génération du code de pairing:', error.message);
            console.error(error.stack);
            throw error;
        }
    }
    return null;
}

router.get('/code', async (req, res) => {
    const number = req.query.number;
    if (!number) {
        return res.status(400).json({ error: 'Numéro requis' });
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

module.exports = router;
