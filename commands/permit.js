const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed } = require('../utils/helpers');

module.exports = {
  name: 'permit',
  description: 'Allow a specific user to join your temp channel.',
  execute: async (client, message, args, tempChannels) => {
    const user = message.mentions.users.first();
    if (!user) return message.reply({ embeds: [errorEmbed('يرجى منشن المستخدم المراد السماح له!', client)] });

    // ── FIX: Safe voiceChannel check ─────────────────────────────────────
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply({ embeds: [errorEmbed('You must be in a voice channel!', client)] });
    // ─────────────────────────────────────────────────────────────────────

    const channelData = tempChannels.get(voiceChannel.id);
    if (!channelData) return message.reply({ embeds: [errorEmbed('This is not a temporary channel!', client)] });
    if (channelData.ownerId !== message.author.id) return message.reply({ embeds: [errorEmbed('You are not the owner of this channel!', client)] });

    if (user.id === message.author.id) return message.reply({ embeds: [errorEmbed('You are already the owner!', client)] });

    // Remove from rejected if they were there
    if (channelData.rejectedUsers?.includes(user.id)) {
      channelData.rejectedUsers = channelData.rejectedUsers.filter(id => id !== user.id);
    }

    if (!channelData.allowedUsers) channelData.allowedUsers = [];
    if (!channelData.allowedUsers.includes(user.id)) {
      channelData.allowedUsers.push(user.id);
    }

    try {
      await voiceChannel.permissionOverwrites.edit(user.id, {
        [PermissionFlagsBits.Connect]: true,
        [PermissionFlagsBits.ViewChannel]: true,
        [PermissionFlagsBits.Speak]: true
      });

      const successEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('✅ تم السماح')
        .setDescription(`تم السماح للمستخدم **${user.username}** بالانضمام إلى قناتك!`)
        .addFields(
          { name: '👤 المستخدم', value: `<@${user.id}>`, inline: true },
          { name: '🎤 القناة', value: voiceChannel.name, inline: true },
          { name: '⚡ الحالة', value: 'مسموح', inline: true }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      message.reply({ embeds: [successEmbed] });
    } catch (error) {
      message.reply({ embeds: [errorEmbed('Failed to permit user. Check bot permissions.', client)] });
    }
  }
};
