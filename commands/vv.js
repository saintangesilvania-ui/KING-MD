 {
  if (!m.quoted) {
    return reply(*ʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ, ᴠɪᴅᴇᴏ, ᴏʀ ᴀᴜᴅɪᴏ ᴡɪᴛʜ ᴛʜᴇ ᴄᴀᴘᴛɪᴏɴ ${prefix + command}*)
  }
  
  let mime = (m.quoted.msg  m.quoted).mimetype  ''
  try {
    if (/image/.test(mime)) {
      let media = await m.quoted.download()
      await bad.sendMessage(m.sender, {
        image: media,
        caption: "✅ ᴠɪᴇᴡ ᴏɴᴄᴇ ɪᴍᴀɢᴇ sᴇɴᴛ ᴛᴏ ʏᴏᴜʀ ᴅᴍ",
      }, { quoted: m })
      
    } else if (/video/.test(mime)) {
      let media = await m.quoted.download()
      await bad.sendMessage(m.sender, {
        video: media,
        caption: "✅ ᴠɪᴇᴡ ᴏɴᴄᴇ ᴠɪᴅᴇᴏ sᴇɴᴛ ᴛᴏ ʏᴏᴜʀ ᴅᴍ",
      }, { quoted: m })
      
    } else if (/audio/.test(mime)) {
      let media = await m.quoted.download()
      await bad.sendMessage(m.sender, {
        audio: media,
        mimetype: 'audio/mpeg',
        ptt: true
      }, { quoted: m })
      
    } else {
      reply(❌ ᴜɴsᴜᴘᴘᴏʀᴛᴇᴅ ᴍᴇᴅɪᴀ ᴛʏᴘᴇ!\nʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ, ᴠɪᴅᴇᴏ, ᴏʀ ᴀᴜᴅɪᴏ ᴡɪᴛʜ *${prefix + command}*)
    }
  } catch (err) {
    console.error('ᴇʀʀᴏʀ ᴘʀᴏᴄᴇssɪɴɢ ᴍᴇᴅɪᴀ:', err)
    reply(ғᴀɪʟᴇᴅ ᴛᴏ ᴘʀᴏᴄᴇss ᴍᴇᴅɪᴀ. ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ.)
  }
}
break