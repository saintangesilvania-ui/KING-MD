// Extrait pour commands/vv.js
{
  if (!m.quoted) {
    return reply(`*ʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ, ᴠɪᴅᴇᴏ, ᴏʀ ᴀᴜᴅɪᴏ ᴡɪᴛʜ ᴛʜᴇ ᴄᴀᴘᴛɪᴏɴ ${prefix + command}*`);
  }

  // Sécurisation maximale pour récupérer le mimetype sur différentes versions de Baileys
  let q = m.quoted;
  let mime = (q.msg || q.message?.[Object.keys(q.message)[0]] || q).mimetype || '';

  // Vérification précoce
  if (!mime || !/image|video|audio/.test(mime)) {
    return reply(`❌ ᴜɴsᴜᴘᴘᴏʀᴛᴇᴅ ᴍᴇᴅɪᴀ ᴛʏᴘᴇ!\nʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ, ᴠɪᴅᴇᴏ, ᴏʀ ᴀᴜᴅɪᴏ ᴡɪᴛʜ *${prefix + command}*`);
  }

  try {
    // Téléchargement du média
    let media = await q.download();
    if (!media) throw new Error("Le téléchargement du média a échoué ou est vide.");

    let messageOptions = {};

    if (/image/.test(mime)) {
      messageOptions = {
        image: media,
        caption: "✅ ᴠɪᴇᴡ ᴏɴᴄᴇ ɪᴍᴀɢᴇ sᴇɴᴛ ᴛᴏ ʏᴏᴜʀ ᴅᴍ",
        viewOnce: true
      };
    } else if (/video/.test(mime)) {
      messageOptions = {
        video: media,
        caption: "✅ ᴠɪᴇᴡ ᴏɴᴄᴇ ᴠɪᴅᴇᴏ sᴇɴᴛ ᴛᴏ ʏᴏᴜʀ ᴅᴍ",
        viewOnce: true
      };
    } else if (/audio/.test(mime)) {
      // Pour l'audio, viewOnce n'est pas supporté par WhatsApp, on l'envoie donc en vocal normal
      messageOptions = {
        audio: media,
        mimetype: 'audio/mpeg',
        ptt: true
      };
    }

    // Envoi du message en DM (m.sender)
    await bad.sendMessage(m.sender, messageOptions, { quoted: m });

  } catch (err) {
    console.error('ᴇʀʀᴏʀ ᴘʀᴏᴄᴇssɪɴɢ ᴍᴇᴅɪᴀ:', err);
    reply(`ғᴀɪʟᴇᴅ ᴛᴏ ᴘʀᴏᴄᴇss ᴍᴇᴅɪᴀ. ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ.`);
  }
}
