{
  // Vérification si l'utilisateur a répondu à un message
  if (!m.quoted) {
    return reply(`*ʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ, ᴠɪᴅᴇᴏ, ᴏʀ ᴀᴜᴅɪᴏ ᴡɪᴛʜ ᴛʜᴇ ᴄᴀᴘᴛɪᴏɴ ${prefix + command}*`);
  }

  // Récupération sécurisée du type de média (mimetype)
  const mime = (m.quoted.msg || m.quoted).mimetype || '';

  // Vérification précoce : si ce n'est pas une image, vidéo ou audio, on arrête tout de suite
  if (!/image|video|audio/.test(mime)) {
    return reply(`❌ ᴜɴsᴜᴘᴘᴏʀᴛᴇᴅ ᴍᴇᴅɪᴀ ᴛʏᴘᴇ!\nʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ, ᴠɪᴅᴇᴏ, ᴏʀ ᴀᴜᴅɪᴏ ᴡɪᴛʜ *${prefix + command}*`);
  }

  try {
    // On télécharge le média une seule fois pour tous les types (gain de performance)
    const media = await m.quoted.download();
    let messageOptions = {};

    // Construction de l'objet message selon le type de média
    if (/image/.test(mime)) {
      messageOptions = {
        image: media,
        caption: "✅ ᴠɪᴇᴡ ᴏɴᴄᴇ ɪᴍᴀɢᴇ sᴇɴᴛ ᴛᴏ ʏᴏᴜʀ ᴅᴍ",
        viewOnce: true // Ajout réel de l'option view once
      };
    } else if (/video/.test(mime)) {
      messageOptions = {
        video: media,
        caption: "✅ ᴠɪᴇᴡ ᴏɴᴄᴇ ᴠɪᴅᴇᴏ sᴇɴᴛ ᴛᴏ ʏᴏᴜʀ ᴅᴍ",
        viewOnce: true // Ajout réel de l'option view once
      };
    } else if (/audio/.test(mime)) {
      messageOptions = {
        audio: media,
        mimetype: 'audio/mpeg',
        ptt: true // Envoi en tant que note vocale (audio)
        // Note: viewOnce n'est généralement pas supporté pour l'audio classique sur WhatsApp
      };
    }

    // Envoi du message à l'expéditeur (DM)
    await bad.sendMessage(m.sender, messageOptions, { quoted: m });

  } catch (err) {
    console.error('ᴇʀʀᴏʀ ᴘʀᴏᴄᴇssɪɴɢ ᴍᴇᴅɪᴀ:', err);
    reply(`ғᴀɪʟᴇᴅ ᴛᴏ ᴘʀᴏᴄᴇss ᴍᴇᴅɪᴀ. ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ.`);
  }
}