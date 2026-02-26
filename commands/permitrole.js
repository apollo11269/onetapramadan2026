const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed } = require('../utils/helpers');

module.exports = {
  name: 'permitrole',
  description: 'Allow a specific role to join your temp channel.',
  execute: async (client, message, args, tempChannels) => {
    const role = message.mentions.roles.first();
    if (!role) return message.reply({ embeds: [errorEmbed('رجاء منشن الدور (Role) اللي بغيت تسمح ليه.', client)] });

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply({ embeds: [errorEmbed('You must be in a voice channel!', client)] });

    const channelData = tempChannels.get(voiceChannel.id);
    if (!channelData) return message.reply({ embeds: [errorEmbed('This is not a temporary channel!', client)] });

    // Admin or Owner can run this
    const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;
    const isOwner = channelData.ownerId === message.author.id;
    const isAdmin = ADMIN_ROLE_ID && message.member.roles.cache.has(ADMIN_ROLE_ID);

    if (!isOwner && !isAdmin) {
      return message.reply({ embeds: [errorEmbed('You are not the owner or an admin!', client)] });
    }

    try {
      await voiceChannel.permissionOverwrites.edit(role.id, {
        [PermissionFlagsBits.Connect]: true,
        [PermissionFlagsBits.ViewChannel]: true
      });

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('✅ تم السماح للدور')
        .setDescription(`تم السماح للدور **${role.name}** بالانضمام للقناة.`)
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } catch (error) {
      message.reply({ embeds: [errorEmbed('Failed to permit role.', client)] });
    }
  }
};
