const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed } = require('../utils/helpers');

module.exports = {
  name: 'rejectrole',
  description: 'Block a specific role from joining your temp channel.',
  execute: async (client, message, args, tempChannels) => {
    const role = message.mentions.roles.first();
    if (!role) return message.reply({ embeds: [errorEmbed('رجاء منشن الدور (Role) اللي بغيت تمنعو.', client)] });

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply({ embeds: [errorEmbed('You must be in a voice channel!', client)] });

    const channelData = tempChannels.get(voiceChannel.id);
    if (!channelData) return message.reply({ embeds: [errorEmbed('This is not a temporary channel!', client)] });

    if (channelData.ownerId !== message.author.id) return message.reply({ embeds: [errorEmbed('You are not the owner of this channel!', client)] });

    try {
      await voiceChannel.permissionOverwrites.edit(role.id, {
        [PermissionFlagsBits.Connect]: false
      });

      const embed = new EmbedBuilder()
        .setColor('#E67E22') // Orange for block
        .setTitle('⛔ تم منع الدور')
        .setDescription(`تم منع الدور **${role.name}** من الانضمام للقناة.`)
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } catch (error) {
      message.reply({ embeds: [errorEmbed('Failed to reject role.', client)] });
    }
  }
};
