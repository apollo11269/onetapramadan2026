const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../utils/helpers');

const MAX_NAME_LENGTH = 90; // Discord limit is 100, we use 90 for the prefix "🔊｜"

module.exports = {
  name: 'name',
  description: 'Change channel name.',
  execute: async (client, message, args, tempChannels) => {
    const err = (msg) => new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`> <a:warning_animated:1361729714259099809> **${msg}**`)
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return safeReply(message, { embeds: [err('You must be in a voice channel!')] });

    const channelData = tempChannels.get(voiceChannel.id);
    if (!channelData) return safeReply(message, { embeds: [err('This is not a temporary channel!')] });
    if (channelData.ownerId !== message.author.id) return safeReply(message, { embeds: [err('You are not the owner of this channel!')] });

    if (args.length === 0) return safeReply(message, { embeds: [err('Please provide a new valid name!')] });

    const rawName = args.join(' ');

    // ── FIX #1: enforce max length BEFORE sending to Discord ─────────────
    if (rawName.length > MAX_NAME_LENGTH) {
      return message.reply({ embeds: [err(`Channel name is too long! Maximum is ${MAX_NAME_LENGTH} characters.`)] });
    }
    // ─────────────────────────────────────────────────────────────────────

    const newName = `🔊｜${rawName}`;
    const oldName = voiceChannel.name;

    try {
      // ── FIX #2: await setName so we only reply on actual success ─────────
      await voiceChannel.setName(newName);
      // ─────────────────────────────────────────────────────────────────────

      safeReply(message, {
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('<:voice6:1358152460979404992> **NAME CHANGED**')
            .setDescription('> <a:notif:1447321335117123610> **Channel name updated successfully.**')
            .addFields(
              { name: 'Old Name', value: oldName, inline: true },
              { name: 'New Name', value: newName, inline: true },
              { name: '<a:org:1449141144268308595> Owner', value: `<@${message.author.id}>`, inline: true }
            )
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });
    } catch (error) {
      safeReply(message, { embeds: [err('Failed to change name. It might be rate limited — try again in a moment.')] });
    }
  }
};