const { EmbedBuilder } = require('discord.js');
const { errorEmbed, safeReply } = require('../utils/helpers');

module.exports = {
  name: 'limit',
  description: 'Set user limit for the voice channel.',
  execute: async (client, message, args, tempChannels) => {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return safeReply(message, { embeds: [errorEmbed('You must be in a voice channel!', client)] });

    const limit = parseInt(args[0], 10);
    if (isNaN(limit) || limit < 0 || limit > 99) {
      return safeReply(message, { embeds: [errorEmbed('Please provide a valid number (0-99)!', client)] });
    }

    const channelData = tempChannels.get(voiceChannel.id);
    if (!channelData) return safeReply(message, { embeds: [errorEmbed('This is not a temporary channel!', client)] });
    if (channelData.ownerId !== message.author.id) return safeReply(message, { embeds: [errorEmbed('You are not the owner of this channel!', client)] });

    try {
      const oldLimit = voiceChannel.userLimit;
      await voiceChannel.setUserLimit(limit);

      const successEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle(`<:voice4:1358152468273430718> **LIMIT UPDATED**`)
        .setDescription(`> <a:notif:1447321335117123610> **User limit has been set successfully.**`)
        .addFields(
          { name: 'Old Limit', value: `${oldLimit === 0 ? 'Unlimited' : oldLimit}`, inline: true },
          { name: 'New Limit', value: `${limit === 0 ? 'Unlimited' : limit}`, inline: true },
          { name: `<a:org:1449141144268308595> Owner`, value: `<@${message.author.id}>`, inline: true }
        )
      message.guild.iconURL({ dynamic: true }) && successEmbed.setThumbnail(message.guild.iconURL({ dynamic: true }));

      safeReply(message, { embeds: [successEmbed] });
    } catch (error) {
      safeReply(message, { embeds: [errorEmbed('Failed to update limit. Rate limit might apply.', client)] });
    }
  }
};