const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { setVoiceStatus, errorEmbed, safeReply } = require('../utils/helpers');

module.exports = {
  name: 'lock',
  description: 'Lock the voice channel.',
  execute: async (client, message, args, tempChannels) => {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return safeReply(message, { embeds: [errorEmbed('You must be in a voice channel!', client)] });

    const channelData = tempChannels.get(voiceChannel.id);
    if (!channelData) return safeReply(message, { embeds: [errorEmbed('This is not a temporary channel!', client)] });
    if (channelData.ownerId !== message.author.id) return safeReply(message, { embeds: [errorEmbed('You are not the owner of this channel!', client)] });

    const targetRoleId = process.env.TEMP_ROOM_ROLE_ID || message.guild.id;

    try {
      await voiceChannel.permissionOverwrites.edit(targetRoleId, { [PermissionFlagsBits.Connect]: false });

      // Update voice status helper
      await setVoiceStatus(voiceChannel.id, client.token, '<:lock:1452014333965111398>  ** Room Masdoda**');

      const successEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle(`<:voice3:1358152470081175622> **CHANNEL LOCKED**`)
        .setDescription(`> <a:notif:1447321335117123610> **Channel is now locked for everyone.**`)
        .addFields(
          { name: `<:voice2:1358152471687467228> Channel`, value: `${voiceChannel.name}`, inline: true },
          { name: `<a:org:1449141144268308595> Owner`, value: `<@${message.author.id}>`, inline: true }
        )
      message.guild.iconURL({ dynamic: true }) && successEmbed.setThumbnail(message.guild.iconURL({ dynamic: true }));

      safeReply(message, { embeds: [successEmbed] });
    } catch (error) {
      safeReply(message, { embeds: [errorEmbed('Failed to lock the channel. Check bot permissions.', client)] });
    }
  }
};