// -*- coding: utf-8 -*-
// Ordre et regroupement des commandes pour l'affichage du .menu
'use strict';

const sanitizeNames = (arr) => {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (let n of arr) {
    const s = String(n).trim().toLowerCase();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
};

const categories = [
  { title: '👑 ROYAL BASE', names: sanitizeNames(['ping', 'menu', 'alive', 'status', 'env', 'links', 'pair', 'uptime', 'fetch']) },
  { title: '⚙️ ROYAL ADMIN', names: sanitizeNames(['addadmin', 'deladmin', 'addprem', 'delprem', 'delete']) },
  { title: '👑 KINGDOM SETTINGS', names: sanitizeNames(['setname', 'setprefix', 'mode', 'botname', 'ownername', 'ownernumber', 'description', 'stickername', 'settings', 'online', 'statuslike', 'botdp', 'reactemojis', 'owneremojis', 'setmodel', 'getsession', 'setnewsletterid', 'lang']) },
  { title: '🎨 ROYAL STICKERS', names: sanitizeNames(['sticker', 'autosticker']) },
  { title: '⚔️ ROYAL DOWNLOADS', names: sanitizeNames(['tiktok', 'instagram', 'yt', 'url', 'ytmp3', 'ytmp4', 'fb', 'mediafire', 'gdrive', 'play']) },
  { title: '🏰 KINGDOM GROUP', names: sanitizeNames(['kick', 'kickall', 'promote', 'demote', 'mute', 'unmute', 'lock', 'unlock', 'tagall', 'hidetag', 'revoke', 'grouplink', 'gcpp', 'ginfo', 'updategdesc', 'updategname', 'poll', 'out', 'newgc', 'end', 'join', 'invite', 'tag', 'acceptall', 'rejectall', 'requests', 'accept', 'reject', 'add', 'gcstatus', 'everyone', 'chreact']) },
  { title: '⚔️ ROYAL MODERATION', names: sanitizeNames(['ban', 'unban', 'banlist', 'warn', 'unwarn', 'warnings', 'resetwarn', 'sudo', 'delsudo', 'listsudo']) },
  { title: '🛡️ ROYAL SECURITY', names: sanitizeNames(['welcome', 'goodbye', 'setwelcome', 'setgoodbye', 'antilink', 'antispam', 'antifake', 'antibot', 'antitag', 'autoread', 'autoreact', 'anticall', 'anticallmsg', 'autotyping', 'recording', 'statusview', 'adminaction']) },
  { title: '🧠 ROYAL AI', names: sanitizeNames(['ai', 'translate', 'summarize', 'rewrite', 'explain', 'code', 'bugfix', 'imagine']) },
  { title: '📮 ROYAL TOOLS', names: sanitizeNames(['removebg', 'upscale', 'enhance', 'unblur', 'colorize', 'caption', 'getimage', 'getpp', 'convert', 'id', 'calc', 'qrgen', 'base64', 'ocr']) },
  { title: '🎭 ROYAL FUN', names: sanitizeNames(['blague', 'quiz', 'titato', 'endgame', 'roast', 'ship', 'compatibility', 'aura', '8ball', 'compliment', 'emoji', 'character', 'anime', 'truth', 'dare', 'rps']) },
  { title: '🌌 ROYAL OTHER', names: sanitizeNames(['wthr', 'praytime', 'time', 'quote', 'joke', 'lyrics', 'currency', 'horoscope']) },
];

module.exports = categories;

/**
 * Utilitaires attachés à l'export principal.
 * Exemple d'utilisation :
 * const menuCategories = require('./lib/menuCategories');
 * const category = menuCategories.findCategory('ping');
 * const all = menuCategories.getAllCommands();
 */
module.exports.findCategory = function (command) {
  if (!command) return null;
  const cmd = String(command).trim().toLowerCase();
  return categories.find((c) => c.names.includes(cmd)) || null;
};

module.exports.getAllCommands = function () {
  return categories.flatMap((c) => c.names).slice();
};
