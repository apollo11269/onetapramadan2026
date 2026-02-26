const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'kick',
  description: 'Kick a user from your temp voice channel (can rejoin later).',
  execute: async (client, message, args, tempChannels) => {
    const err = (msg) => new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`> <a:warning_animated:1361729714259099809> **${msg}**`)
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply({ embeds: [err('You must be in a voice channel!')] });

    const channelData = tempChannels.get(voiceChannel.id);
    if (!channelData) return message.reply({ embeds: [err('This is not a temporary channel!')] });
    if (channelData.ownerId !== message.author.id) return message.reply({ embeds: [err('You are not the owner of this channel!')] });

    const mentionUser = message.mentions.users.first();
    let targetId = mentionUser?.id ?? (args[0] ? args[0].replace(/[^0-9]/g, '') : null);

    if (!targetId) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('⚠️ مستخدم مطلوب')
            .setDescription('يرجى منشن المستخدم أو توفير ID صحيح لطرده من القناة!')
            .addFields({ name: '📝 مثال', value: '`.v kick @username` أو `.v kick 849713984732894792`', inline: false })
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });
    }

    // ── FIX: prevent kicking yourself ────────────────────────────────────
    if (targetId === message.author.id) {
      return message.reply({ embeds: [err('You cannot kick yourself!')] });
    }
    // ─────────────────────────────────────────────────────────────────────

    const targetMember = voiceChannel.members.get(targetId);
    if (!targetMember) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('⚠️ تحذير')
            .setDescription('المستخدم ليس في نفس القناة الصوتية!')
            .addFields({ name: '🎤 القناة الحالية', value: voiceChannel.name, inline: true })
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });
    }

    // ── FIX: prevent kicking bots ─────────────────────────────────────────
    if (targetMember.user.bot) {
      return message.reply({ embeds: [err('You cannot kick a bot!')] });
    }
    // ─────────────────────────────────────────────────────────────────────

    try {
      // Prefer disconnect; fall back to moving to Create Room or null
      if (typeof targetMember.voice.disconnect === 'function') {
        await targetMember.voice.disconnect();
      } else {
        const createRoomId = process.env.CREATE_ROOM_ID;
        const createRoom = message.guild.channels.cache.find(
          c => c.id === createRoomId || (c.type === 2 && (c.name.includes('Create Room') || c.name.includes('➕')))
        );

        await targetMember.voice.setChannel(createRoom ?? null);
      }

      // ── REVOKE PERSISTENT INVITE: Remove from allowedUsers on kick ───────
      if (channelData.allowedUsers) {
        channelData.allowedUsers = channelData.allowedUsers.filter(id => id !== targetId);
      }
      // ───────────────────────────────────────────────────────────────────

      message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#E67E22')
            .setTitle('<a:sssss:1450241657261002864> تم طرد المستخدم')
            .setDescription(`تم طرد <@${targetId}> من القناة الصوتية. يمكنه الانضمام مجددًا لاحقًا.`)
            .addFields(
              { name: '🎤 القناة', value: voiceChannel.name, inline: true },
              { name: '👤 بواسطة', value: `<@${message.author.id}>`, inline: true }
            )
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });

    } catch (error) {
      message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('❌ فشل الطرد')
            .setDescription('تعذر طرد المستخدم من القناة. تأكد من امتلاك صلاحية نقل الأعضاء (Move Members).')
            .addFields({ name: '📄 الخطأ', value: error.message || 'غير معروف', inline: false })
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });
    }
  }
};
