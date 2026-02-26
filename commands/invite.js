const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'invite',
  description: 'Invite a user to your temp channel.',
  execute: async (client, message, args, tempChannels) => {
    const err = (msg) => new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`> <a:warning_animated:1361729714259099809> **${msg}**`)
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply({ embeds: [err('You must be in a voice channel!')] });

    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('⚠️ مستخدم مطلوب')
            .setDescription('يرجى ذكر مستخدم لدعوته!')
            .addFields({ name: '📝 مثال', value: '`.v invite @username`', inline: false })
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });
    }

    const channelData = tempChannels.get(voiceChannel.id);
    if (!channelData) return message.reply({ embeds: [err('This is not a temporary channel!')] });
    if (channelData.ownerId !== message.author.id) return message.reply({ embeds: [err('You are not the owner of this channel!')] });

    // ── FIX #1: prevent inviting yourself ────────────────────────────────
    if (user.id === message.author.id) {
      return message.reply({ embeds: [err('You cannot invite yourself!')] });
    }

    // ── FIX #2: prevent inviting bots ────────────────────────────────────
    if (user.bot) {
      return message.reply({ embeds: [err('You cannot invite a bot!')] });
    }
    // ─────────────────────────────────────────────────────────────────────

    if (!channelData.allowedUsers) channelData.allowedUsers = [];

    if (channelData.allowedUsers.includes(user.id)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('⚠️ مدعو مسبقاً')
            .setDescription('هذا المستخدم مدعو بالفعل للانضمام إلى قناتك!')
            .addFields(
              { name: '👤 المستخدم', value: `<@${user.id}>`, inline: true },
              { name: '🎤 القناة', value: voiceChannel.name, inline: true }
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });
    }

    // ── FIX #3: also remove from rejectedUsers if previously rejected ─────
    if (channelData.rejectedUsers?.includes(user.id)) {
      channelData.rejectedUsers = channelData.rejectedUsers.filter(id => id !== user.id);
    }
    // ─────────────────────────────────────────────────────────────────────

    channelData.allowedUsers.push(user.id);
    await voiceChannel.permissionOverwrites.edit(user.id, {
      Connect: true,
      ViewChannel: true,
      Speak: true,
      SendMessages: true,
      ReadMessageHistory: true,
      UseVAD: true
    });

    message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2B2D31)
          .setTitle('📨 تم إرسال الدعوة')
          .setDescription('تم دعوة المستخدم للانضمام إلى قناتك بنجاح!')
          .addFields(
            { name: '👤 المستخدم المدعو', value: `<@${user.id}>`, inline: true },
            { name: '🎤 القناة', value: voiceChannel.name, inline: true },
            { name: '<a:12104crownpink:1449139449211387945> بواسطة', value: `<@${message.author.id}>`, inline: true },
            { name: '✅ الصلاحيات الممنوحة', value: '• الاتصال 🔗\n• الرؤية <a:Red_Eye:1450210370487718071>\n• التحدث 🎤\n• الرسائل 💬\n• الأرشيف 📜\n• الصوت التلقائي 🔉', inline: false }
          )
          .setThumbnail(user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
          .setTimestamp()
      ]
    });
  }
};
