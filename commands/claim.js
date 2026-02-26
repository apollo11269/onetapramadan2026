const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'claim',
  description: 'Claim ownership if the current owner left.',
  execute: async (client, message, args, tempChannels) => {
    const err = (msg) => new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`> <a:warning_animated:1361729714259099809> **${msg}**`)
      .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() });

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply({ embeds: [err('You must be in a voice channel!')] });

    const channelData = tempChannels.get(voiceChannel.id);
    if (!channelData) return message.reply({ embeds: [err('This is not a temporary channel!')] });

    if (channelData.ownerId === message.author.id) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('<a:12104crownpink:1449139449211387945> Already Owner')
            .setDescription('You are already the owner of this channel!')
            .addFields(
              { name: '🎤 Channel', value: voiceChannel.name, inline: true },
              { name: '👤 Owner', value: `<@${message.author.id}>`, inline: true }
            )
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });
    }

    // Owner must have left the channel
    if (voiceChannel.members.has(channelData.ownerId)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#E67E22')
            .setTitle('⚠️ Owner Still Present')
            .setDescription('The current owner is still in the channel!')
            .addFields(
              { name: '🎤 Channel', value: voiceChannel.name, inline: true },
              { name: '👤 Current Owner', value: `<@${channelData.ownerId}>`, inline: true },
              { name: '💡 Tip', value: 'Wait for the owner to leave before claiming.', inline: false }
            )
            .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
            .setTimestamp()
        ]
      });
    }

    // ── SMART CLAIM: Check if 5 minutes have passed since owner left ───────
    if (channelData.ownerLeftAt) {
      const fiveMinutes = 5 * 60 * 1000;
      const timePassed = Date.now() - channelData.ownerLeftAt;

      if (timePassed < fiveMinutes) {
        const remainingSeconds = Math.ceil((fiveMinutes - timePassed) / 1000);
        const remainingMinutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x2B2D31)
              .setTitle('⏳ Owner Grace Period')
              .setDescription(`The owner recently left. You must wait for the 5-minute grace period before claiming ownership.`)
              .addFields(
                { name: '⏰ Time Remaining', value: `\`${remainingMinutes}m ${seconds}s\``, inline: true },
                { name: '👤 Original Owner', value: `<@${channelData.ownerId}>`, inline: true }
              )
              .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
              .setTimestamp()
          ]
        });
      }
    }
    // ───────────────────────────────────────────────────────────────────

    // Grant new owner permissions
    await voiceChannel.permissionOverwrites.edit(message.author.id, {
      ManageChannels: true,
      Connect: true,
      ViewChannel: true,
      Stream: true,
      Speak: true,
      UseVAD: true,
      PrioritySpeaker: true
    });

    // ── FIX: revoke old owner's ManageChannels so they can't manage after leaving ──
    const oldOwnerId = channelData.ownerId;
    await voiceChannel.permissionOverwrites.edit(oldOwnerId, {
      ManageChannels: false,
      PrioritySpeaker: false
    }).catch(() => { }); // old owner may not have an overwrite
    // ──────────────────────────────────────────────────────────────────────────────

    channelData.ownerId = message.author.id;
    delete channelData.ownerLeftAt; // Clear the timestamp after successful claim

    message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2B2D31)
          .setTitle('<a:12104crownpink:1449139449211387945> Channel Claimed')
          .setDescription('You have successfully claimed ownership of this channel!')
          .addFields(
            { name: '🎤 Channel', value: voiceChannel.name, inline: true },
            { name: '👤 New Owner', value: `<@${message.author.id}>`, inline: true },
            { name: '⚡ Permissions', value: 'Manage Channel, Stream, Speak, Priority Speaker', inline: false }
          )
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'TMPv - Ramadan Version 🌛 By APOllO', iconURL: client.user.displayAvatarURL() })
          .setTimestamp()
      ]
    });
  }
};
