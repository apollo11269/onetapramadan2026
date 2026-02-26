const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'transfer',
  description: 'Transfer channel ownership to another user.',
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
            .setDescription('يرجى ذكر مستخدم لنقل ملكية القناة إليه!')
            .addFields({ name: '📝 مثال', value: '`.v transfer @username`', inline: false })
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });
    }

    const channelData = tempChannels.get(voiceChannel.id);
    if (!channelData) return message.reply({ embeds: [err('This is not a temporary channel!')] });
    if (channelData.ownerId !== message.author.id) return message.reply({ embeds: [err('You are not the owner of this channel!')] });

    // ── FIX #1: prevent transferring to yourself ──────────────────────────
    if (user.id === message.author.id) {
      return message.reply({ embeds: [err('You cannot transfer ownership to yourself!')] });
    }

    // ── FIX #2: prevent transferring to a bot ────────────────────────────
    if (user.bot) {
      return message.reply({ embeds: [err('You cannot transfer ownership to a bot!')] });
    }

    // ── FIX #3: target must be IN the voice channel ───────────────────────
    const targetMember = voiceChannel.members.get(user.id);
    if (!targetMember) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('❌ خطأ')
            .setDescription('يجب أن يكون المستخدم المستهدف موجوداً في نفس القناة الصوتية!')
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });
    }
    // ─────────────────────────────────────────────────────────────────────

    // Grant new owner permissions
    await voiceChannel.permissionOverwrites.edit(user.id, {
      ManageChannels: true,
      Connect: true,
      ViewChannel: true,
      Stream: true,
      Speak: true,
      UseVAD: true,
      PrioritySpeaker: true
    });

    // ── FIX #4: fully revoke old owner's ManageChannels (not just set false) ──
    await voiceChannel.permissionOverwrites.edit(message.author.id, {
      ManageChannels: false,
      PrioritySpeaker: false
    });
    // ─────────────────────────────────────────────────────────────────────

    channelData.ownerId = user.id;

    message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2B2D31)
          .setTitle('<a:12104crownpink:1449139449211387945> تم نقل الملكية')
          .setDescription('تم نقل ملكية القناة بنجاح!')
          .addFields(
            { name: '👤 المالك الجديد', value: `<@${user.id}>`, inline: true },
            { name: '👤 المالك السابق', value: `<@${message.author.id}>`, inline: true },
            { name: '🎤 القناة', value: voiceChannel.name, inline: true }
          )
          .setThumbnail(user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
          .setTimestamp()
      ]
    });
  }
};
