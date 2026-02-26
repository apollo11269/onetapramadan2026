const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed } = require('../utils/helpers');

module.exports = {
  name: 'hide',
  description: 'Hide the channel from the public role.',
  execute: async (client, message, args, tempChannels) => {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply({ embeds: [errorEmbed('You must be in a voice channel!', client)] });

    const channelData = tempChannels.get(voiceChannel.id);
    if (!channelData) return message.reply({ embeds: [errorEmbed('This is not a temporary channel!', client)] });
    if (channelData.ownerId !== message.author.id) return message.reply({ embeds: [errorEmbed('You are not the owner of this channel!', client)] });

    const targetRoleId = process.env.TEMP_ROOM_ROLE_ID || message.guild.id;

    try {
      await voiceChannel.permissionOverwrites.edit(targetRoleId, { [PermissionFlagsBits.ViewChannel]: false });

      const successEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle(`<a:Red_Eye:1450210370487718071> **CHANNEL HIDDEN**`)
        .setDescription(`> <a:notif:1447321335117123610> **Channel is now invisible to everyone.**`)
        .addFields(
          { name: `<:voice2:1358152471687467228> Channel`, value: `${voiceChannel.name}`, inline: true },
          { name: `<a:org:1449141144268308595> Owner`, value: `<@${message.author.id}>`, inline: true }
        )
        .setThumbnail(message.guild.iconURL({ dynamic: true }))
        .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      message.reply({ embeds: [successEmbed] });
    } catch (error) {
      message.reply({ embeds: [errorEmbed('Failed to hide the channel.', client)] });
    }
  }
};